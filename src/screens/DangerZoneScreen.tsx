import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Banner, Card, H1, P, colors, styles } from '../components/ui';
import { TestCard } from '../components/TestCard';
import { ALL_TESTS } from '../tests/registry';
import { ENV } from '../config/env';
import { useLabState } from '../hooks/useLab';

/**
 * Every dangerous / destructive test lives here and ONLY here. None of them is
 * part of RUN SAFE TEST SUITE. Each requires a per-run confirmation dialog, and
 * release builds disable them unless ENABLE_DANGEROUS_TESTS=true was set at
 * build time.
 */
export function DangerZoneScreen() {
  const s = useLabState();
  const defs = ALL_TESTS.filter(t => t.dangerous);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="screen-DangerZone">
      <View style={{ backgroundColor: colors.danger, borderRadius: 10, padding: 16, gap: 6 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>⚠️ DANGEROUS / DESTRUCTIVE TESTS</Text>
        <Text style={{ color: '#fff' }}>
          These tests intentionally CRASH the app, FREEZE the UI, flood the queue, or RESTART into OTA bundles. Save your work, export results first, and never run
          them on a device someone else is using.
        </Text>
      </View>
      {!ENV.dangerousTestsAllowed && <Banner kind="danger" text="Disabled in this RELEASE build. Rebuild with ENABLE_DANGEROUS_TESTS=true for internal testing." />}
      {s.pendingCrashMarker && <Banner kind="info" text={`A crash was armed in run ${s.pendingCrashMarker.runId} at ${s.pendingCrashMarker.armedAt}. Run ERR-013 (Errors screen) to record the drain check, then verify in Diagnose → Crashes.`} />}
      <Card>
        <H1>After a crash</H1>
        <P>1. Relaunch the app (the native crash handler persisted the report). 2. Stay online ≥ 30 s so the drain uploads. 3. Run ERR-013. 4. Dashboard → Diagnose → Crashes, filter by installation id shown on Home.</P>
      </Card>
      {defs.map(d => (
        <TestCard key={d.id} def={d} />
      ))}
    </ScrollView>
  );
}
