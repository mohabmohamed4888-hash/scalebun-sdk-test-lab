import { t, DASH, stats } from './helpers';
import { readJson, writeJson, KEYS } from '../services/persistence';

const C = 'Offline & Queue' as const;

export interface OfflineWizardState {
  runId: string;
  startedAt: string;
  events: number;
  logs: number;
  errors: number;
  statsAtGenerate?: unknown;
}

/** Generates `n` numbered items without freezing the UI (chunks of 25). */
export async function generateNumbered(
  S: { track: (n: string, p?: Record<string, unknown>) => void; log: (l: 'info', m: string, d?: Record<string, unknown>) => void; captureError: (e: Error, c?: { metadata?: Record<string, unknown> }) => void },
  runId: string,
  counts: { events: number; logs: number; errors: number },
): Promise<void> {
  const yieldUi = () => new Promise<void>(r => setTimeout(r, 0));
  for (let i = 1; i <= counts.events; i++) {
    S.track('test_offline_event', { testRunId: runId, seq: i, total: counts.events });
    if (i % 25 === 0) await yieldUi();
  }
  for (let i = 1; i <= counts.logs; i++) S.log('info', `sdk_test_offline_log ${i}/${counts.logs} ${runId}`, { testRunId: runId, seq: i });
  for (let i = 1; i <= counts.errors; i++) S.captureError(new Error(`SdkTestOfflineError ${i}/${counts.errors} ${runId}`), { metadata: { testRunId: runId, seq: i } });
}

