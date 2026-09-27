import { t, DASH } from './helpers';
import DeviceInfo from 'react-native-device-info';

const C = 'Attribution' as const;

export const attributionTests = [
  t({
    id: 'ATT-001',
    category: C,
    name: 'Platform identifiers (consent-safe only)',
    description: 'iOS: sends IDFV (vendor id, no ATT prompt needed). IDFA/GAID are NOT collected — the Test Lab never bypasses ATT / AdID consent.',
    platforms: ['ios'],
    platformNote: 'Android GAID requires the Play Services AdID permission + user consent flow the Test Lab does not implement; ANDROID_ID is not an advertising id.',
    requires: ['sdkInitialized', 'appId'],
    expectedLocal: 'setIdentifiers({ idfv }) does not throw.',
    expectedScaleBun: 'Installation shows idfv; no idfa.',
    dashboardLocation: DASH.attribution,
    covers: ['facade.events.setIdentifiers'],
    run: async ctx => {
      const idfv = await DeviceInfo.getUniqueId();
      ctx.sdk.ScaleBun.events.setIdentifiers({ idfv });
      return { output: { idfvPrefix: `${idfv.slice(0, 8)}…` } };
    },
  }),
  t({
    id: 'ATT-002',
    category: C,
    name: 'Attribution click id',
    description: 'events.setAttributionClickId("sdk_test_click_<run>").',
    requires: ['sdkInitialized', 'appId'],
    expectedLocal: 'No throw.',
    expectedScaleBun: 'Installation attributed to click id sdk_test_click_<run>.',
    dashboardLocation: DASH.attribution,
    covers: ['facade.events.setAttributionClickId'],
    run: async ctx => {
      ctx.sdk.ScaleBun.events.setAttributionClickId(`sdk_test_click_${ctx.runId}`);
      return {};
    },
  }),
  t({
    id: 'ATT-003',
    category: C,
    name: 'Play Install Referrer (automatic)',
    description: 'Read once per install by the SDK. Install via `adb install` gives an empty referrer; use a Play internal-testing link with referrer=utm_source%3Dsdk_test%26scalebun_click_id%3D<id> for a real value.',
    platforms: ['android'],
    platformNote: 'Play Install Referrer is Android-only.',
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'n/a',
    expectedScaleBun: 'install_referrer event on first launch (when Play supplied one).',
    dashboardLocation: DASH.attribution,
    covers: ['native.installReferrer'],
    run: async () => ({ note: 'Fresh install from Play internal testing with a referrer link, then open once.' }),
  }),
  t({
    id: 'ATT-004',
    category: C,
    name: 'SKAdNetwork conversion value (events namespace)',
    description: 'events.updateSkanConversionValue(12, "medium", false) → Promise<boolean>.',
    platforms: ['ios'],
    platformNote: 'SKAdNetwork is an Apple framework; not called on Android.',
    requires: ['sdkInitialized'],
    expectedLocal: 'Resolves true on iOS 16.1+/SKAN4 device builds (native module present).',
    expectedScaleBun: 'Postback only in real ad-attributed installs — not observable in a dev build.',
    dashboardLocation: DASH.attribution,
    covers: ['facade.events.updateSkanConversionValue'],
    run: async ctx => {
      const ok = await ctx.sdk.ScaleBun.events.updateSkanConversionValue(12, 'medium', false);
      ctx.expect(ok === true, 'native SKAN call not made');
      return { output: { ok } };
    },
  }),
  t({
    id: 'ATT-005',
    category: C,
    name: 'SKAdNetwork conversion value (facade, fire-and-forget)',
    description: 'ScaleBun.updateSkanConversionValue(13) (void).',
    platforms: ['ios'],
    platformNote: 'iOS only.',
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'No throw.',
    expectedScaleBun: 'n/a (Apple postback).',
    dashboardLocation: DASH.attribution,
    covers: ['facade.updateSkanConversionValue'],
    run: async ctx => {
      ctx.sdk.ScaleBun.updateSkanConversionValue(13);
      return {};
    },
  }),
  t({
    id: 'ATT-006',
    category: C,
    name: 'Deferred deep links',
    description: 'No public deferred-deep-link API in 2.4.0.',
    verification: 'LOCAL_ONLY',
    expectedLocal: 'SKIPPED WITH REASON.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['missing.deferredDeepLink'],
    run: async () => ({ kind: 'SKIPPED', note: 'NOT-AVAILABLE-IN-INSTALLED-VERSION' }),
  }),
];
