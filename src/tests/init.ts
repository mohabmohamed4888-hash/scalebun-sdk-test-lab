import { t, DASH, ids, flushAndObserve } from './helpers';
import { getLabState } from '../scalebun/labState';
import { SCALEBUN_HOST } from '../services/egressObserver';
import { SkipError } from '../testRunner/types';
import { disabledFeatures } from '../config/profiles';

const C = 'Setup & Init' as const;

export const initTests = [
  t({
    id: 'INIT-001',
    category: C,
    name: 'Valid initialization (active integration mode)',
    description: 'Checks the init performed at app start with the selected profile: phase, timing, feature flags and SDK ids.',
    preconditions: ['SCALEBUN_APP_ID + SCALEBUN_CLIENT_KEY configured', 'Profile: default / direct-init'],
    requires: ['clientKey', 'appId'],
    expectedLocal: 'initPhase READY; events.ids() returns installationId/anonymousId/sessionId; provider onReady fired (provider mode).',
    expectedScaleBun: 'A new session with app_open/session_start appears for this installation.',
    dashboardLocation: DASH.sessions,
    covers: ['facade.init', 'export.ScaleBunProvider', 'provider.config', 'provider.onReady', 'config.appId', 'config.clientKey', 'config.eventTracking'],
    run: async ctx => {
      const s = getLabState();
      ctx.expect(s.initPhase === 'READY', `init phase is ${s.initPhase} (${s.initError ?? 'no error'})`);
      const i = ids(ctx);
      ctx.expect(i !== null, 'events.ids() is null → envelope lane not started (appId/clientKey missing or init failed)');
      ctx.expect(!!i?.installationId && !!i?.sessionId, 'installationId/sessionId missing');
      ctx.sdk.ScaleBun.track('test_init_valid', ctx.tag({ integration: s.profile.integration }));
      return {
        output: { integration: s.profile.integration, initMs: (s.initFinishedAt ?? 0) - (s.initStartedAt ?? 0), ids: i },
        note: `Search the dashboard for installationId ${i?.installationId}.`,
      };
    },
  }),
  t({
    id: 'INIT-002',
    category: C,
    name: 'Repeated init() is idempotent',
    description: 'Calls ScaleBun.init() three more times (two concurrent, one sequential) with the SAME config.',
    requires: ['sdkInitialized'],
    expectedLocal: 'Each call resolves; sessionId/installationId unchanged; no integration errors.',
    expectedScaleBun: 'No duplicate session for this device around the test timestamp.',
    dashboardLocation: DASH.sessions,
    covers: ['facade.init'],
    run: async ctx => {
      const before = ids(ctx);
      const cfg = getLabState().profile.build(ctx.env, getLabState().custom);
      const t0 = Date.now();
      await Promise.all([ctx.sdk.ScaleBun.init(cfg), ctx.sdk.ScaleBun.init(cfg)]);
      await ctx.sdk.ScaleBun.init(cfg);
      const after = ids(ctx);
      ctx.expect(before?.sessionId === after?.sessionId, `sessionId changed: ${before?.sessionId} → ${after?.sessionId}`);
      ctx.expect(before?.installationId === after?.installationId, 'installationId changed on re-init');
      return { output: { elapsedMs: Date.now() - t0, before, after } };
    },
  }),
  t({
    id: 'INIT-003',
    category: C,
    name: 'SDK calls before init resolves (identify / track / log)',
    description:
      'In profile pre-init-probe the app calls identify(), track(), log() and captureError() BEFORE init() starts. Checks what the SDK buffered.',
    preconditions: ['Profile: pre-init-probe (direct integration)'],
    profiles: ['pre-init-probe'],
    requires: ['appId', 'clientKey'],
    expectedLocal: 'identify() is buffered (_pendingIdentity) → events.ids().userId equals the pre-init user after init.',
    expectedScaleBun: 'User sdk_test_user_preinit_<run> exists. Whether test_pre_init_event arrives documents buffering of track() (see KSI-001).',
    dashboardLocation: `${DASH.userJourney} / ${DASH.events}`,
    covers: ['facade.identify', 'facade.track', 'facade.init'],
    run: async ctx => {
      const probe = getLabState().preInit;
      ctx.expect(probe, 'pre-init probe did not run');
      const cur = ids(ctx);
      ctx.expect(probe!.afterInit?.idsUserId === probe!.userId || cur?.userId === probe!.userId, `pre-init identify lost: ids().userId=${cur?.userId}`);
      return {
        output: { probe, currentUserId: cur?.userId },
        note: `Check whether event "${probe!.eventName}" reached the dashboard. SDK 2.4.0 source drops non-$ track() calls before init (logs "SDK not initialized. Event dropped") even though the facade documents a pre-init buffer.`,
      };
    },
  }),
  t({
    id: 'INIT-004',
    category: C,
    name: 'Direct ScaleBun.init() integration',
    description: 'Profile direct-init: imperative init + setNavigationRef + EngagePromptProvider wrapping, no ScaleBunProvider.',
    profiles: ['direct-init', 'direct-legacy-root', 'pre-init-probe', 'no-auto-events'],
    requires: ['sdkInitialized'],
    expectedLocal: 'SDK READY, navigation ref registered, useEngagePrompt controller available.',
    expectedScaleBun: 'Session + screen_viewed events identical to provider mode.',
    dashboardLocation: DASH.sessions,
    covers: ['facade.init', 'facade.setNavigationRef', 'export.EngagePromptProvider'],
    run: async ctx => {
      ctx.expect(getLabState().initPhase === 'READY', 'direct init not READY');
      ctx.expect(ctx.bridge.engage !== null, 'EngagePromptProvider controller not mounted');
      ctx.navigate('Analytics');
      await ctx.sleep(500);
      ctx.navigate('Home');
      return { output: { integration: getLabState().profile.integration } };
    },
  }),
  t({
    id: 'INIT-005',
    category: C,
    name: 'Feature flags snapshot matches profile',
    description: 'getFeatureFlags() must reflect exactly what the active profile passed in `features`.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'Every feature disabled by the profile is false in getFeatureFlags(); others are true/undefined.',
    expectedScaleBun: 'n/a (local)',
    dashboardLocation: 'n/a',
    covers: ['facade.getFeatureFlags'],
    run: async ctx => {
      const flags = ctx.sdk.ScaleBun.getFeatureFlags() as Record<string, boolean | undefined>;
      const disabled = disabledFeatures(getLabState().profile, getLabState().custom);
      for (const f of disabled) ctx.expect(flags[f] === false, `feature ${f} should be false, got ${String(flags[f])}`);
      return { output: { flags, disabledByProfile: disabled } };
    },
  }),
  t({
    id: 'INIT-006',
    category: C,
    name: 'Verbose / debug logging',
    description: 'Profile verbose sets verbose:true and runtime logLevel:"debug". Emits a marker event whose debug log line should appear in device logs.',
    profiles: ['verbose'],
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'Device log shows "[ScaleBun]" debug lines, e.g. "Tracking event: test_verbose_marker".',
    expectedScaleBun: 'Event test_verbose_marker.',
    dashboardLocation: DASH.events,
    covers: ['config.verbose', 'config.logLevel'],
    run: async ctx => {
      ctx.sdk.ScaleBun.track('test_verbose_marker', ctx.tag());
      return { note: 'Run `adb logcat | grep -i scalebun` (Android) or watch the Xcode console (iOS).' };
    },
  }),
  t({
    id: 'INIT-007',
    category: C,
    name: 'Invalid credentials fail safely',
    description: 'Profile invalid-credentials: fake client key. The app must stay usable and SDK calls must not throw; the backend must reject.',
    profiles: ['invalid-credentials'],
    expectedLocal: 'submitRating() resolves { ok:false, reason:"http_error", status 401/403 }; SDK egress shows 4xx; no exception.',
    expectedScaleBun: 'Nothing recorded for the fake key.',
    dashboardLocation: 'n/a (nothing should appear)',
    covers: ['facade.init', 'facade.submitRating'],
    run: async ctx => {
      const mark = ctx.egress.mark();
      ctx.sdk.ScaleBun.track('test_invalid_credentials', ctx.tag());
      const rating = await ctx.sdk.ScaleBun.submitRating({ rating: 3, comment: ctx.token(), source: 'manual' });
      const summary = await flushAndObserve(ctx, mark, 3000);
      ctx.expect(rating && rating.ok === false, `expected rejected rating, got ${JSON.stringify(rating)}`);
      return { output: { rating, egress: summary } };
    },
  }),
  t({
    id: 'INIT-008',
    category: C,
    name: 'Malformed optional config does not crash',
    description: 'Profile malformed-config passes flushIntervalMs:10 (min 1000). The SDK schema rejects the config and aborts boot.',
    profiles: ['malformed-config'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'init() resolved without throwing; SDK stays uninitialized (events.ids() null, submitRating → sdk_not_configured); app fully usable.',
    expectedScaleBun: 'Nothing.',
    dashboardLocation: 'n/a',
    covers: ['facade.init', 'provider.onInitError', 'config.flushIntervalMs'],
    run: async ctx => {
      const s = getLabState();
      const rating = await ctx.sdk.ScaleBun.submitRating({ rating: 4 });
      ctx.expect(s.initPhase !== 'READY' || rating?.reason === 'sdk_not_configured', 'SDK reports ready despite invalid config');
      ctx.expect(ids(ctx) === null, 'events lane running despite invalid config');
      return { output: { initPhase: s.initPhase, initError: s.initError, rating } };
    },
  }),
  t({
    id: 'INIT-009',
    category: C,
    name: 'apiBaseUrl override is ignored (endpoint locked)',
    description: 'Profile custom-endpoint sets apiBaseUrl to an unreachable host. 2.4.0 locks the endpoint; all SDK egress must still go to api.scalebun.com.',
    profiles: ['custom-endpoint'],
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'Egress observer sees SDK uploads only to api.scalebun.com, never to unreachable.invalid.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['config.apiBaseUrl'],
    run: async ctx => {
      const mark = ctx.egress.mark();
      ctx.sdk.ScaleBun.track('test_endpoint_lock', ctx.tag());
      await flushAndObserve(ctx, mark, 3000);
      const hosts = ctx.egress.hostsSince(0);
      ctx.expect(!hosts.includes('unreachable.invalid'), 'SDK contacted the overridden apiBaseUrl');
      ctx.expect(hosts.includes(SCALEBUN_HOST), 'no SDK traffic observed at all');
      return { output: { hosts } };
    },
  }),
  t({
    id: 'INIT-010',
    category: C,
    name: 'Offline startup',
    description: 'Enable airplane mode, force-stop and relaunch the app, run this test, then reconnect.',
    interactive: true,
    verification: 'MANUAL',
    preconditions: ['Device offline BEFORE launching the app'],
    expectedLocal: 'App launches; init completes (non-blocking); events queue (stats().pending > 0) instead of failing.',
    expectedScaleBun: 'After reconnect, test_offline_startup arrives once.',
    dashboardLocation: DASH.events,
    covers: ['facade.init', 'facade.events.stats'],
    run: async ctx => {
      ctx.sdk.ScaleBun.track('test_offline_startup', ctx.tag());
      return { output: { stats: ctx.sdk.ScaleBun.events.stats(), initPhase: getLabState().initPhase } };
    },
  }),
  t({
    id: 'INIT-011',
    category: C,
    name: 'Legacy credentials (README quick-start config)',
    description: 'Profile legacy-credentials: only projectId + publishableKey, exactly as the SDK README quick start shows. Records where events go.',
    profiles: ['legacy-credentials'],
    expectedLocal: 'Records init phase and the SDK endpoints hit (legacy handshake → /sessions, events → /sdk/events).',
    expectedScaleBun: 'Unknown — see KSI-002: the bootstrapper states no backend route serves /sdk/events.',
    dashboardLocation: DASH.events,
    covers: ['config.projectId', 'config.publishableKey', 'facade.track'],
    run: async ctx => {
      if (ctx.env.legacyCredentials !== 'CONFIGURED') throw new SkipError('NOT_CONFIGURED: SCALEBUN_PROJECT_ID / SCALEBUN_PUBLISHABLE_KEY');
      const mark = ctx.egress.mark();
      ctx.sdk.ScaleBun.track('test_legacy_mode_event', ctx.tag());
      const summary = await flushAndObserve(ctx, mark, 6000);
      return { output: { initPhase: getLabState().initPhase, egress: summary, allSdkPaths: ctx.egress.sdkSummary(0).paths } };
    },
  }),
  t({
    id: 'INIT-012',
    category: C,
    name: 'Environment & credential sanity',
    description: 'Validates that only client-safe credentials are embedded and that the configured environment is not production.',
    verification: 'LOCAL_ONLY',
    expectedLocal: 'No REJECTED credentials; client key contains "_ck_"; environment != production.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['config.clientKey'],
    run: async ctx => {
      ctx.expect(ctx.env.saasCredentials !== 'REJECTED', 'a server-secret-like key was configured and rejected');
      ctx.expect(!/prod/i.test(ctx.env.environment), `environment is "${ctx.env.environment}" — the Test Lab must not target production`);
      return { output: { saas: ctx.env.saasCredentials, legacy: ctx.env.legacyCredentials, environment: ctx.env.environment, problems: ctx.env.problems } };
    },
  }),
  t({
    id: 'INIT-013',
    category: C,
    name: 'Flush interval & batch size honored',
    description: 'Profile flush-fast (flushIntervalMs 1000, maxQueueSize 10): tracks 25 events without calling flush and watches /batch uploads.',
    profiles: ['flush-fast'],
    requires: ['sdkInitialized', 'online'],
    expectedLocal: 'At least 1 SDK upload within ~3s WITHOUT an explicit flush; pending returns to 0.',
    expectedScaleBun: '25 events test_flush_interval_<n> with this testRunId.',
    dashboardLocation: DASH.events,
    covers: ['config.flushIntervalMs', 'config.maxQueueSize'],
    run: async ctx => {
      const mark = ctx.egress.mark();
      for (let i = 1; i <= 25; i++) ctx.sdk.ScaleBun.track('test_flush_interval', ctx.tag({ n: i }));
      await ctx.sleep(3500);
      const s = ctx.egress.sdkSummary(mark);
      ctx.expect(s.requests > 0, 'no automatic upload within 3.5s at flushIntervalMs=1000');
      return { output: { egress: s, stats: ctx.sdk.ScaleBun.events.stats() } };
    },
  }),
  t({
    id: 'INIT-014',
    category: C,
    name: 'Optional native dependencies degrade gracefully',
    description: 'Reports which optional peers are resolvable and confirms the missing expo-router is stubbed by withScaleBun instead of breaking the bundle.',
    verification: 'LOCAL_ONLY',
    expectedLocal: 'App bundle loaded (proves the metro stub works); view-shot/notifee/firebase presence reported.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['metro.withScaleBun', 'metro.SCALEBUN_OPTIONAL_MODULES'],
    run: async ctx => {
      const probe = (load: () => unknown) => {
        try {
          const m = load() as Record<string, unknown> | null;
          return m && Object.keys(m).length > 0 ? 'present' : 'stubbed/empty';
        } catch (e) {
          return `missing (${e instanceof Error ? e.message.slice(0, 60) : 'error'})`;
        }
      };
      const out = {
        'react-native-view-shot': probe(() => require('react-native-view-shot')),
        '@notifee/react-native': probe(() => require('@notifee/react-native')),
        '@react-native-firebase/messaging': probe(() => require('@react-native-firebase/messaging')),
      };
      ctx.expect(out['react-native-view-shot'] === 'present', 'react-native-view-shot should be installed for replay');
      return { output: out, note: 'expo-router is intentionally not installed; the bundle loading at all proves withScaleBun stubbed it.' };
    },
  }),
  t({
    id: 'INIT-015',
    category: C,
    name: 'ScaleBun doctor / init codemods',
    description: 'Run `npm run doctor` on the dev machine. Record the result in PLATFORM_MATRIX.md.',
    verification: 'MANUAL',
    expectedLocal: 'Only the documented, explained items remain (see README → Doctor).',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['cli.doctor', 'cli.init-android', 'cli.init-ios'],
    run: async () => ({ note: 'npm run doctor && npx scalebun init android --check && npx scalebun init ios --check' }),
  }),
  t({
    id: 'INIT-016',
    category: C,
    name: 'SDK egress targets the cloud /api/v1 endpoint',
    description: 'All observed SDK uploads use https://api.scalebun.com/api/v1/*.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'Every SDK request path starts with /api/v1/ and uses https.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['config.apiBaseUrl'],
    run: async ctx => {
      const mark = ctx.egress.mark();
      ctx.sdk.ScaleBun.track('test_endpoint_prefix', ctx.tag());
      await flushAndObserve(ctx, mark, 2500);
      const sdkReqs = ctx.egress.all().filter(r => r.sdk);
      ctx.expect(sdkReqs.length > 0, 'no SDK traffic observed');
      const bad = sdkReqs.filter(r => !r.path.startsWith('/api/v1/'));
      ctx.expect(bad.length === 0, `requests outside /api/v1: ${bad.map(b => b.path).join(', ')}`);
      return { output: ctx.egress.sdkSummary(0) };
    },
  }),
];
