import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScaleBunImpression, ScaleBunScreen, useScaleBunScreen } from '@scalebun/react-native';
import { Button, Card, H1, H2, KV, P, Row, colors, styles } from '../components/ui';
import { useEgress, useLabState } from '../hooks/useLab';
import { fakePii } from '../tests/helpers';
import type { RootStackParamList } from '../navigation/types';

type ScreenProps<N extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, N>;

export function ImpressionsScreen() {
  const { runId } = useLabState();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <H1>Impressions</H1>
      <ScaleBunImpression name="sdk_test_promo" properties={{ slot: 'impressions_top', testRunId: runId }} resetKey={runId}>
        <Card style={{ borderColor: colors.accent }}>
          <H2>Summer promo (TEST)</H2>
          <P>This card emits element_viewed once it has been ≥50% visible for a moment.</P>
        </Card>
      </ScaleBunImpression>
      {Array.from({ length: 20 }, (_, i) => (
        <P key={i} muted>
          filler {i}
        </P>
      ))}
      <ScaleBunImpression name="sdk_test_below_fold" properties={{ slot: 'below_fold' }}>
        <Card>
          <P>Below-the-fold card (emits only after you scroll to it).</P>
        </Card>
      </ScaleBunImpression>
    </ScrollView>
  );
}

export function PrivacySecretScreen() {
  const { runId } = useLabState();
  const pii = fakePii(runId);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <H1>PrivacySecret</H1>
      <P>This screen is added to replay ignoredScreens by RPL-005/PRIV-007: NO frames of it should exist.</P>
      <Card>
        <KV k="Fake account" v={pii.iban} />
        <KV k="Fake card" v={pii.card} />
        <KV k="Fake email" v={pii.email} />
      </Card>
    </ScrollView>
  );
}

function SimpleScreen({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <View style={[styles.screen, { padding: 16, gap: 12 }]}>
      <H1>{title}</H1>
      {children}
    </View>
  );
}

export function NavAScreen({ navigation }: ScreenProps<'NavA'>) {
  return (
    <SimpleScreen title="NavA">
      <Row>
        <Button title="Push NavB" onPress={() => navigation.push('NavB')} />
        <Button kind="secondary" title="Back" onPress={() => navigation.goBack()} />
      </Row>
    </SimpleScreen>
  );
}

export function NavBScreen({ navigation, route }: ScreenProps<'NavB'>) {
  return (
    <SimpleScreen title="NavB">
      <P muted>deep-link params: {JSON.stringify(route.params ?? {})}</P>
      <Row>
        <Button title="Push NavC" onPress={() => navigation.push('NavC')} />
        <Button kind="secondary" title="Back" onPress={() => navigation.goBack()} />
      </Row>
    </SimpleScreen>
  );
}

export function NavCScreen({ navigation }: ScreenProps<'NavC'>) {
  useScaleBunScreen('sdk_test_beacon_hook');
  return (
    <SimpleScreen title="NavC">
      <ScaleBunScreen name="sdk_test_beacon_component" />
      <P muted>This screen registers ScaleBunScreen + useScaleBunScreen beacons.</P>
      <Button kind="secondary" title="Back" onPress={() => navigation.goBack()} />
    </SimpleScreen>
  );
}

export function TabOneScreen() {
  return <SimpleScreen title="TabOne (nested)" />;
}

export function TabTwoScreen() {
  return <SimpleScreen title="TabTwo (nested)" />;
}

export function LabModalScreen({ navigation }: ScreenProps<'LabModal'>) {
  return (
    <SimpleScreen title="LabModal (presentation: modal)">
      <Button title="Close" onPress={() => navigation.goBack()} />
    </SimpleScreen>
  );
}

export function EgressScreen() {
  const egress = useEgress();
  const recs = egress.all().slice(-80).reverse();
  const summary = egress.sdkSummary(0);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <H1>Egress observer</H1>
      <P muted>Pass-through fetch observer (JS lanes only; native replay/crash uploads are invisible). Stores method/host/path/status/size only — never bodies, headers or query strings.</P>
      <Card>
        <KV k="SDK requests" v={summary.requests} />
        <KV k="SDK failures" v={summary.failures} />
        <KV k="Unscanned bodies" v={summary.unscanned} />
        {Object.entries(summary.paths).map(([k, n]) => (
          <P key={k} mono>
            {n}× {k}
          </P>
        ))}
        <Button small kind="ghost" title="Clear" onPress={() => egress.clear()} />
      </Card>
      {recs.map(r => (
        <Text key={r.seq} style={{ color: r.sdk ? colors.accent : colors.muted, fontFamily: 'monospace', fontSize: 11 }}>
          #{r.seq} {r.method} {r.host}
          {r.path} → {r.status ?? r.error ?? '…'} {r.durationMs ?? ''}ms {r.needleHits.length ? `NEEDLE:${r.needleHits.join(',')}` : ''}
        </Text>
      ))}
    </ScrollView>
  );
}
