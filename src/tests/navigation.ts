import { Linking } from 'react-native';
import { t, DASH } from './helpers';
import { getLabState } from '../scalebun/labState';

const C = 'Navigation' as const;

export const navigationTests = [
  t({
    id: 'NAV-001',
    category: C,
    name: 'Navigation ref wired to ScaleBun',
    description: 'Provider navigationRef (or setNavigationRef in direct mode) is connected and the container is ready.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'Navigation container ready; current route known.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['provider.navigationRef', 'facade.setNavigationRef'],
    run: async ctx => {
      const s = getLabState();
      ctx.expect(s.navReady, 'navigation container not ready');
      return { output: { currentRoute: s.currentRoute, integration: s.profile.integration } };
    },
  }),
  t({
    id: 'NAV-002',
    category: C,
    name: 'Stack push / back sequence',
    description: 'Push NavA → NavB → NavC then go back twice (programmatic).',
    requires: ['sdkInitialized'],
    expectedLocal: 'All navigations succeed.',
    expectedScaleBun: 'screen_viewed: NavA, NavB, NavC, NavB, NavA.',
    dashboardLocation: DASH.sessions,
    covers: ['provider.navigationRef'],
    run: async ctx => {
      for (const r of ['NavA', 'NavB', 'NavC']) {
        ctx.expect(ctx.navigate(r), `navigate ${r}`);
        await ctx.sleep(600);
      }
      ctx.navigate('__back__');
      await ctx.sleep(600);
      ctx.navigate('__back__');
      await ctx.sleep(600);
      return {};
    },
  }),
  t({
    id: 'NAV-003',
    category: C,
    name: 'Nested tabs, modal and repeated visits',
    description: 'Opens the nested Tabs navigator (TabOne→TabTwo→TabOne), a modal screen, and visits NavA three times.',
    requires: ['sdkInitialized'],
    expectedLocal: 'Navigation succeeds.',
    expectedScaleBun: 'Nested route names (TabOne/TabTwo) and ModalScreen in the timeline; NavA ×3.',
    dashboardLocation: DASH.sessions,
    covers: ['provider.navigationRef'],
    run: async ctx => {
      const steps = ['NestedTabs', 'TabTwo', 'TabOne', 'LabModal', '__back__', 'NavA', 'Home', 'NavA', 'Home', 'NavA', 'Home'];
      for (const s of steps) {
        ctx.navigate(s);
        await ctx.sleep(500);
      }
      return { output: steps };
    },
  }),
  t({
    id: 'NAV-004',
    category: C,
    name: 'Deep link navigation',
    description: 'Opens scalebuntestlab://nav/b through Linking; React Navigation linking routes to NavB.',
    requires: ['sdkInitialized'],
    expectedLocal: 'Current route becomes NavB within 2s.',
    expectedScaleBun: 'Deep link event + screen_viewed NavB.',
    dashboardLocation: DASH.sessions,
    covers: ['config.automaticEventTracking'],
    run: async ctx => {
      await Linking.openURL(`scalebuntestlab://nav/b?testRunId=${encodeURIComponent(ctx.runId)}`);
      const ok = await ctx.waitFor(() => getLabState().currentRoute === 'NavB', 3000, 200);
      ctx.expect(ok, `route is ${getLabState().currentRoute}`);
      return {};
    },
  }),
  t({
    id: 'NAV-005',
    category: C,
    name: 'ScaleBunScreen / useScaleBunScreen beacons',
    description: 'NavC renders <ScaleBunScreen name="sdk_test_beacon_component"/> and useScaleBunScreen("sdk_test_beacon_hook").',
    requires: ['sdkInitialized'],
    expectedLocal: 'Screen rendered.',
    expectedScaleBun: 'Beacon screen names appear alongside the navigator route name.',
    dashboardLocation: DASH.sessions,
    covers: ['export.ScaleBunScreen', 'export.useScaleBunScreen'],
    run: async ctx => {
      ctx.navigate('NavC');
      await ctx.sleep(1000);
      ctx.navigate('Home');
      return {};
    },
  }),
  t({
    id: 'NAV-006',
    category: C,
    name: 'Legacy ScaleBunDebugRoot wrapper',
    description: 'Profile direct-legacy-root mounts the deprecated wrapper; the app must work and log one deprecation warning.',
    profiles: ['direct-legacy-root'],
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'App functional; console shows the ScaleBunDebugRoot deprecation warning.',
    expectedScaleBun: 'Screens still tracked.',
    dashboardLocation: DASH.sessions,
    covers: ['export.ScaleBunDebugRoot'],
    run: async ctx => {
      ctx.navigate('NavA');
      await ctx.sleep(500);
      ctx.navigate('Home');
      return {};
    },
  }),
  t({
    id: 'NAV-007',
    category: C,
    name: 'Expo Router integration',
    description: 'Not applicable: bare React Native app using React Navigation. expo-router is an optional SDK peer that is stubbed by withScaleBun.',
    verification: 'LOCAL_ONLY',
    expectedLocal: 'SKIPPED WITH REASON.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['missing.expoRouter'],
    run: async () => ({ kind: 'SKIPPED', note: 'expo-router intentionally not installed; test it in a separate Expo Router test app to avoid mixing navigation integrations.' }),
  }),
];
