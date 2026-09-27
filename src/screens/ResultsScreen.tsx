import React, { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, Share, Text, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { Button, Card, H1, H2, KV, P, Row, StatusBadge, colors, styles } from '../components/ui';
import { ALL_TESTS } from '../tests/registry';
import { CATEGORIES, type TestStatus } from '../testRunner/types';
import { buildReport } from '../testRunner/report';
import { useLabState, useResults } from '../hooks/useLab';
import { sdk } from '../scalebun/sdk';
import { ENV } from '../config/env';

type Filter = 'ALL' | 'VERIFIED' | 'LOCAL_PASS' | 'FAIL' | 'NOT_RUN' | 'MANUAL' | 'SKIPPED';
const FILTERS: Filter[] = ['ALL', 'VERIFIED', 'LOCAL_PASS', 'FAIL', 'NOT_RUN', 'MANUAL', 'SKIPPED'];
const matches = (f: Filter, s: TestStatus) => f === 'ALL' || (f === 'MANUAL' ? s === 'MANUAL_VERIFICATION_REQUIRED' : s === f);

export function ResultsScreen() {
  const store = useResults();
  const lab = useLabState();
  const [filter, setFilter] = useState<Filter>('ALL');
  const grouped = useMemo(
    () =>
      CATEGORIES.map(c => ({
        category: c,
        tests: ALL_TESTS.filter(t => t.category === c && matches(filter, store.status(t.id))),
      })).filter(g => g.tests.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, store.all()],
  );

  const exportReport = async () => {
    const v = Platform.constants.reactNativeVersion;
    const report = buildReport(lab.runId, ALL_TESTS, store.all(), {
      sdkVersion: sdk.version,
      reactNativeVersion: `${v.major}.${v.minor}.${v.patch}`,
      platform: Platform.OS,
      osVersion: String(Platform.Version),
      appVersion: DeviceInfo.getVersion(),
      buildNumber: DeviceInfo.getBuildNumber(),
      environment: ENV.environment,
      appId: ENV.appId,
      clientKey: ENV.clientKey,
      profileId: lab.profileId,
      integration: lab.profile.integration,
      configSnapshot: lab.configSnapshot,
      deviceModel: DeviceInfo.getModel(),
      isEmulator: DeviceInfo.isEmulatorSync(),
    });
    const json = JSON.stringify(report, null, 2);
    await store.flushNow();
    await Share.share({ title: `scalebun-test-lab-${lab.runId}.json`, message: json });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="screen-Results">
      <H1>Results</H1>
      <KV k="testRunId" v={lab.runId} />
      <Row>
        {FILTERS.map(f => (
          <Button key={f} small kind={f === filter ? 'primary' : 'ghost'} title={f} onPress={() => setFilter(f)} testID={`filter-${f}`} />
        ))}
      </Row>
      <Row>
        <Button title="Export Results (JSON)" onPress={exportReport} testID="export-results" />
        <Button
          kind="danger"
          title="Reset"
          onPress={() =>
            Alert.alert('Reset all results?', 'Local results are cleared (the testRunId is kept).', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', style: 'destructive', onPress: () => store.reset() },
            ])
          }
        />
      </Row>
      <P muted>Exports never include credentials: the client key is reduced to a prefix and secret-like values are redacted.</P>
      {grouped.map(g => (
        <Card key={g.category}>
          <H2>{g.category}</H2>
          {g.tests.map(t => {
            const r = store.get(t.id);
            return (
              <View key={t.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6, gap: 2 }}>
                <Row wrap={false}>
                  <StatusBadge status={r?.status ?? 'NOT_RUN'} />
                  <Text style={{ color: colors.text, flex: 1, fontSize: 13 }}>
                    {t.id} {t.name}
                  </Text>
                </Row>
                {r && (
                  <P muted>
                    {r.finishedAt ?? r.startedAt} · {r.durationMs ?? '?'} ms {r.verifiedBy ? `· verified by ${r.verifiedBy}` : ''}
                  </P>
                )}
                {r?.note ? <P>{r.note}</P> : null}
                <P muted>Dashboard: {t.dashboardLocation}</P>
              </View>
            );
          })}
        </Card>
      ))}
    </ScrollView>
  );
}
