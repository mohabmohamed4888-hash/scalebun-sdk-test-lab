#!/usr/bin/env node
/**
 * ScaleBun SDK Test Lab — server-side verification companion.
 *
 * SECURITY: this tool may use a SERVER-SIDE credential (personal access token)
 * read from tools/scalebun-verifier/.env.verifier (gitignored). It lives outside
 * the React Native source tree, is excluded from Metro (metro.config.js
 * blockList) and must NEVER be imported by app code.
 *
 * What it can verify, honestly:
 *   auth                 — the token works (GET /auth/me, the same endpoint the
 *                          official @scalebun/cli uses) and can see SCALEBUN_APP_ID.
 *   checklist <report>   — turns an exported Test Lab report into a per-run
 *                          Dashboard Verification checklist with exact search
 *                          terms (testRunId, tokens, transaction ids, users).
 *   mcp <report>         — prints ready-to-run ScaleBun MCP `verify_ingestion`
 *                          calls (the ONLY supported event-level delivery proof).
 *
 * What it deliberately does NOT do: query events/errors/logs/sessions over REST.
 * @scalebun/cli 2.4.0 and the public SDK expose no documented query endpoint for
 * those; guessing private routes would produce false VERIFIED results. See
 * DASHBOARD_VERIFICATION.md.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '.env.verifier');

function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_FILE)) {
    for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !line.trim().startsWith('#')) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return { ...env, ...pick(process.env, ['SCALEBUN_TOKEN', 'SCALEBUN_API_URL', 'SCALEBUN_APP_ID', 'SCALEBUN_ORG_ID']) };
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k]) out[k] = obj[k];
  return out;
}

/** Never print a credential — only a short prefix. */
const mask = v => (v ? `${String(v).slice(0, 12)}…` : '(unset)');

async function api(env, p) {
  const base = (env.SCALEBUN_API_URL || 'https://api.scalebun.com/api/v1').replace(/\/+$/, '');
  if (!/\/api\/v1$/.test(base)) throw new Error(`SCALEBUN_API_URL must end with /api/v1 (got ${base})`);
  const res = await fetch(base + p, { headers: { Authorization: `Bearer ${env.SCALEBUN_TOKEN}`, Accept: 'application/json' } });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 300);
  }
  return { status: res.status, body };
}

async function cmdAuth() {
  const env = loadEnv();
  if (!env.SCALEBUN_TOKEN) {
    console.error(`NOT_CONFIGURED: set SCALEBUN_TOKEN in ${path.relative(process.cwd(), ENV_FILE)} (see .env.verifier.example).`);
    process.exit(2);
  }
  console.log(`token ${mask(env.SCALEBUN_TOKEN)} → ${env.SCALEBUN_API_URL || 'https://api.scalebun.com/api/v1'}`);
  const me = await api(env, '/auth/me');
  console.log(`GET /auth/me → ${me.status}`);
  if (me.status !== 200) {
    console.error(typeof me.body === 'string' ? me.body : JSON.stringify(me.body));
    process.exit(1);
  }
  const who = me.body && (me.body.email || (me.body.user && me.body.user.email) || me.body.id);
  console.log(`authenticated as ${who || '(unknown)'}`);
  if (env.SCALEBUN_APP_ID) {
    const envs = await api(env, `/apps/${encodeURIComponent(env.SCALEBUN_APP_ID)}/environments`);
    console.log(`GET /apps/${env.SCALEBUN_APP_ID}/environments → ${envs.status}`);
    if (envs.status === 200 && Array.isArray(envs.body)) console.log(`environments: ${envs.body.map(e => e.name).join(', ')}`);
    else if (envs.status === 200 && envs.body && Array.isArray(envs.body.data)) console.log(`environments: ${envs.body.data.map(e => e.name).join(', ')}`);
  }
}

function readReport(file) {
  if (!file) throw new Error('usage: verify.js checklist <exported-report.json> [--out file.md]');
  const r = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (r.schema !== 'scalebun-sdk-test-lab/report@1') throw new Error(`not a Test Lab report (schema ${r.schema})`);
  return r;
}

const NEEDS_DASHBOARD = new Set(['LOCAL_PASS', 'MANUAL_VERIFICATION_REQUIRED']);

