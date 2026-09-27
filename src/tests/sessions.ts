import { t, DASH, ids } from './helpers';
import { getLabState } from '../scalebun/labState';

const C = 'Sessions' as const;

export const sessionTests = [
  t({
    id: 'SES-001',
    category: C,
    name: 'Automatic session exists',
    description: 'Reads session.isActive / currentSessionId, events.ids().sessionId and replay.sessionId.',
    requires: ['sdkInitialized'],
    expectedLocal: 'An analytics sessionId exists (events.ids()); unified session state is reported.',
    expectedScaleBun: 'Session with this id is listed.',
    dashboardLocation: DASH.sessions,
    covers: ['facade.session.isActive', 'facade.session.currentSessionId', 'facade.events.ids', 'facade.replay.sessionId'],
    run: async ctx => {
      const S = ctx.sdk.ScaleBun;
      const out = {
        unified: { isActive: S.session.isActive, currentSessionId: S.session.currentSessionId },
        analytics: ids(ctx),
        replaySessionId: S.replay.sessionId,
      };
      ctx.expect(out.analytics?.sessionId || out.unified.currentSessionId, 'no session id from any lane');
      return { output: out };
    },
  }),
  t({
    id: 'SES-002',
    category: C,
    name: 'startSession(metadata) / stopSession()',
    description: 'Explicit unified-session control with metadata.',
    requires: ['sdkInitialized'],
    expectedLocal: 'Boolean results recorded; session.isActive reflects the calls.',
    expectedScaleBun: 'A session carrying metadata { testRunId, purpose } that ends with reason "ended".',
    dashboardLocation: DASH.sessions,
    covers: ['facade.startSession', 'facade.stopSession'],
    run: async ctx => {
      const S = ctx.sdk.ScaleBun;
      const stopped0 = S.stopSession('ended');
      const started = S.startSession(ctx.tag({ purpose: 'explicit_session_test' }));
      const activeAfterStart = S.session.isActive;
      await ctx.sleep(1500);
      S.track('test_in_explicit_session', ctx.tag());
      const stopped = S.stopSession('ended');
      const activeAfterStop = S.session.isActive;
      const restarted = S.startSession(ctx.tag({ purpose: 'restore_after_test' }));
      return { output: { stopped0, started, activeAfterStart, stopped, activeAfterStop, restarted } };
    },
  }),
  t({
    id: 'SES-003',
    category: C,
    name: 'Session namespace start / emitEvent / end',
    description: 'ScaleBun.session.start/emitEvent/end including a "timeout" end reason.',
    requires: ['sdkInitialized'],
    expectedLocal: 'Calls return booleans without throwing.',
    expectedScaleBun: 'Custom session event test_session_marker in the timeline; one session ended with reason timeout.',
    dashboardLocation: DASH.sessions,
    covers: ['facade.session.start', 'facade.session.end', 'facade.session.emitEvent'],
    run: async ctx => {
      const s = ctx.sdk.ScaleBun.session;
      const a = s.start(ctx.tag({ via: 'namespace' }));
      s.emitEvent('test_session_marker', ctx.tag());
      const b = s.end('timeout');
      const c = s.start(ctx.tag({ via: 'namespace_restore' }));
      return { output: { start: a, end: b, restart: c, isActive: s.isActive } };
    },
  }),
  t({
    id: 'SES-004',
    category: C,
    name: 'events.newSession() rotates the analytics session',
    description: 'Session replacement on the envelope lane.',
    requires: ['sdkInitialized', 'appId'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'events.ids().sessionId changes; installationId unchanged.',
    expectedScaleBun: 'Two consecutive sessions for the installation.',
    dashboardLocation: DASH.sessions,
    covers: ['facade.events.newSession'],
    run: async ctx => {
      const before = ids(ctx);
      ctx.sdk.ScaleBun.events.newSession();
      const after = ids(ctx);
      ctx.expect(before?.sessionId !== after?.sessionId, 'sessionId did not change');
      ctx.expect(before?.installationId === after?.installationId, 'installationId changed');
      return { output: { before: before?.sessionId, after: after?.sessionId } };
    },
  }),
  t({
    id: 'SES-005',
    category: C,
    name: 'Foreground / background transition',
    description: 'Background the app for ~5s and return (below the background cap).',
    interactive: true,
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'Lifecycle log shows background → active; sessionId unchanged.',
    expectedScaleBun: 'app_backgrounded + app_foregrounded in the SAME session.',
    dashboardLocation: DASH.sessions,
    covers: ['facade.events.ids'],
    run: async ctx => {
      const before = ids(ctx)?.sessionId;
      ctx.log('Background the app now and come back within 5–10 s…');
      const back = await ctx.bridge.lifecycleLog.waitFor(e => e.kind === 'active', 60000);
      const after = ids(ctx)?.sessionId;
      ctx.expect(back, 'did not observe a return to foreground within 60 s');
      return { output: { before, after, sameSession: before === after } };
    },
    timeoutMs: 70000,
  }),
  t({
    id: 'SES-006',
    category: C,
    name: 'Session timeout after long background',
    description: 'Profile short-session-cap (sessionBackgroundCapMs 60s): background > 70s then return.',
    interactive: true,
    profiles: ['short-session-cap'],
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'events.ids().sessionId differs after returning.',
    expectedScaleBun: 'Previous session finalized; new session opened.',
    dashboardLocation: DASH.sessions,
    covers: ['config.sessionBackgroundCapMs'],
    run: async ctx => {
      const before = ids(ctx)?.sessionId;
      ctx.log('Background the app for more than 70 seconds, then return.');
      await ctx.bridge.lifecycleLog.waitFor(e => e.kind === 'active', 180000);
      await ctx.sleep(1500);
      const after = ids(ctx)?.sessionId;
      return { output: { before, after, rotated: before !== after } };
    },
    timeoutMs: 200000,
  }),
  t({
    id: 'SES-007',
    category: C,
    name: 'Multiple screens within one session',
    description: 'Visits 5 screens; asserts the analytics session id is stable across them.',
    requires: ['sdkInitialized'],
    expectedLocal: 'Same sessionId before and after.',
    expectedScaleBun: 'One session timeline listing all 5 screens in order.',
    dashboardLocation: DASH.sessions,
    covers: ['facade.setNavigationRef'],
    run: async ctx => {
      const before = ids(ctx)?.sessionId;
      for (const r of ['Sessions', 'Identity', 'Network', 'Performance', 'Home']) {
        ctx.navigate(r);
        await ctx.sleep(600);
      }
      const after = ids(ctx)?.sessionId;
      ctx.expect(before === after, 'session rotated during navigation');
      return { output: { sessionId: after } };
    },
  }),
  t({
    id: 'SES-008',
    category: C,
    name: 'Session attributes (setAttribute)',
    description: 'String, number and boolean session attributes.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw.',
    expectedScaleBun: 'Session shows sdk_test_run_id, sdk_test_count=7, sdk_test_flag=true.',
    dashboardLocation: DASH.sessions,
    covers: ['facade.setAttribute'],
    run: async ctx => {
      ctx.sdk.ScaleBun.setAttribute('sdk_test_run_id', ctx.runId);
      ctx.sdk.ScaleBun.setAttribute('sdk_test_count', 7);
      ctx.sdk.ScaleBun.setAttribute('sdk_test_flag', true);
      return {};
    },
  }),
  t({
    id: 'SES-009',
    category: C,
    name: 'Installation continuity across relaunch',
    description: 'Compares events.ids().installationId with the value stored on the previous launch.',
    requires: ['sdkInitialized', 'appId'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'installationId identical to the previous launch (unless eraseLocalData/purge ran).',
    expectedScaleBun: 'Sessions from both launches attributed to one installation.',
    dashboardLocation: DASH.sessions,
    covers: ['facade.events.ids'],
    run: async ctx => {
      const prev = getLabState().previousInstallationId;
      const cur = ids(ctx)?.installationId;
      if (!prev) return { kind: 'MANUAL', output: { cur }, note: 'First launch recorded; relaunch the app and run again.' };
      ctx.expect(prev === cur, `installationId changed across relaunch: ${prev} → ${cur}`);
      return { output: { prev, cur, bootCount: getLabState().bootCount } };
    },
  }),
];
