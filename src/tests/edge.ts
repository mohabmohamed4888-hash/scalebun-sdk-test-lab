import { t, DASH, stats } from './helpers';

const C = 'Edge Cases' as const;

type Loose = (...args: unknown[]) => unknown;

export const edgeTests = [
  t({
    id: 'EDGE-001',
    category: C,
    name: 'Rapid synchronous calls (200 in a tight loop)',
    description: 'Simulates frantic tapping: 200 track() calls in one JS tick.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'No throw; < 2s.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.track'],
    run: async ctx => {
      const t0 = Date.now();
      for (let i = 0; i < 200; i++) ctx.sdk.ScaleBun.track('test_rapid_tap', { testRunId: ctx.runId, i });
      const ms = Date.now() - t0;
      ctx.expect(ms < 2000, `took ${ms}ms`);
      return { output: { ms } };
    },
  }),
  t({
    id: 'EDGE-002',
    category: C,
    name: 'Empty / missing properties and empty names',
    description: 'track(name), track(name, {}), track(name, undefined), track("").',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw; empty name dropped or accepted (recorded).',
    expectedScaleBun: 'test_no_props ×3; empty-name behaviour documented.',
    dashboardLocation: DASH.events,
    covers: ['facade.track'],
    run: async ctx => {
      const d0 = stats(ctx)?.dropped ?? 0;
      ctx.sdk.ScaleBun.track('test_no_props');
      ctx.sdk.ScaleBun.track('test_no_props', {});
      ctx.sdk.ScaleBun.track('test_no_props', undefined);
      ctx.sdk.ScaleBun.track('');
      return { output: { droppedDelta: (stats(ctx)?.dropped ?? 0) - d0 } };
    },
  }),
  t({
    id: 'EDGE-003',
    category: C,
    name: 'Very long event name and values',
    description: '1000-char event name, 10 KB string property.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw; dropped delta recorded.',
    expectedScaleBun: 'Name truncated/rejected per backend limits (document).',
    dashboardLocation: DASH.events,
    covers: ['facade.track'],
    run: async ctx => {
      const d0 = stats(ctx)?.dropped ?? 0;
      ctx.sdk.ScaleBun.track('test_long_' + 'x'.repeat(990), ctx.tag());
      ctx.sdk.ScaleBun.track('test_long_value', ctx.tag({ v: 'y'.repeat(10_000) }));
      return { output: { droppedDelta: (stats(ctx)?.dropped ?? 0) - d0 } };
    },
  }),
  t({
    id: 'EDGE-004',
    category: C,
    name: 'Special characters and reserved prefixes',
    description: 'Names with spaces, dots, slashes, quotes, newlines, and a user event starting with "$" (the SDK reserves $-prefixed names for internal signals).',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw.',
    expectedScaleBun: 'Document whether "$sdk_test_dollar" is uploaded (internal-lane routing).',
    dashboardLocation: DASH.events,
    covers: ['facade.track'],
    run: async ctx => {
      for (const n of ['test event with spaces', 'test.dot.name', 'test/slash', 'test "quotes" \'single\'', 'test\nnewline', '$sdk_test_dollar', 'test_<script>']) {
        ctx.sdk.ScaleBun.track(n, ctx.tag());
      }
      return {};
    },
  }),
  t({
    id: 'EDGE-005',
    category: C,
    name: 'Large but reasonable metadata (~50 KB)',
    description: '500-key object property.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw; UI responsive.',
    expectedScaleBun: 'Event present or dropped with stats().dropped++ (document limit).',
    dashboardLocation: DASH.events,
    covers: ['facade.track'],
    run: async ctx => {
      const big: Record<string, string> = {};
      for (let i = 0; i < 500; i++) big[`k${i}`] = 'v'.repeat(100);
      const d0 = stats(ctx)?.dropped ?? 0;
      ctx.sdk.ScaleBun.track('test_large_metadata', ctx.tag({ big }));
      return { output: { droppedDelta: (stats(ctx)?.dropped ?? 0) - d0 } };
    },
  }),
  t({
    id: 'EDGE-006',
    category: C,
    name: 'Malformed input TypeScript would forbid',
    description: 'Calls every major API with null/undefined/wrong types at runtime (cast through unknown).',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'NO call throws (the SDK promises never-throw); each result recorded.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.track', 'facade.identify', 'facade.captureError', 'facade.trackPurchase', 'facade.log', 'facade.setAttribute', 'facade.setUser'],
    run: async ctx => {
      const S = ctx.sdk.ScaleBun as unknown as Record<string, Loose>;
      const calls: Array<[string, () => unknown]> = [
        ['track(null)', () => S.track.call(ctx.sdk.ScaleBun, null)],
        ['track(123, "x")', () => S.track.call(ctx.sdk.ScaleBun, 123, 'x')],
        ['identify(undefined)', () => S.identify.call(ctx.sdk.ScaleBun, undefined)],
        ['identify({})', () => S.identify.call(ctx.sdk.ScaleBun, {})],
        ['captureError(undefined)', () => S.captureError.call(ctx.sdk.ScaleBun, undefined)],
        ['captureError({ message })', () => S.captureError.call(ctx.sdk.ScaleBun, { message: 'plain object' })],
        ['trackPurchase({})', () => S.trackPurchase.call(ctx.sdk.ScaleBun, {})],
        ['trackPurchase(null)', () => S.trackPurchase.call(ctx.sdk.ScaleBun, null)],
        ['log("bogus", 42)', () => S.log.call(ctx.sdk.ScaleBun, 'bogus', 42)],
        ['setAttribute("k", {obj})', () => S.setAttribute.call(ctx.sdk.ScaleBun, 'k', { obj: true })],
        ['setUser(null)', () => S.setUser.call(ctx.sdk.ScaleBun, null)],
        ['trackPermission(null, "x")', () => S.trackPermission.call(ctx.sdk.ScaleBun, null, 'x')],
        ['setUiState(undefined, undefined)', () => S.setUiState.call(ctx.sdk.ScaleBun, undefined, undefined)],
      ];
      const results: Record<string, string> = {};
      const threw: string[] = [];
      for (const [label, fn] of calls) {
        try {
          const r = fn();
          if (r && typeof (r as Promise<unknown>).then === 'function') await (r as Promise<unknown>);
          results[label] = 'ok';
        } catch (e) {
          results[label] = `THREW: ${e instanceof Error ? e.message : String(e)}`;
          threw.push(label);
        }
      }
      ctx.sdk.ScaleBun.clearUser();
      ctx.expect(threw.length === 0, `SDK threw for: ${threw.join('; ')}`);
      return { output: results };
    },
  }),
  t({
    id: 'EDGE-007',
    category: C,
    name: 'Non-JSON-serializable values',
    description: 'Properties with BigInt, function, Symbol, NaN, Infinity, Date, circular refs, Map/Set.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'No throw (BigInt breaks naive JSON.stringify).',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.track'],
    run: async ctx => {
      const circ: Record<string, unknown> = {};
      circ.self = circ;
      const weird: Record<string, unknown> = {
        big: BigInt(9007199254740993),
        fn: () => 1,
        sym: Symbol('s'),
        nan: NaN,
        inf: Infinity,
        date: new Date(0),
        circ,
        map: new Map([['a', 1]]),
        set: new Set([1]),
      };
      const outcomes: Record<string, string> = {};
      for (const [k, v] of Object.entries(weird)) {
        try {
          ctx.sdk.ScaleBun.track('test_weird_value', { testRunId: ctx.runId, kind: k, v });
          outcomes[k] = 'ok';
        } catch (e) {
          outcomes[k] = `THREW: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
      try {
        await ctx.sdk.ScaleBun.flush();
        outcomes.flush = 'ok';
      } catch (e) {
        outcomes.flush = `THREW: ${e instanceof Error ? e.message : String(e)}`;
      }
      const threw = Object.entries(outcomes).filter(([, v]) => v.startsWith('THREW'));
      ctx.expect(threw.length === 0, `threw for ${threw.map(([k]) => k).join(', ')}`);
      return { output: outcomes };
    },
  }),
  t({
    id: 'EDGE-008',
    category: C,
    name: 'Concurrent flush() calls',
    description: '10 overlapping flush() + events.flush() calls.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'All resolve; no duplicate uploads storm (≤ a handful of SDK requests).',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.flush', 'facade.events.flush'],
    run: async ctx => {
      ctx.sdk.ScaleBun.track('test_concurrent_flush', ctx.tag());
      const mark = ctx.egress.mark();
      await Promise.all(Array.from({ length: 10 }, () => Promise.all([ctx.sdk.ScaleBun.flush(), ctx.sdk.ScaleBun.events.flush()])));
      await ctx.sleep(1500);
      const s = ctx.egress.sdkSummary(mark);
      return { output: s };
    },
  }),
  t({
    id: 'EDGE-009',
    category: C,
    name: 'Calls while backgrounded',
    description: 'Schedules track() + captureError() + flush every 2s for 20s; background the app during that window.',
    interactive: true,
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'No crash; calls made while backgrounded are queued.',
    expectedScaleBun: 'All 10 test_background_tick events eventually arrive.',
    dashboardLocation: DASH.events,
    covers: ['facade.track', 'facade.flush'],
    timeoutMs: 30000,
    run: async ctx => {
      for (let i = 1; i <= 10; i++) {
        ctx.sdk.ScaleBun.track('test_background_tick', ctx.tag({ i }));
        if (i === 5) ctx.sdk.ScaleBun.captureError(new Error(`SdkTestBackgroundError ${ctx.runId}`));
        await ctx.sdk.ScaleBun.flush();
        await ctx.sleep(2000);
      }
      return {};
    },
  }),
  t({
    id: 'EDGE-010',
    category: C,
    name: 'Calls right after a JS reload',
    description: 'Tap "Reload JS" on the Config screen; the app issues track() within the first frame after init (bootLog).',
    interactive: true,
    verification: 'MANUAL',
    expectedLocal: 'Boot probe event emitted without error on every boot.',
    expectedScaleBun: 'test_boot_probe for each boot (bootCount).',
    dashboardLocation: DASH.events,
    covers: ['facade.track', 'facade.init'],
    run: async () => ({ note: 'The app emits test_boot_probe immediately after init on every launch.' }),
  }),
];