export const offlineTests = [
  t({
    id: 'OFF-001',
    category: C,
    name: 'Offline queue wizard: generate while offline',
    description: 'Step 1 of the Offline Wizard (Offline screen). Disconnect the device FIRST, then run: generates 50 events, 5 logs, 3 errors and records exact counts.',
    interactive: true,
    requires: ['sdkInitialized', 'appId'],
    preconditions: ['Airplane mode ON (NetInfo must report offline)'],
    verification: 'MANUAL',
    expectedLocal: 'events.stats().pending ≥ 50 while offline; counts persisted.',
    expectedScaleBun: 'After OFF-002: exactly 50 test_offline_event (seq 1..50), 5 logs, 3 errors — no duplicates.',
    dashboardLocation: `${DASH.events} (filter testRunId, sort by seq)`,
    covers: ['facade.events.stats', 'facade.track'],
    run: async ctx => {
      const counts = { events: 50, logs: 5, errors: 3 };
      await generateNumbered(ctx.sdk.ScaleBun, ctx.runId, counts);
      const s = stats(ctx);
      const state: OfflineWizardState = { runId: ctx.runId, startedAt: new Date().toISOString(), ...counts, statsAtGenerate: s };
      await writeJson(KEYS.offlineWizard, state);
      return { output: state, note: 'Optionally force-stop & relaunch while still offline, then reconnect and run OFF-002.' };
    },
  }),
  t({
    id: 'OFF-002',
    category: C,
    name: 'Offline queue wizard: reconnect & drain',
    description: 'Step 2: reconnect, then run. Flushes and waits for pending to reach 0.',
    interactive: true,
    requires: ['sdkInitialized', 'appId', 'online'],
    expectedLocal: 'stats().pending returns to 0 within 30s; dropped unchanged.',
    expectedScaleBun: 'All items from OFF-001 delivered once, in order of seq (ordering beyond per-lane FIFO is not guaranteed).',
    dashboardLocation: DASH.events,
    covers: ['facade.flush', 'facade.events.flush', 'facade.events.stats'],
    timeoutMs: 45000,
    run: async ctx => {
      const wiz = await readJson<OfflineWizardState | null>(KEYS.offlineWizard, null);
      ctx.expect(wiz, 'run OFF-001 first');
      const mark = ctx.egress.mark();
      await ctx.sdk.ScaleBun.flush();
      await ctx.sdk.ScaleBun.events.flush();
      const drained = await ctx.waitFor(() => (stats(ctx)?.pending === 0 ? stats(ctx) : null), 30000, 500);
      ctx.expect(drained, `queue not drained: ${JSON.stringify(stats(ctx))}`);
      return { output: { generated: wiz, drained, egress: ctx.egress.sdkSummary(mark) }, note: `Verify 50/5/3 items for run ${wiz!.runId}.` };
    },
  }),
  t({
    id: 'OFF-003',
    category: C,
    name: 'Offline kill & relaunch persistence',
    description: 'After OFF-001, force-stop the app while still offline, relaunch offline, run this, then reconnect and run OFF-002.',
    interactive: true,
    requires: ['sdkInitialized', 'appId'],
    verification: 'MANUAL',
    expectedLocal: 'After relaunch pending > 0 (leftover envelopes reloaded from disk).',
    expectedScaleBun: 'Items generated before the kill still arrive after reconnect.',
    dashboardLocation: DASH.events,
    covers: ['config.persistence'],
    run: async ctx => ({ output: { stats: stats(ctx), wizard: await readJson(KEYS.offlineWizard, null) } }),
  }),
  t({
    id: 'OFF-004',
    category: C,
    name: 'Stress burst 500 events (chunked)',
    description: 'Configurable burst; the safe variant sends 500 in chunks of 25 with UI yields.',
    risk: 'MEDIUM',
    requires: ['sdkInitialized'],
    expectedLocal: 'Completes; UI stays responsive; dropped count recorded.',
    expectedScaleBun: '500 test_stress events (or documented drops).',
    dashboardLocation: DASH.events,
    covers: ['facade.track', 'facade.events.stats', 'config.maxQueueSize'],
    timeoutMs: 60000,
    run: async ctx => {
      const d0 = stats(ctx)?.dropped ?? 0;
      const t0 = Date.now();
      for (let i = 1; i <= 500; i++) {
        ctx.sdk.ScaleBun.track('test_stress', { testRunId: ctx.runId, seq: i });
        if (i % 25 === 0) await ctx.sleep(0);
      }
      return { output: { attempted: 500, ms: Date.now() - t0, droppedDelta: (stats(ctx)?.dropped ?? 0) - d0, stats: stats(ctx) } };
    },
  }),
  t({
    id: 'OFF-005',
    category: C,
    name: 'MASSIVE stress burst 5000 events',
    description: 'Dangerous: 5000 events. May saturate storage/queue and upload bandwidth.',
    risk: 'HIGH',
    dangerous: true,
    requires: ['sdkInitialized'],
    expectedLocal: 'No crash; dropped counter documents bounded-queue behaviour.',
    expectedScaleBun: 'Up to 5000 events; drops accounted for by stats().dropped.',
    dashboardLocation: DASH.events,
    covers: ['facade.events.stats', 'config.maxQueueSize'],
    timeoutMs: 180000,
    run: async ctx => {
      const d0 = stats(ctx)?.dropped ?? 0;
      for (let i = 1; i <= 5000; i++) {
        ctx.sdk.ScaleBun.track('test_stress_massive', { testRunId: ctx.runId, seq: i });
        if (i % 50 === 0) await ctx.sleep(0);
      }
      return { output: { attempted: 5000, droppedDelta: (stats(ctx)?.dropped ?? 0) - d0 } };
    },
  }),
  t({
    id: 'OFF-006',
    category: C,
    name: 'Queue limit with small queue',
    description: 'Profile small-queue (maxQueueSize 5, persistence.maxEntries 50, 60s flush): 120 events while offline.',
    interactive: true,
    profiles: ['small-queue'],
    requires: ['sdkInitialized', 'appId'],
    verification: 'MANUAL',
    expectedLocal: 'dropped increases once the bounded queue is full; app stable.',
    expectedScaleBun: 'Delivered count + dropped count = 120.',
    dashboardLocation: DASH.events,
    covers: ['config.maxQueueSize', 'config.persistence'],
    run: async ctx => {
      const d0 = stats(ctx)?.dropped ?? 0;
      for (let i = 1; i <= 120; i++) {
        ctx.sdk.ScaleBun.track('test_queue_limit', { testRunId: ctx.runId, seq: i });
        if (i % 20 === 0) await ctx.sleep(0);
      }
      return { output: { attempted: 120, droppedDelta: (stats(ctx)?.dropped ?? 0) - d0, stats: stats(ctx) } };
    },
  }),
  t({
    id: 'OFF-007',
    category: C,
    name: 'Retry behaviour while offline',
    description: 'While offline, observes SDK upload attempts for 30s (count & spacing) to document retry/backoff.',
    interactive: true,
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'Failed attempts spaced by growing backoff (no tight retry loop).',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['facade.flush'],
    timeoutMs: 45000,
    run: async ctx => {
      const mark = ctx.egress.mark();
      ctx.sdk.ScaleBun.track('test_retry_probe', ctx.tag());
      await ctx.sdk.ScaleBun.flush();
      await ctx.sleep(30000);
      const attempts = ctx.egress.since(mark).filter(r => r.sdk).map(r => ({ t: r.ts, path: r.path, err: r.error, status: r.status }));
      const gaps = attempts.slice(1).map((a, i) => a.t - attempts[i].t);
      return { output: { attempts: attempts.length, gapsMs: gaps } };
    },
  }),
  t({
    id: 'OFF-008',
    category: C,
    name: 'Memory-only persistence loses queue on kill (expected)',
    description: 'Profile memory-persistence: go offline, generate, force-stop, relaunch online.',
    interactive: true,
    profiles: ['memory-persistence'],
    requires: ['sdkInitialized'],
    verification: 'MANUAL',
    expectedLocal: 'After relaunch, pending starts at 0.',
    expectedScaleBun: 'Items generated before the kill do NOT arrive (documented behaviour of persistence.enabled:false).',
    dashboardLocation: DASH.events,
    covers: ['config.persistence'],
    run: async ctx => {
      for (let i = 1; i <= 20; i++) ctx.sdk.ScaleBun.track('test_memory_queue', { testRunId: ctx.runId, seq: i });
      return { output: { stats: stats(ctx) } };
    },
  }),
];
