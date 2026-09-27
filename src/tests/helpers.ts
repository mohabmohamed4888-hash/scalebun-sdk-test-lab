import { SkipError, type TestContext, type TestDefinition } from '../testRunner/types';
import { disabledFeatures, type FeatureKey } from '../config/profiles';
import { getLabState } from '../scalebun/labState';

/** Whether the ACTIVE profile (including a custom combination) disables `feature`. */
export function featureDisabled(ctx: TestContext, feature: FeatureKey): boolean {
  return disabledFeatures(ctx.profile, getLabState().custom).includes(feature);
}

type Builder = Omit<TestDefinition, 'platforms' | 'risk' | 'preconditions' | 'verification'> &
  Partial<Pick<TestDefinition, 'platforms' | 'risk' | 'preconditions' | 'verification'>>;

/** Test definition with sensible defaults (both platforms, SAFE, DASHBOARD). */
export function t(def: Builder): TestDefinition {
  return {
    platforms: ['android', 'ios'],
    risk: 'SAFE',
    preconditions: [],
    verification: 'DASHBOARD',
    ...def,
  };
}

/**
 * FAKE PII — obviously synthetic, never real. Every value embeds the runId so
 * dashboard searches are unambiguous, and is long/unique enough to serve as an
 * egress needle without false positives.
 */
export function fakePii(runId: string) {
  const compact = runId.replace(/[^a-z0-9]/gi, '');
  return {
    email: `qa.fake.${compact.slice(-10)}@example.test`,
    /** Stripe's public test card; Luhn-valid so the SDK's value scrubber applies. */
    card: '4242 4242 4242 4242',
    cardCompact: '4242424242424242',
    ssn: '000-12-3456',
    iban: 'DE00FAKE0000TEST0000' + compact.slice(-6).toUpperCase(),
    jwt: `eyJhbGciOiJub25lIn0.eyJzdWIiOiJzZGtfdGVzdCJ9.${compact.slice(-12)}FAKESIG`,
    authHeader: `Bearer FAKE_AUTH_TOKEN_${compact}`,
    authToken: `FAKE_AUTH_TOKEN_${compact}`,
    cookie: `sessionid=FAKE_COOKIE_${compact}`,
    cookieValue: `FAKE_COOKIE_${compact}`,
    password: `FAKE_PW_${compact}`,
    apiKeyQuery: `FAKE_QUERY_TOKEN_${compact}`,
    phone: '+1 555 010 0199',
    arabicName: 'اختبار وهمي',
  };
}

export function requireSdkMethod(ok: boolean, what: string): void {
  if (!ok) throw new SkipError(`NOT-AVAILABLE-IN-INSTALLED-VERSION: ${what}`);
}

/** Current SDK ids, or null when the envelope lane is not running (no appId / not initialized). */
export function ids(ctx: TestContext) {
  return ctx.sdk.ScaleBun.events.ids();
}

export function stats(ctx: TestContext) {
  return ctx.sdk.ScaleBun.events.stats();
}

/**
 * Wait until SDK-bound egress quiets down after a flush. Returns the SDK
 * requests observed since `mark`.
 */
export async function flushAndObserve(ctx: TestContext, mark: number, settleMs = 2500) {
  await ctx.sdk.ScaleBun.flush();
  await ctx.sdk.ScaleBun.events.flush();
  await ctx.sleep(settleMs);
  return ctx.egress.sdkSummary(mark);
}

/** Register fake-PII needles, generate traffic, flush, and report hits. */
export async function withNeedles(
  ctx: TestContext,
  needles: Record<string, string>,
  generate: () => Promise<void> | void,
  settleMs = 4000,
): Promise<{ hits: Record<string, number>; sdkRequests: number; unscanned: number; paths: Record<string, string[]> }> {
  const prefix = `${ctx.testId}:`;
  for (const [k, v] of Object.entries(needles)) ctx.egress.addNeedle(prefix + k, v);
  const mark = ctx.egress.mark();
  try {
    await generate();
    const summary = await flushAndObserve(ctx, mark, settleMs);
    const hits: Record<string, number> = {};
    const paths: Record<string, string[]> = {};
    for (const k of Object.keys(needles)) {
      const r = ctx.egress.needleResult(prefix + k);
      hits[k] = r?.hits ?? 0;
      paths[k] = r?.hitPaths ?? [];
    }
    return { hits, sdkRequests: summary.requests, unscanned: summary.unscanned, paths };
  } finally {
    for (const k of Object.keys(needles)) ctx.egress.removeNeedle(prefix + k);
  }
}

export const DASH = {
  events: 'Analytics → Events (search property testRunId)',
  userJourney: 'Analytics → Users → <user> → Journey / Timeline',
  funnels: 'Analytics → Funnels',
  revenue: 'Business → Revenue / Transactions',
  subscriptions: 'Business → Subscriptions',
  sessions: 'Sessions → Session list → session timeline',
  crashes: 'Diagnose → Crashes / Errors',
  logs: 'Diagnose → Logs',
  bugReports: 'Diagnose → Bug reports',
  network: 'Sessions → <session> → Network panel',
  performance: 'Performance → Traces / Screens / App start',
  replay: 'Sessions → <session> → Replay',
  engage: 'Engage → Campaigns / Responses / In-app',
  ratings: 'Engage → Ratings',
  push: 'Engage → Push → Devices / Deliveries',
  ota: 'OTA → Releases → <release> → Delivery funnel',
  attribution: 'Growth → Attribution',
  config: 'Settings → Remote config / Flags / Experiments',
  ingestionDebugger: 'Settings → Ingestion debugger (or MCP verify_ingestion)',
} as const;
