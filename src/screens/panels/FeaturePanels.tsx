import React, { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { ScaleBunInlineSlot, ScaleBunAnchor, useScaleBunAnchor, useOtaUpdate, type PushNotification } from '@scalebun/react-native';
import { Button, Card, H2, KV, P, Row, Banner, colors } from '../../components/ui';
import { sdk } from '../../scalebun/sdk';
import { ENV } from '../../config/env';
import { labBridge, type CallbackLogEntry } from '../../scalebun/labBridge';
import { useCallbackLog, useLabState, usePoll } from '../../hooks/useLab';
import { guard, guardAsync } from '../../scalebun/integrationErrors';
import { firebaseConfigured } from '../../testRunner/labRunner';
import { safeJson } from '../../utils/safe';
import { writeJson, KEYS } from '../../services/persistence';

const S = sdk.ScaleBun;

function LogList({ entries }: { entries: readonly unknown[] }) {
  if (!entries.length) return <P muted>No callbacks received yet.</P>;
  return (
    <View style={{ gap: 2 }}>
      {(entries as CallbackLogEntry[]).slice(0, 20).map((e, i) => (
        <P key={`${e.at}-${i}`} mono>
          {e.at.slice(11, 19)} {e.kind} {safeJson(e.detail, 0).slice(0, 240)}
        </P>
      ))}
    </View>
  );
}

export function ReplayPanel({ openPlayground }: { openPlayground: () => void }) {
  const v = usePoll(() => ({ rec: S.replay.isRecording, id: S.replay.sessionId }), 700);
  const [maskInputs, setMaskInputs] = useState(true);
  const [maskImages, setMaskImages] = useState(false);
  return (
    <Card>
      <H2>Replay</H2>
      <KV k="isRecording" v={String(v.rec)} color={v.rec ? colors.ok : colors.warn} />
      <KV k="replay sessionId" v={v.id} />
      <Row>
        <Button small title="Open Replay Playground" onPress={openPlayground} />
        <Button small kind="secondary" title="Start" onPress={() => guardAsync('replay.start', () => S.replay.start())} />
        <Button small kind="secondary" title="Pause" onPress={() => guardAsync('replay.pause', () => S.replay.pause())} />
        <Button small kind="secondary" title="Resume" onPress={() => guardAsync('replay.resume', () => S.replay.resume())} />
        <Button small kind="ghost" title="Stop" onPress={() => guardAsync('replay.stop', () => S.replay.stop())} />
      </Row>
      <Row>
        <Button
          small
          kind={maskInputs ? 'primary' : 'ghost'}
          title={`maskTextInputs: ${maskInputs}`}
          onPress={() => {
            setMaskInputs(!maskInputs);
            guardAsync('replay.setPrivacy', () => S.replay.setPrivacy({ maskTextInputs: !maskInputs }));
          }}
        />
        <Button
          small
          kind={maskImages ? 'primary' : 'ghost'}
          title={`maskImages: ${maskImages}`}
          onPress={() => {
            setMaskImages(!maskImages);
            guardAsync('replay.setPrivacy', () => S.replay.setPrivacy({ maskImages: !maskImages }));
          }}
        />
      </Row>
      <P muted>Runtime toggles call replay.setPrivacy. Init-time privacy is chosen via profiles (privacy-strict / privacy-relaxed).</P>
    </Card>
  );
}

export function NavigationPanel({ go }: { go: (r: string) => void }) {
  const s = useLabState();
  return (
    <Card>
      <H2>Navigation</H2>
      <KV k="Current route" v={s.currentRoute} />
      <Row>
        <Button small title="NavA" onPress={() => go('NavA')} />
        <Button small title="Nested tabs" onPress={() => go('NestedTabs')} />
        <Button small title="Modal" onPress={() => go('LabModal')} />
        <Button small title="Impressions" onPress={() => go('Impressions')} />
      </Row>
    </Card>
  );
}

export function PushPanel() {
  const log = useCallbackLog(labBridge.pushLog);
  const status = usePoll(() => S.push.status(), 1000);
  const [result, setResult] = useState('');
  const fb = firebaseConfigured();
  return (
    <Card>
      <H2>Push</H2>
      {!fb && <Banner text="NOT_CONFIGURED: Firebase config missing (android/app/google-services.json, ios/GoogleService-Info.plist). APNs key must be uploaded in the ScaleBun dashboard. Manual-provider tests still run." />}
      <KV k="enabled / usable" v={`${status.enabled} / ${status.usable}`} />
      <KV k="adapter" v={status.adapter} />
      <KV k="permission" v={status.permission} />
      <KV k="token" v={status.token ? `${status.token.slice(0, 10)}…` : null} />
      <KV k="reason" v={status.reason} />
      <Row>
        <Button
          small
          title="Enable Push"
          onPress={async () => {
            const r = await guardAsync('enablePush', () =>
              S.enablePush({
                android: { channelId: 'sdk_test_lab_default', channelName: 'SDK Test Lab' },
                onForegroundNotification: (n: PushNotification) => labBridge.recordPush('foreground', n),
                onNotificationOpened: (n: PushNotification) => labBridge.recordPush('opened', n),
              }),
            );
            if (r?.ok) await writeJson(KEYS.pushEnabled, true);
            setResult(safeJson(r, 0));
          }}
        />
        <Button small kind="ghost" title="Clear log" onPress={() => labBridge.pushLog.clear()} />
      </Row>
      {result ? <P mono>{result}</P> : null}
      <H2>Callback log</H2>
      <LogList entries={log} />
    </Card>
  );
}

function AnchoredButton() {
  const anchor = useScaleBunAnchor('sdk_test.anchor.button');
  return (
    <View ref={anchor as never} collapsable={false}>
      <Button small title="Anchor target (hook)" onPress={() => undefined} />
    </View>
  );
}

function InlineFallback() {
  useEffect(() => {
    labBridge.engageLog.push('inlineFallbackRendered', { placementKey: 'sdk_test.inline' });
  }, []);
  return <P muted>Inline slot fallback (no campaign owns placement sdk_test.inline).</P>;
}

export function EngagePanel() {
  const s = useLabState();
  const log = useCallbackLog(labBridge.engageLog);
  const [msg, setMsg] = useState('');
  return (
    <Card>
      <H2>Engagement</H2>
      <P muted>Campaigns (NPS/CSAT/Feedback/Rating/in-app) are dashboard-controlled. Configure them per DASHBOARD_VERIFICATION.md §Engage, then trigger here.</P>
      <Row>
        {['test_trigger_in_app', 'test_trigger_survey', 'test_trigger_nps', 'test_trigger_feedback'].map(e => (
          <Button key={e} small title={`Trigger ${e.replace('test_trigger_', '')}`} onPress={() => guard('track', () => S.track(e, { testRunId: s.runId }))} />
        ))}
      </Row>
      <Row>
        <Button small kind="secondary" title="Show NPS prompt" onPress={async () => setMsg(`shown=${await labBridge.engage?.showEngagePrompt({ types: ['NPS'] })}`)} />
        <Button small kind="secondary" title="Show in-app" onPress={async () => setMsg(`shown=${await labBridge.engage?.showInAppMessage({})}`)} />
        <Button small kind="ghost" title="Reset in-app throttle" onPress={() => setMsg(`cleared=${S.engage.resetInAppState()}`)} />
        <Button
          small
          kind="ghost"
          title="Rate 5★"
          onPress={async () => setMsg(safeJson(await guardAsync('submitRating', () => S.submitRating({ rating: 5, comment: `button ${s.runId}`, source: 'manual' })), 0))}
        />
      </Row>
      {msg ? <P mono>{msg}</P> : null}
      <H2>Inline placement</H2>
      <ScaleBunInlineSlot placementKey="sdk_test.inline">
        <InlineFallback />
      </ScaleBunInlineSlot>
      <H2>Coachmark anchors</H2>
      <Row>
        <AnchoredButton />
        <ScaleBunAnchor anchorKey="sdk_test.anchor.card">
          <View style={{ padding: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 6 }}>
            <Text style={{ color: colors.text }}>Anchor target (wrapper)</Text>
          </View>
        </ScaleBunAnchor>
      </Row>
      <H2>Engage callback log</H2>
      <LogList entries={log} />
    </Card>
  );
}

export function AttributionPanel() {
  return (
    <Card>
      <H2>Attribution</H2>
      <KV k="Platform" v={Platform.OS} />
      <P muted>
        iOS: IDFV only (no ATT prompt, no IDFA). SKAdNetwork tests run on iOS only. Android: Play Install Referrer is read automatically by the SDK; GAID is never
        collected by the Test Lab.
      </P>
    </Card>
  );
}

export function PrivacyPanel({ go }: { go: (r: string) => void }) {
  const policy = usePoll(() => guard('getEffectivePrivacyPolicy', () => S.getEffectivePrivacyPolicy()) ?? null, 1500);
  const [consent, setConsent] = useState(true);
  return (
    <Card>
      <H2>Privacy Lab</H2>
      <P muted>Assertions are separated: CAPTURED LOCALLY (SDK state) · TRANSMITTED (egress observer, JS lanes only) · VISIBLE IN DASHBOARD (manual/verifier).</P>
      <KV k="Effective policy" v={safeJson(policy, 0)} />
      <Row>
        <Button
          small
          kind={consent ? 'secondary' : 'danger'}
          title={consent ? 'Withdraw consent' : 'Grant consent'}
          onPress={() => {
            guard('setConsent', () => S.setConsent(!consent));
            setConsent(!consent);
          }}
        />
        <Button small kind="ghost" title="Erase local data" onPress={() => guardAsync('eraseLocalData', () => S.eraseLocalData())} />
        <Button small kind="ghost" title="Open secret screen" onPress={() => go('PrivacySecret')} />
        <Button small kind="ghost" title="Egress observer" onPress={() => go('Egress')} />
      </Row>
    </Card>
  );
}

/** Mounted only when a client key is configured (useOtaUpdate requires one). */
function OtaHookPanel() {
  const hook = useOtaUpdate({
    apiUrl: 'https://api.scalebun.com/api/v1',
    clientKey: ENV.clientKey!,
    appVersion: DeviceInfo.getVersion(),
    channelName: ENV.otaChannel,
    mandatoryBlocksUi: true,
  });
  useEffect(() => {
    labBridge.ota = hook;
  });
  useEffect(
    () => () => {
      labBridge.ota = null;
    },
    [],
  );
  const log = useCallbackLog(labBridge.otaLog);
  const o = sdk.otaOrchestrator;
  return (
    <Card>
      <H2>OTA (channel {ENV.otaChannel})</H2>
      <KV k="orchestrator enabled" v={String(o.isEnabled())} />
      <KV k="isSyncing" v={String(hook.isSyncing)} />
      <KV k="downloadProgress" v={`${hook.downloadProgress}%`} />
      <KV k="isRestartRequired" v={String(hook.isRestartRequired)} />
      <KV k="mandatoryUpdatePending" v={String(hook.mandatoryUpdatePending)} color={hook.mandatoryUpdatePending ? colors.danger : undefined} />
      <KV k="activeBundle" v={hook.activeBundle ? `${hook.activeBundle.id} v${hook.activeBundle.version}` : 'factory bundle'} />
      <KV k="current (orchestrator)" v={safeJson(o.getCurrentBundle(), 0)} />
      <KV k="syncResult" v={safeJson(hook.syncResult, 0)} />
      <KV k="lastEvent" v={hook.lastEvent ? `${hook.lastEvent.type} ${hook.lastEvent.bundleId}` : null} />
      <KV k="integrity indicators" v={o.deviceIntegrityIndicators().join(', ') || 'none'} />
      <Row>
        <Button small title="Check OTA (sync)" busy={hook.isSyncing} onPress={() => guardAsync('ota.sync', () => hook.sync())} />
        <Button small kind="danger" title="Apply OTA (restart)" disabled={!hook.isRestartRequired} onPress={() => hook.restart()} />
      </Row>
      {hook.mandatoryUpdatePending && <Banner kind="danger" text="MANDATORY update pending — the app must apply and restart (mandatoryBlocksUi)." />}
      <H2>OTA event log</H2>
      <LogList entries={log} />
    </Card>
  );
}

export function OtaPanel() {
  if (!ENV.clientKey) return <Banner text="NOT_CONFIGURED: SCALEBUN_CLIENT_KEY is required for OTA checks." />;
  return (
    <>
      <OtaHookPanel />
      <P muted>Publish test bundles ONLY to the "{ENV.otaChannel}" channel: npm run ota:publish:android / ota:publish:ios (see README). Never production.</P>
    </>
  );
}

export function DiagnosticsPanel() {
  const [armed, setArmed] = useState('');
  const v = usePoll(() => ({
    debug: S.debug.isEnabled(),
    flag: S.flags.isEnabled('sdk_test_flag'),
    rollout: S.rollouts.isOn('sdk_test_rollout'),
    variant: S.experiments.variant('sdk_test_experiment'),
    maxItems: S.config.get('sdk_test_config_max_items', 10),
    perfFeature: sdk.getPerformanceFeature() ? 'present' : 'null',
    profiler: sdk.getProfilerFeature() ? 'present' : 'null',
    transport: sdk.getDebugTransport() ? 'present' : 'null',
  }), 1500);
  return (
    <Card>
      <H2>Diagnostics (DIAGNOSTIC-ONLY APIs)</H2>
      {Object.entries(v).map(([k, val]) => (
        <KV key={k} k={k} v={String(val)} />
      ))}
      <Row>
        <Button
          small
          kind="secondary"
          title="Arm calibration"
          onPress={() => {
            guard('setCalibrationTarget', () => S.setCalibrationTarget({ targetId: 'sdk_test_calibration', expectedNX: 0.5, expectedNY: 0.5 }));
            setArmed(`armed at ${new Date().toISOString().slice(11, 23)} — tap the target within 500ms`);
          }}
        />
        <Button small kind="ghost" title="Refresh remote config" onPress={() => guardAsync('config.refresh', () => S.config.refresh())} />
      </Row>
      <View style={{ alignItems: 'center' }}>
        <Button testID="calibration-target" title="Calibration target" onPress={() => setArmed(a => `${a} → tapped`)} />
      </View>
      {armed ? <P mono>{armed}</P> : null}
    </Card>
  );
}
