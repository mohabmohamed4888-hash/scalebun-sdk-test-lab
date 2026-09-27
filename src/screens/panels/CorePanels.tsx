import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, H2, KV, P, Row, Banner, colors } from '../../components/ui';
import { sdk } from '../../scalebun/sdk';
import { ENV } from '../../config/env';
import { maskKey } from '../../config/envValidation';
import { useLabState, usePoll, useNetInfo, useEgress } from '../../hooks/useLab';
import { guard, guardAsync } from '../../scalebun/integrationErrors';
import { isSdkInitialized } from '../../scalebun/bootstrap';
import { fakeUserId } from '../../utils/ids';
import { safeJson } from '../../utils/safe';
import { labFetch } from '../../services/networkClient';
import { generateNumbered } from '../../tests/offline';
import { readJson, KEYS } from '../../services/persistence';
import { disabledFeatures } from '../../config/profiles';

const S = sdk.ScaleBun;

export function SetupPanel() {
  const s = useLabState();
  return (
    <Card>
      <H2>Initialization</H2>
      <KV k="Phase" v={s.initPhase} color={s.initPhase === 'READY' ? colors.ok : colors.warn} />
      <KV k="Profile" v={`${s.profile.label} (${s.profile.integration})`} />
      <KV k="Init duration" v={s.initFinishedAt && s.initStartedAt ? `${s.initFinishedAt - s.initStartedAt} ms` : undefined} />
      <KV k="Init error" v={s.initError} />
      <KV k="Internal initialized flag (diagnostic)" v={String(isSdkInitialized())} />
      <KV k="SaaS credentials" v={`${ENV.saasCredentials} · appId ${ENV.appId ?? '—'} · key ${maskKey(ENV.clientKey)}`} />
      <KV k="Legacy credentials" v={`${ENV.legacyCredentials} · project ${ENV.projectId ?? '—'}`} />
      {ENV.problems.map(p => (
        <Banner key={p} text={p} />
      ))}
      <P mono selectable>
        {safeJson(s.configSnapshot)}
      </P>
    </Card>
  );
}

export function AnalyticsPanel() {
  const s = useLabState();
  const stats = usePoll(() => guard('events.stats', () => S.events.stats()) ?? null);
  return (
    <Card>
      <H2>Event queue</H2>
      <KV k="pending / dropped" v={stats ? `${stats.pending} / ${stats.dropped}` : 'envelope lane off'} />
      <Row>
        <Button small title="Generate Events (10)" onPress={() => { for (let i = 1; i <= 10; i++) guard('track', () => S.track('test_manual_generate', { testRunId: s.runId, seq: i })); }} />
        <Button small kind="secondary" title="Flush" onPress={() => { guardAsync('flush', () => S.flush()); guardAsync('events.flush', () => S.events.flush()); }} />
      </Row>
    </Card>
  );
}

export function SessionsPanel() {
  const v = usePoll(() => ({
    ids: guard('events.ids', () => S.events.ids()) ?? null,
    active: S.session.isActive,
    unified: S.session.currentSessionId,
    replay: S.replay.sessionId,
  }));
  const s = useLabState();
  return (
    <Card>
      <H2>Session state</H2>
      <KV k="Analytics sessionId" v={v.ids?.sessionId} />
      <KV k="Unified session active / id" v={`${v.active} / ${v.unified ?? '—'}`} />
      <KV k="Replay sessionId" v={v.replay} />
      <KV k="installationId" v={v.ids?.installationId} />
      <KV k="Previous launch installationId" v={s.previousInstallationId} />
      <Row>
        <Button small title="Start Session" onPress={() => guard('startSession', () => S.startSession({ testRunId: s.runId, source: 'button' }))} />
        <Button small kind="secondary" title="Stop Session" onPress={() => guard('stopSession', () => S.stopSession('ended'))} />
        <Button small kind="ghost" title="New analytics session" onPress={() => guard('newSession', () => S.events.newSession())} />
      </Row>
    </Card>
  );
}

export function IdentityPanel() {
  const s = useLabState();
  const v = usePoll(() => ({ ids: guard('events.ids', () => S.events.ids()) ?? null, engage: S.engage.getIdentifiedUserId() }), 500);
  return (
    <Card>
      <H2>Current identity</H2>
      <KV k="State" v={v.ids?.userId ? 'IDENTIFIED' : 'ANONYMOUS'} color={v.ids?.userId ? colors.ok : colors.muted} />
      <KV k="userId" v={v.ids?.userId} />
      <KV k="anonymousId" v={v.ids?.anonymousId} />
      <KV k="engage identified user" v={v.engage} />
      <Row>
        <Button small title="Identify User A" onPress={() => guard('identify', () => S.identify(fakeUserId(s.runId, 'a'), { plan: 'pro_test' }))} />
        <Button small title="Identify User B" onPress={() => guard('identify', () => S.identify(fakeUserId(s.runId, 'b'), { plan_b: 'free_test' }))} />
        <Button small kind="secondary" title="Clear User" onPress={() => guard('clearUser', () => S.clearUser())} />
      </Row>
      <P muted>All user ids are opaque fakes (sdk_test_user_&lt;label&gt;_&lt;runId&gt;). Emails only on the reserved example.test domain.</P>
    </Card>
  );
}

