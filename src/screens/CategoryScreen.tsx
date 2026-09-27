import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, H1, H2, P, Row, StatusBadge, styles } from '../components/ui';
import { TestCard } from '../components/TestCard';
import { META_BY_ROUTE } from './categoryMeta';
import { testsInCategory } from '../tests/registry';
import { isSafeSuiteTest } from '../testRunner/runner';
import { runSafe } from '../testRunner/labRunner';
import { useResults } from '../hooks/useLab';
import { SetupPanel, AnalyticsPanel, SessionsPanel, IdentityPanel, ErrorsPanel, NetworkPanel, OfflinePanel, PerformancePanel, FeatureMatrixPanel } from './panels/CorePanels';
import { ReplayPanel, NavigationPanel, PushPanel, EngagePanel, AttributionPanel, PrivacyPanel, OtaPanel, DiagnosticsPanel } from './panels/FeaturePanels';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, keyof RootStackParamList>;

export function CategoryScreen({ route, navigation }: Props) {
  const meta = META_BY_ROUTE.get(route.name)!;
  const defs = useMemo(() => testsInCategory(meta.category).filter(d => !d.dangerous), [meta.category]);
  const store = useResults();
  const counts = store.counts(defs.map(d => d.id));
  const [progress, setProgress] = useState<string | null>(null);
  const go = (r: string) => navigation.navigate(r as never);
  const params = (route.params ?? {}) as { heavy?: boolean };

  const panel = (() => {
    switch (route.name) {
      case 'Setup':
        return <SetupPanel />;
      case 'Analytics':
        return <AnalyticsPanel />;
      case 'Sessions':
        return <SessionsPanel />;
      case 'Identity':
        return <IdentityPanel />;
      case 'Errors':
        return <ErrorsPanel goDanger={() => go('DangerZone')} />;
      case 'Network':
        return <NetworkPanel />;
      case 'Offline':
        return <OfflinePanel />;
      case 'Performance':
        return <PerformancePanel heavy={params.heavy} />;
      case 'Replay':
        return <ReplayPanel openPlayground={() => go('ReplayPlayground')} />;
      case 'Navigation':
        return <NavigationPanel go={go} />;
      case 'Push':
        return <PushPanel />;
      case 'Engage':
        return <EngagePanel />;
      case 'Attribution':
        return <AttributionPanel />;
      case 'Privacy':
        return <PrivacyPanel go={go} />;
      case 'Ota':
        return <OtaPanel />;
      case 'Diagnostics':
        return <DiagnosticsPanel />;
      case 'FeatureMatrix':
        return <FeatureMatrixPanel goConfig={() => go('Config')} />;
      default:
        return null;
    }
  })();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID={`screen-${route.name}`}>
      <H1>{meta.title}</H1>
      <P muted>{meta.description}</P>
      {meta.prerequisites.length > 0 && <P muted>Prerequisites: {meta.prerequisites.join(' · ')}</P>}
      {panel}
      <Card>
        <H2>Tests ({defs.length})</H2>
        <Row>
          {(['VERIFIED', 'LOCAL_PASS', 'FAIL', 'MANUAL_VERIFICATION_REQUIRED', 'SKIPPED', 'NOT_RUN'] as const).map(s => (
            <View key={s} style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
              <StatusBadge status={s} />
              <P>{counts[s]}</P>
            </View>
          ))}
        </Row>
        <Button
          testID={`run-safe-${route.name}`}
          title={progress ?? `Run ${defs.filter(isSafeSuiteTest).length} safe tests in this category`}
          busy={progress !== null}
          onPress={async () => {
            setProgress('starting…');
            await runSafe(defs, (i, n, cur) => setProgress(`${i + 1}/${n} ${cur.id}`));
            setProgress(null);
          }}
        />
      </Card>
      {defs.map(d => (
        <TestCard key={d.id} def={d} compact />
      ))}
    </ScrollView>
  );
}
