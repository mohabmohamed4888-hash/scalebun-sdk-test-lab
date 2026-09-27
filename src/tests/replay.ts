import { t, DASH, featureDisabled } from './helpers';

const C = 'Session Replay' as const;

export const replayTests = [
  t({
    id: 'RPL-001',
    category: C,
    name: 'Replay state',
    description: 'replay.isRecording and replay.sessionId under the current profile.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'isRecording true in default profile; false with replay-record-off / no-replay.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.replay.isRecording', 'facade.replay.sessionId', 'config.replay.record', 'config.sessionReplay'],
    run: async ctx => {
      const R = ctx.sdk.ScaleBun.replay;
      const expectRecording = !(featureDisabled(ctx, 'replay') || ctx.profileId === 'replay-record-off');
      ctx.expect(R.isRecording === expectRecording, `isRecording=${R.isRecording}, expected ${expectRecording}`);
      return { output: { isRecording: R.isRecording, sessionId: R.sessionId } };
    },
  }),
  t({
    id: 'RPL-002',
    category: C,
    name: 'stop → start → pause → resume',
    description: 'Lifecycle control with state assertions after each step; leaves recording ON.',
    requires: ['sdkInitialized'],
    expectedLocal: 'isRecording false after stop, true after start, (paused state reported), true after resume.',
    expectedScaleBun: 'Replay timeline shows a gap during stop/pause.',
    dashboardLocation: DASH.replay,
    covers: ['facade.replay.start', 'facade.replay.stop', 'facade.replay.pause', 'facade.replay.resume'],
    run: async ctx => {
      const R = ctx.sdk.ScaleBun.replay;
      if (featureDisabled(ctx, 'replay')) return { kind: 'SKIPPED', note: 'replay disabled in profile' };
      const states: Record<string, boolean> = {};
      await R.stop();
      states.afterStop = R.isRecording;
      await R.start();
      states.afterStart = R.isRecording;
      await R.pause();
      states.afterPause = R.isRecording;
      await R.resume();
      states.afterResume = R.isRecording;
      ctx.expect(!states.afterStop, 'still recording after stop()');
      ctx.expect(states.afterStart, 'not recording after start()');
      ctx.expect(states.afterResume, 'not recording after resume()');
      return { output: states };
    },
  }),
  t({
    id: 'RPL-003',
    category: C,
    name: 'Manual frame capture & replay flush',
    description: 'captureFrame() on the Replay Playground then replay.flush().',
    requires: ['sdkInitialized'],
    expectedLocal: 'Both resolve.',
    expectedScaleBun: 'A manual frame of the Replay Playground in the replay.',
    dashboardLocation: DASH.replay,
    covers: ['facade.replay.captureFrame', 'facade.replay.flush'],
    run: async ctx => {
      ctx.navigate('ReplayPlayground');
      await ctx.sleep(800);
      await ctx.sdk.ScaleBun.replay.captureFrame();
      await ctx.sdk.ScaleBun.replay.flush();
      return {};
    },
  }),
  t({
    id: 'RPL-004',
    category: C,
    name: 'Screen name, quality and capture mode',
    description: 'setScreen, setQuality(high→low→grayscale→normal), setCaptureMode(navigation→interactions).',
    requires: ['sdkInitialized'],
    expectedLocal: 'All resolve.',
    expectedScaleBun: 'Frames labelled sdk_test_replay_screen; visibly different quality between frames.',
    dashboardLocation: DASH.replay,
    covers: ['facade.replay.setScreen', 'facade.replay.setQuality', 'facade.replay.setCaptureMode', 'config.replay.quality', 'config.replay.captureMode'],
    run: async ctx => {
      const R = ctx.sdk.ScaleBun.replay;
      await R.setScreen('sdk_test_replay_screen');
      for (const q of ['high', 'low', 'grayscale', 'normal']) {
        await R.setQuality(q);
        await R.captureFrame();
        await ctx.sleep(300);
      }
      await R.setCaptureMode('navigation');
      await R.setCaptureMode('interactions');
      return {};
    },
  }),
  t({
    id: 'RPL-005',
    category: C,
    name: 'Runtime privacy options + setEnabled',
    description: 'setPrivacy({ maskTextInputs, maskImages, maskedElementIds, ignoredScreens }); setEnabled(false/true).',
    requires: ['sdkInitialized'],
    expectedLocal: 'Resolves; isRecording false after setEnabled(false), restored after true.',
    expectedScaleBun: 'Element nativeID sdk-test-secret-view masked; screen PrivacySecret never captured.',
    dashboardLocation: DASH.replay,
    covers: ['facade.replay.setPrivacy', 'facade.replay.setEnabled'],
    run: async ctx => {
      const R = ctx.sdk.ScaleBun.replay;
      await R.setPrivacy({ maskTextInputs: true, maskImages: true, maskedElementIds: ['sdk-test-secret-view'], ignoredScreens: ['PrivacySecret'] });
      await R.setEnabled(false);
      const off = R.isRecording;
      await R.setEnabled(true);
      const on = R.isRecording;
      return { output: { afterDisable: off, afterEnable: on } };
    },
  }),
  t({
    id: 'RPL-006',
    category: C,
    name: 'Replay Playground walkthrough',
    description: 'Manual: type in inputs, scroll FlatList/SectionList, open the modal, long-press, fast-tap, keyboard, animation, fire network calls.',
    interactive: true,
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'n/a',
    expectedScaleBun: 'Replay shows taps, scrolls, navigation, modal, keyboard; network + log breadcrumbs aligned on the timeline.',
    dashboardLocation: DASH.replay,
    covers: ['export.ScaleBunScrollView', 'export.ScaleBunFlatList', 'export.ScaleBunSectionList', 'config.replay.intervalMs'],
    run: async ctx => {
      ctx.navigate('ReplayPlayground');
      return { note: 'Perform the checklist on the Replay Playground, then verify in the dashboard.' };
    },
  }),
  t({
    id: 'RPL-007',
    category: C,
    name: 'Masking of fake sensitive content',
    description: 'Playground shows fake email/card/password in TextInputs and plain Text; default privacy masks inputs, not plain text.',
    interactive: true,
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'n/a',
    expectedScaleBun: 'TextInputs (incl. password) masked in frames. Plain Text with the fake card is visible unless in maskedElementIds (by design). Masking happens on-device (PrivacyMaskProcessor) BEFORE upload.',
    dashboardLocation: DASH.replay,
    covers: ['config.privacy.maskTextInputs', 'config.privacy.maskImages'],
    run: async ctx => {
      ctx.navigate('ReplayPlayground');
      return { note: 'Type in every field; then inspect frames. Repeat with profile privacy-strict (images masked) and privacy-relaxed.' };
    },
  }),
  t({
    id: 'RPL-008',
    category: C,
    name: 'Screenshot dependency available',
    description: 'react-native-view-shot is installed (required for JS-side capture paths).',
    verification: 'LOCAL_ONLY',
    expectedLocal: 'captureRef is a function.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['metro.SCALEBUN_OPTIONAL_MODULES'],
    run: async ctx => {
      const vs = require('react-native-view-shot') as { captureRef?: unknown };
      ctx.expect(typeof vs.captureRef === 'function', 'react-native-view-shot not linked');
      return {};
    },
  }),
  t({
    id: 'RPL-009',
    category: C,
    name: 'Auto-instrumented ScrollViews',
    description: 'Profile auto-scroll: plain <ScrollView> taps report scroll depth.',
    interactive: true,
    profiles: ['auto-scroll'],
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'Scrolling behaves normally (the patch must not change host UI).',
    expectedScaleBun: 'Taps inside the plain ScrollView carry content depth (scroll_source != none).',
    dashboardLocation: DASH.replay,
    covers: ['config.autoInstrumentScrollViews'],
    run: async ctx => {
      ctx.navigate('ReplayPlayground');
      return {};
    },
  }),
  t({
    id: 'RPL-010',
    category: C,
    name: 'Replay disabled → no-ops',
    description: 'Profile no-replay: every replay method is safe and isRecording stays false.',
    profiles: ['no-replay'],
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'start() resolves but isRecording remains false.',
    expectedScaleBun: 'No replay for the session.',
    dashboardLocation: DASH.replay,
    covers: ['config.features.replay', 'facade.replay.start'],
    run: async ctx => {
      const R = ctx.sdk.ScaleBun.replay;
      await R.start();
      await R.captureFrame();
      ctx.expect(!R.isRecording, 'recording despite features.replay=false');
      return {};
    },
  }),
];
