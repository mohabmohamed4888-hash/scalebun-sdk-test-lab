import type { TestDefinition, TestResult } from './types';
import { looksLikeServerSecret, maskKey } from '../config/envValidation';

export interface ReportEnvironment {
  sdkVersion: string;
  reactNativeVersion: string;
  platform: string;
  osVersion: string;
  appVersion: string;
  buildNumber: string;
  environment: string;
  appId?: string;
  clientKey?: string;
  profileId: string;
  integration: string;
  configSnapshot?: Record<string, unknown>;
  deviceModel?: string;
  isEmulator?: boolean;
}

export interface LabReport {
  schema: 'scalebun-sdk-test-lab/report@1';
  generatedAt: string;
  testRunId: string;
  environment: Omit<ReportEnvironment, 'clientKey'> & { clientKeyPrefix: string };
  summary: Record<string, number>;
  tests: Array<{
    id: string;
    category: string;
    name: string;
    risk: string;
    verification: string;
    expectedLocal: string;
    expectedScaleBun: string;
    dashboardLocation: string;
    result: Omit<TestResult, 'testId'> | { status: 'NOT_RUN' };
  }>;
}

/** Publishable identifiers: exported as a short prefix so reports stay attributable. */
const PUBLISHABLE_KEYS = /^(clientkey|publishablekey)$/i;
/** Anything secret-named is removed entirely. */
const SECRET_KEYS = /^(apikey|token|accesstoken|refreshtoken|secret|password|passwd|authorization|cookie|setcookie|privatekey|pat)$/i;

/**
 * Deep-copy an object replacing credential-like values. Applied to the config
 * snapshot and to every test output before export: no secret — or even a full
 * publishable key — ever leaves the device in a report.
 */
export function redactForExport(value: unknown, depth = 0): unknown {
  if (depth > 12) return '[depth]';
  if (typeof value === 'string') {
    return looksLikeServerSecret(value) ? '[REDACTED:secret-like]' : value;
  }
  if (Array.isArray(value)) return value.map(v => redactForExport(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const norm = k.replace(/[_-]/g, '');
      if (SECRET_KEYS.test(norm)) out[k] = '[REDACTED]';
      else if (PUBLISHABLE_KEYS.test(norm) && typeof v === 'string') out[k] = maskKey(v);
      else out[k] = redactForExport(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function buildReport(
  runId: string,
  defs: readonly TestDefinition[],
  results: readonly TestResult[],
  env: ReportEnvironment,
  now: Date = new Date(),
): LabReport {
  const byId = new Map(results.map(r => [r.testId, r]));
  const summary: Record<string, number> = {};
  const tests = defs.map(d => {
    const r = byId.get(d.id);
    const status = r?.status ?? 'NOT_RUN';
    summary[status] = (summary[status] ?? 0) + 1;
    const result = r ? (({ testId: _omit, ...rest }) => rest)(r) : { status: 'NOT_RUN' as const };
    return {
      id: d.id,
      category: d.category,
      name: d.name,
      risk: d.risk,
      verification: d.verification,
      expectedLocal: d.expectedLocal,
      expectedScaleBun: d.expectedScaleBun,
      dashboardLocation: d.dashboardLocation,
      result: redactForExport(result) as LabReport['tests'][number]['result'],
    };
  });
  const { clientKey, configSnapshot, ...rest } = env;
  return {
    schema: 'scalebun-sdk-test-lab/report@1',
    generatedAt: now.toISOString(),
    testRunId: runId,
    environment: {
      ...rest,
      configSnapshot: redactForExport(configSnapshot) as Record<string, unknown> | undefined,
      clientKeyPrefix: maskKey(clientKey),
    },
    summary,
    tests,
  };
}