function cmdChecklist(file, out) {
  const r = readReport(file);
  const lines = [];
  const e = r.environment;
  lines.push(`# Dashboard verification — ${r.testRunId}`, '');
  lines.push(`- Generated: ${r.generatedAt}`);
  lines.push(`- SDK ${e.sdkVersion} · RN ${e.reactNativeVersion} · ${e.platform} ${e.osVersion} · app ${e.appVersion} (${e.buildNumber})`);
  lines.push(`- Environment: ${e.environment} · appId ${e.appId || '—'} · profile ${e.profileId} (${e.integration})`);
  lines.push(`- Summary: ${Object.entries(r.summary).map(([k, v]) => `${k}=${v}`).join(', ')}`, '');
  lines.push('Search every dashboard view for the property/value **testRunId = ' + r.testRunId + '** first.', '');
  const groups = {};
  for (const t of r.tests) {
    if (!NEEDS_DASHBOARD.has(t.result.status)) continue;
    (groups[t.category] = groups[t.category] || []).push(t);
  }
  for (const [cat, tests] of Object.entries(groups)) {
    lines.push(`## ${cat}`, '');
    for (const t of tests) {
      const extra = searchTerms(t, r.testRunId);
      lines.push(`- [ ] **${t.id} ${t.name}** — ${t.result.status}`);
      lines.push(`  - Where: ${t.dashboardLocation}`);
      lines.push(`  - Expect: ${t.expectedScaleBun}`);
      if (extra.length) lines.push(`  - Search: ${extra.map(x => '`' + x + '`').join(', ')}`);
      if (t.result.note) lines.push(`  - Note: ${t.result.note}`);
    }
    lines.push('');
  }
  const failed = r.tests.filter(t => t.result.status === 'FAIL');
  if (failed.length) {
    lines.push('## Local FAILURES (investigate before dashboard checks)', '');
    for (const t of failed) lines.push(`- ${t.id} ${t.name}: ${t.result.note || ''}`);
  }
  const md = lines.join('\n') + '\n';
  if (out) {
    fs.writeFileSync(out, md);
    console.log(`wrote ${out}`);
  } else process.stdout.write(md);
}

function searchTerms(t, runId) {
  const terms = new Set();
  const s = JSON.stringify(t.result.actual || {});
  for (const m of s.matchAll(/sdk_test_[A-Za-z0-9_:.-]+/g)) terms.add(m[0]);
  if (/purchase|revenue|funnel/i.test(t.name)) terms.add(`sdk_test_txn_${runId}`);
  if (/identify|user|identity/i.test(t.name)) terms.add(`sdk_test_user_a_${runId}`);
  return [...terms].slice(0, 6);
}

function cmdMcp(file) {
  const r = readReport(file);
  const env = loadEnv();
  const appId = env.SCALEBUN_APP_ID || r.environment.appId || '<appId>';
  const install = findInstallationId(r);
  console.log('# Paste into an MCP-enabled agent session (ScaleBun MCP):\n');
  console.log(JSON.stringify({ tool: 'verify_ingestion', args: { appId, eventName: 'test_boot_probe', ...(install ? { installationId: install } : {}) } }, null, 2));
  for (const name of ['test_single_event', 'test_envelope_event', 'test_manual_flush', 'Purchase Completed']) {
    console.log(JSON.stringify({ tool: 'verify_ingestion', args: { appId, eventName: name, ...(install ? { correlationId: install } : {}) } }));
  }
}

function findInstallationId(r) {
  for (const t of r.tests) {
    const s = JSON.stringify(t.result.actual || {});
    const m = /"installationId":"([^"]+)"/.exec(s);
    if (m) return m[1];
  }
  return null;
}

async function main() {
  const [cmd, a1, ...rest] = process.argv.slice(2);
  const outIdx = rest.indexOf('--out');
  const out = outIdx > -1 ? rest[outIdx + 1] : undefined;
  switch (cmd) {
    case 'auth':
      return cmdAuth();
    case 'checklist':
      return cmdChecklist(a1, out);
    case 'mcp':
      return cmdMcp(a1);
    default:
      console.log('usage: node tools/scalebun-verifier/verify.js <auth | checklist <report.json> [--out f.md] | mcp <report.json>>');
      process.exit(cmd ? 1 : 0);
  }
}

main().catch(err => {
  console.error(`verifier error: ${err.message}`);
  process.exit(1);
});
