import React, { useEffect, useState } from 'react';
import { Linking, StatusBar, Text, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef, DarkTheme, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  ScaleBunProvider,
  ScaleBunErrorBoundary,
  ScaleBunDebugRoot,
  EngagePromptProvider,
  useEngagePrompt,
  type InAppGameRequest,
  type InAppGameResult,
  type PushNotification,
} from '@scalebun/react-native';
import { sdk } from './scalebun/sdk';
import { labBridge } from './scalebun/labBridge';
import { getLabState, patchLabState } from './scalebun/labState';
import { directInit, markInitSettled } from './scalebun/bootstrap';
import { readJson, KEYS } from './services/persistence';
import { guard } from './scalebun/integrationErrors';
import { firebaseConfigured } from './testRunner/labRunner';
import { colors, Button } from './components/ui';
import type { RootStackParamList, TabParamList } from './navigation/types';
import { HomeScreen } from './screens/HomeScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { ConfigScreen } from './screens/ConfigScreen';
import { DangerZoneScreen } from './screens/DangerZoneScreen';
import { CategoryScreen } from './screens/CategoryScreen';
import { ReplayPlaygroundScreen } from './screens/ReplayPlaygroundScreen';
import { EgressScreen, ImpressionsScreen, LabModalScreen, NavAScreen, NavBScreen, NavCScreen, PrivacySecretScreen, TabOneScreen, TabTwoScreen } from './screens/MiscScreens';
import { CATEGORY_META } from './screens/categoryMeta';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const OWN_SCHEME = 'scalebuntestlab://';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [OWN_SCHEME],
  config: {
    screens: {
      Home: '',
      Analytics: 'analytics',
      NavA: 'nav/a',
      NavB: 'nav/b',
      NavC: 'nav/c',
      Push: 'push',
      Ota: 'ota',
      Engage: 'engage',
    },
  },
};

/** Imperative navigation for tests (TestContext.navigate). */
labBridge.navigate = (route, params) => {
  if (!navigationRef.isReady()) return false;
  if (route === '__back__') {
    if (navigationRef.canGoBack()) navigationRef.goBack();
    return true;
  }
  if (route === 'TabOne' || route === 'TabTwo') {
    navigationRef.navigate('NestedTabs', { screen: route });
    return true;
  }
  (navigationRef.navigate as unknown as (name: string, params?: object) => void)(route, params);
  return true;
};

function NestedTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: colors.card } }}>
      <Tabs.Screen name="TabOne" component={TabOneScreen} />
      <Tabs.Screen name="TabTwo" component={TabTwoScreen} />
    </Tabs.Navigator>
  );
}

/** Registers the useEngagePrompt controller on the bridge (must sit inside an Engage provider). */
function EngageBridgeMount() {
  const controller = useEngagePrompt();
  useEffect(() => {
    labBridge.engage = controller;
    return () => {
      labBridge.engage = null;
    };
  }, [controller]);
  return null;
}

/** Child that throws during render when armed — for ERR-007. */
function BoundaryProbe() {
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => {
    labBridge.triggerBoundaryError = msg => setArmed(msg);
    return () => {
      labBridge.triggerBoundaryError = null;
    };
  }, []);
  if (armed) {
    const err = new Error(armed);
    err.name = 'SdkTestRenderError';
    throw err;
  }
  return null;
}

function BoundaryFallback({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    labBridge.boundaryLog.push('fallbackRendered', { message: error.message });
    const t = setTimeout(reset, 2500); // auto-recover so the probe can be re-run
    return () => clearTimeout(t);
  }, [error, reset]);
  return (
    <View style={{ backgroundColor: colors.danger, padding: 6 }}>
      <Text style={{ color: '#fff', fontSize: 12 }}>ErrorBoundary fallback: {error.message}</Text>
    </View>
  );
}

function BoundaryProbeHost() {
  const [key, setKey] = useState(0);
  return (
    <ScaleBunErrorBoundary
      key={key}
      screenName="ErrorBoundaryProbe"
      onError={(error, info) => labBridge.boundaryLog.push('onError', { message: error.message, componentStack: info.componentStack?.slice(0, 300) })}
      fallback={error => <BoundaryFallback error={error} reset={() => setKey(k => k + 1)} />}>
      <BoundaryProbe />
    </ScaleBunErrorBoundary>
  );
}

function RootFallback({ error }: { error: Error }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', gap: 12 }}>
      <Text style={{ color: colors.danger, fontSize: 18, fontWeight: '700' }}>Test Lab render error (captured by ScaleBunErrorBoundary)</Text>
      <Text style={{ color: colors.text }}>{error.message}</Text>
    </View>
  );
}

