import React, { useState } from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Banner, Button, Card, H1, H2, KV, P, Row, StatusBadge, colors, styles } from '../components/ui';
import { sdk } from '../scalebun/sdk';
import { ENV } from '../config/env';
import { maskKey } from '../config/envValidation';
import { ALL_TESTS } from '../tests/registry';
import { isSafeSuiteTest } from '../testRunner/runner';
import { runSafe, resultsStore } from '../testRunner/labRunner';
import { useLabState, useResults, useNetInfo, usePoll, useIntegrationErrors } from '../hooks/useLab';
import { CATEGORY_META } from './categoryMeta';
import { guard } from '../scalebun/integrationErrors';
import { clearIntegrationErrors } from '../scalebun/integrationErrors';
import { startNewTestSession } from '../scalebun/bootstrap';
import { disabledFeatures } from '../config/profiles';
import { safeJson } from '../utils/safe';
import type { RootStackParamList } from '../navigation/types';

const S = sdk.ScaleBun;
const rnVersion = (() => {
  const v = Platform.constants.reactNativeVersion;
  return `${v.major}.${v.minor}.${v.patch}${v.prerelease ? `-${v.prerelease}` : ''}`;
})();

export function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  const s = useLabState();
  const store = useResults();
  const net = useNetInfo();
  const errors = useIntegrationErrors();
  const [progress, setProgress] = useState<string | null>(null);
  const cancel = React.useRef(false);
  const live = usePoll(
    () => ({
      ids: guard('events.ids', () => S.events.ids()) ?? null,
      stats: guard('events.stats', () => S.events.stats()) ?? null,
      replay: S.replay.isRecording,
      perf: S.performance.isActive(),
      push: S.push.status(),
      ota: sdk.otaOrchestrator.getCurrentBundle(),
      otaEnabled: sdk.otaOrchestrator.isEnabled(),
      flags: guard('getFeatureFlags', () => S.getFeatureFlags()) ?? {},
    }),
    1000,
  );
  const counts = store.counts(ALL_TESTS.map(t => t.id));
  const last = store.lastFinished();
  const safeCount = ALL_TESTS.filter(isSafeSuiteTest).length;
  const off = disabledFeatures(s.profile, s.custom);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="screen-Home">
      <H1>ScaleBun SDK Test Lab</H1>
      {s.initPhase === 'NOT_CONFIGURED' && <Banner kind="danger" text="NOT_CONFIGURED: no ScaleBun credentials in .env. The app works; SDK-dependent tests are SKIPPED with NOT_CONFIGURED." />}
      {s.profile.warning && <Banner text={`Profile "${s.profile.label}": ${s.profile.warning}`} />}
      {off.length > 0 && <Banner kind="info" text={`Intentionally DISABLED: ${off.join(', ')}`} />}

      <Card>
        <H2>Build & environment</H2>
        <KV k="SDK version" v={`@scalebun/react-native ${sdk.version}`} />
        <KV k="React Native" v={rnVersion} />
        <KV k="OS" v={`${Platform.OS} ${String(Platform.Version)} · ${DeviceInfo.getModel()}${DeviceInfo.isEmulatorSync() ? ' (emulator)' : ''}`} />
        <KV k="App version / build" v={`${DeviceInfo.getVersion()} (${DeviceInfo.getBuildNumber()}) · ${__DEV__ ? 'DEBUG' : 'RELEASE'}`} />
        <KV k="Environment" v={ENV.environment} />
        <KV k="Project / app" v={`${ENV.projectName} · appId ${ENV.appId ?? '—'} · key ${maskKey(ENV.clientKey)}`} />
      </Card>

      <Card>
        <H2>SDK state</H2>
        <KV k="Init" v={`${s.initPhase}${s.initError ? ` — ${s.initError}` : ''}`} color={s.initPhase === 'READY' ? colors.ok : colors.warn} />
        <KV k="Profile / integration" v={`${s.profileId} / ${s.profile.integration}`} />
        <KV k="User" v={live.ids?.userId ?? 'anonymous'} />
        <KV k="installationId" v={live.ids?.installationId} />
        <KV k="anonymousId" v={live.ids?.anonymousId} />
        <KV k="sessionId" v={live.ids?.sessionId} />
        <KV k="Queue pending/dropped" v={live.stats ? `${live.stats.pending}/${live.stats.dropped}` : '—'} />
        <KV k="Feature flags" v={safeJson(live.flags, 0)} />
        <KV k="Network" v={net ? `${net.type} · ${net.isConnected ? 'online' : 'OFFLINE'}` : '…'} color={net?.isConnected ? undefined : colors.warn} />
        <KV k="OTA" v={`${live.otaEnabled ? 'enabled' : 'disabled'} · bundle ${live.ota ? `${live.ota.id} v${live.ota.version}` : 'factory'}`} />
        <KV k="Push" v={`${live.push.adapter ?? 'not enabled'} · permission ${live.push.permission ?? '—'} · token ${live.push.token ? 'registered' : 'none'}`} />
        <KV k="Replay recording" v={String(live.replay)} />
        <KV k="Performance active" v={String(live.perf)} />
      </Card>

      <Card>
        <H2>Test session</H2>
        <KV k="testRunId" v={s.runId} />
        <KV k="Started" v={s.runStartedAt} />
        <KV k="Last result" v={last ? `${last.testId} → ${last.status}` : '—'} />
        <Row>
          {(['VERIFIED', 'LOCAL_PASS', 'FAIL', 'MANUAL_VERIFICATION_REQUIRED', 'SKIPPED', 'NOT_RUN'] as const).map(st => (
            <View key={st} style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
              <StatusBadge status={st} />
              <P>{counts[st]}</P>
            </View>
          ))}
        </Row>
        <Button
          testID="run-all-safe"
          title={progress ?? `RUN SAFE TEST SUITE (${safeCount})`}
          busy={progress !== null}
          onPress={async () => {
            cancel.current = false;
            setProgress('starting…');
            await runSafe(ALL_TESTS, (i, n, cur) => setProgress(`${i + 1}/${n} ${cur.id}`), () => cancel.current);
            setProgress(null);
          }}
        />
        {progress && <Button kind="ghost" title="Cancel suite" onPress={() => (cancel.current = true)} />}
        <Row>
          <Button small kind="secondary" title="Results / Export" onPress={() => navigation.navigate('Results')} />
          <Button small kind="secondary" title="Config profiles" onPress={() => navigation.navigate('Config')} />
          <Button small kind="danger" title="DANGEROUS / DESTRUCTIVE TESTS" onPress={() => navigation.navigate('DangerZone')} />
          <Button
            small
            kind="ghost"
            title="New test session"
            onPress={() =>
              Alert.alert('New test session?', 'Generates a new testRunId and clears local results (export first!).', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'New session',
                  onPress: async () => {
                    await startNewTestSession();
                    resultsStore.reset();
                  },
                },
              ])
            }
          />
        </Row>
      </Card>

      <Card>
        <H2>Capabilities</H2>
        <Row>
          {CATEGORY_META.map(m => (
            <Button key={m.route} small kind="secondary" testID={`nav-${m.route}`} title={m.title} onPress={() => navigation.navigate(m.route as never)} />
          ))}
          <Button small kind="secondary" title="Replay Playground" onPress={() => navigation.navigate('ReplayPlayground')} />
          <Button small kind="secondary" title="Egress observer" onPress={() => navigation.navigate('Egress')} />
        </Row>
      </Card>

      <Card>
        <H2>Integration errors ({errors.length})</H2>
        {errors.length === 0 ? <P muted>No ScaleBun call has thrown or rejected.</P> : errors.slice(0, 10).map((e, i) => <P key={i} mono>{`${e.at.slice(11, 19)} ${e.where}: ${e.name}: ${e.message}`}</P>)}
        {errors.length > 0 && <Button small kind="ghost" title="Clear" onPress={clearIntegrationErrors} />}
      </Card>
      {ENV.problems.length > 0 && (
        <Card>
          <H2>Configuration problems</H2>
          {ENV.problems.map(p => (
            <P key={p}>• {p}</P>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}
