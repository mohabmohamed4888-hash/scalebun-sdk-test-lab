import { t, DASH, ids, stats } from './helpers';

const C = 'Diagnostics' as const;

export const diagnosticsTests = [
  t({
    id: 'DIAG-001',
    category: C,
    name: 'Debug subsystem without a desktop debugger',
    description: 'DIAGNOSTIC-ONLY. debug.isEnabled / ping; enableDebug(unreachable host) → disableDebug. The desktop debugger is a future product per SDK docs.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'No throw; isEnabled reflects enable/disable; app unaffected when nothing listens on the socket.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.debug.isEnabled', 'facade.debug.ping', 'facade.enableDebug', 'facade.disableDebug'],
    run: async ctx => {
      const S = ctx.sdk.ScaleBun;
      const before = S.debug.isEnabled();
      S.debug.ping();
      S.enableDebug({ host: '127.0.0.1', port: 9, appName: 'SDK Test Lab (diag)' });
      await ctx.sleep(500);
      const during = S.debug.isEnabled();
      S.debug.ping();
      S.disableDebug();
      const after = S.debug.isEnabled();
      return { output: { before, during, after } };
    },
  }),
  t({
    id: 'DIAG-002',
    category: C,
    name: 'Desktop debugger connection (profile desktop-debug)',
    description: 'DIAGNOSTIC-ONLY. init({ desktopDebug }) to SCALEBUN_DESKTOP_DEBUG_HOST:9333. Requires the ScaleBun desktop app (not generally available) and a devTools bundle.',
    profiles: ['desktop-debug'],
    requires: ['sdkInitialized', 'devTools'],
    verification: 'MANUAL',
    expectedLocal: 'debug.isEnabled() true; getDebugTransport() non-null.',
    expectedScaleBun: 'Desktop app lists the device.',
    dashboardLocation: 'ScaleBun Desktop → Devices',
    covers: ['config.desktopDebug', 'config.debug', 'export.getDebugTransport'],
    run: async ctx => ({ output: { enabled: ctx.sdk.ScaleBun.debug.isEnabled(), transport: ctx.sdk.getDebugTransport() ? 'present' : null } }),
  }),
  t({
    id: 'DIAG-003',
    category: C,
    name: 'getDebugTransport / report.export without desktop',
    description: 'DIAGNOSTIC-ONLY. Transport handle and report export must fail gracefully without a desktop connection.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'report.export resolves { success:false, error } (never throws/hangs).',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['export.getDebugTransport', 'facade.report.export'],
    run: async ctx => {
      const transport = ctx.sdk.getDebugTransport();
      const res = await Promise.race([
        ctx.sdk.ScaleBun.report.export('qa'),
        new Promise<{ success: false; error: string }>(r => setTimeout(() => r({ success: false, error: 'TEST_LAB_TIMEOUT_5S' }), 5000)),
      ]);
      ctx.expect(res.success === false, 'export succeeded without a desktop connection?');
      ctx.expect(res.error !== 'TEST_LAB_TIMEOUT_5S', 'report.export hung for 5s without a desktop connection');
      return { output: { transport: transport ? 'present' : null, exportResult: res } };
    },
  }),
  t({
    id: 'DIAG-004',
    category: C,
    name: 'Calibration target + tap',
    description: 'DIAGNOSTIC-ONLY. setCalibrationTarget before a programmatic tap on the Diagnostics screen calibration button.',
    requires: ['sdkInitialized'],
    interactive: true,
    verification: 'MANUAL',
    expectedLocal: 'No throw.',
    expectedScaleBun: 'Gesture payload carries expectedTargetId sdk_test_calibration.',
    dashboardLocation: `${DASH.sessions} (gesture diagnostics)`,
    covers: ['facade.setCalibrationTarget'],
    run: async ctx => {
      ctx.navigate('Diagnostics');
      ctx.sdk.ScaleBun.setCalibrationTarget({ targetId: 'sdk_test_calibration', expectedNX: 0.5, expectedNY: 0.5 });
      return { note: 'Tap the centred "Calibration target" button within 500ms of pressing its own arm button.' };
    },
  }),
  t({
    id: 'DIAG-005',
    category: C,
    name: 'IDs & queue stats',
    description: 'events.ids() and events.stats() snapshot.',
    requires: ['sdkInitialized', 'appId'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'installationId/anonymousId/sessionId non-empty; stats { pending, dropped } numbers.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.events.ids', 'facade.events.stats'],
    run: async ctx => {
      const i = ids(ctx);
      const s = stats(ctx);
      ctx.expect(i && i.installationId && i.anonymousId && i.sessionId, 'incomplete ids');
      ctx.expect(s && typeof s.pending === 'number' && typeof s.dropped === 'number', 'bad stats');
      return { output: { ids: i, stats: s } };
    },
  }),
  t({
    id: 'DIAG-006',
    category: C,
    name: 'Remote config, flags, rollouts, experiments',
    description: 'config.get with fallback, config.refresh(), flags.isEnabled, rollouts.isOn, experiments.variant for sdk_test_* keys.',
    requires: ['sdkInitialized', 'clientKey'],
    expectedLocal: 'Unknown keys return fallback/false/null; refresh resolves.',
    expectedScaleBun: 'Create sdk_test_flag / sdk_test_rollout / sdk_test_experiment / sdk_test_config_max_items in the dashboard; re-run to see non-default values.',
    dashboardLocation: DASH.config,
    covers: ['facade.config.get', 'facade.config.refresh', 'facade.flags.isEnabled', 'facade.rollouts.isOn', 'facade.experiments.variant'],
    run: async ctx => {
      const S = ctx.sdk.ScaleBun;
      const fallback = S.config.get('sdk_test_nonexistent_' + ctx.runId, 'fallback');
      ctx.expect(fallback === 'fallback', 'fallback not returned for unknown key');
      await S.config.refresh();
      return {
        output: {
          maxItems: S.config.get('sdk_test_config_max_items', 10),
          flag: S.flags.isEnabled('sdk_test_flag'),
          rollout: S.rollouts.isOn('sdk_test_rollout'),
          variant: S.experiments.variant('sdk_test_experiment'),
          unknownFlag: S.flags.isEnabled('sdk_test_nonexistent_flag'),
        },
      };
    },
  }),
  t({
    id: 'DIAG-007',
    category: C,
    name: 'devTools-excluded bundle degrades gracefully',
    description: 'Build with SCALEBUN_DEVTOOLS=0 (production-shaped bundle); diagnostics APIs must not crash.',
    interactive: true,
    verification: 'MANUAL',
    expectedLocal: 'DIAG-001/003 still pass; getProfilerFeature() null.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['metro.withScaleBun'],
    run: async ctx => ({ output: { profiler: ctx.sdk.getProfilerFeature() ? 'present' : null } }),
  }),
];