export function ErrorsPanel({ goDanger }: { goDanger: () => void }) {
  const s = useLabState();
  const [bug, setBug] = useState<string>('');
  return (
    <Card>
      <H2>Quick actions</H2>
      <Row>
        <Button small title="Generate Logs" onPress={() => (['debug', 'info', 'warn', 'error'] as const).forEach(l => guard('log', () => S.log(l, `sdk_test_button_log ${s.runId}`, { testRunId: s.runId })))} />
        <Button small title="Capture Handled Error" onPress={() => guard('captureError', () => S.captureError(new Error(`SdkTestButtonError ${s.runId}`), { metadata: { testRunId: s.runId } }))} />
        <Button
          small
          title="Report Bug"
          onPress={async () => {
            const r = await guardAsync('reportBugDetailed', () => S.reportBugDetailed({ message: `Button bug report ${s.runId}`, title: 'SDK Test Lab button' }));
            setBug(typeof r === 'string' ? `report id ${r}` : `failed: ${safeJson(r, 0)}`);
          }}
        />
      </Row>
      {bug ? <P mono>{bug}</P> : null}
      <Button kind="danger" title="Danger Zone (native crash, JS crash, stalls)…" onPress={goDanger} />
    </Card>
  );
}

export function NetworkPanel() {
  const [health, setHealth] = useState<string>('not checked');
  const egress = useEgress();
  const summary = egress.sdkSummary(0);
  const base = ENV.networkServerUrl;
  return (
    <Card>
      <H2>Network test server</H2>
      <KV k="NETWORK_TEST_SERVER_URL" v={base ?? 'NOT_CONFIGURED'} color={base ? undefined : colors.warn} />
      <KV k="Health" v={health} />
      <Row>
        <Button small disabled={!base} title="Check server" onPress={async () => setHealth(safeJson(await labFetch(base!, '/health', { timeoutMs: 4000 }), 0))} />
        <Button small disabled={!base} title="Generate Slow Request" onPress={() => labFetch(base!, '/delay/3000')} />
        <Button small disabled={!base} title="Generate 500 Request" onPress={() => labFetch(base!, '/status/500')} />
      </Row>
      <P muted>Android emulator → http://10.0.2.2:4545 · iOS simulator → http://localhost:4545 · physical device → http://&lt;LAN-IP&gt;:4545</P>
      <H2>SDK egress (JS lanes)</H2>
      <KV k="requests / failures" v={`${summary.requests} / ${summary.failures}`} />
      <KV k="hosts" v={summary.hosts.join(', ')} />
    </Card>
  );
}

export function OfflinePanel() {
  const net = useNetInfo();
  const s = useLabState();
  const stats = usePoll(() => guard('events.stats', () => S.events.stats()) ?? null);
  const [wizard, setWizard] = useState<string>('');
  const offline = net ? !net.isConnected || net.isInternetReachable === false : false;
  return (
    <Card>
      <H2>Offline wizard</H2>
      <KV k="Connectivity" v={net ? `${net.type} · connected=${net.isConnected} · internet=${String(net.isInternetReachable)}` : '…'} color={offline ? colors.warn : colors.ok} />
      <KV k="Queue pending / dropped" v={stats ? `${stats.pending} / ${stats.dropped}` : '—'} />
      <P>1. Enable airplane mode. 2. Run OFF-001 (or the button). 3. Optional: force-stop & relaunch offline (OFF-003). 4. Reconnect. 5. Run OFF-002. 6. Verify counts in the dashboard.</P>
      <Row>
        <Button
          small
          title="Run Offline Queue Test (generate)"
          onPress={async () => {
            await generateNumbered(S, s.runId, { events: 50, logs: 5, errors: 3 });
            setWizard(`generated 50/5/3 while ${offline ? 'OFFLINE' : 'ONLINE (!)'}`);
          }}
        />
        <Button small kind="secondary" title="Show last wizard record" onPress={async () => setWizard(safeJson(await readJson(KEYS.offlineWizard, null), 0))} />
      </Row>
      {wizard ? <P mono>{wizard}</P> : null}
    </Card>
  );
}

export function PerformancePanel({ heavy }: { heavy?: boolean }) {
  const active = usePoll(() => S.performance.isActive());
  const [trace, setTrace] = useState<string | null>(null);
  return (
    <Card>
      <H2>Performance</H2>
      <KV k="performance.isActive()" v={String(active)} color={active ? colors.ok : colors.warn} />
      <Row>
        <Button
          small
          title={trace ? 'Stop Performance Trace' : 'Start Performance Trace'}
          onPress={() => {
            if (trace) {
              guard('stopTrace', () => S.performance.stopTrace(trace));
              setTrace(null);
            } else setTrace(guard('startTrace', () => S.performance.startTrace('manual_button_trace')) ?? null);
          }}
        />
      </Row>
      {heavy ? (
        <View>
          {Array.from({ length: 300 }, (_, i) => (
            <P key={i} muted>
              heavy row #{i} — {'▮'.repeat(i % 20)}
            </P>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

export function FeatureMatrixPanel({ goConfig }: { goConfig: () => void }) {
  const s = useLabState();
  const off = disabledFeatures(s.profile, s.custom);
  const flags = guard('getFeatureFlags', () => S.getFeatureFlags()) ?? {};
  return (
    <Card>
      <H2>Intentionally disabled in this profile</H2>
      <P>{off.length ? off.join(', ') : 'nothing — all features enabled'}</P>
      <P mono>getFeatureFlags(): {safeJson(flags, 0)}</P>
      <Button small title="Change profile…" onPress={goConfig} />
    </Card>
  );
}
