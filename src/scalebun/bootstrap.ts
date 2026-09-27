import { AppState } from 'react-native';
import { sdk } from './sdk';
import { ENV } from '../config/env';
import { getProfile, type CustomOverrides, type ProfileId } from '../config/profiles';
import { initLabState, getLabState, patchLabState, hasLabState, type PreInitProbe } from './labState';
import { readJson, writeJson, KEYS } from '../services/persistence';
import { newTestRunId, fakeUserId } from '../utils/ids';
import { redactForExport } from '../testRunner/report';
import { guard, guardAsync, recordIntegrationError } from './integrationErrors';
import { labBridge } from './labBridge';

const { ScaleBun } = sdk;

/**
 * Whether the SDK facade finished a SUCCESSFUL bootstrap.
 *
 * @scalebun/react-native 2.4.0 has no public "isInitialized": init() resolves
 * and ScaleBunProvider fires onReady even when the config was rejected and the
 * SDK stays inert (KSI-006). The Test Lab therefore reads the facade's private
 * `initialized` flag — DIAGNOSTIC ONLY, clearly labelled in the UI — and falls
 * back to the public events.ids() signal.
 */
export function isSdkInitialized(): boolean {
  const internal = (ScaleBun as unknown as { initialized?: unknown }).initialized;
  if (typeof internal === 'boolean') return internal;
  return guard('events.ids', () => ScaleBun.events.ids()) != null;
}

/** Profiles that must init even without valid credentials (they test failure modes). */
const FAILURE_PROFILES: readonly ProfileId[] = ['invalid-credentials', 'malformed-config', 'legacy-credentials'];

export interface BootPlan {
  config: Record<string, unknown>;
  shouldInit: boolean;
}

/** Loads persisted Test Lab state and decides how to initialize. Call before first render. */
export async function prepareLab(): Promise<BootPlan> {
  const profileId = await readJson<ProfileId>(KEYS.profile, 'default');
  const custom = await readJson<CustomOverrides | undefined>(KEYS.customOverrides, undefined);
  const profile = getProfile(profileId);
  let run = await readJson<{ runId: string; startedAt: string } | null>(KEYS.runId, null);
  if (!run) {
    run = { runId: newTestRunId(), startedAt: new Date().toISOString() };
    await writeJson(KEYS.runId, run);
  }
  const bootCount = (await readJson<number>(KEYS.bootCount, 0)) + 1;
  await writeJson(KEYS.bootCount, bootCount);
  const previousInstallationId = await readJson<string | undefined>(KEYS.lastInstallationId, undefined);
  const crash = await readJson<{ armedAt: string; runId: string } | null>(KEYS.crashMarker, null);
  const restart = await readJson<{ at: string; runId: string; token: string } | null>(KEYS.restartMarker, null);

  const config = profile.build(ENV, custom);
  const credentialed = ENV.saasCredentials === 'CONFIGURED' || ENV.legacyCredentials === 'CONFIGURED';
  const shouldInit = credentialed || FAILURE_PROFILES.includes(profile.id);

  initLabState({
    runId: run.runId,
    runStartedAt: run.startedAt,
    profileId: profile.id,
    profile,
    custom,
    initPhase: shouldInit ? 'IDLE' : 'NOT_CONFIGURED',
    configSnapshot: redactForExport(config) as Record<string, unknown>,
    bootCount,
    previousInstallationId,
    pendingCrashMarker: crash,
    restartMarker: restart,
    navReady: false,
  });
  return { config, shouldInit };
}

/** identify / track / log / captureError BEFORE init() (profile pre-init-probe). */
export function runPreInitProbe(): void {
  const { runId } = getLabState();
  const probe: PreInitProbe = {
    userId: fakeUserId(runId, 'preinit'),
    eventName: 'test_pre_init_event',
    calledAt: new Date().toISOString(),
    errors: [],
  };
  const attempt = (label: string, fn: () => unknown) => {
    try {
      fn();
    } catch (e) {
      probe.errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  attempt('identify', () => ScaleBun.identify(probe.userId, { phase: 'pre_init', testRunId: runId }));
  attempt('track', () => ScaleBun.track(probe.eventName, { testRunId: runId, phase: 'pre_init' }));
  attempt('log', () => ScaleBun.log('info', `sdk_test_pre_init_log ${runId}`, { testRunId: runId }));
  attempt('captureError', () => ScaleBun.captureError(new Error(`SdkTestPreInitError ${runId}`)));
  patchLabState({ preInit: probe });
}

export function markInitStarted(): void {
  patchLabState({ initPhase: 'INITIALIZING', initStartedAt: Date.now() });
}

/** Called when init() resolved/rejected (direct) or provider onReady/onInitError fired. */
export async function markInitSettled(error?: unknown): Promise<void> {
  const ok = !error && isSdkInitialized();
  patchLabState({
    initPhase: error ? 'FAILED' : ok ? 'READY' : 'NOT_INITIALIZED',
    initFinishedAt: Date.now(),
    initError: error ? (error instanceof Error ? error.message : String(error)) : ok ? undefined : 'init() resolved but the SDK did not initialize (see device log; config rejected or backend unreachable)',
  });
  if (error) recordIntegrationError('ScaleBun.init', error);
  if (!ok) return;
  const s = getLabState();

  if (s.preInit) {
    const i = guard('events.ids', () => ScaleBun.events.ids());
    patchLabState({ preInit: { ...s.preInit, afterInit: { idsUserId: i?.userId, identifiedUserId: ScaleBun.engage.getIdentifiedUserId() } } });
  }

  // Correlate the whole session with this test run.
  guard('setAttribute', () => ScaleBun.setAttribute('testRunId', s.runId));
  guard('setAttribute', () => ScaleBun.setAttribute('testLabProfile', s.profileId));
  // EDGE-010 boot probe: an SDK call immediately after init on every boot.
  guard('track', () => ScaleBun.track('test_boot_probe', { testRunId: s.runId, bootCount: s.bootCount, profile: s.profileId }));

  const installationId = guard('events.ids', () => ScaleBun.events.ids()?.installationId);
  if (installationId) await writeJson(KEYS.lastInstallationId, installationId);
}

/** Direct integration: optional pre-init probe then ScaleBun.init(). */
export async function directInit(config: Record<string, unknown>): Promise<void> {
  if (getLabState().profile.preInitProbe) runPreInitProbe();
  markInitStarted();
  try {
    await ScaleBun.init(config);
    await markInitSettled();
  } catch (e) {
    await markInitSettled(e);
  }
}

let lifecycleInstalled = false;
export function installLifecycleLog(): void {
  if (lifecycleInstalled) return;
  lifecycleInstalled = true;
  AppState.addEventListener('change', st => labBridge.lifecycleLog.push(st, { at: Date.now() }));
}

/** Start a brand new test session: new testRunId, results cleared by caller. */
export async function startNewTestSession(): Promise<string> {
  const runId = newTestRunId();
  await writeJson(KEYS.runId, { runId, startedAt: new Date().toISOString() });
  if (hasLabState()) patchLabState({ runId, runStartedAt: new Date().toISOString() });
  await guardAsync('setAttribute', () => ScaleBun.setAttribute('testRunId', runId));
  return runId;
}
