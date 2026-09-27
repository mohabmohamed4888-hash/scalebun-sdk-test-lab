/**
 * Inventory of every public capability exposed by the INSTALLED
 * @scalebun/react-native (verified against 2.4.0 type declarations + runtime
 * source). This file is the machine-readable source of SDK_COVERAGE.md.
 *
 * `__tests__/sdkSurface.test.ts` re-parses the installed package's .d.ts files
 * and fails when:
 *   - the SDK exports / facade members something that is NOT listed here
 *     (a new API shipped without a Test Lab test), or
 *   - an entry here no longer exists in the SDK (stale test).
 * `__tests__/coverage.test.ts` fails when an entry is neither covered by a test
 * (`covers: [...]` in src/tests/**) nor explicitly classified with a reason.
 */

export type ApiKind =
  | 'facade-method'
  | 'facade-namespace'
  | 'facade-property'
  | 'export-component'
  | 'export-hook'
  | 'export-function'
  | 'export-value'
  | 'hook-return'
  | 'config'
  | 'config-runtime-only'
  | 'provider-prop'
  | 'component-prop'
  | 'metro'
  | 'cli'
  | 'native';

/**
 * How the capability is verified.
 *  AUTOMATED          – a runnable test asserts a local, observable effect.
 *  DASHBOARD          – runnable test emits tagged data; delivery is checked in the dashboard/verifier.
 *  MANUAL             – needs a human (OS dialog, backgrounding, killing the app, physical device).
 *  PLATFORM_SPECIFIC  – only meaningful on one OS; SKIPPED WITH REASON on the other.
 *  DIAGNOSTIC_ONLY    – debug/diagnostic surface; exercised but not a product feature.
 *  NOT_CALLED         – deliberately never invoked by the Test Lab (reason required).
 *  NOT_AVAILABLE      – advertised/expected capability that the installed SDK does not expose.
 */
export type Classification =
  | 'AUTOMATED'
  | 'DASHBOARD'
  | 'MANUAL'
  | 'PLATFORM_SPECIFIC'
  | 'DIAGNOSTIC_ONLY'
  | 'NOT_CALLED'
  | 'NOT_AVAILABLE';

export interface ApiEntry {
  id: string;
  kind: ApiKind;
  classification: Classification;
  note?: string;
}

const e = (
  id: string,
  kind: ApiKind,
  classification: Classification,
  note?: string,
): ApiEntry => ({ id, kind, classification, note });

