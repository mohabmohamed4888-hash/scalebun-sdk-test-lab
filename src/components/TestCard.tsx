import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import type { TestDefinition } from '../testRunner/types';
import { Button, Card, KV, P, Row, StatusBadge, colors, styles } from './ui';
import { useResults } from '../hooks/useLab';
import { runOne } from '../testRunner/labRunner';
import { safeJson } from '../utils/safe';

export function confirmDangerous(def: TestDefinition): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      `⚠️ ${def.risk}: ${def.id}`,
      `${def.name}\n\n${def.description}\n\nExpected: ${def.expectedLocal}\n\nThis is NOT part of the safe suite. Continue?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'I understand — run it', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function TestCard({ def, compact }: { def: TestDefinition; compact?: boolean }) {
  const store = useResults();
  const r = store.get(def.id);
  const status = r?.status ?? 'NOT_RUN';
  const [open, setOpen] = useState(!compact);

  const run = async () => {
    let dangerConfirmed = false;
    if (def.dangerous) {
      dangerConfirmed = await confirmDangerous(def);
      if (!dangerConfirmed) return;
    }
    await runOne(def, { dangerConfirmed });
  };

  return (
    <Card danger={def.dangerous}>
      <Row wrap={false}>
        <StatusBadge status={status} />
        <Text style={[styles.h2, { flex: 1, fontSize: 14 }]} onPress={() => setOpen(o => !o)}>
          {def.id} · {def.name}
        </Text>
      </Row>
      <Row>
        <Text style={{ color: def.dangerous ? colors.danger : colors.muted, fontSize: 11 }}>
          risk {def.risk} · {def.platforms.join('/')} · {def.verification}
          {def.interactive ? ' · INTERACTIVE' : ''}
          {def.profiles ? ` · profile ${def.profiles.join('|')}` : ''}
        </Text>
      </Row>
      {open && (
        <View style={{ gap: 4 }}>
          <P muted>{def.description}</P>
          {def.preconditions.length > 0 && <P muted>Preconditions: {def.preconditions.join('; ')}</P>}
          <KV k="Expected local" v={def.expectedLocal} />
          <KV k="Expected ScaleBun" v={def.expectedScaleBun} />
          <KV k="Dashboard" v={def.dashboardLocation} />
          {r && (
            <>
              <KV k="testRunId" v={r.testRunId} />
              <KV k="Started" v={r.startedAt} />
              <KV k="Finished" v={r.finishedAt} />
              <KV k="Duration" v={r.durationMs !== undefined ? `${r.durationMs} ms` : undefined} />
              {r.note ? <P>{r.note}</P> : null}
              {r.error ? <P mono>{`${r.error.name}: ${r.error.message}`}</P> : null}
              {r.actual !== undefined ? (
                <P mono selectable>
                  {safeJson(r.actual).slice(0, 3000)}
                </P>
              ) : null}
              {r.logs.length > 0 ? <P mono>{r.logs.slice(-15).join('\n')}</P> : null}
            </>
          )}
        </View>
      )}
      <Row>
        <Button testID={`run-${def.id}`} small title={def.dangerous ? 'Run (dangerous)…' : 'Run Test'} kind={def.dangerous ? 'danger' : 'primary'} busy={status === 'RUNNING'} onPress={run} />
        {(status === 'LOCAL_PASS' || status === 'MANUAL_VERIFICATION_REQUIRED') && (
          <>
            <Button small kind="secondary" title="Mark VERIFIED" onPress={() => store.markVerified(def.id, 'tester', 'Confirmed in dashboard by tester')} />
            <Button small kind="ghost" title="Mark FAIL" onPress={() => store.markFailed(def.id, 'Dashboard check failed (tester)')} />
          </>
        )}
        {!open && <Button small kind="ghost" title="Details" onPress={() => setOpen(true)} />}
      </Row>
    </Card>
  );
}
