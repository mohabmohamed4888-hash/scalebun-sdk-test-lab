import { t, DASH, flushAndObserve } from './helpers';
import { disabledFeatures, type FeatureKey } from '../config/profiles';
import { getLabState } from '../scalebun/labState';

const C = 'Feature Matrix' as const;

/**
 * One smoke test executed under EVERY profile. For the features the profile
 * disables it asserts inertness; for every other feature it asserts the
 * capability still works — "disabling one feature must not break unrelated
 * features".
 */
export const featureMatrixTests = [
  t({
    id: 'FMX-001',
    category: C,
    name: 'Cross-feature smoke under the current profile',
    description: 'track + captureError + log + trace + replay state + session state, with per-feature expectations derived from the profile.',
    requires: ['sdkInitialized'],
    expectedLocal: 'Enabled features respond; disabled features are inert; nothing throws.',
    expectedScaleBun: 'Events/errors/logs present for enabled features only.',
    dashboardLocation: `${DASH.events} / ${DASH.crashes} / ${DASH.performance} / ${DASH.replay}`,
    covers: ['config.features.replay', 'config.features.network', 'config.features.crashes', 'config.features.session', 'config.features.journey', 'config.features.performance', 'config.sessionReplay'],
    run: async ctx => {
      const S = ctx.sdk.ScaleBun;
      const off = new Set<FeatureKey>(disabledFeatures(ctx.profile, getLabState().custom));
      const mark = ctx.egress.mark();
      S.track('test_fmx_event', ctx.tag({ profile: ctx.profileId, disabled: [...off].join(',') }));
      S.log('info', `sdk_test_fmx_log ${ctx.runId}`, ctx.tag());
      S.captureError(new Error(`SdkTestFmxError ${ctx.runId}`), { metadata: ctx.tag() });
      const trace = S.performance.startTrace('fmx_trace');
      if (trace) S.performance.stopTrace(trace);
      const egress = await flushAndObserve(ctx, mark);
      const checks = {
        analyticsUploads: egress.requests > 0,
        performanceActive: S.performance.isActive(),
        traceId: trace,
        replayRecording: S.replay.isRecording,
        sessionActive: S.session.isActive,
      };
      ctx.expect(checks.analyticsUploads, 'analytics stopped uploading (must be independent of feature flags)');
      if (off.has('performance')) ctx.expect(!checks.performanceActive && trace === null, 'performance not inert');
      else ctx.expect(checks.performanceActive && trace !== null, 'performance broken while not disabled');
      if (off.has('replay')) ctx.expect(!checks.replayRecording, 'replay recording while disabled');
      return { output: { profile: ctx.profileId, disabled: [...off], checks, egress } };
    },
  }),
];