export const API_INVENTORY: readonly ApiEntry[] = [
  // ── Facade: lifecycle & config ────────────────────────────────────────────
  e('facade.init', 'facade-method', 'AUTOMATED'),
  e('facade.getFeatureFlags', 'facade-method', 'AUTOMATED'),
  e('facade.flush', 'facade-method', 'AUTOMATED'),
  e('facade.setNavigationRef', 'facade-method', 'DASHBOARD'),
  e('facade.setAttribute', 'facade-method', 'DASHBOARD'),
  e('facade.setUiState', 'facade-method', 'DASHBOARD'),
  e('facade.clearUiState', 'facade-method', 'DASHBOARD'),
  e('facade.setCalibrationTarget', 'facade-method', 'DIAGNOSTIC_ONLY'),

  // ── Facade: analytics ─────────────────────────────────────────────────────
  e('facade.track', 'facade-method', 'DASHBOARD'),
  e('facade.trackPurchase', 'facade-method', 'DASHBOARD'),
  e('facade.trackSubscription', 'facade-method', 'DASHBOARD'),
  e('facade.trackPermission', 'facade-method', 'DASHBOARD'),
  e('facade.updateSkanConversionValue', 'facade-method', 'PLATFORM_SPECIFIC', 'iOS only (SKAdNetwork).'),
  e('facade.events.track', 'facade-namespace', 'DASHBOARD'),
  e('facade.events.identify', 'facade-namespace', 'DASHBOARD'),
  e('facade.events.trackPurchase', 'facade-namespace', 'DASHBOARD'),
  e('facade.events.trackSubscription', 'facade-namespace', 'DASHBOARD'),
  e('facade.events.setIdentifiers', 'facade-namespace', 'PLATFORM_SPECIFIC', 'Only identifiers the platform allows without extra consent are sent (IDFV on iOS). IDFA/GAID are never collected by the Test Lab.'),
  e('facade.events.setAttributionClickId', 'facade-namespace', 'DASHBOARD'),
  e('facade.events.flush', 'facade-namespace', 'AUTOMATED'),
  e('facade.events.newSession', 'facade-namespace', 'AUTOMATED'),
  e('facade.events.ids', 'facade-namespace', 'AUTOMATED'),
  e('facade.events.stats', 'facade-namespace', 'AUTOMATED'),
  e('facade.events.updateSkanConversionValue', 'facade-namespace', 'PLATFORM_SPECIFIC', 'iOS only; resolves false when the native SKAN module is absent.'),

  // ── Facade: remote config / flags ─────────────────────────────────────────
  e('facade.config.get', 'facade-namespace', 'AUTOMATED'),
  e('facade.config.refresh', 'facade-namespace', 'DASHBOARD'),
  e('facade.flags.isEnabled', 'facade-namespace', 'DASHBOARD'),
  e('facade.rollouts.isOn', 'facade-namespace', 'DASHBOARD'),
  e('facade.experiments.variant', 'facade-namespace', 'DASHBOARD'),

  // ── Facade: identity ──────────────────────────────────────────────────────
  e('facade.identify', 'facade-method', 'AUTOMATED'),
  e('facade.identifyUser', 'facade-method', 'AUTOMATED'),
  e('facade.setUser', 'facade-method', 'DASHBOARD'),
  e('facade.clearUser', 'facade-method', 'AUTOMATED'),

  // ── Facade: privacy / consent ─────────────────────────────────────────────
  e('facade.eraseLocalData', 'facade-method', 'AUTOMATED'),
  e('facade.setConsent', 'facade-method', 'AUTOMATED'),
  e('facade.getEffectivePrivacyPolicy', 'facade-method', 'AUTOMATED'),

  // ── Facade: errors, logs, bug reports ─────────────────────────────────────
  e('facade.log', 'facade-method', 'DASHBOARD'),
  e('facade.captureError', 'facade-method', 'DASHBOARD'),
  e('facade.nativeCrash', 'facade-method', 'MANUAL', 'DANGEROUS: terminates the process. Behind the Danger Zone confirmation; never in the safe suite.'),
  e('facade.reportBug', 'facade-method', 'DASHBOARD'),
  e('facade.reportBugDetailed', 'facade-method', 'AUTOMATED'),

  // ── Facade: ratings & engage namespace ────────────────────────────────────
  e('facade.submitRating', 'facade-method', 'AUTOMATED'),
  e('facade.engage.getIdentifiedUserId', 'facade-namespace', 'AUTOMATED'),
  e('facade.engage.fetchConfig', 'facade-namespace', 'AUTOMATED'),
  e('facade.engage.trackCoachmarkEvent', 'facade-namespace', 'DIAGNOSTIC_ONLY', 'Documented as the renderer\'s internal bridge; called once with a clearly-tagged test event.'),
  e('facade.engage.clearInAppMessageCache', 'facade-namespace', 'DIAGNOSTIC_ONLY'),
  e('facade.engage.resetInAppState', 'facade-namespace', 'DIAGNOSTIC_ONLY'),
  e('facade.engage.flushEvents', 'facade-namespace', 'AUTOMATED'),
  e('facade.engage.debugFetchInAppMessages', 'facade-namespace', 'DIAGNOSTIC_ONLY'),
  e('facade.engage.submitResponse', 'facade-namespace', 'DASHBOARD'),
  e('facade.engage.submitResponseWithAttachments', 'facade-namespace', 'DASHBOARD'),
  e('facade.engage.submitResponseConfirmed', 'facade-namespace', 'AUTOMATED'),
  e('facade.engage.trackEvent', 'facade-namespace', 'DASHBOARD'),
  e('facade.engage.trackSurveyImpression', 'facade-namespace', 'DASHBOARD'),
  e('facade.engage.emitRatingEvent', 'facade-namespace', 'DASHBOARD'),
  e('facade.engage.requestStoreReview', 'facade-namespace', 'MANUAL', 'OS decides whether the review sheet appears (quota-limited).'),
  e('facade.engage.submitRating', 'facade-namespace', 'DASHBOARD'),
  e('facade.engage.registerForPush', 'facade-namespace', 'MANUAL', 'Needs Firebase/APNs credentials and a physical device for a real token.'),

  // ── Facade: push ──────────────────────────────────────────────────────────
  e('facade.enablePush', 'facade-method', 'AUTOMATED'),
  e('facade.onForegroundNotification', 'facade-method', 'AUTOMATED'),
  e('facade.onNotificationOpened', 'facade-method', 'AUTOMATED'),
  e('facade.push.setToken', 'facade-namespace', 'AUTOMATED'),
  e('facade.push.getToken', 'facade-namespace', 'AUTOMATED'),
  e('facade.push.emitForeground', 'facade-namespace', 'AUTOMATED'),
  e('facade.push.emitNotificationOpened', 'facade-namespace', 'AUTOMATED'),
  e('facade.push.status', 'facade-namespace', 'AUTOMATED'),
  e('facade.push.teardown', 'facade-namespace', 'AUTOMATED'),

  // ── Facade: debug / diagnostics ───────────────────────────────────────────
  e('facade.enableDebug', 'facade-method', 'DIAGNOSTIC_ONLY', 'Deprecated in favour of init({ desktopDebug }). The desktop debugger is a future product per the SDK metro docs.'),
  e('facade.disableDebug', 'facade-method', 'DIAGNOSTIC_ONLY'),
  e('facade.debug.addBreadcrumb', 'facade-namespace', 'DIAGNOSTIC_ONLY'),
  e('facade.debug.ping', 'facade-namespace', 'DIAGNOSTIC_ONLY'),
  e('facade.debug.isEnabled', 'facade-namespace', 'AUTOMATED'),
  e('facade.debug.sendMetric', 'facade-namespace', 'DIAGNOSTIC_ONLY'),
  e('facade.report.export', 'facade-namespace', 'DIAGNOSTIC_ONLY', 'Requires a desktop debug connection; without one it must resolve { success:false }.'),
  e('facade.report.setPrivacy', 'facade-namespace', 'AUTOMATED'),
  e('facade.report.setBranding', 'facade-namespace', 'AUTOMATED'),
  e('facade.report.getPrivacy', 'facade-namespace', 'AUTOMATED'),
  e('facade.report.getBranding', 'facade-namespace', 'AUTOMATED'),

  // ── Facade: replay ────────────────────────────────────────────────────────
  e('facade.replay.start', 'facade-namespace', 'AUTOMATED'),
  e('facade.replay.stop', 'facade-namespace', 'AUTOMATED'),
  e('facade.replay.pause', 'facade-namespace', 'AUTOMATED'),
  e('facade.replay.resume', 'facade-namespace', 'AUTOMATED'),
  e('facade.replay.captureFrame', 'facade-namespace', 'DASHBOARD'),
  e('facade.replay.setUser', 'facade-namespace', 'DASHBOARD'),
  e('facade.replay.clearUser', 'facade-namespace', 'DASHBOARD'),
  e('facade.replay.addBreadcrumb', 'facade-namespace', 'DASHBOARD'),
  e('facade.replay.setPrivacy', 'facade-namespace', 'DASHBOARD'),
  e('facade.replay.setEnabled', 'facade-namespace', 'AUTOMATED'),
  e('facade.replay.setQuality', 'facade-namespace', 'DASHBOARD'),
  e('facade.replay.setCaptureMode', 'facade-namespace', 'DASHBOARD'),
  e('facade.replay.setScreen', 'facade-namespace', 'DASHBOARD'),
  e('facade.replay.flush', 'facade-namespace', 'DASHBOARD'),
  e('facade.replay.isRecording', 'facade-property', 'AUTOMATED'),
  e('facade.replay.sessionId', 'facade-property', 'AUTOMATED'),

  // ── Facade: performance ───────────────────────────────────────────────────
  e('facade.performance.startTrace', 'facade-namespace', 'AUTOMATED'),
  e('facade.performance.stopTrace', 'facade-namespace', 'DASHBOARD'),
  e('facade.performance.addTraceSpan', 'facade-namespace', 'DASHBOARD'),
  e('facade.performance.addTraceMeasurement', 'facade-namespace', 'DASHBOARD'),
  e('facade.performance.markScreenLoadStart', 'facade-namespace', 'DASHBOARD'),
  e('facade.performance.markScreenLoadEnd', 'facade-namespace', 'DASHBOARD'),
  e('facade.performance.setCurrentScreen', 'facade-namespace', 'DASHBOARD'),
  e('facade.performance.onNavigationStateChange', 'facade-namespace', 'DASHBOARD'),
  e('facade.performance.isActive', 'facade-namespace', 'AUTOMATED'),
  e('facade.performance.sendMetric', 'facade-namespace', 'DASHBOARD'),

  // ── Facade: sessions ──────────────────────────────────────────────────────
  e('facade.session.isActive', 'facade-property', 'AUTOMATED'),
  e('facade.session.currentSessionId', 'facade-property', 'AUTOMATED'),
  e('facade.session.start', 'facade-namespace', 'AUTOMATED'),
  e('facade.session.end', 'facade-namespace', 'AUTOMATED'),
  e('facade.session.emitEvent', 'facade-namespace', 'DASHBOARD'),
  e('facade.startSession', 'facade-method', 'AUTOMATED'),
  e('facade.stopSession', 'facade-method', 'AUTOMATED'),

  // ── Named exports ─────────────────────────────────────────────────────────
  e('export.ScaleBunProvider', 'export-component', 'AUTOMATED'),
  e('export.ScaleBunErrorBoundary', 'export-component', 'AUTOMATED'),
  e('export.ScaleBunDebugRoot', 'export-component', 'MANUAL', 'Legacy wrapper (logs a deprecation warning). Mounted only in the "direct-legacy-root" profile.'),
  e('export.ScaleBunScreen', 'export-component', 'DASHBOARD'),
  e('export.useScaleBunScreen', 'export-hook', 'DASHBOARD'),
  e('export.ScaleBunScrollView', 'export-component', 'MANUAL'),
  e('export.ScaleBunFlatList', 'export-component', 'MANUAL'),
  e('export.ScaleBunSectionList', 'export-component', 'MANUAL'),
  e('export.ScaleBunImpression', 'export-component', 'DASHBOARD'),
  e('export.EngagePromptProvider', 'export-component', 'AUTOMATED'),
  e('export.useEngagePrompt', 'export-hook', 'AUTOMATED'),
  e('export.EngageAnchorProvider', 'export-component', 'MANUAL'),
  e('export.ScaleBunAnchor', 'export-component', 'MANUAL'),
  e('export.useScaleBunAnchor', 'export-hook', 'MANUAL'),
  e('export.captureException', 'export-function', 'DASHBOARD'),
  e('export.captureMessage', 'export-function', 'DASHBOARD'),
  e('export.otaOrchestrator', 'export-value', 'AUTOMATED'),
  e('export.OtaOrchestrator', 'export-value', 'NOT_CALLED', 'Class export. Constructing a second orchestrator would contend with the singleton for the same native OTA slots (the SDK documents a 2026-09-21 slot-corruption incident from concurrent syncs). Only `instanceof` is asserted.'),
  e('export.useOtaUpdate', 'export-hook', 'AUTOMATED'),
  e('export.otaEventEmitter', 'export-value', 'AUTOMATED'),
  e('export.ScaleBunInlineSlot', 'export-component', 'AUTOMATED'),
  e('export.EngagePromptView', 'export-component', 'DIAGNOSTIC_ONLY', 'Low-level renderer normally mounted by the provider; resolved via the renderer registry.'),
  e('export.PROMPT_RENDERERS', 'export-value', 'DIAGNOSTIC_ONLY'),
  e('export.resolvePromptRenderer', 'export-function', 'AUTOMATED'),
  e('export.EngageInAppView', 'export-component', 'DIAGNOSTIC_ONLY', 'Low-level renderer normally mounted by the provider.'),
  e('export.INAPP_RENDERERS', 'export-value', 'DIAGNOSTIC_ONLY'),
  e('export.resolveInAppRenderer', 'export-function', 'AUTOMATED'),
  e('export.resolveInAppLayout', 'export-function', 'AUTOMATED'),
  e('export.EngageThrottleStore', 'export-value', 'AUTOMATED'),
  e('export.isCampaignEligible', 'export-function', 'AUTOMATED'),
  e('export.isInAppEligible', 'export-function', 'AUTOMATED'),
  e('export.selectCampaignToRender', 'export-function', 'AUTOMATED'),
  e('export.selectInAppToRender', 'export-function', 'AUTOMATED'),
  e('export.selectInAppVariant', 'export-function', 'AUTOMATED'),
  e('export.getDebugTransport', 'export-function', 'DIAGNOSTIC_ONLY'),
  e('export.getPerformanceFeature', 'export-function', 'DIAGNOSTIC_ONLY'),
  e('export.getProfilerFeature', 'export-function', 'DIAGNOSTIC_ONLY'),
  e('export.createTypedTracker', 'export-function', 'AUTOMATED'),
  e('export.defineTrackingPlan', 'export-function', 'AUTOMATED'),

  // ── Hook / controller return values ───────────────────────────────────────
  e('useEngagePrompt.showEngagePrompt', 'hook-return', 'DASHBOARD', 'Returns false unless a matching campaign is configured in the dashboard.'),
  e('useEngagePrompt.dismissEngagePrompt', 'hook-return', 'AUTOMATED'),
  e('useEngagePrompt.showInAppMessage', 'hook-return', 'DASHBOARD'),
  e('useEngagePrompt.dismissInAppMessage', 'hook-return', 'AUTOMATED'),
  e('useOtaUpdate.sync', 'hook-return', 'MANUAL', 'Downloads/stages a real bundle from channel sdk-test. Not part of the safe suite.'),
  e('useOtaUpdate.restart', 'hook-return', 'MANUAL', 'DANGEROUS: reloads the app.'),
  e('useOtaUpdate.state', 'hook-return', 'AUTOMATED', 'isSyncing / isRestartRequired / activeBundle / syncResult / downloadProgress / lastEvent / mandatoryUpdatePending are rendered live on the OTA screen.'),
  e('otaOrchestrator.getCurrentBundle', 'hook-return', 'AUTOMATED'),
  e('otaOrchestrator.init', 'hook-return', 'NOT_CALLED', 'Called by the SDK from init({ ota: { enabled:true } }); the Test Lab must not double-initialize it. Verified indirectly via isEnabled().'),
  e('otaOrchestrator.isEnabled', 'hook-return', 'AUTOMATED'),
  e('otaOrchestrator.deviceIntegrityIndicators', 'hook-return', 'AUTOMATED'),
  e('otaOrchestrator.isRestartRequired', 'hook-return', 'AUTOMATED'),
  e('otaOrchestrator.checkForUpdate', 'hook-return', 'AUTOMATED'),
  e('otaOrchestrator.sync', 'hook-return', 'MANUAL', 'Same as useOtaUpdate.sync (the hook delegates to it).'),
  e('otaOrchestrator.restart', 'hook-return', 'MANUAL', 'DANGEROUS: reloads the app.'),
  e('otaEventEmitter.addListener', 'hook-return', 'AUTOMATED'),
  e('otaEventEmitter.removeListener', 'hook-return', 'AUTOMATED'),
  e('otaEventEmitter.emit', 'hook-return', 'NOT_CALLED', 'Emitting queues a FAKE OTA lifecycle event for backend telemetry upload, corrupting the release-health funnel.'),
  e('otaEventEmitter.emitSimple', 'hook-return', 'NOT_CALLED', 'Convenience wrapper over emit(): would queue fake OTA telemetry for upload.'),
  e('otaEventEmitter.setFlushCallback', 'hook-return', 'NOT_CALLED', 'Would replace the SDK\'s own telemetry sink ("Called by the SDK core").'),
  e('otaEventEmitter.flush', 'hook-return', 'NOT_CALLED', 'Drains the SDK\'s pending telemetry batch; calling it from the host would drop OTA events.'),
  e('typedTracker.track', 'hook-return', 'DASHBOARD'),
  e('typedTracker.trackUnchecked', 'hook-return', 'DASHBOARD'),
  e('typedTracker.plan', 'hook-return', 'AUTOMATED'),

  // ── Provider / component props ────────────────────────────────────────────
  e('provider.config', 'provider-prop', 'AUTOMATED'),
  e('provider.navigationRef', 'provider-prop', 'DASHBOARD'),
  e('provider.captureInteractions', 'provider-prop', 'MANUAL'),
  e('provider.onReady', 'provider-prop', 'AUTOMATED'),
  e('provider.onInitError', 'provider-prop', 'AUTOMATED'),
  e('provider.defaultTypes', 'provider-prop', 'DASHBOARD'),
  e('provider.ratingRouting', 'provider-prop', 'MANUAL'),
  e('provider.onInAppDeepLink', 'provider-prop', 'MANUAL'),
  e('provider.onInAppGameRequest', 'provider-prop', 'MANUAL', 'Handler is wired and logs requests; granting rewards requires a host backend the Test Lab does not have.'),
  e('provider.previewPollMs', 'provider-prop', 'MANUAL'),
  e('errorBoundary.fallback', 'component-prop', 'AUTOMATED'),
  e('errorBoundary.onError', 'component-prop', 'AUTOMATED'),
  e('errorBoundary.screenName', 'component-prop', 'DASHBOARD'),
  e('impression.resetKey', 'component-prop', 'DASHBOARD'),

  // ── Init configuration (public types) ─────────────────────────────────────
  e('config.projectId', 'config', 'AUTOMATED', 'Legacy handshake mode (profile legacy-credentials).'),
  e('config.publishableKey', 'config', 'AUTOMATED', 'Legacy handshake mode.'),
  e('config.appId', 'config', 'AUTOMATED'),
  e('config.clientKey', 'config', 'AUTOMATED'),
  e('config.apiBaseUrl', 'config', 'AUTOMATED', 'Deprecated & ignored: endpoint is locked to https://api.scalebun.com/api/v1. Test asserts the override is NOT honoured.'),
  e('config.desktopDebug', 'config', 'DIAGNOSTIC_ONLY'),
  e('config.debug', 'config', 'DIAGNOSTIC_ONLY', 'Deprecated alias of desktopDebug.'),
  e('config.sessionReplay', 'config', 'AUTOMATED'),
  e('config.replay.record', 'config', 'AUTOMATED'),
  e('config.replay.captureMode', 'config', 'DASHBOARD'),
  e('config.replay.intervalMs', 'config', 'DASHBOARD'),
  e('config.replay.quality', 'config', 'DASHBOARD'),
  e('config.privacy.redactAuth', 'config', 'AUTOMATED'),
  e('config.privacy.redactCookies', 'config', 'AUTOMATED'),
  e('config.privacy.redactBodies', 'config', 'AUTOMATED'),
  e('config.privacy.maskTextInputs', 'config', 'DASHBOARD'),
  e('config.privacy.maskImages', 'config', 'DASHBOARD'),
  e('config.features.replay', 'config', 'AUTOMATED'),
  e('config.features.network', 'config', 'AUTOMATED'),
  e('config.features.crashes', 'config', 'AUTOMATED'),
  e('config.features.session', 'config', 'AUTOMATED'),
  e('config.features.journey', 'config', 'AUTOMATED'),
  e('config.features.performance', 'config', 'AUTOMATED'),
  e('config.verbose', 'config', 'MANUAL', 'Observable only in device logs (logcat / Xcode console).'),
  e('config.flushIntervalMs', 'config', 'AUTOMATED'),
  e('config.maxQueueSize', 'config', 'AUTOMATED'),
  e('config.enableNetworkMonitoring', 'config', 'AUTOMATED', 'Legacy ScaleBunInitConfig field.'),
  e('config.performance.enabled', 'config', 'AUTOMATED'),
  e('config.performance.tier1', 'config', 'DASHBOARD'),
  e('config.performance.tier2', 'config', 'DASHBOARD'),
  e('config.captureConsoleLogs', 'config', 'DASHBOARD'),
  e('config.autoInstrumentScrollViews', 'config', 'MANUAL'),
  e('config.platform', 'config', 'NOT_CALLED', 'Documented "integrations should omit it"; overriding the detected platform would mislabel all Test Lab data.'),
  e('config.eventTracking', 'config', 'AUTOMATED'),
  e('config.automaticEventTracking', 'config', 'DASHBOARD'),
  e('config.autoLifecycleEvents', 'config', 'DASHBOARD'),

  // ── Init configuration accepted at RUNTIME but absent from public TS types ─
  e('config.ota', 'config-runtime-only', 'AUTOMATED', 'ota.{enabled,checkOnForeground,channelOverride,mandatoryBlocksUi,onCompromisedDevice,healthyAfterMs}. Missing from SimplifiedInitConfig (KSI-005).'),
  e('config.logLevel', 'config-runtime-only', 'MANUAL'),
  e('config.captureNetworkBodies', 'config-runtime-only', 'AUTOMATED'),
  e('config.networkBodyMaxBytes', 'config-runtime-only', 'NOT_CALLED', 'Internal tuning knob not in public types.'),
  e('config.persistence', 'config-runtime-only', 'MANUAL'),
  e('config.sessionBackgroundCapMs', 'config-runtime-only', 'MANUAL'),
  e('config.idleThresholdMs', 'config-runtime-only', 'NOT_CALLED', 'Internal tuning knob not in public types.'),
  e('config.finalizeOnBackground', 'config-runtime-only', 'NOT_CALLED', 'Internal tuning knob not in public types.'),
  e('config.captureInteractionHeatmap', 'config-runtime-only', 'NOT_CALLED', 'Internal; default true is exercised by every interaction test.'),
  e('config.nativeOutbox', 'config-runtime-only', 'NOT_CALLED', 'enableNativeFileOutbox / nativeOutbox* / useObjectStorage* — internal transport knobs not in public types.'),
  e('config.replay.delta', 'config-runtime-only', 'NOT_CALLED', 'replay.deltaEncoding / deltaKeyframeInterval — internal.'),

  // ── Metro / CLI / native ──────────────────────────────────────────────────
  e('metro.withScaleBun', 'metro', 'AUTOMATED'),
  e('metro.SCALEBUN_OPTIONAL_MODULES', 'metro', 'AUTOMATED'),
  e('cli.doctor', 'cli', 'MANUAL', 'npm run doctor'),
  e('cli.init-android', 'cli', 'MANUAL'),
  e('cli.init-ios', 'cli', 'MANUAL'),
  e('cli.ota-publish', 'cli', 'MANUAL', 'scripts/ota-publish-test.sh → channel sdk-test only.'),
  e('native.installReferrer', 'native', 'PLATFORM_SPECIFIC', 'Android Play Install Referrer, read automatically once per install.'),
  e('native.crashDrain', 'native', 'MANUAL', 'Native crash persisted and drained on next launch.'),
  e('native.anrWatchdog', 'native', 'MANUAL', 'Main-thread hang cannot be produced from JS; JS-thread stall is tested instead.'),
  e('native.bootGuard', 'native', 'MANUAL', 'OTA auto-rollback after a crashing bundle (dangerous, manual procedure).'),

  // ── Expected but NOT available in 2.4.0 ───────────────────────────────────
  e('missing.networkUrlExclusion', 'config', 'NOT_AVAILABLE', 'NetworkFeature supports denyUrls/thirdPartyHosts internally but init never passes them (SDKBootstrapper hardcodes the options).'),
  e('missing.expoRouter', 'export-component', 'NOT_AVAILABLE', 'expo-router is an optional peer; the Test Lab is bare React Native with React Navigation, so it is intentionally not installed.'),
  e('missing.deferredDeepLink', 'facade-method', 'NOT_AVAILABLE', 'No public deferred-deep-link API; only install-referrer click ids (Android) and setAttributionClickId.'),
  e('missing.surveyOpenApi', 'facade-method', 'NOT_AVAILABLE', 'No imperative "open survey by id" API: surveys/NPS/in-app are dashboard campaigns shown via useEngagePrompt + triggers.'),
  e('missing.voiceFeedbackApi', 'facade-method', 'NOT_AVAILABLE', 'Voice capture (captureVoiceAttachment) is internal; voice notes arrive only through dashboard FEEDBACK campaigns.'),
  e('missing.replayLink', 'facade-method', 'NOT_AVAILABLE', 'getSessionReplayLink exists on the internal replay SDK but is not on the public facade.'),
];

export const API_IDS = new Set(API_INVENTORY.map(a => a.id));
export type ApiId = (typeof API_INVENTORY)[number]['id'];
