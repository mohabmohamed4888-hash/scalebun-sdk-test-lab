import { t, DASH, ids } from './helpers';
import DeviceInfo from 'react-native-device-info';
import { SkipError } from '../testRunner/types';

const C = 'OTA' as const;
const API = 'https://api.scalebun.com/api/v1';

export const otaTests = [
  t({
    id: 'OTA-001',
    category: C,
    name: 'OTA orchestrator state',
    description: 'isEnabled / getCurrentBundle / isRestartRequired / deviceIntegrityIndicators.',
    requires: ['sdkInitialized'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'isEnabled() true only in ota-enabled/ota-withhold profiles; bundle null on the factory bundle.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['export.otaOrchestrator', 'otaOrchestrator.isEnabled', 'otaOrchestrator.getCurrentBundle', 'otaOrchestrator.isRestartRequired', 'otaOrchestrator.deviceIntegrityIndicators', 'config.ota', 'export.OtaOrchestrator'],
    run: async ctx => {
      const o = ctx.sdk.otaOrchestrator;
      const enabled = o.isEnabled();
      const expectEnabled = ctx.profileId === 'ota-enabled' || ctx.profileId === 'ota-withhold';
      ctx.expect(enabled === expectEnabled, `isEnabled=${enabled}, profile ${ctx.profileId}`);
      ctx.expect(o instanceof ctx.sdk.OtaOrchestrator, 'singleton is not an OtaOrchestrator');
      return {
        output: { enabled, currentBundle: o.getCurrentBundle(), restartRequired: o.isRestartRequired(), integrityIndicators: o.deviceIntegrityIndicators() },
      };
    },
  }),
  t({
    id: 'OTA-002',
    category: C,
    name: 'Check for update on channel sdk-test (read-only)',
    description: 'otaOrchestrator.checkForUpdate against SCALEBUN_OTA_CHANNEL (default sdk-test). Downloads nothing.',
    requires: ['sdkInitialized', 'clientKey', 'online'],
    expectedLocal: 'Response action NONE (up to date) or DOWNLOAD (a release is available) — never throws uncaught.',
    expectedScaleBun: 'A CHECK in the OTA delivery funnel for this installation.',
    dashboardLocation: DASH.ota,
    covers: ['otaOrchestrator.checkForUpdate'],
    run: async ctx => {
      const installationId = ids(ctx)?.installationId;
      if (!installationId) throw new SkipError('NOT_CONFIGURED: no installationId (appId missing)');
      const res = await ctx.sdk.otaOrchestrator.checkForUpdate({
        apiUrl: API,
        clientKey: ctx.env.clientKey!,
        appVersion: DeviceInfo.getVersion(),
        installationId,
        channelName: ctx.env.otaChannel,
      });
      ctx.expect(['NONE', 'DOWNLOAD', 'ROLLBACK'].includes(res.action), `unexpected action ${JSON.stringify(res)}`);
      return { output: { action: res.action, bundle: res.bundle ? { id: res.bundle.id, version: res.bundle.version, isMandatory: res.bundle.isMandatory, installMode: res.bundle.installMode } : null } };
    },
  }),
  t({
    id: 'OTA-003',
    category: C,
    name: 'Check with invalid parameters surfaces an error',
    description: 'checkForUpdate with an unknown channel and nonsense appVersion.',
    requires: ['sdkInitialized', 'clientKey', 'online'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'Either a rejected promise with a message or action NONE — recorded; app unaffected.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['otaOrchestrator.checkForUpdate'],
    run: async ctx => {
      try {
        const res = await ctx.sdk.otaOrchestrator.checkForUpdate({
          apiUrl: API,
          clientKey: ctx.env.clientKey!,
          appVersion: 'not-a-semver',
          installationId: ids(ctx)?.installationId ?? 'sdk_test_install',
          channelName: `sdk-test-missing-${ctx.runId}`,
        });
        return { output: { resolved: res } };
      } catch (e) {
        return { output: { rejected: e instanceof Error ? e.message : String(e) } };
      }
    },
  }),
  t({
    id: 'OTA-004',
    category: C,
    name: 'OTA event listener add / remove',
    description: 'otaEventEmitter.addListener returns an unsubscribe; removeListener detaches.',
    verification: 'LOCAL_ONLY',
    expectedLocal: 'Both calls succeed; the OTA screen listener keeps receiving live events.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['export.otaEventEmitter', 'otaEventEmitter.addListener', 'otaEventEmitter.removeListener'],
    run: async ctx => {
      const l = () => undefined;
      const unsub = ctx.sdk.otaEventEmitter.addListener(l);
      ctx.expect(typeof unsub === 'function', 'addListener did not return an unsubscribe fn');
      unsub();
      ctx.sdk.otaEventEmitter.addListener(l);
      ctx.sdk.otaEventEmitter.removeListener(l);
      return {};
    },
  }),
  t({
    id: 'OTA-005',
    category: C,
    name: 'useOtaUpdate hook state',
    description: 'The OTA screen mounts useOtaUpdate(channelName = sdk-test, mandatoryBlocksUi). Reads its live state.',
    requires: ['sdkInitialized', 'clientKey', 'bridge'],
    verification: 'LOCAL_ONLY',
    expectedLocal: 'Hook state available: isSyncing false, downloadProgress 0..100, mandatoryUpdatePending boolean.',
    expectedScaleBun: 'n/a',
    dashboardLocation: 'n/a',
    covers: ['export.useOtaUpdate', 'useOtaUpdate.state'],
    run: async ctx => {
      ctx.navigate('Ota');
      const hook = await ctx.waitFor(() => ctx.bridge.ota, 3000, 100);
      ctx.expect(hook, 'useOtaUpdate not mounted (OTA screen)');
      const { isSyncing, isRestartRequired, activeBundle, syncResult, downloadProgress, lastEvent, mandatoryUpdatePending } = hook!;
      return { output: { isSyncing, isRestartRequired, activeBundle, syncResult, downloadProgress, lastEvent, mandatoryUpdatePending } };
    },
  }),
  t({
    id: 'OTA-006',
    category: C,
    name: 'Sync: download & stage from sdk-test',
    description: 'useOtaUpdate().sync(). Publish a test bundle first (scripts/ota-publish-test.sh). Observes CHECK/OFFERED/DOWNLOAD_*/INSTALLED events and progress.',
    risk: 'MEDIUM',
    interactive: true,
    requires: ['sdkInitialized', 'clientKey', 'bridge', 'online'],
    verification: 'MANUAL',
    expectedLocal: 'SyncResult UPDATE_INSTALLED (or UP_TO_DATE / WITHHELD); progress reaches 100; isRestartRequired true for ON_NEXT_RESTART.',
    expectedScaleBun: 'OFFERED → DOWNLOAD_COMPLETE → INSTALLED; BOOT_SUCCESS after restart.',
    dashboardLocation: DASH.ota,
    covers: ['useOtaUpdate.sync', 'otaOrchestrator.sync'],
    timeoutMs: 180000,
    run: async ctx => {
      ctx.navigate('Ota');
      const hook = await ctx.waitFor(() => ctx.bridge.ota, 3000, 100);
      ctx.expect(hook, 'OTA hook not mounted');
      const res = await hook!.sync();
      return { output: { result: res, events: ctx.bridge.otaLog.list().slice(0, 15).map(e => e.kind) } };
    },
  }),
  t({
    id: 'OTA-007',
    category: C,
    name: 'APPLY: restart into the staged bundle',
    description: 'Dangerous: reloads the app via useOtaUpdate().restart() / otaOrchestrator.restart().',
    risk: 'HIGH',
    dangerous: true,
    requires: ['sdkInitialized', 'bridge'],
    verification: 'MANUAL',
    expectedLocal: 'App restarts; OTA screen shows the new active bundle id.',
    expectedScaleBun: 'BOOT_SUCCESS after healthyAfterMs (10s).',
    dashboardLocation: DASH.ota,
    covers: ['useOtaUpdate.restart', 'otaOrchestrator.restart'],
    run: async ctx => {
      if (ctx.bridge.ota) ctx.bridge.ota.restart();
      else ctx.sdk.otaOrchestrator.restart();
      return { note: 'If the app did not restart, no update was staged or the native restart path is missing.' };
    },
  }),
  t({
    id: 'OTA-008',
    category: C,
    name: 'Mandatory update UI',
    description: 'Publish a MANDATORY (install-mode IMMEDIATE) bundle to sdk-test; with mandatoryBlocksUi the OTA overlay must block the UI until applied.',
    interactive: true,
    requires: ['sdkInitialized', 'clientKey'],
    verification: 'MANUAL',
    expectedLocal: 'mandatoryUpdatePending = true → blocking overlay.',
    expectedScaleBun: 'Release marked mandatory.',
    dashboardLocation: DASH.ota,
    covers: ['useOtaUpdate.state', 'config.ota'],
    run: async ctx => ({ output: { mandatoryUpdatePending: ctx.bridge.ota?.mandatoryUpdatePending ?? null } }),
  }),
  t({
    id: 'OTA-009',
    category: C,
    name: 'Rollback (boot guard)',
    description: 'Dangerous manual procedure: publish a bundle that throws at startup to sdk-test, sync, restart. The native boot guard must revert.',
    risk: 'DESTRUCTIVE',
    dangerous: true,
    interactive: true,
    verification: 'MANUAL',
    expectedLocal: 'After two failed boots the app runs the previous bundle; SyncResult/OTA events show AUTO_ROLLBACK.',
    expectedScaleBun: 'AUTO_ROLLBACK for the broken release.',
    dashboardLocation: DASH.ota,
    covers: ['native.bootGuard', 'cli.ota-publish'],
    run: async () => ({ note: 'See TEST_PLAN.md §OTA rollback. NEVER on a production channel.' }),
  }),
  t({
    id: 'OTA-010',
    category: C,
    name: 'Compromised-device withhold policy',
    description: "Profile ota-withhold: on an emulator/rooted device sync() must return WITHHELD and emit UPDATE_WITHHELD.",
    profiles: ['ota-withhold'],
    interactive: true,
    requires: ['sdkInitialized', 'bridge'],
    verification: 'MANUAL',
    expectedLocal: 'deviceIntegrityIndicators() non-empty → WITHHELD; empty → normal sync.',
    expectedScaleBun: 'n/a (UPDATE_WITHHELD is local-only by design).',
    dashboardLocation: 'n/a',
    covers: ['config.ota', 'otaOrchestrator.deviceIntegrityIndicators'],
    run: async ctx => ({ output: { indicators: ctx.sdk.otaOrchestrator.deviceIntegrityIndicators() } }),
  }),
];
