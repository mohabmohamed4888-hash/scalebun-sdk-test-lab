import { t, DASH, fakePii, withNeedles } from './helpers';
import { labFetch, labAxios } from '../services/networkClient';
import type { TestContext } from '../testRunner/types';

const C = 'Network' as const;
const base = (ctx: TestContext) => ctx.env.networkServerUrl!;
const q = (ctx: TestContext) => `testRunId=${encodeURIComponent(ctx.runId)}&testId=${ctx.testId}`;

const NET_REQ = ['sdkInitialized', 'networkServer'] as const;

export const networkTests = [
  t({
    id: 'NET-001',
    category: C,
    name: 'GET 200 with query parameters (fetch)',
    description: 'GET /echo?a=1&b=two&unicode=اختبار',
    requires: NET_REQ,
    expectedLocal: 'HTTP 200; echoed query matches.',
    expectedScaleBun: 'Network entry GET /echo 200 with duration, in the session network panel.',
    dashboardLocation: DASH.network,
    covers: ['config.features.network', 'config.enableNetworkMonitoring'],
    run: async ctx => {
      const r = await labFetch(base(ctx), `/echo?a=1&b=two&unicode=${encodeURIComponent('اختبار')}&${q(ctx)}`);
      ctx.expect(r.status === 200, `status ${r.status} ${r.error ?? ''}`);
      return { output: r };
    },
  }),
  t({
    id: 'NET-002',
    category: C,
    name: 'POST JSON body (fetch)',
    description: 'POST /echo with a JSON request body.',
    requires: NET_REQ,
    expectedLocal: 'HTTP 200; body echoed.',
    expectedScaleBun: 'POST /echo 200 with request size; bodies only when captureNetworkBodies=true.',
    dashboardLocation: DASH.network,
    covers: ['config.features.network'],
    run: async ctx => {
      const r = await labFetch(base(ctx), `/echo?${q(ctx)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: 'mug', qty: 2, testRunId: ctx.runId }),
      });
      ctx.expect(r.status === 200, `status ${r.status}`);
      return { output: r };
    },
  }),
  t({
    id: 'NET-003',
    category: C,
    name: 'Redirect chain (302 ×2 → 200)',
    description: 'GET /redirect/2 follows two redirects to /echo.',
    requires: NET_REQ,
    expectedLocal: 'Final status 200; redirected=true.',
    expectedScaleBun: 'Captured as the final 200 (and/or the redirect hops, document which).',
    dashboardLocation: DASH.network,
    covers: ['config.features.network'],
    run: async ctx => {
      const r = await labFetch(base(ctx), `/redirect/2?${q(ctx)}`);
      ctx.expect(r.status === 200, `status ${r.status}`);
      return { output: r };
    },
  }),
  t({
    id: 'NET-004',
    category: C,
    name: 'Error status matrix 400/401/403/404/429/500',
    description: 'One request per status via /status/:code.',
    requires: NET_REQ,
    expectedLocal: 'Each request returns exactly the requested status.',
    expectedScaleBun: '6 failed requests with correct status codes; 5xx/4xx highlighted.',
    dashboardLocation: DASH.network,
    covers: ['config.features.network', 'config.performance.tier1'],
    run: async ctx => {
      const codes = [400, 401, 403, 404, 429, 500];
      const out: Record<number, number> = {};
      for (const c of codes) {
        const r = await labFetch(base(ctx), `/status/${c}?${q(ctx)}`);
        out[c] = r.status;
        ctx.expect(r.status === c, `/status/${c} returned ${r.status}`);
      }
      return { output: out };
    },
  }),
  t({
    id: 'NET-005',
    category: C,
    name: 'Timeout (client abort after 1.5s on a 5s response)',
    description: 'AbortController aborts GET /delay/5000 after 1500 ms.',
    requires: NET_REQ,
    expectedLocal: 'Request fails with AbortError after ~1.5s.',
    expectedScaleBun: 'Network entry marked error/aborted with ~1.5s duration.',
    dashboardLocation: DASH.network,
    covers: ['config.features.network'],
    run: async ctx => {
      const r = await labFetch(base(ctx), `/delay/5000?${q(ctx)}`, { timeoutMs: 1500 });
      ctx.expect(r.status === 0 && r.durationMs < 4000, `expected abort, got ${r.status} in ${r.durationMs}ms`);
      return { output: r };
    },
  }),
  t({
    id: 'NET-006',
    category: C,
    name: 'Cancellation mid-flight',
    description: 'Starts GET /delay/3000 and aborts after 300 ms from outside.',
    requires: NET_REQ,
    expectedLocal: 'AbortError.',
    expectedScaleBun: 'Cancelled request recorded as error (status 0).',
    dashboardLocation: DASH.network,
    covers: ['config.features.network'],
    run: async ctx => {
      const ac = new AbortController();
      const p = labFetch(base(ctx), `/delay/3000?${q(ctx)}`, { signal: ac.signal });
      setTimeout(() => ac.abort(), 300);
      const r = await p;
      ctx.expect(r.status === 0, `expected cancellation, got ${r.status}`);
      return { output: r };
    },
  }),
  t({
    id: 'NET-007',
    category: C,
    name: 'Slow response (3s)',
    description: 'GET /delay/3000 completes normally.',
    requires: NET_REQ,
    expectedLocal: '200 after ≥ 3000 ms.',
    expectedScaleBun: 'Slow request flagged by network performance collector (tier1.network).',
    dashboardLocation: `${DASH.network} / ${DASH.performance}`,
    covers: ['config.performance.tier1'],
    run: async ctx => {
      const r = await labFetch(base(ctx), `/delay/3000?${q(ctx)}`);
      ctx.expect(r.status === 200 && r.durationMs >= 2900, `status ${r.status} in ${r.durationMs}ms`);
      return { output: r };
    },
  }),
  t({
    id: 'NET-008',
    category: C,
    name: '10 concurrent requests',
    description: 'Parallel GET /delay/{100..1000}.',
    requires: NET_REQ,
    expectedLocal: 'All 10 return 200.',
    expectedScaleBun: '10 overlapping entries, none lost.',
    dashboardLocation: DASH.network,
    covers: ['config.features.network'],
    run: async ctx => {
      const rs = await Promise.all(Array.from({ length: 10 }, (_, i) => labFetch(base(ctx), `/delay/${(i + 1) * 100}?${q(ctx)}&i=${i}`)));
      ctx.expect(rs.every(r => r.status === 200), `statuses: ${rs.map(r => r.status).join(',')}`);
      return { output: rs.map(r => ({ s: r.status, ms: r.durationMs })) };
    },
  }),
  t({
    id: 'NET-009',
    category: C,
    name: 'Large response (1 MB)',
    description: 'GET /large/1024 returns ~1 MB JSON.',
    requires: NET_REQ,
    expectedLocal: '200; ≥ 1,000,000 bytes.',
    expectedScaleBun: 'Response size ~1 MB recorded; body truncated per networkBodyMaxBytes when bodies are captured.',
    dashboardLocation: DASH.network,
    covers: ['config.captureNetworkBodies'],
    run: async ctx => {
      const r = await labFetch(base(ctx), `/large/1024?${q(ctx)}`);
      ctx.expect(r.status === 200 && r.bytes >= 1_000_000, `status ${r.status}, ${r.bytes} bytes`);
      return { output: { status: r.status, bytes: r.bytes, ms: r.durationMs } };
    },
  }),
  t({
    id: 'NET-010',
    category: C,
    name: 'DNS / connection failure',
    description: 'GET https://sdk-test-lab.invalid/ (reserved TLD, never resolves).',
    requires: ['sdkInitialized'],
    expectedLocal: 'Network error (status 0), app unaffected.',
    expectedScaleBun: 'Failed request recorded with error message.',
    dashboardLocation: DASH.network,
    covers: ['config.features.network'],
    run: async ctx => {
      const r = await labFetch('https://sdk-test-lab.invalid', `/?${q(ctx)}`, { timeoutMs: 8000 });
      ctx.expect(r.status === 0, `expected failure, got ${r.status}`);
      return { output: r };
    },
  }),
  t({
    id: 'NET-011',
    category: C,
    name: 'Axios (XMLHttpRequest) GET / POST / 500',
    description: 'Same scenarios through axios to exercise the XHR interceptor.',
    requires: NET_REQ,
    expectedLocal: '200, 200, 500.',
    expectedScaleBun: '3 entries captured from XHR identical in shape to fetch entries.',
    dashboardLocation: DASH.network,
    covers: ['config.features.network'],
    run: async ctx => {
      const a = await labAxios(base(ctx), 'get', `/echo?via=axios&${q(ctx)}`);
      const b = await labAxios(base(ctx), 'post', `/echo?via=axios&${q(ctx)}`, { data: { testRunId: ctx.runId } });
      const c = await labAxios(base(ctx), 'get', `/status/500?via=axios&${q(ctx)}`);
      ctx.expect(a.status === 200 && b.status === 200 && c.status === 500, `axios statuses ${a.status}/${b.status}/${c.status}`);
      return { output: { get: a.status, post: b.status, err: c.status } };
    },
  }),
  t({
    id: 'NET-012',
    category: C,
    name: 'Authorization header redaction (transmitted)',
    description: 'Sends a FAKE bearer token to the test server; the raw token must never appear in any SDK upload.',
    requires: NET_REQ,
    expectedLocal: 'Egress observer: 0 needle hits in SDK JS uploads.',
    expectedScaleBun: 'Network entry shows Authorization: [REDACTED] (or no headers). Search the dashboard for FAKE_AUTH_TOKEN_<run> → no results.',
    dashboardLocation: DASH.network,
    covers: ['config.privacy.redactAuth'],
    run: async ctx => {
      const p = fakePii(ctx.runId);
      const res = await withNeedles(ctx, { auth: p.authToken }, async () => {
        await labFetch(base(ctx), `/echo?${q(ctx)}`, { headers: { Authorization: p.authHeader, 'X-Api-Key': p.authToken } });
        await labAxios(base(ctx), 'get', `/echo?${q(ctx)}`, { headers: { Authorization: p.authHeader } });
      });
      ctx.expect(res.hits.auth === 0, `FAKE auth token found in SDK upload(s): ${res.paths.auth.join(', ')}`);
      return { output: res, note: 'Local assertion covers JS upload lanes; confirm in the dashboard too.' };
    },
  }),
  t({
    id: 'NET-013',
    category: C,
    name: 'Cookie / Set-Cookie redaction (transmitted)',
    description: 'Request Cookie header + a response that sets a fake cookie.',
    requires: NET_REQ,
    expectedLocal: '0 needle hits.',
    expectedScaleBun: 'Cookie/Set-Cookie shown as [REDACTED].',
    dashboardLocation: DASH.network,
    covers: ['config.privacy.redactCookies'],
    run: async ctx => {
      const p = fakePii(ctx.runId);
      const res = await withNeedles(ctx, { cookie: p.cookieValue }, async () => {
        await labFetch(base(ctx), `/set-cookie?value=${encodeURIComponent(p.cookieValue)}&${q(ctx)}`, { headers: { Cookie: p.cookie } });
      });
      ctx.expect(res.hits.cookie === 0, `FAKE cookie found in SDK upload(s): ${res.paths.cookie.join(', ')}`);
      return { output: res };
    },
  }),
  t({
    id: 'NET-014',
    category: C,
    name: 'Request/response body redaction (transmitted)',
    description: 'Sensitive keys (password, card_number, access_token) and value patterns (Luhn card, email, JWT) in request and response bodies. Meaningful with profile capture-bodies.',
    requires: NET_REQ,
    expectedLocal: '0 hits for password/token/card/jwt/email needles.',
    expectedScaleBun: 'Captured bodies show [REDACTED] for those fields; unrelated fields intact.',
    dashboardLocation: DASH.network,
    covers: ['config.privacy.redactBodies', 'config.captureNetworkBodies'],
    run: async ctx => {
      const p = fakePii(ctx.runId);
      const res = await withNeedles(
        ctx,
        { password: p.password, jwt: p.jwt, email: p.email, card: p.cardCompact },
        async () => {
          await labFetch(base(ctx), `/echo?${q(ctx)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'sdk_test', password: p.password, card_number: p.cardCompact, note: `contact ${p.email}`, testRunId: ctx.runId }),
          });
          await labFetch(base(ctx), `/login-fake?${q(ctx)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: p.email }) });
        },
      );
      const leaked = Object.entries(res.hits).filter(([, n]) => n > 0);
      ctx.expect(leaked.length === 0, `leaked in SDK uploads: ${leaked.map(([k]) => k).join(', ')}`);
      return { output: { ...res, profile: ctx.profileId } };
    },
  }),
  t({
    id: 'NET-015',
    category: C,
    name: 'URL query token redaction (transmitted)',
    description: 'GET /echo?token=<fake>&api_key=<fake>&page=2',
    requires: NET_REQ,
    expectedLocal: '0 needle hits (SDK redactUrl covers token/api_key/key/secret/password params).',
    expectedScaleBun: 'URL shown as ?token=[REDACTED]&api_key=[REDACTED]&page=2.',
    dashboardLocation: DASH.network,
    covers: ['config.privacy.redactAuth'],
    run: async ctx => {
      const p = fakePii(ctx.runId);
      const res = await withNeedles(ctx, { query: p.apiKeyQuery }, async () => {
        await labFetch(base(ctx), `/echo?token=${p.apiKeyQuery}&api_key=${p.apiKeyQuery}&page=2&${q(ctx)}`);
      });
      ctx.expect(res.hits.query === 0, `query token leaked in: ${res.paths.query.join(', ')}`);
      return { output: res };
    },
  }),
  t({
    id: 'NET-016',
    category: C,
    name: 'Beacon / telemetry requests are excluded',
    description: 'GET /generate_204 is classified as telemetry by the SDK and must leave NO trace in any lane.',
    requires: NET_REQ,
    expectedLocal: 'The unique beacon path segment never appears in SDK uploads.',
    expectedScaleBun: 'No network entry for /beacon-<run>/generate_204.',
    dashboardLocation: DASH.network,
    covers: ['missing.networkUrlExclusion'],
    run: async ctx => {
      const marker = `beacon${ctx.runId.replace(/[^a-z0-9]/gi, '')}`;
      const res = await withNeedles(ctx, { beacon: marker }, async () => {
        await labFetch(base(ctx), `/${marker}/generate_204`);
      });
      ctx.expect(res.hits.beacon === 0, 'beacon request was reported by the SDK');
      return { output: res, note: 'Custom URL deny-lists are NOT configurable in 2.4.0 (see SDK_COVERAGE missing.networkUrlExclusion).' };
    },
  }),
  t({
    id: 'NET-017',
    category: C,
    name: 'redactAuth:false is honoured? (privacy-relaxed)',
    description: 'Profile privacy-relaxed turns redactAuth/redactCookies OFF. Records whether the SDK actually stops redacting (KSI-003).',
    profiles: ['privacy-relaxed'],
    requires: NET_REQ,
    verification: 'MANUAL',
    expectedLocal: 'Records needle hits and getEffectivePrivacyPolicy().',
    expectedScaleBun: 'Per the public PrivacyConfig docs, Authorization should now be visible (FAKE token). SDK 2.4.0 source hard-codes header redaction.',
    dashboardLocation: DASH.network,
    covers: ['config.privacy.redactAuth', 'config.privacy.redactCookies', 'facade.getEffectivePrivacyPolicy'],
    run: async ctx => {
      const p = fakePii(ctx.runId);
      const policy = ctx.sdk.ScaleBun.getEffectivePrivacyPolicy();
      const res = await withNeedles(ctx, { auth: p.authToken }, async () => {
        await labFetch(base(ctx), `/echo?${q(ctx)}`, { headers: { Authorization: p.authHeader } });
      });
      return { output: { policy, hits: res.hits } };
    },
  }),
  t({
    id: 'NET-018',
    category: C,
    name: 'Network feature disabled → nothing captured',
    description: 'Profile no-network: requests must not be reported by the SDK.',
    profiles: ['no-network'],
    requires: NET_REQ,
    expectedLocal: 'The unique request path never appears in SDK uploads.',
    expectedScaleBun: 'No network panel entries for this run.',
    dashboardLocation: DASH.network,
    covers: ['config.features.network'],
    run: async ctx => {
      const marker = `nonet${ctx.runId.replace(/[^a-z0-9]/gi, '')}`;
      const res = await withNeedles(ctx, { path: marker }, async () => {
        await labFetch(base(ctx), `/echo/${marker}`);
      });
      ctx.expect(res.hits.path === 0, 'request reported despite features.network=false');
      return { output: res };
    },
  }),
  t({
    id: 'NET-019',
    category: C,
    name: 'RN URL API capability probe (diagnostic)',
    description: 'The SDK\'s redactUrl relies on new URL(u).searchParams.has/set. Probes that the RN runtime supports it (older RN polyfills threw "not implemented").',
    verification: 'LOCAL_ONLY',
    expectedLocal: 'searchParams.has/set work and toString() reflects the change.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['config.privacy.redactAuth'],
    run: async ctx => {
      const u = new URL('https://example.test/path?token=abc&page=2');
      // RN's lib typings declare a reduced URLSearchParams; probe the runtime.
      const sp = u.searchParams as unknown as { has?: (k: string) => boolean; set?: (k: string, v: string) => void };
      ctx.expect(typeof sp.has === 'function' && typeof sp.set === 'function', 'URLSearchParams.has/set missing at runtime');
      const has = sp.has!('token');
      sp.set!('token', '[REDACTED]');
      const s = u.toString();
      ctx.expect(has && s.includes('REDACTED') && !s.includes('abc'), `URL polyfill cannot redact: ${s}`);
      return { output: { has, result: s } };
    },
  }),
];
