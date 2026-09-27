import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { ResultsStore } from './store';
import type { Requirement, TestContext, TestDefinition, TestResult } from './types';
import { AssertionError } from './types';
import { runSuite, runTest, type RunnerEnvironment } from './runner';
import { sdk } from '../scalebun/sdk';
import { labBridge } from '../scalebun/labBridge';
import { egressObserver } from '../services/egressObserver';
import { ENV } from '../config/env';
import { getLabState } from '../scalebun/labState';
import { isSdkInitialized } from '../scalebun/bootstrap';
import { readJson, writeJson, KEYS } from '../services/persistence';
import { sleep } from '../utils/safe';

/** App-wide results store persisted in AsyncStorage. */
export const resultsStore = new ResultsStore({
  load: () => readJson<Record<string, TestResult> | null>(KEYS.results, null),
  save: r => writeJson(KEYS.results, r),
});

let online = true;
NetInfo.addEventListener(s => {
  online = !!s.isConnected && s.isInternetReachable !== false;
});

function requirementStatus(r: Requirement): { ok: boolean; reason: string } {
  switch (r) {
    case 'sdkInitialized':
      return { ok: isSdkInitialized(), reason: `SDK not initialized (phase ${getLabState().initPhase}; profile ${getLabState().profileId})` };
    case 'clientKey':
      return { ok: !!ENV.clientKey, reason: 'SCALEBUN_CLIENT_KEY missing or rejected (.env)' };
    case 'appId':
      return { ok: !!ENV.appId, reason: 'SCALEBUN_APP_ID missing (.env)' };
    case 'networkServer':
      return { ok: !!ENV.networkServerUrl, reason: 'NETWORK_TEST_SERVER_URL missing (.env) — start `npm run network-server`' };
    case 'firebase':
      return { ok: firebaseConfigured(), reason: 'Firebase not configured (google-services.json / GoogleService-Info.plist) — push provider NOT_CONFIGURED' };
    case 'otaEnabled':
      return { ok: sdk.otaOrchestrator.isEnabled(), reason: 'OTA disabled — select profile ota-enabled' };
    case 'online':
      return { ok: online, reason: 'device offline' };
    case 'bridge':
      return { ok: getLabState().navReady, reason: 'navigation/bridge not ready' };
    case 'devTools':
      return { ok: sdk.getProfilerFeature() !== null || sdk.ScaleBun.debug.isEnabled(), reason: 'bundle built without devTools (SCALEBUN_DEVTOOLS=0) or no desktop connection' };
  }
}

export function firebaseConfigured(): boolean {
  try {
    const app = require('@react-native-firebase/app').default as () => { options?: { projectId?: string } };
    return !!app()?.options?.projectId;
  } catch {
    return false;
  }
}

function makeContext(def: TestDefinition, log: (line: string) => void): TestContext {
  const s = getLabState();
  const runId = s.runId;
  return {
    runId,
    testId: def.id,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    sdk,
    bridge: labBridge,
    egress: egressObserver,
    env: ENV,
    profileId: s.profileId,
    profile: s.profile,
    log: (m, data) => log(data === undefined ? m : `${m} ${JSON.stringify(data)}`),
    expect: (cond, msg) => {
      if (!cond) throw new AssertionError(msg);
    },
    tag: props => ({ ...(props ?? ({} as never)), testRunId: runId, testId: def.id }),
    token: suffix => `sdk_test_${def.id}_${runId}${suffix ? `_${suffix}` : ''}`,
    sleep,
    waitFor: async (probe, timeoutMs, intervalMs = 250) => {
      const end = Date.now() + timeoutMs;
      let v = await probe();
      while (!v && Date.now() < end) {
        await sleep(intervalMs);
        v = await probe();
      }
      return v;
    },
    navigate: (route, params) => labBridge.navigate(route, params),
  };
}

export function runnerEnv(): RunnerEnvironment {
  const s = getLabState();
  return {
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    profileId: s.profileId,
    dangerousAllowed: ENV.dangerousTestsAllowed,
    requirementStatus,
    makeContext,
  };
}

export function runOne(def: TestDefinition, opts?: { dangerConfirmed?: boolean }) {
  return runTest(def, resultsStore, runnerEnv(), getLabState().runId, opts);
}

export function runSafe(defs: readonly TestDefinition[], onProgress?: (done: number, total: number, cur: TestDefinition) => void, shouldCancel?: () => boolean) {
  return runSuite(defs, resultsStore, runnerEnv(), getLabState().runId, onProgress, shouldCancel);
}

export { requirementStatus };
