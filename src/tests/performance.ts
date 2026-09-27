import { t, DASH, featureDisabled } from './helpers';
import { labFetch } from '../services/networkClient';

const C = 'Performance' as const;

/** Busy-wait the JS thread. Only ever called from explicitly-labelled stall tests. */
export function blockJsThread(ms: number): number {
  const end = Date.now() + ms;
  let spins = 0;
  while (Date.now() < end) spins++;
  return spins;
}

export const performanceTests = [
  t({
    id: 'PERF-001',
    category: C,
    name: 'Performance monitoring active',
    description: 'performance.isActive() under the current profile.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'true unless the profile disables performance.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.performance.isActive', 'config.performance.enabled'],
    run: async ctx => {
      const active = ctx.sdk.ScaleBun.performance.isActive();
      const expected = !featureDisabled(ctx, 'performance');
      ctx.expect(active === expected, `isActive=${active}, expected ${expected}`);
      return { output: { active } };
    },
  }),
  t({
    id: 'PERF-002',
    category: C,
    name: 'Custom trace checkout_test with spans & measurement',
    description: 'startTrace → spans cart_validation / fake_api_call / render → measurement item_count → stopTrace in finally.',
    requires: ['sdkInitialized', 'networkServer'],
    expectedLocal: 'startTrace returns a traceId; trace always stopped.',
    expectedScaleBun: 'Trace checkout_test with 3 spans and item_count=3.',
    dashboardLocation: DASH.performance,
    covers: ['facade.performance.startTrace', 'facade.performance.addTraceSpan', 'facade.performance.addTraceMeasurement', 'facade.performance.stopTrace'],
    run: async ctx => {
      const P = ctx.sdk.ScaleBun.performance;
      const traceId = P.startTrace('checkout_test');
      ctx.expect(traceId, 'startTrace returned null (performance inactive?)');
      try {
        let t0 = Date.now();
        await ctx.sleep(40);
        P.addTraceSpan(traceId!, 'cart_validation', Date.now() - t0, ctx.tag({ items: 3 }));
        t0 = Date.now();
        const r = await labFetch(ctx.env.networkServerUrl!, `/delay/250?testRunId=${ctx.runId}`);
        P.addTraceSpan(traceId!, 'fake_api_call', Date.now() - t0, { status: r.status });
        t0 = Date.now();
        await ctx.sleep(16);
        P.addTraceSpan(traceId!, 'render', Date.now() - t0);
        P.addTraceMeasurement(traceId!, 'item_count', 3, 'count');
      } finally {
        if (traceId) P.stopTrace(traceId);
      }
      return { output: { traceId } };
    },
  }),
  t({
    id: 'PERF-003',
    category: C,
    name: 'Trace misuse is safe',
    description: 'stopTrace twice, stopTrace unknown id, span on a stopped trace, empty trace name.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'No throw.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.performance.stopTrace', 'facade.performance.startTrace'],
    run: async ctx => {
      const P = ctx.sdk.ScaleBun.performance;
      const id = P.startTrace('trace_misuse_test');
      if (id) {
        P.stopTrace(id);
        P.stopTrace(id);
        P.addTraceSpan(id, 'late_span', 5);
      }
      P.stopTrace('does-not-exist');
      const empty = P.startTrace('');
      if (empty) P.stopTrace(empty);
      return { output: { id, empty } };
    },
  }),
  t({
    id: 'PERF-004',
    category: C,
    name: 'Manual screen load markers',
    description: 'markScreenLoadStart/End around a simulated 350ms screen load.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw.',
    expectedScaleBun: 'Screen load sdk_test_manual_screen ≈ 350 ms.',
    dashboardLocation: `${DASH.performance} → Screens`,
    covers: ['facade.performance.markScreenLoadStart', 'facade.performance.markScreenLoadEnd'],
    run: async ctx => {
      const P = ctx.sdk.ScaleBun.performance;
      P.markScreenLoadStart('sdk_test_manual_screen');
      await ctx.sleep(350);
      P.markScreenLoadEnd('sdk_test_manual_screen');
      return {};
    },
  }),
  t({
    id: 'PERF-005',
    category: C,
    name: 'setCurrentScreen & onNavigationStateChange',
    description: 'Manual screen context + forwarding a synthetic navigation state.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw.',
    expectedScaleBun: 'Metrics after the call are attributed to sdk_test_perf_context.',
    dashboardLocation: DASH.performance,
    covers: ['facade.performance.setCurrentScreen', 'facade.performance.onNavigationStateChange'],
    run: async ctx => {
      const P = ctx.sdk.ScaleBun.performance;
      P.setCurrentScreen('sdk_test_perf_context');
      P.onNavigationStateChange({ index: 0, routes: [{ name: 'sdk_test_perf_context', key: 'k1' }] });
      P.sendMetric('sdk_test_after_context', 1, 'count', { testRunId: ctx.runId });
      return {};
    },
  }),
  t({
    id: 'PERF-006',
    category: C,
    name: 'Raw metrics (performance.sendMetric / debug.sendMetric)',
    description: 'Manual metrics through both channels.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw (debug.sendMetric is a no-op without desktop debug).',
    expectedScaleBun: 'Metric sdk_test_metric_ms=123 tagged with testRunId.',
    dashboardLocation: DASH.performance,
    covers: ['facade.performance.sendMetric', 'facade.debug.sendMetric'],
    run: async ctx => {
      ctx.sdk.ScaleBun.performance.sendMetric('sdk_test_metric_ms', 123, 'ms', { testRunId: ctx.runId });
      ctx.sdk.ScaleBun.debug.sendMetric('sdk_test_debug_metric', 1, 'count', { testRunId: ctx.runId });
      return {};
    },
  }),
  t({
    id: 'PERF-007',
    category: C,
    name: 'App launch timing',
    description: 'Cold-start the app (force-stop then open) and check the app_launch metric.',
    interactive: true,
    verification: 'MANUAL',
    expectedLocal: 'n/a',
    expectedScaleBun: 'App start (cold) metric for this installation.',
    dashboardLocation: `${DASH.performance} → App start`,
    covers: ['config.performance.tier1'],
    run: async () => ({ note: 'Force-stop the app, relaunch, wait 10s.' }),
  }),
  t({
    id: 'PERF-008',
    category: C,
    name: 'Controlled JS stall (700 ms)',
    description: 'Blocks the JS thread for 700 ms — short and safe — so js_stall / frame collectors can fire.',
    risk: 'MEDIUM',
    requires: ['sdkInitialized'],
    expectedLocal: 'UI freezes ~0.7s then recovers.',
    expectedScaleBun: 'js_stall ≈ 700 ms (tier-2 is sampled: use profile perf-full-sampling for determinism).',
    dashboardLocation: DASH.performance,
    covers: ['config.performance.tier2'],
    run: async ctx => {
      ctx.sdk.ScaleBun.performance.setCurrentScreen('sdk_test_stall_screen');
      const spins = blockJsThread(700);
      return { output: { blockedMs: 700, spins } };
    },
  }),
  t({
    id: 'PERF-009',
    category: C,
    name: 'LONG JS stall (4 s) — dangerous',
    description: 'Blocks the JS thread for 4 seconds. The app is unresponsive meanwhile.',
    risk: 'HIGH',
    dangerous: true,
    requires: ['sdkInitialized'],
    expectedLocal: 'UI frozen 4s, then recovers.',
    expectedScaleBun: 'js_stall ≈ 4000 ms. NOTE: a JS-thread stall is not a main-thread ANR; the native ANR watchdog is not exercised from JS.',
    dashboardLocation: DASH.performance,
    covers: ['config.performance.tier2', 'native.anrWatchdog'],
    run: async () => ({ output: { spins: blockJsThread(4000) } }),
  }),
  t({
    id: 'PERF-010',
    category: C,
    name: 'Performance / profiler feature handles (diagnostic)',
    description: 'getPerformanceFeature() / getProfilerFeature() from the debug bootstrap.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'Reports whether each handle is present (profiler requires devTools + desktop debug).',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['export.getPerformanceFeature', 'export.getProfilerFeature'],
    run: async ctx => {
      const perf = ctx.sdk.getPerformanceFeature();
      const prof = ctx.sdk.getProfilerFeature();
      return { output: { performanceFeature: perf ? 'present' : 'null', profilerFeature: prof ? 'present' : 'null' } };
    },
  }),
  t({
    id: 'PERF-011',
    category: C,
    name: 'Performance disabled → inert',
    description: 'Profile no-performance: isActive false and startTrace returns null.',
    profiles: ['no-performance'],
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'isActive()=false; startTrace()=null.',
    expectedScaleBun: 'No performance data for this session.',
    dashboardLocation: DASH.performance,
    covers: ['config.features.performance', 'facade.performance.isActive'],
    run: async ctx => {
      const P = ctx.sdk.ScaleBun.performance;
      const id = P.startTrace('should_not_exist');
      ctx.expect(!P.isActive(), 'performance active despite features.performance=false');
      ctx.expect(id === null, 'startTrace returned an id');
      return {};
    },
  }),
  t({
    id: 'PERF-012',
    category: C,
    name: 'Automatic screen load timing',
    description: 'Navigates to the heavy "Performance" screen (renders 300 rows).',
    requires: ['sdkInitialized'],
    expectedLocal: 'Navigation works.',
    expectedScaleBun: 'Automatic screen_load for Performance (tier1.screenLoad).',
    dashboardLocation: `${DASH.performance} → Screens`,
    covers: ['config.performance.tier1'],
    run: async ctx => {
      ctx.navigate('Performance', { heavy: true });
      await ctx.sleep(1500);
      ctx.navigate('Home');
      return {};
    },
  }),
];