function Navigator() {
  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      theme={DarkTheme}
      onReady={() => {
        patchLabState({ navReady: true, currentRoute: navigationRef.getCurrentRoute()?.name });
        // Direct integrations wire the ref themselves (the provider does it via its prop).
        if (getLabState().profile.integration !== 'provider') guard('setNavigationRef', () => sdk.ScaleBun.setNavigationRef(navigationRef));
      }}
      onStateChange={() => patchLabState({ currentRoute: navigationRef.getCurrentRoute()?.name })}>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text }}>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'SDK Test Lab' }} />
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen name="Config" component={ConfigScreen} options={{ title: 'Config profiles' }} />
        <Stack.Screen name="DangerZone" component={DangerZoneScreen} options={{ title: '⚠️ Danger Zone' }} />
        <Stack.Screen name="Egress" component={EgressScreen} options={{ title: 'Egress observer' }} />
        <Stack.Screen name="ReplayPlayground" component={ReplayPlaygroundScreen} options={{ title: 'Replay Playground' }} />
        <Stack.Screen name="Impressions" component={ImpressionsScreen} />
        <Stack.Screen name="PrivacySecret" component={PrivacySecretScreen} />
        <Stack.Screen name="NavA" component={NavAScreen} />
        <Stack.Screen name="NavB" component={NavBScreen} />
        <Stack.Screen name="NavC" component={NavCScreen} />
        <Stack.Screen name="NestedTabs" component={NestedTabs} options={{ title: 'Nested tabs' }} />
        <Stack.Screen name="LabModal" component={LabModalScreen} options={{ presentation: 'modal' }} />
        {CATEGORY_META.map(m => (
          <Stack.Screen key={m.route} name={m.route as keyof RootStackParamList} component={CategoryScreen as never} options={{ title: m.title }} />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const onPushOpened = (n: PushNotification) => {
  labBridge.recordPush('opened', n);
  const link = n.data?.deepLink;
  if (link && link.startsWith(OWN_SCHEME)) Linking.openURL(link).catch(() => undefined);
};

const engageProps = {
  previewPollMs: __DEV__ ? 4000 : undefined,
  ratingRouting: {
    highRatingThreshold: 4,
    routeLowToFeedback: true,
    onHighRating: (info: { rating: number }) => {
      labBridge.engageLog.push('ratingHigh', { rating: info.rating });
      sdk.ScaleBun.engage.requestStoreReview().catch(() => undefined);
    },
    onLowRating: (info: { rating: number }) => labBridge.engageLog.push('ratingLow', { rating: info.rating }),
  },
  onInAppDeepLink: (info: { deepLink: string; message: { id: string } }) => {
    labBridge.engageLog.push('inAppDeepLink', { deepLink: info.deepLink, messageId: info.message.id });
    if (info.deepLink.startsWith(OWN_SCHEME)) Linking.openURL(info.deepLink).catch(() => undefined);
  },
  onInAppGameRequest: async (req: InAppGameRequest): Promise<InAppGameResult> => {
    labBridge.engageLog.push('gameRequest', { campaignId: req.campaignId, gameKey: req.gameKey, variantKey: req.variantKey, action: req.action });
    // The Test Lab has no authenticated reward backend: report NOT_CONFIGURED honestly.
    return { attemptId: req.attemptId, status: 'unavailable', retryable: false, message: 'NOT_CONFIGURED: Test Lab has no game backend' };
  },
};

export default function App({ config, shouldInit }: { config: Record<string, unknown>; shouldInit: boolean }) {
  const integration = getLabState().profile.integration;

  useEffect(() => {
    // OTA lifecycle events → live log (OTA screen).
    const unsubOta = sdk.otaEventEmitter.addListener(e => labBridge.recordOta(e));
    if (shouldInit && integration !== 'provider') directInit(config);
    // Re-arm push callbacks on every boot once the tester enabled push (cold-start opens).
    (async () => {
      const wasEnabled = await readJson<boolean>(KEYS.pushEnabled, false);
      if (wasEnabled && firebaseConfigured()) {
        await sdk.ScaleBun.enablePush({ skipPermissionRequest: true, onForegroundNotification: n => labBridge.recordPush('foreground', n), onNotificationOpened: onPushOpened });
      }
    })().catch(() => undefined);
    const unsubPush = sdk.ScaleBun.onNotificationOpened(onPushOpened);
    return () => {
      unsubOta();
      unsubPush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tree = (
    <ScaleBunErrorBoundary screenName="Root" fallback={e => <RootFallback error={e} />}>
      <StatusBar barStyle="light-content" />
      <BoundaryProbeHost />
      <Navigator />
    </ScaleBunErrorBoundary>
  );

  if (!shouldInit) {
    return <SafeAreaProvider>{tree}</SafeAreaProvider>;
  }

  if (integration === 'provider') {
    return (
      <SafeAreaProvider>
        <ScaleBunProvider
          config={config}
          navigationRef={navigationRef}
          captureInteractions
          onReady={() => markInitSettled()}
          onInitError={e => markInitSettled(e ?? new Error('onInitError'))}
          {...engageProps}>
          <EngageBridgeMount />
          {tree}
        </ScaleBunProvider>
      </SafeAreaProvider>
    );
  }

  const direct = (
    <EngagePromptProvider engage={sdk.ScaleBun.engage} {...engageProps}>
      <EngageBridgeMount />
      {tree}
    </EngagePromptProvider>
  );
  return (
    <SafeAreaProvider>
      {integration === 'direct-legacy-root' ? <ScaleBunDebugRoot navigationRef={navigationRef}>{direct}</ScaleBunDebugRoot> : direct}
    </SafeAreaProvider>
  );
}

/** Rendered while AsyncStorage state loads (a few ms). */
export function BootSplash() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.text }}>Loading SDK Test Lab…</Text>
    </View>
  );
}

export function BootError({ error, retry }: { error: string; retry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', gap: 12 }}>
      <Text style={{ color: colors.danger }}>Test Lab failed to prepare: {error}</Text>
      <Button title="Retry" onPress={retry} />
    </View>
  );
}

