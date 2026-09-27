import type { LabSdk } from '../scalebun/sdk';
import type { LabBridge } from '../scalebun/labBridge';
import type { EgressObserver } from '../services/egressObserver';
import type { LabEnv } from '../config/env';
import type { ProfileId, InitProfile } from '../config/profiles';

export type TestStatus =
  | 'NOT_RUN'
  | 'RUNNING'
  | 'LOCAL_PASS'
  | 'VERIFIED'
  | 'FAIL'
  | 'MANUAL_VERIFICATION_REQUIRED'
  | 'SKIPPED';

export const ALL_STATUSES: readonly TestStatus[] = [
  'NOT_RUN',
  'RUNNING',
  'LOCAL_PASS',
  'VERIFIED',
  'FAIL',
  'MANUAL_VERIFICATION_REQUIRED',
  'SKIPPED',
];

export type RiskLevel = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'DESTRUCTIVE';

export type LabPlatform = 'android' | 'ios';

export type Category =
  | 'Setup & Init'
  | 'Analytics'
  | 'Sessions'
  | 'Identity'
  | 'Logs, Errors & Bugs'
  | 'Network'
  | 'Offline & Queue'
  | 'Performance'
  | 'Session Replay'
  | 'Navigation'
  | 'Push'
  | 'Engagement'
  | 'Attribution'
  | 'Privacy & Consent'
  | 'OTA'
  | 'Diagnostics'
  | 'Feature Matrix'
  | 'Edge Cases';

export const CATEGORIES: readonly Category[] = [
  'Setup & Init',
  'Analytics',
  'Sessions',
  'Identity',
  'Logs, Errors & Bugs',
  'Network',
  'Offline & Queue',
  'Performance',
  'Session Replay',
  'Navigation',
  'Push',
  'Engagement',
  'Attribution',
  'Privacy & Consent',
  'OTA',
  'Diagnostics',
  'Feature Matrix',
  'Edge Cases',
];

/**
 * How a passing run is graded.
 *  DASHBOARD  – local PASS → LOCAL_PASS; becomes VERIFIED only after dashboard/verifier confirmation.
 *  LOCAL_ONLY – the assertion is entirely on-device (no backend expectation) → VERIFIED.
 *  MANUAL     – run() prepares/emits data but a human must judge → MANUAL_VERIFICATION_REQUIRED.
 */
export type Verification = 'DASHBOARD' | 'LOCAL_ONLY' | 'MANUAL';

/** Things a test needs before it can run; unmet → SKIPPED with a NOT_CONFIGURED reason. */
export type Requirement =
  | 'sdkInitialized'
  | 'clientKey'
  | 'appId'
  | 'networkServer'
  | 'firebase'
  | 'otaEnabled'
  | 'online'
  | 'bridge'
  | 'devTools';

export interface TestContext {
  /** Globally unique id of the current test session. */
  runId: string;
  testId: string;
  platform: LabPlatform;
  sdk: LabSdk;
  bridge: LabBridge;
  egress: EgressObserver;
  env: LabEnv;
  profileId: ProfileId;
  profile: InitProfile;
  /** Append a line to the test's live output. */
  log: (message: string, data?: unknown) => void;
  /** Throws an AssertionError (→ FAIL) when `condition` is falsy. */
  expect: (condition: unknown, message: string) => void;
  /** Merge testRunId/testId into a property bag. */
  tag: <T extends Record<string, unknown>>(props?: T) => T & { testRunId: string; testId: string };
  /** Unique, searchable token for this test in this run, e.g. `sdk_test_ANA-001_<runId>`. */
  token: (suffix?: string) => string;
  sleep: (ms: number) => Promise<void>;
  /** Poll `probe` until truthy or timeout; returns the last value. */
  waitFor: <T>(probe: () => T | Promise<T>, timeoutMs: number, intervalMs?: number) => Promise<T>;
  navigate: (route: string, params?: Record<string, unknown>) => boolean;
}

export type OutcomeKind = 'PASS' | 'FAIL' | 'MANUAL' | 'SKIPPED';

export interface TestOutcome {
  kind?: OutcomeKind;
  /** JSON-serializable local result shown in the UI and exported. */
  output?: unknown;
  /** Human-readable next step (e.g. what to check in the dashboard). */
  note?: string;
}

export interface TestDefinition {
  id: string;
  category: Category;
  name: string;
  description: string;
  risk: RiskLevel;
  platforms: readonly LabPlatform[];
  /** Shown as the SKIPPED reason on unsupported platforms. */
  platformNote?: string;
  preconditions: readonly string[];
  requires?: readonly Requirement[];
  /** Restrict to specific init profiles (feature-matrix / config tests). */
  profiles?: readonly ProfileId[];
  expectedLocal: string;
  expectedScaleBun: string;
  dashboardLocation: string;
  /** API inventory ids this test exercises (see src/scalebun/apiInventory.ts). */
  covers: readonly string[];
  verification: Verification;
  /** Excluded from RUN SAFE SUITE; requires explicit confirmation; disabled in release unless enabled. */
  dangerous?: boolean;
  /** Needs the tester's hands (background the app, kill it, tap an OS dialog). Excluded from the safe suite. */
  interactive?: boolean;
  timeoutMs?: number;
  run: (ctx: TestContext) => Promise<TestOutcome | void>;
}

export interface TestResult {
  testId: string;
  testRunId: string;
  status: TestStatus;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  actual?: unknown;
  note?: string;
  error?: { name: string; message: string; stack?: string };
  logs: string[];
  /** Set when a human confirmed the dashboard result. */
  verifiedBy?: 'tester' | 'verifier';
  platform: LabPlatform;
  profileId: string;
}

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

/** Thrown by a test to mark itself SKIPPED (e.g. provider credentials missing). */
export class SkipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkipError';
  }
}
