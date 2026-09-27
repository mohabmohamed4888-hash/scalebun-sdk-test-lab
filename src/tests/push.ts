import { t, DASH } from './helpers';
import type { PushNotification } from '@scalebun/react-native';
import { writeJson, KEYS } from '../services/persistence';

const C = 'Push' as const;

export const pushTests = [
  t({
    id: 'PUSH-001',
    category: C,
    name: 'Push status & capabilities (before enable)',
    description: 'ScaleBun.push.status() and getToken() before enablePush.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'Status object with adapter/usable/reason; no throw.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.push.status', 'facade.push.getToken'],
    run: async ctx => ({ output: { status: ctx.sdk.ScaleBun.push.status(), token: ctx.sdk.ScaleBun.push.getToken() ? '(present)' : null } }),
  }),
  t({
    id: 'PUSH-002',
    category: C,
    name: 'enablePush (auto adapter)',
    description: 'Full official flow: permission → Android channel → token → backend registration → callbacks.',
    requires: ['sdkInitialized', 'firebase'],
    interactive: true,
    preconditions: ['Firebase configured (google-services.json / GoogleService-Info.plist)', 'Physical device for iOS APNs'],
    expectedLocal: 'EnablePushResult { ok:true, adapter:"rnfirebase"|"native", permission:"granted", tokenRegistered:true }.',
    expectedScaleBun: 'Device token registered for this installation; permission_result notification=granted.',
    dashboardLocation: DASH.push,
    covers: ['facade.enablePush', 'facade.trackPermission'],
    run: async ctx => {
      const res = await ctx.sdk.ScaleBun.enablePush({
        android: { channelId: 'sdk_test_lab_default', channelName: 'SDK Test Lab', importance: 4 },
        onForegroundNotification: (n: PushNotification) => ctx.bridge.recordPush('foreground', n),
        onNotificationOpened: (n: PushNotification) => ctx.bridge.recordPush('opened', n),
      });
      ctx.expect(res.ok, `enablePush failed: ${res.adapter} — ${res.reason}`);
      await writeJson(KEYS.pushEnabled, true);
      return { output: { ...res, status: { ...ctx.sdk.ScaleBun.push.status(), token: '(redacted)' } } };
    },
  }),
  t({
    id: 'PUSH-003',
    category: C,
    name: 'Missing provider reports NOT_CONFIGURED clearly',
    description: 'Without Firebase, enablePush must fail CLEARLY (ok:false + actionable reason) — never throw or hang.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'If Firebase is missing: ok:false with a non-empty reason; otherwise SKIPPED.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.enablePush'],
    run: async ctx => {
      const status = ctx.sdk.ScaleBun.push.status();
      if (status.enabled && status.usable) return { kind: 'SKIPPED', note: 'Push already usable on this build (Firebase configured).' };
      const res = await ctx.sdk.ScaleBun.enablePush({ skipPermissionRequest: true });
      if (res.ok) return { kind: 'SKIPPED', note: `Provider available (${res.adapter}); run PUSH-002 instead.` };
      ctx.expect(res.reason && res.reason.length > 10, 'failure without actionable reason');
      return { output: res };
    },
  }),
  t({
    id: 'PUSH-004',
    category: C,
    name: 'Manual provider: token + callbacks round-trip',
    description: 'enablePush({ provider:"manual", manualToken }) with a FAKE token; emitForeground / emitNotificationOpened must reach onForegroundNotification / onNotificationOpened subscribers.',
    requires: ['sdkInitialized'],
    expectedLocal: 'getToken() returns the fake token; both subscriptions receive the synthetic notification; unsubscribe stops delivery.',
    expectedScaleBun: 'A device token row with the fake token (sends to it will fail — expected).',
    dashboardLocation: DASH.push,
    covers: ['facade.enablePush', 'facade.push.setToken', 'facade.push.getToken', 'facade.push.emitForeground', 'facade.push.emitNotificationOpened', 'facade.onForegroundNotification', 'facade.onNotificationOpened'],
    run: async ctx => {
      const S = ctx.sdk.ScaleBun;
      const token = `sdk_test_fake_push_token_${ctx.runId}`;
      const res = await S.enablePush({ provider: 'manual', manualToken: token, skipPermissionRequest: true });
      const got: string[] = [];
      const u1 = S.onForegroundNotification(n => got.push(`fg:${n.data.testRunId}`));
      const u2 = S.onNotificationOpened(n => got.push(`open:${n.data.testRunId}`));
      const msg = { title: 'SDK Test', body: 'synthetic', data: { testRunId: ctx.runId, deepLink: 'scalebuntestlab://nav/a' } };
      S.push.emitForeground(msg);
      S.push.emitNotificationOpened(msg);
      u1();
      u2();
      S.push.emitForeground(msg); // must NOT be received after unsubscribe
      const rotated = `${token}_rotated`;
      S.push.setToken(rotated);
      ctx.expect(got.includes(`fg:${ctx.runId}`), 'foreground callback not delivered');
      ctx.expect(got.includes(`open:${ctx.runId}`), 'opened callback not delivered');
      ctx.expect(got.length === 2, `delivered after unsubscribe (${got.length})`);
      ctx.expect(S.push.getToken() === rotated, 'setToken did not rotate the token');
      return { output: { enable: res, received: got } };
    },
  }),
  t({
    id: 'PUSH-005',
    category: C,
    name: 'push.teardown()',
    description: 'Tears down listeners; subsequent emits must not reach old handlers.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'status().enabled false (or listeners cleared) after teardown.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.push.teardown', 'facade.push.status'],
    run: async ctx => {
      ctx.sdk.ScaleBun.push.teardown();
      return { output: ctx.sdk.ScaleBun.push.status() };
    },
  }),
  t({
    id: 'PUSH-006',
    category: C,
    name: 'engage.registerForPush (native bridge)',
    description: 'Acquire the native token through the ScaleBunEngage bridge.',
    requires: ['sdkInitialized', 'firebase'],
    verification: 'MANUAL',
    expectedLocal: 'Resolves; token visible in push.status().',
    expectedScaleBun: 'Device token registered.',
    dashboardLocation: DASH.push,
    covers: ['facade.engage.registerForPush'],
    run: async ctx => {
      await ctx.sdk.ScaleBun.engage.registerForPush();
      return { output: { status: { ...ctx.sdk.ScaleBun.push.status(), token: '(redacted)' } } };
    },
  }),
  t({
    id: 'PUSH-007',
    category: C,
    name: 'Foreground / opened / cold-start notifications (manual)',
    description: 'Send a test push from the dashboard (data: {deepLink:"scalebuntestlab://nav/b", testRunId}). Check the Push screen callback log in foreground, background-tap, and killed-tap states.',
    interactive: true,
    requires: ['sdkInitialized', 'firebase'],
    verification: 'MANUAL',
    expectedLocal: 'Callback log entries: foreground, opened, cold-start; deepLink navigates to NavB.',
    expectedScaleBun: 'Delivery + open recorded.',
    dashboardLocation: DASH.push,
    covers: ['facade.onForegroundNotification', 'facade.onNotificationOpened'],
    run: async ctx => ({ output: ctx.bridge.pushLog.list().slice(0, 10) }),
  }),
  t({
    id: 'PUSH-008',
    category: C,
    name: 'Permission denied flow',
    description: 'On a fresh install deny the OS prompt (or revoke in Settings), then enablePush.',
    interactive: true,
    requires: ['sdkInitialized', 'firebase'],
    verification: 'MANUAL',
    expectedLocal: 'EnablePushResult.permission = "denied", ok:false with a clear reason; app unaffected.',
    expectedScaleBun: 'permission_result notification=denied (captured automatically).',
    dashboardLocation: DASH.events,
    covers: ['facade.enablePush'],
    run: async ctx => ({ output: await ctx.sdk.ScaleBun.enablePush({}) }),
  }),
];
