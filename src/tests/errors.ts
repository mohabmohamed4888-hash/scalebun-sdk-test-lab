import { t, DASH } from './helpers';
import { writeJson, KEYS } from '../services/persistence';
import { getLabState } from '../scalebun/labState';

const C = 'Logs, Errors & Bugs' as const;

export const errorTests = [
  t({
    id: 'ERR-001',
    category: C,
    name: 'All log levels',
    description: 'ScaleBun.log at debug, info, warn and error with structured data.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw.',
    expectedScaleBun: '4 log lines (source sdk) tagged with testRunId; also $log analytics events.',
    dashboardLocation: DASH.logs,
    covers: ['facade.log'],
    run: async ctx => {
      for (const level of ['debug', 'info', 'warn', 'error'] as const) {
        ctx.sdk.ScaleBun.log(level, `sdk_test_log_${level} ${ctx.runId}`, ctx.tag({ level }));
      }
      await ctx.sdk.ScaleBun.flush();
      return {};
    },
  }),
  t({
    id: 'ERR-002',
    category: C,
    name: 'Handled Error with context',
    description: 'captureError(new Error) with screenName, type and metadata.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw.',
    expectedScaleBun: 'Handled error "SdkTestHandledError <run>" with screen ErrorsScreen and metadata.testRunId; stack symbolicated in release builds with uploaded sourcemaps.',
    dashboardLocation: DASH.crashes,
    covers: ['facade.captureError'],
    run: async ctx => {
      const err = new Error(`SdkTestHandledError ${ctx.runId}`);
      err.name = 'SdkTestHandledError';
      ctx.sdk.ScaleBun.captureError(err, { screenName: 'ErrorsScreen', type: 'handled_test', metadata: ctx.tag({ orderId: 'order_test_1' }) });
      await ctx.sdk.ScaleBun.flush();
      return {};
    },
  }),
  t({
    id: 'ERR-003',
    category: C,
    name: 'Handled string error',
    description: 'captureError("string") — supported by the signature Error | string.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw.',
    expectedScaleBun: 'Error with message "sdk_test_string_error <run>".',
    dashboardLocation: DASH.crashes,
    covers: ['facade.captureError'],
    run: async ctx => {
      ctx.sdk.ScaleBun.captureError(`sdk_test_string_error ${ctx.runId}`, { metadata: ctx.tag() });
      return {};
    },
  }),
  t({
    id: 'ERR-004',
    category: C,
    name: 'Handled error flagged fatal',
    description: 'captureError(err, { fatal: true }) without crashing the app.',
    requires: ['sdkInitialized'],
    expectedLocal: 'App keeps running.',
    expectedScaleBun: 'Error marked fatal=true (and how the dashboard classifies a handled-fatal).',
    dashboardLocation: DASH.crashes,
    covers: ['facade.captureError'],
    run: async ctx => {
      ctx.sdk.ScaleBun.captureError(new Error(`SdkTestFatalFlag ${ctx.runId}`), { fatal: true, metadata: ctx.tag() });
      return {};
    },
  }),
  t({
    id: 'ERR-005',
    category: C,
    name: 'captureException / captureMessage exports',
    description: 'Sentry-style named exports routed through the crash pipeline.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw.',
    expectedScaleBun: 'Exception "SdkTestCaptureException" and message "sdk_test_capture_message".',
    dashboardLocation: DASH.crashes,
    covers: ['export.captureException', 'export.captureMessage'],
    run: async ctx => {
      ctx.sdk.captureException(new Error(`SdkTestCaptureException ${ctx.runId}`), { screenName: 'Errors', metadata: ctx.tag() });
      ctx.sdk.captureMessage(`sdk_test_capture_message ${ctx.runId}`, { metadata: ctx.tag() });
      return {};
    },
  }),
  t({
    id: 'ERR-006',
    category: C,
    name: 'Errors from different screens',
    description: 'Navigates to 3 screens and captures an error on each.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw.',
    expectedScaleBun: '3 errors, each attributed to its screen (Analytics / Network / Performance).',
    dashboardLocation: DASH.crashes,
    covers: ['facade.captureError'],
    run: async ctx => {
      for (const s of ['Analytics', 'Network', 'Performance']) {
        ctx.navigate(s);
        await ctx.sleep(600);
        ctx.sdk.ScaleBun.captureError(new Error(`SdkTestScreenError@${s} ${ctx.runId}`), { metadata: ctx.tag({ screen: s }) });
      }
      ctx.navigate('Home');
      return {};
    },
  }),
  t({
    id: 'ERR-007',
    category: C,
    name: 'React render error caught by ScaleBunErrorBoundary',
    description: 'Arms the boundary probe so a child throws during render; the SDK boundary must capture, call onError and render the fallback.',
    requires: ['sdkInitialized', 'bridge'],
    expectedLocal: 'Boundary onError fired with the probe message; fallback rendered.',
    expectedScaleBun: 'Render error "SdkTestRenderError" with screenName ErrorBoundaryProbe and component stack.',
    dashboardLocation: DASH.crashes,
    covers: ['export.ScaleBunErrorBoundary', 'errorBoundary.onError', 'errorBoundary.fallback', 'errorBoundary.screenName'],
    run: async ctx => {
      ctx.expect(ctx.bridge.triggerBoundaryError, 'boundary probe not mounted');
      const msg = `SdkTestRenderError ${ctx.runId}`;
      const waiter = ctx.bridge.boundaryLog.waitFor(e => e.kind === 'onError' && String((e.detail as { message?: string }).message).includes(ctx.runId), 5000);
      ctx.bridge.triggerBoundaryError!(msg);
      const hit = await waiter;
      ctx.expect(hit, 'ScaleBunErrorBoundary.onError was not called within 5s');
      const fallback = await ctx.bridge.boundaryLog.waitFor(e => e.kind === 'fallbackRendered', 2000);
      return { output: { onError: hit?.detail, fallbackRendered: !!fallback } };
    },
  }),
  t({
    id: 'ERR-008',
    category: C,
    name: 'Unhandled promise rejection',
    description: 'Creates an unhandled rejected promise (no crash; RN only warns).',
    risk: 'MEDIUM',
    requires: ['sdkInitialized'],
    expectedLocal: 'App keeps running (dev builds may show a LogBox warning).',
    expectedScaleBun: 'Rejection "SdkTestUnhandledRejection" captured by the SDK rejection handler — or documented as not captured.',
    dashboardLocation: DASH.crashes,
    covers: ['facade.captureError'],
    run: async ctx => {
      // Intentionally unhandled.
      Promise.reject(new Error(`SdkTestUnhandledRejection ${ctx.runId}`));
      await ctx.sleep(1500);
      return { note: 'Check whether the SDK reported the rejection (Hermes rejection tracking).' };
    },
  }),
  t({
    id: 'ERR-009',
    category: C,
    name: 'Uncaught JS exception (global handler)',
    description: 'Throws from a timer callback. In RELEASE builds this is fatal and terminates the app; in debug it shows a RedBox.',
    risk: 'HIGH',
    dangerous: true,
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'App terminates (release) or RedBox (debug).',
    expectedScaleBun: 'Fatal JS crash "SdkTestUncaught" delivered on this or next launch.',
    dashboardLocation: DASH.crashes,
    covers: ['facade.captureError'],
    run: async ctx => {
      await writeJson(KEYS.crashMarker, { armedAt: new Date().toISOString(), runId: ctx.runId, kind: 'js-uncaught' });
      setTimeout(() => {
        throw new Error(`SdkTestUncaught ${ctx.runId}`);
      }, 300);
      return { note: 'After relaunch, run ERR-013 to record the drain check.' };
    },
  }),
  t({
    id: 'ERR-010',
    category: C,
    name: 'reportBug (legacy convenience)',
    description: 'reportBug(description, metadata). Per SDK source this emits an analytics event rather than a Bug Report row.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw.',
    expectedScaleBun: 'Event/bug entry "sdk_test_legacy_bug <run>" — record where it lands.',
    dashboardLocation: `${DASH.bugReports} or ${DASH.events}`,
    covers: ['facade.reportBug'],
    run: async ctx => {
      ctx.sdk.ScaleBun.reportBug(`sdk_test_legacy_bug ${ctx.runId}`, ctx.tag({ severity: 'low' }));
      return {};
    },
  }),
  t({
    id: 'ERR-011',
    category: C,
    name: 'reportBugDetailed returns a report id',
    description: 'Submits a detailed bug report against the current session (fake reporter email on example.test).',
    requires: ['sdkInitialized', 'clientKey', 'online'],
    expectedLocal: 'Resolves to a string report id (not { e }).',
    expectedScaleBun: 'Bug report with title "SDK Test Lab bug <run>" linked to the current session.',
    dashboardLocation: DASH.bugReports,
    covers: ['facade.reportBugDetailed'],
    run: async ctx => {
      const res = await ctx.sdk.ScaleBun.reportBugDetailed({
        title: `SDK Test Lab bug ${ctx.runId}`,
        message: `Automated bug report from ${ctx.testId}. Steps: open Errors screen → tap Report Bug. testRunId=${ctx.runId}`,
        email: 'qa.reporter@example.test',
        clientReportId: `sdk_test_bug_${ctx.runId}`,
      });
      ctx.expect(typeof res === 'string', `expected report id, got ${JSON.stringify(res)}`);
      return { output: { reportId: res } };
    },
  }),
  t({
    id: 'ERR-012',
    category: C,
    name: 'NATIVE CRASH (official test-only API)',
    description: 'Calls ScaleBun.nativeCrash(). The process terminates immediately. Relaunch, then run ERR-013.',
    risk: 'DESTRUCTIVE',
    dangerous: true,
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'App terminates.',
    expectedScaleBun: 'Native crash with signal/exception info appears after the NEXT launch drains it.',
    dashboardLocation: DASH.crashes,
    covers: ['facade.nativeCrash', 'native.crashDrain'],
    run: async ctx => {
      await writeJson(KEYS.crashMarker, { armedAt: new Date().toISOString(), runId: ctx.runId, kind: 'native' });
      ctx.sdk.ScaleBun.track('test_native_crash_armed', ctx.tag());
      await ctx.sdk.ScaleBun.flush();
      await ctx.sleep(500);
      await ctx.sdk.ScaleBun.nativeCrash();
      return { kind: 'FAIL', note: 'nativeCrash() returned — the native crash module is unavailable in this build.' };
    },
  }),
  t({
    id: 'ERR-013',
    category: C,
    name: 'Post-crash drain check (after relaunch)',
    description: 'Reads the crash marker written before ERR-009/ERR-012 and flushes so the drained crash uploads.',
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'Crash marker from the previous process is present.',
    expectedScaleBun: 'The previous crash is listed (same installation) within a few minutes.',
    dashboardLocation: DASH.crashes,
    covers: ['native.crashDrain'],
    run: async ctx => {
      const marker = getLabState().pendingCrashMarker;
      ctx.expect(marker, 'no crash marker — run ERR-012 (native) or ERR-009 (JS) first');
      ctx.sdk.ScaleBun.track('test_crash_relaunch', ctx.tag({ crashedRunId: marker!.runId }));
      await ctx.sdk.ScaleBun.flush();
      await writeJson(KEYS.crashMarker, null);
      return { output: marker, note: `Look for the crash from run ${marker!.runId} in Crashes.` };
    },
  }),
  t({
    id: 'ERR-014',
    category: C,
    name: 'Breadcrumbs before an error',
    description: 'debug.addBreadcrumb + replay.addBreadcrumb, then a handled error.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw (debug breadcrumbs are no-ops without a desktop debugger).',
    expectedScaleBun: 'The error shows the replay breadcrumb trail (navigation → user → custom).',
    dashboardLocation: `${DASH.crashes} → breadcrumbs / ${DASH.replay}`,
    covers: ['facade.debug.addBreadcrumb', 'facade.replay.addBreadcrumb'],
    run: async ctx => {
      ctx.sdk.ScaleBun.debug.addBreadcrumb('sdk_test debug breadcrumb', ctx.tag());
      for (const [category, level] of [
        ['navigation', 'info'],
        ['user', 'info'],
        ['custom', 'warning'],
      ] as const) {
        await ctx.sdk.ScaleBun.replay.addBreadcrumb({ category, level, message: `sdk_test_${category}_crumb ${ctx.runId}`, data: ctx.tag() });
      }
      ctx.sdk.ScaleBun.captureError(new Error(`SdkTestAfterBreadcrumbs ${ctx.runId}`), { metadata: ctx.tag() });
      return {};
    },
  }),
  t({
    id: 'ERR-015',
    category: C,
    name: 'Console log capture',
    description: 'Profile console-capture: console.log/warn/error lines must reach the Logs lane.',
    profiles: ['console-capture'],
    requires: ['sdkInitialized', 'clientKey'],
    expectedLocal: 'No throw.',
    expectedScaleBun: '3 console log lines containing the run token.',
    dashboardLocation: DASH.logs,
    covers: ['config.captureConsoleLogs'],
    run: async ctx => {
      console.log(`sdk_test_console_log ${ctx.runId}`);
      console.warn(`sdk_test_console_warn ${ctx.runId}`);
      console.error(`sdk_test_console_error ${ctx.runId}`);
      await ctx.sdk.ScaleBun.flush();
      return {};
    },
  }),
  t({
    id: 'ERR-016',
    category: C,
    name: 'Symbolication requirements',
    description: 'Release-build JS errors need the matching sourcemap uploaded; see DASHBOARD_VERIFICATION.md §Symbolication.',
    verification: 'MANUAL',
    expectedLocal: 'n/a',
    expectedScaleBun: 'ERR-002 stack shows original file/line in a release build after sourcemap upload.',
    dashboardLocation: DASH.crashes,
    covers: ['cli.ota-publish'],
    run: async () => ({
      note: 'Sourcemaps upload only via `scalebun ota publish --sourcemap` (needs a server secret). No CLI command exists for the store-bundle sourcemap or native dSYM/R8 mapping in 2.4.0.',
    }),
  }),
  t({
    id: 'ERR-017',
    category: C,
    name: 'Error with large and circular metadata',
    description: 'captureError with ~20 KB metadata and a circular reference.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw; app responsive.',
    expectedScaleBun: 'Error present; metadata truncated/cycle-safe.',
    dashboardLocation: DASH.crashes,
    covers: ['facade.captureError'],
    run: async ctx => {
      const circular: Record<string, unknown> = { name: 'loop' };
      circular.self = circular;
      ctx.sdk.ScaleBun.captureError(new Error(`SdkTestLargeMetadata ${ctx.runId}`), {
        metadata: ctx.tag({ big: 'x'.repeat(20000), circular }),
      });
      return {};
    },
  }),
];
