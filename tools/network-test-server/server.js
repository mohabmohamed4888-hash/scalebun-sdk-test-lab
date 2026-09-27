#!/usr/bin/env node
/**
 * Deterministic HTTP server for the ScaleBun SDK Test Lab Network screen.
 * Zero dependencies (Node >= 18). Binds 0.0.0.0 so physical devices on the
 * same LAN can reach it.
 *
 *   node tools/network-test-server/server.js [--port 4545]
 *
 * Every response is deterministic in status, latency and shape. All values it
 * echoes are whatever the Test Lab sent — the Test Lab only ever sends FAKE
 * credentials/PII. The server never logs request headers or bodies.
 */
'use strict';
const http = require('http');
const os = require('os');
const { URL } = require('url');

const argPort = process.argv.indexOf('--port');
const PORT = Number(argPort > -1 ? process.argv[argPort + 1] : process.env.PORT || 4545);
const MAX_DELAY_MS = 30_000;
const MAX_LARGE_KB = 5 * 1024;

const stats = { startedAt: new Date().toISOString(), requests: 0, byRoute: {} };

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise(resolve => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size <= 2 * 1024 * 1024) chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(raw ? JSON.parse(raw) : null);
      } catch {
        resolve(raw);
      }
    });
    req.on('error', () => resolve(null));
  });
}

const routes = [
  // GET /health
  [/^\/health$/, async () => ({ status: 200, body: { ok: true, server: 'scalebun-sdk-test-lab-network-server', uptimeS: Math.round(process.uptime()) } })],
  // GET /stats — how many requests each route received (lets testers confirm delivery)
  [/^\/stats$/, async () => ({ status: 200, body: stats })],
  // ANY /echo[/anything] — echoes method, path, query, header NAMES and body
  [
    /^\/echo(\/.*)?$/,
    async (req, url) => ({
      status: 200,
      body: {
        method: req.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        headerNames: Object.keys(req.headers).sort(),
        body: await readBody(req),
      },
    }),
  ],
  // GET /status/:code
  [
    /^\/status\/(\d{3})$/,
    async (req, url, m) => {
      const code = Number(m[1]);
      const headers = code === 429 ? { 'Retry-After': '2' } : code === 401 ? { 'WWW-Authenticate': 'Bearer realm="sdk-test"' } : {};
      return { status: code, headers, body: { status: code, message: http.STATUS_CODES[code] || 'unknown', testRunId: url.searchParams.get('testRunId') } };
    },
  ],
  // GET /delay/:ms
  [
    /^\/delay\/(\d+)$/,
    async (req, url, m) => {
      const ms = Math.min(Number(m[1]), MAX_DELAY_MS);
      await new Promise(r => setTimeout(r, ms));
      return { status: 200, body: { delayedMs: ms } };
    },
  ],
  // GET /redirect/:n → 302 chain ending at /echo
  [
    /^\/redirect\/(\d+)$/,
    async (req, url, m) => {
      const n = Number(m[1]);
      const next = n <= 1 ? `/echo${url.search}` : `/redirect/${n - 1}${url.search}`;
      return { status: 302, headers: { Location: next }, body: { redirectTo: next } };
    },
  ],
  // GET /large/:kb — deterministic JSON of ~kb kilobytes
  [
    /^\/large\/(\d+)$/,
    async (req, url, m) => {
      const kb = Math.min(Number(m[1]), MAX_LARGE_KB);
      const row = { id: 0, name: 'sdk-test-row', value: 'x'.repeat(80) };
      const rows = [];
      const rowBytes = JSON.stringify(row).length + 1;
      for (let i = 0; i < Math.ceil((kb * 1024) / rowBytes); i++) rows.push({ ...row, id: i });
      return { status: 200, body: { kb, rows } };
    },
  ],
  // GET /set-cookie?value=… — sets a FAKE cookie supplied by the Test Lab
  [
    /^\/set-cookie$/,
    async (req, url) => ({
      status: 200,
      headers: { 'Set-Cookie': `sdk_test_session=${encodeURIComponent(url.searchParams.get('value') || 'FAKE')}; Path=/; HttpOnly` },
      body: { cookieSet: true },
    }),
  ],
  // POST /login-fake — responds with a FAKE token so response-body redaction can be observed
  [
    /^\/login-fake$/,
    async req => {
      const body = await readBody(req);
      return {
        status: 200,
        body: {
          access_token: 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJzZGtfdGVzdCJ9.FAKESIGNATURE_NOT_REAL',
          refresh_token: 'FAKE_REFRESH_TOKEN_NOT_REAL',
          user: { email: (body && body.email) || 'fake@example.test', display: 'Fake User' },
        },
      };
    },
  ],
  // GET /<anything>/generate_204 — classified by the SDK as a telemetry beacon
  [/\/generate_204$/, async () => ({ status: 204, body: '' })],
];

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  stats.requests += 1;
  // Client aborts (cancellation/timeout tests) close the response before we finish.
  // NOTE: req.destroyed is NOT usable for this — Node auto-destroys the request
  // stream once its body has been fully read.
  let clientGone = false;
  res.on('close', () => {
    if (!res.writableFinished) clientGone = true;
  });
  const started = Date.now();
  for (const [re, handler] of routes) {
    const m = re.exec(url.pathname);
    if (!m) continue;
    const key = re.source;
    stats.byRoute[key] = (stats.byRoute[key] || 0) + 1;
    try {
      const out = await handler(req, url, m);
      if (clientGone) {
        console.log(`${new Date().toISOString()} ${req.method} ${url.pathname} → client aborted after ${Date.now() - started}ms`);
        return;
      }
      send(res, out.status, out.status === 204 ? '' : out.body, out.headers);
    } catch (err) {
      send(res, 500, { error: String(err && err.message) });
    }
    console.log(`${new Date().toISOString()} ${req.method} ${url.pathname} → ${res.statusCode} ${Date.now() - started}ms`);
    return;
  }
  send(res, 404, { error: 'no such route', path: url.pathname });
  console.log(`${new Date().toISOString()} ${req.method} ${url.pathname} → 404`);
});

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    const lan = Object.values(os.networkInterfaces())
      .flat()
      .filter(i => i && i.family === 'IPv4' && !i.internal)
      .map(i => `http://${i.address}:${PORT}`);
    console.log(`ScaleBun Test Lab network server on :${PORT}`);
    console.log(`  Android emulator : http://10.0.2.2:${PORT}`);
    console.log(`  iOS simulator    : http://localhost:${PORT}`);
    for (const u of lan) console.log(`  Physical device  : ${u}`);
    console.log('Set NETWORK_TEST_SERVER_URL in .env accordingly.');
  });
}

module.exports = { server, routes };
