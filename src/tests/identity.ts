import { t, DASH, ids } from './helpers';
import { fakeUserId } from '../utils/ids';

const C = 'Identity' as const;

export const identityTests = [
  t({
    id: 'IDN-001',
    category: C,
    name: 'Anonymous start',
    description: 'Clears identity and generates anonymous activity.',
    requires: ['sdkInitialized', 'appId'],
    expectedLocal: 'events.ids().userId undefined; anonymousId present.',
    expectedScaleBun: 'test_anonymous_activity attributed to the anonymous id only.',
    dashboardLocation: DASH.userJourney,
    covers: ['facade.clearUser', 'facade.events.ids'],
    run: async ctx => {
      ctx.sdk.ScaleBun.clearUser();
      const i = ids(ctx);
      ctx.expect(!i?.userId, `userId still set: ${i?.userId}`);
      ctx.expect(i?.anonymousId, 'no anonymousId');
      ctx.sdk.ScaleBun.track('test_anonymous_activity', ctx.tag());
      return { output: i };
    },
  }),
  t({
    id: 'IDN-002',
    category: C,
    name: 'identify(user A, traits)',
    description: 'Identifies an opaque fake user with traits (no real email).',
    requires: ['sdkInitialized', 'appId'],
    expectedLocal: 'events.ids().userId === A and engage.getIdentifiedUserId() === A.',
    expectedScaleBun: 'User sdk_test_user_a_<run> with plan=pro_test, signup_source=sdk_test_lab.',
    dashboardLocation: DASH.userJourney,
    covers: ['facade.identify', 'facade.engage.getIdentifiedUserId'],
    run: async ctx => {
      const a = fakeUserId(ctx.runId, 'a');
      ctx.sdk.ScaleBun.identify(a, { plan: 'pro_test', signup_source: 'sdk_test_lab', testRunId: ctx.runId });
      ctx.expect(ids(ctx)?.userId === a, `ids().userId=${ids(ctx)?.userId}`);
      ctx.expect(ctx.sdk.ScaleBun.engage.getIdentifiedUserId() === a, 'engage identity not updated');
      ctx.sdk.ScaleBun.track('test_identified_activity', ctx.tag({ user: 'A' }));
      return { output: { userId: a } };
    },
  }),
  t({
    id: 'IDN-003',
    category: C,
    name: 'identifyUser alias',
    description: 'Stable public alias of identify().',
    requires: ['sdkInitialized', 'appId'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'userId updated identically to identify().',
    expectedScaleBun: 'Same as identify.',
    dashboardLocation: DASH.userJourney,
    covers: ['facade.identifyUser'],
    run: async ctx => {
      const a = fakeUserId(ctx.runId, 'a');
      ctx.sdk.ScaleBun.identifyUser(a, { alias_path: 'identifyUser' });
      ctx.expect(ids(ctx)?.userId === a, 'identifyUser did not set userId');
      return {};
    },
  }),
  t({
    id: 'IDN-004',
    category: C,
    name: 'events.identify (envelope lane)',
    description: 'Identify through the events namespace.',
    requires: ['sdkInitialized', 'appId'],
    expectedLocal: 'events.ids().userId updated.',
    expectedScaleBun: 'identify envelope for the user.',
    dashboardLocation: DASH.userJourney,
    covers: ['facade.events.identify'],
    run: async ctx => {
      const a = fakeUserId(ctx.runId, 'a');
      ctx.sdk.ScaleBun.events.identify(a, { via: 'events.identify' });
      ctx.expect(ids(ctx)?.userId === a, 'userId not updated');
      return {};
    },
  }),
  t({
    id: 'IDN-005',
    category: C,
    name: 'setUser (session identity)',
    description: 'setUser with name, reserved-domain fake email, attributes and properties.',
    requires: ['sdkInitialized'],
    expectedLocal: 'No throw.',
    expectedScaleBun: 'Session shows user sdk_test_user_a_<run>, name "Test User A", email @example.test.',
    dashboardLocation: DASH.sessions,
    covers: ['facade.setUser'],
    run: async ctx => {
      ctx.sdk.ScaleBun.setUser({
        id: fakeUserId(ctx.runId, 'a'),
        name: 'Test User A',
        email: 'test.user.a@example.test',
        attributes: { tier: 'gold_test', age_bucket: 30, beta: true },
        properties: { testRunId: ctx.runId },
      });
      return {};
    },
  }),
  t({
    id: 'IDN-006',
    category: C,
    name: 'Update traits for the same user',
    description: 'Re-identify A with changed traits.',
    requires: ['sdkInitialized', 'appId'],
    expectedLocal: 'userId unchanged.',
    expectedScaleBun: 'User A traits now plan=enterprise_test (previous value replaced), new trait seats=5.',
    dashboardLocation: DASH.userJourney,
    covers: ['facade.identify'],
    run: async ctx => {
      const a = fakeUserId(ctx.runId, 'a');
      ctx.sdk.ScaleBun.identify(a, { plan: 'enterprise_test', seats: 5 });
      ctx.expect(ids(ctx)?.userId === a, 'userId changed');
      return {};
    },
  }),
  t({
    id: 'IDN-007',
    category: C,
    name: 'clearUser() (logout)',
    description: 'Logout clears identity; anonymous activity afterwards.',
    requires: ['sdkInitialized', 'appId'],
    expectedLocal: 'userId undefined after clearUser; engage identity cleared.',
    expectedScaleBun: 'test_after_logout NOT attributed to user A.',
    dashboardLocation: DASH.userJourney,
    covers: ['facade.clearUser', 'facade.engage.getIdentifiedUserId'],
    run: async ctx => {
      const before = ids(ctx);
      ctx.sdk.ScaleBun.clearUser();
      const after = ids(ctx);
      ctx.expect(!after?.userId, 'userId still set after clearUser');
      ctx.sdk.ScaleBun.track('test_after_logout', ctx.tag());
      return { output: { before, after, engageUser: ctx.sdk.ScaleBun.engage.getIdentifiedUserId() ?? null, anonymousRotated: before?.anonymousId !== after?.anonymousId } };
    },
  }),
  t({
    id: 'IDN-008',
    category: C,
    name: 'Second user, no data bleed',
    description: 'identify(A) → event → clearUser → identify(B, different traits) → event.',
    requires: ['sdkInitialized', 'appId'],
    expectedLocal: 'userId sequence A → undefined → B.',
    expectedScaleBun: 'User B has ONLY its own traits (no plan from A) and only test_user_b_event.',
    dashboardLocation: DASH.userJourney,
    covers: ['facade.identify', 'facade.clearUser'],
    run: async ctx => {
      const S = ctx.sdk.ScaleBun;
      const a = fakeUserId(ctx.runId, 'a');
      const b = fakeUserId(ctx.runId, 'b');
      S.identify(a, { plan: 'pro_test', only_a: true });
      S.track('test_user_a_event', ctx.tag());
      S.clearUser();
      const mid = ids(ctx)?.userId;
      S.identify(b, { plan_b: 'free_test' });
      S.track('test_user_b_event', ctx.tag());
      ctx.expect(!mid, 'identity not cleared between users');
      ctx.expect(ids(ctx)?.userId === b, 'user B not set');
      return { output: { a, b } };
    },
  }),
  t({
    id: 'IDN-009',
    category: C,
    name: 'clearUser({ purgeLocal: true })',
    description: 'Logout with local purge (queue, cached ids).',
    requires: ['sdkInitialized', 'appId'],
    expectedLocal: 'Records which ids rotate after purge (installation/anonymous).',
    expectedScaleBun: 'Subsequent activity appears under fresh anonymous identity.',
    dashboardLocation: DASH.userJourney,
    covers: ['facade.clearUser'],
    run: async ctx => {
      const before = ids(ctx);
      ctx.sdk.ScaleBun.clearUser({ purgeLocal: true });
      await ctx.sleep(500);
      const after = ids(ctx);
      ctx.sdk.ScaleBun.track('test_after_purge_logout', ctx.tag());
      return { output: { before, after, stats: ctx.sdk.ScaleBun.events.stats() } };
    },
  }),
  t({
    id: 'IDN-010',
    category: C,
    name: 'Replay identity (replay.setUser / clearUser)',
    description: 'Associates the replay recording with fake user A, then clears.',
    requires: ['sdkInitialized'],
    expectedLocal: 'Both promises resolve.',
    expectedScaleBun: 'Replay session shows user A during the window.',
    dashboardLocation: DASH.replay,
    covers: ['facade.replay.setUser', 'facade.replay.clearUser'],
    run: async ctx => {
      await ctx.sdk.ScaleBun.replay.setUser({ id: fakeUserId(ctx.runId, 'a'), name: 'Replay User A', attributes: { testRunId: ctx.runId } });
      await ctx.sleep(1000);
      await ctx.sdk.ScaleBun.replay.clearUser();
      return {};
    },
  }),
  t({
    id: 'IDN-011',
    category: C,
    name: 'Rapid identify / clear cycles',
    description: '25 alternating identify/clear calls in a tight loop.',
    requires: ['sdkInitialized', 'appId'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'No throw; final state = last call (identified as cycle_24).',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.identify', 'facade.clearUser'],
    run: async ctx => {
      let last = '';
      for (let i = 0; i < 25; i++) {
        ctx.sdk.ScaleBun.clearUser();
        last = fakeUserId(ctx.runId, `cycle_${i}`);
        ctx.sdk.ScaleBun.identify(last);
      }
      ctx.expect(ids(ctx)?.userId === last, 'final identity is not the last identify');
      ctx.sdk.ScaleBun.clearUser();
      return {};
    },
  }),
];
