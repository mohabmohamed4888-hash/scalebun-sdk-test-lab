# SDK Coverage Matrix

> **Generated** by `npm run docs:coverage` from `src/scalebun/apiInventory.ts` and `src/tests/**`. Do not edit by hand.
> Installed SDK: **@scalebun/react-native 2.4.0** (source of truth: the installed `lib/typescript` declarations + `lib/module` runtime).

## How completeness is enforced

- `__tests__/sdkSurface.test.ts` re-parses the installed SDK (`index.d.ts` runtime exports, every public `ScaleBunFacade` member and namespace member, every `SimplifiedInitConfig` key) and fails on any API that is missing from — or stale in — the inventory.
- `__tests__/coverage.test.ts` fails when an inventoried capability has no covering test **and** no written NOT_CALLED / NOT_AVAILABLE reason.
- Bumping the SDK version fails the version pin test until this matrix is regenerated and reviewed.

## Totals

| Metric | Value |
|---|---|
| Public APIs / capabilities inventoried | **251** |
| Covered by ≥1 Test Lab test | **237** |
| Explicitly not called / not available (with reason) | 14 |
| Classification AUTOMATED | 109 |
| Classification DASHBOARD | 68 |
| Classification DIAGNOSTIC_ONLY | 20 |
| Classification PLATFORM_SPECIFIC | 4 |
| Classification MANUAL | 31 |
| Classification NOT_CALLED | 13 |
| Classification NOT_AVAILABLE | 6 |
| Test cases | **200** |
| — runnable unattended (safe suite, graded LOCAL_PASS/VERIFIED) | 149 |
| — needing a human (interactive or MANUAL grading) | 49 |
| — dangerous/destructive (Danger Zone only) | 6 |

Classification legend: **AUTOMATED** local assertion on observable SDK state · **DASHBOARD** emits tagged data, delivery verified in dashboard/verifier (LOCAL_PASS ≠ VERIFIED) · **MANUAL** needs a person/OS dialog/device action · **PLATFORM_SPECIFIC** SKIPPED WITH REASON on the other OS · **DIAGNOSTIC_ONLY** debug/diagnostic surface · **NOT_CALLED** deliberately never invoked (reason given) · **NOT_AVAILABLE** not exposed by the installed SDK.

## Facade methods & namespaces (`import ScaleBun from "@scalebun/react-native"`)

| API / capability | Classification | Tests | Notes |
|---|---|---|---|
| `facade.init` | AUTOMATED | INIT-001, INIT-002, INIT-003, INIT-004, INIT-007, INIT-008, INIT-010, EDGE-010 |  |
| `facade.getFeatureFlags` | AUTOMATED | INIT-005 |  |
| `facade.flush` | AUTOMATED | ANA-001, ANA-009, OFF-002, OFF-007, EDGE-008, EDGE-009 |  |
| `facade.setNavigationRef` | DASHBOARD | INIT-004, ANA-008, SES-007, NAV-001 |  |
| `facade.setAttribute` | DASHBOARD | SES-008, EDGE-006 |  |
| `facade.setUiState` | DASHBOARD | ANA-021 |  |
| `facade.clearUiState` | DASHBOARD | ANA-021 |  |
| `facade.setCalibrationTarget` | DIAGNOSTIC_ONLY | DIAG-004 |  |
| `facade.track` | DASHBOARD | INIT-003, INIT-011, ANA-001, ANA-003, ANA-004, ANA-005, ANA-010, ANA-011, ANA-012, ANA-019, OFF-001, OFF-004, ENG-006, PRIV-005, EDGE-001, EDGE-002, EDGE-003, EDGE-004, EDGE-005, EDGE-006, EDGE-007, EDGE-009, EDGE-010 |  |
| `facade.trackPurchase` | DASHBOARD | ANA-013, ANA-015, ANA-016, ANA-017, ANA-019, EDGE-006 |  |
| `facade.trackSubscription` | DASHBOARD | ANA-018 |  |
| `facade.trackPermission` | DASHBOARD | ANA-022, PUSH-002 |  |
| `facade.updateSkanConversionValue` | PLATFORM_SPECIFIC | ATT-005 | iOS only (SKAdNetwork). |
| `facade.events.track` | DASHBOARD | ANA-002 |  |
| `facade.events.identify` | DASHBOARD | IDN-004 |  |
| `facade.events.trackPurchase` | DASHBOARD | ANA-014 |  |
| `facade.events.trackSubscription` | DASHBOARD | ANA-018 |  |
| `facade.events.setIdentifiers` | PLATFORM_SPECIFIC | ATT-001 | Only identifiers the platform allows without extra consent are sent (IDFV on iOS). IDFA/GAID are never collected by the Test Lab. |
| `facade.events.setAttributionClickId` | DASHBOARD | ATT-002 |  |
| `facade.events.flush` | AUTOMATED | ANA-002, ANA-009, OFF-002, EDGE-008 |  |
| `facade.events.newSession` | AUTOMATED | SES-004 |  |
| `facade.events.ids` | AUTOMATED | SES-001, SES-005, SES-009, IDN-001, DIAG-005 |  |
| `facade.events.stats` | AUTOMATED | INIT-010, ANA-002, ANA-005, ANA-017, OFF-001, OFF-002, OFF-004, OFF-005, DIAG-005 |  |
| `facade.events.updateSkanConversionValue` | PLATFORM_SPECIFIC | ATT-004 | iOS only; resolves false when the native SKAN module is absent. |
| `facade.config.get` | AUTOMATED | DIAG-006 |  |
| `facade.config.refresh` | DASHBOARD | DIAG-006 |  |
| `facade.flags.isEnabled` | DASHBOARD | DIAG-006 |  |
| `facade.rollouts.isOn` | DASHBOARD | DIAG-006 |  |
| `facade.experiments.variant` | DASHBOARD | DIAG-006 |  |
| `facade.identify` | AUTOMATED | INIT-003, IDN-002, IDN-006, IDN-008, IDN-011, EDGE-006 |  |
| `facade.identifyUser` | AUTOMATED | IDN-003 |  |
| `facade.setUser` | DASHBOARD | IDN-005, EDGE-006 |  |
| `facade.clearUser` | AUTOMATED | IDN-001, IDN-007, IDN-008, IDN-009, IDN-011 |  |
| `facade.eraseLocalData` | AUTOMATED | PRIV-004 |  |
| `facade.setConsent` | AUTOMATED | PRIV-002, PRIV-003 |  |
| `facade.getEffectivePrivacyPolicy` | AUTOMATED | NET-017, PRIV-001 |  |
| `facade.log` | DASHBOARD | ERR-001, EDGE-006 |  |
| `facade.captureError` | DASHBOARD | ERR-002, ERR-003, ERR-004, ERR-006, ERR-008, ERR-009, ERR-017, PRIV-006, EDGE-006 |  |
| `facade.nativeCrash` | MANUAL | ERR-012 | DANGEROUS: terminates the process. Behind the Danger Zone confirmation; never in the safe suite. |
| `facade.reportBug` | DASHBOARD | ERR-010 |  |
| `facade.reportBugDetailed` | AUTOMATED | ERR-011 |  |
| `facade.submitRating` | AUTOMATED | INIT-007, ENG-001 |  |
| `facade.engage.getIdentifiedUserId` | AUTOMATED | IDN-002, IDN-007 |  |
| `facade.engage.fetchConfig` | AUTOMATED | ENG-002 |  |
| `facade.engage.trackCoachmarkEvent` | DIAGNOSTIC_ONLY | ENG-008 | Documented as the renderer's internal bridge; called once with a clearly-tagged test event. |
| `facade.engage.clearInAppMessageCache` | DIAGNOSTIC_ONLY | ENG-010 |  |
| `facade.engage.resetInAppState` | DIAGNOSTIC_ONLY | ENG-010 |  |
| `facade.engage.flushEvents` | AUTOMATED | ENG-008 |  |
| `facade.engage.debugFetchInAppMessages` | DIAGNOSTIC_ONLY | ENG-003 |  |
| `facade.engage.submitResponse` | DASHBOARD | ENG-007 |  |
| `facade.engage.submitResponseWithAttachments` | DASHBOARD | ENG-007 |  |
| `facade.engage.submitResponseConfirmed` | AUTOMATED | ENG-007 |  |
| `facade.engage.trackEvent` | DASHBOARD | ENG-008 |  |
| `facade.engage.trackSurveyImpression` | DASHBOARD | ENG-008 |  |
| `facade.engage.emitRatingEvent` | DASHBOARD | ENG-008 |  |
| `facade.engage.requestStoreReview` | MANUAL | ENG-009 | OS decides whether the review sheet appears (quota-limited). |
| `facade.engage.submitRating` | DASHBOARD | ENG-008 |  |
| `facade.engage.registerForPush` | MANUAL | PUSH-006 | Needs Firebase/APNs credentials and a physical device for a real token. |
| `facade.enablePush` | AUTOMATED | PUSH-002, PUSH-003, PUSH-004, PUSH-008 |  |
| `facade.onForegroundNotification` | AUTOMATED | PUSH-004, PUSH-007 |  |
| `facade.onNotificationOpened` | AUTOMATED | PUSH-004, PUSH-007 |  |
| `facade.push.setToken` | AUTOMATED | PUSH-004 |  |
| `facade.push.getToken` | AUTOMATED | PUSH-001, PUSH-004 |  |
| `facade.push.emitForeground` | AUTOMATED | PUSH-004 |  |
| `facade.push.emitNotificationOpened` | AUTOMATED | PUSH-004 |  |
| `facade.push.status` | AUTOMATED | PUSH-001, PUSH-005 |  |
| `facade.push.teardown` | AUTOMATED | PUSH-005 |  |
| `facade.enableDebug` | DIAGNOSTIC_ONLY | DIAG-001 | Deprecated in favour of init({ desktopDebug }). The desktop debugger is a future product per the SDK metro docs. |
| `facade.disableDebug` | DIAGNOSTIC_ONLY | DIAG-001 |  |
| `facade.debug.addBreadcrumb` | DIAGNOSTIC_ONLY | ERR-014 |  |
| `facade.debug.ping` | DIAGNOSTIC_ONLY | DIAG-001 |  |
| `facade.debug.isEnabled` | AUTOMATED | DIAG-001 |  |
| `facade.debug.sendMetric` | DIAGNOSTIC_ONLY | PERF-006 |  |
| `facade.report.export` | DIAGNOSTIC_ONLY | DIAG-003 | Requires a desktop debug connection; without one it must resolve { success:false }. |
| `facade.report.setPrivacy` | AUTOMATED | PRIV-009 |  |
| `facade.report.setBranding` | AUTOMATED | PRIV-009 |  |
| `facade.report.getPrivacy` | AUTOMATED | PRIV-009 |  |
| `facade.report.getBranding` | AUTOMATED | PRIV-009 |  |
| `facade.replay.start` | AUTOMATED | RPL-002, RPL-010 |  |
| `facade.replay.stop` | AUTOMATED | RPL-002 |  |
| `facade.replay.pause` | AUTOMATED | RPL-002 |  |
| `facade.replay.resume` | AUTOMATED | RPL-002 |  |
| `facade.replay.captureFrame` | DASHBOARD | RPL-003 |  |
| `facade.replay.setUser` | DASHBOARD | IDN-010 |  |
| `facade.replay.clearUser` | DASHBOARD | IDN-010 |  |
| `facade.replay.addBreadcrumb` | DASHBOARD | ERR-014 |  |
| `facade.replay.setPrivacy` | DASHBOARD | RPL-005, PRIV-007, PRIV-008 |  |
| `facade.replay.setEnabled` | AUTOMATED | RPL-005 |  |
| `facade.replay.setQuality` | DASHBOARD | RPL-004 |  |
| `facade.replay.setCaptureMode` | DASHBOARD | RPL-004 |  |
| `facade.replay.setScreen` | DASHBOARD | RPL-004 |  |
| `facade.replay.flush` | DASHBOARD | RPL-003 |  |
| `facade.replay.isRecording` | AUTOMATED | RPL-001 |  |
| `facade.replay.sessionId` | AUTOMATED | SES-001, RPL-001 |  |
| `facade.performance.startTrace` | AUTOMATED | PERF-002, PERF-003 |  |
| `facade.performance.stopTrace` | DASHBOARD | PERF-002, PERF-003 |  |
| `facade.performance.addTraceSpan` | DASHBOARD | PERF-002 |  |
| `facade.performance.addTraceMeasurement` | DASHBOARD | PERF-002 |  |
| `facade.performance.markScreenLoadStart` | DASHBOARD | PERF-004 |  |
| `facade.performance.markScreenLoadEnd` | DASHBOARD | PERF-004 |  |
| `facade.performance.setCurrentScreen` | DASHBOARD | PERF-005 |  |
| `facade.performance.onNavigationStateChange` | DASHBOARD | PERF-005 |  |
| `facade.performance.isActive` | AUTOMATED | PERF-001, PERF-011 |  |
| `facade.performance.sendMetric` | DASHBOARD | PERF-006 |  |
| `facade.session.isActive` | AUTOMATED | SES-001 |  |
| `facade.session.currentSessionId` | AUTOMATED | SES-001 |  |
| `facade.session.start` | AUTOMATED | SES-003 |  |
| `facade.session.end` | AUTOMATED | SES-003 |  |
| `facade.session.emitEvent` | DASHBOARD | SES-003 |  |
| `facade.startSession` | AUTOMATED | SES-002 |  |
| `facade.stopSession` | AUTOMATED | SES-002 |  |

## Named exports (components, hooks, functions, values)

| API / capability | Classification | Tests | Notes |
|---|---|---|---|
| `export.ScaleBunProvider` | AUTOMATED | INIT-001 |  |
| `export.ScaleBunErrorBoundary` | AUTOMATED | ERR-007 |  |
| `export.ScaleBunDebugRoot` | MANUAL | NAV-006 | Legacy wrapper (logs a deprecation warning). Mounted only in the "direct-legacy-root" profile. |
| `export.ScaleBunScreen` | DASHBOARD | NAV-005 |  |
| `export.useScaleBunScreen` | DASHBOARD | NAV-005 |  |
| `export.ScaleBunScrollView` | MANUAL | RPL-006 |  |
| `export.ScaleBunFlatList` | MANUAL | RPL-006 |  |
| `export.ScaleBunSectionList` | MANUAL | RPL-006 |  |
| `export.ScaleBunImpression` | DASHBOARD | ANA-023 |  |
| `export.EngagePromptProvider` | AUTOMATED | INIT-004 |  |
| `export.useEngagePrompt` | AUTOMATED | ENG-004 |  |
| `export.EngageAnchorProvider` | MANUAL | ENG-012 |  |
| `export.ScaleBunAnchor` | MANUAL | ENG-012 |  |
| `export.useScaleBunAnchor` | MANUAL | ENG-012 |  |
| `export.captureException` | DASHBOARD | ERR-005 |  |
| `export.captureMessage` | DASHBOARD | ERR-005 |  |
| `export.otaOrchestrator` | AUTOMATED | OTA-001 |  |
| `export.OtaOrchestrator` | NOT_CALLED | OTA-001 | Class export. Constructing a second orchestrator would contend with the singleton for the same native OTA slots (the SDK documents a 2026-09-21 slot-corruption incident from concurrent syncs). Only `instanceof` is asserted. |
| `export.useOtaUpdate` | AUTOMATED | OTA-005 |  |
| `export.otaEventEmitter` | AUTOMATED | OTA-004 |  |
| `export.ScaleBunInlineSlot` | AUTOMATED | ENG-011 |  |
| `export.EngagePromptView` | DIAGNOSTIC_ONLY | ENG-013 | Low-level renderer normally mounted by the provider; resolved via the renderer registry. |
| `export.PROMPT_RENDERERS` | DIAGNOSTIC_ONLY | ENG-013 |  |
| `export.resolvePromptRenderer` | AUTOMATED | ENG-013 |  |
| `export.EngageInAppView` | DIAGNOSTIC_ONLY | ENG-013 | Low-level renderer normally mounted by the provider. |
| `export.INAPP_RENDERERS` | DIAGNOSTIC_ONLY | ENG-013 |  |
| `export.resolveInAppRenderer` | AUTOMATED | ENG-013 |  |
| `export.resolveInAppLayout` | AUTOMATED | ENG-013 |  |
| `export.EngageThrottleStore` | AUTOMATED | ENG-014 |  |
| `export.isCampaignEligible` | AUTOMATED | ENG-014 |  |
| `export.isInAppEligible` | AUTOMATED | ENG-014 |  |
| `export.selectCampaignToRender` | AUTOMATED | ENG-014 |  |
| `export.selectInAppToRender` | AUTOMATED | ENG-014 |  |
| `export.selectInAppVariant` | AUTOMATED | ENG-014 |  |
| `export.getDebugTransport` | DIAGNOSTIC_ONLY | DIAG-002, DIAG-003 |  |
| `export.getPerformanceFeature` | DIAGNOSTIC_ONLY | PERF-010 |  |
| `export.getProfilerFeature` | DIAGNOSTIC_ONLY | PERF-010 |  |
| `export.createTypedTracker` | AUTOMATED | ANA-020 |  |
| `export.defineTrackingPlan` | AUTOMATED | ANA-020 |  |

## Hook / controller / singleton members

| API / capability | Classification | Tests | Notes |
|---|---|---|---|
| `useEngagePrompt.showEngagePrompt` | DASHBOARD | ENG-004 | Returns false unless a matching campaign is configured in the dashboard. |
| `useEngagePrompt.dismissEngagePrompt` | AUTOMATED | ENG-004 |  |
| `useEngagePrompt.showInAppMessage` | DASHBOARD | ENG-005 |  |
| `useEngagePrompt.dismissInAppMessage` | AUTOMATED | ENG-005 |  |
| `useOtaUpdate.sync` | MANUAL | OTA-006 | Downloads/stages a real bundle from channel sdk-test. Not part of the safe suite. |
| `useOtaUpdate.restart` | MANUAL | OTA-007 | DANGEROUS: reloads the app. |
| `useOtaUpdate.state` | AUTOMATED | OTA-005, OTA-008 | isSyncing / isRestartRequired / activeBundle / syncResult / downloadProgress / lastEvent / mandatoryUpdatePending are rendered live on the OTA screen. |
| `otaOrchestrator.getCurrentBundle` | AUTOMATED | OTA-001 |  |
| `otaOrchestrator.init` | NOT_CALLED | — | Called by the SDK from init({ ota: { enabled:true } }); the Test Lab must not double-initialize it. Verified indirectly via isEnabled(). |
| `otaOrchestrator.isEnabled` | AUTOMATED | OTA-001 |  |
| `otaOrchestrator.deviceIntegrityIndicators` | AUTOMATED | OTA-001, OTA-010 |  |
| `otaOrchestrator.isRestartRequired` | AUTOMATED | OTA-001 |  |
| `otaOrchestrator.checkForUpdate` | AUTOMATED | OTA-002, OTA-003 |  |
| `otaOrchestrator.sync` | MANUAL | OTA-006 | Same as useOtaUpdate.sync (the hook delegates to it). |
| `otaOrchestrator.restart` | MANUAL | OTA-007 | DANGEROUS: reloads the app. |
| `otaEventEmitter.addListener` | AUTOMATED | OTA-004 |  |
| `otaEventEmitter.removeListener` | AUTOMATED | OTA-004 |  |
| `otaEventEmitter.emit` | NOT_CALLED | — | Emitting queues a FAKE OTA lifecycle event for backend telemetry upload, corrupting the release-health funnel. |
| `otaEventEmitter.emitSimple` | NOT_CALLED | — | Convenience wrapper over emit(): would queue fake OTA telemetry for upload. |
| `otaEventEmitter.setFlushCallback` | NOT_CALLED | — | Would replace the SDK's own telemetry sink ("Called by the SDK core"). |
| `otaEventEmitter.flush` | NOT_CALLED | — | Drains the SDK's pending telemetry batch; calling it from the host would drop OTA events. |
| `typedTracker.track` | DASHBOARD | ANA-020 |  |
| `typedTracker.trackUnchecked` | DASHBOARD | ANA-020 |  |
| `typedTracker.plan` | AUTOMATED | ANA-020 |  |

## ScaleBunProvider & component props

| API / capability | Classification | Tests | Notes |
|---|---|---|---|
| `provider.config` | AUTOMATED | INIT-001 |  |
| `provider.navigationRef` | DASHBOARD | ANA-008, NAV-001, NAV-002, NAV-003 |  |
| `provider.captureInteractions` | MANUAL | ANA-007 |  |
| `provider.onReady` | AUTOMATED | INIT-001 |  |
| `provider.onInitError` | AUTOMATED | INIT-008 |  |
| `provider.defaultTypes` | DASHBOARD | ENG-004 |  |
| `provider.ratingRouting` | MANUAL | ENG-004 |  |
| `provider.onInAppDeepLink` | MANUAL | ENG-015 |  |
| `provider.onInAppGameRequest` | MANUAL | ENG-015 | Handler is wired and logs requests; granting rewards requires a host backend the Test Lab does not have. |
| `provider.previewPollMs` | MANUAL | ENG-015 |  |
| `errorBoundary.fallback` | AUTOMATED | ERR-007 |  |
| `errorBoundary.onError` | AUTOMATED | ERR-007 |  |
| `errorBoundary.screenName` | DASHBOARD | ERR-007 |  |
| `impression.resetKey` | DASHBOARD | ANA-023 |  |

## Init configuration (public types)

| API / capability | Classification | Tests | Notes |
|---|---|---|---|
| `config.projectId` | AUTOMATED | INIT-011 | Legacy handshake mode (profile legacy-credentials). |
| `config.publishableKey` | AUTOMATED | INIT-011 | Legacy handshake mode. |
| `config.appId` | AUTOMATED | INIT-001 |  |
| `config.clientKey` | AUTOMATED | INIT-001, INIT-012 |  |
| `config.apiBaseUrl` | AUTOMATED | INIT-009, INIT-016 | Deprecated & ignored: endpoint is locked to https://api.scalebun.com/api/v1. Test asserts the override is NOT honoured. |
| `config.desktopDebug` | DIAGNOSTIC_ONLY | DIAG-002 |  |
| `config.debug` | DIAGNOSTIC_ONLY | DIAG-002 | Deprecated alias of desktopDebug. |
| `config.sessionReplay` | AUTOMATED | RPL-001, FMX-001 |  |
| `config.replay.record` | AUTOMATED | RPL-001 |  |
| `config.replay.captureMode` | DASHBOARD | RPL-004 |  |
| `config.replay.intervalMs` | DASHBOARD | RPL-006 |  |
| `config.replay.quality` | DASHBOARD | RPL-004 |  |
| `config.privacy.redactAuth` | AUTOMATED | NET-012, NET-015, NET-017, NET-019, PRIV-001 |  |
| `config.privacy.redactCookies` | AUTOMATED | NET-013, NET-017, PRIV-001 |  |
| `config.privacy.redactBodies` | AUTOMATED | NET-014, PRIV-001, PRIV-010 |  |
| `config.privacy.maskTextInputs` | DASHBOARD | RPL-007, PRIV-001 |  |
| `config.privacy.maskImages` | DASHBOARD | RPL-007, PRIV-001, PRIV-007 |  |
| `config.features.replay` | AUTOMATED | RPL-010, FMX-001 |  |
| `config.features.network` | AUTOMATED | NET-001, NET-002, NET-003, NET-004, NET-005, NET-006, NET-008, NET-010, NET-011, NET-018, FMX-001 |  |
| `config.features.crashes` | AUTOMATED | FMX-001 |  |
| `config.features.session` | AUTOMATED | FMX-001 |  |
| `config.features.journey` | AUTOMATED | FMX-001 |  |
| `config.features.performance` | AUTOMATED | PERF-011, FMX-001 |  |
| `config.verbose` | MANUAL | INIT-006 | Observable only in device logs (logcat / Xcode console). |
| `config.flushIntervalMs` | AUTOMATED | INIT-008, INIT-013 |  |
| `config.maxQueueSize` | AUTOMATED | INIT-013, OFF-004, OFF-005, OFF-006 |  |
| `config.enableNetworkMonitoring` | AUTOMATED | NET-001 | Legacy ScaleBunInitConfig field. |
| `config.performance.enabled` | AUTOMATED | PERF-001 |  |
| `config.performance.tier1` | DASHBOARD | NET-004, NET-007, PERF-007, PERF-012 |  |
| `config.performance.tier2` | DASHBOARD | PERF-008, PERF-009 |  |
| `config.captureConsoleLogs` | DASHBOARD | ERR-015 |  |
| `config.autoInstrumentScrollViews` | MANUAL | RPL-009 |  |
| `config.platform` | NOT_CALLED | — | Documented "integrations should omit it"; overriding the detected platform would mislabel all Test Lab data. |
| `config.eventTracking` | AUTOMATED | INIT-001, ANA-006 |  |
| `config.automaticEventTracking` | DASHBOARD | ANA-006, ANA-024, NAV-004 |  |
| `config.autoLifecycleEvents` | DASHBOARD | ANA-006 |  |

## Init configuration accepted at RUNTIME but absent from public types

| API / capability | Classification | Tests | Notes |
|---|---|---|---|
| `config.ota` | AUTOMATED | OTA-001, OTA-008, OTA-010 | ota.{enabled,checkOnForeground,channelOverride,mandatoryBlocksUi,onCompromisedDevice,healthyAfterMs}. Missing from SimplifiedInitConfig (KSI-005). |
| `config.logLevel` | MANUAL | INIT-006 |  |
| `config.captureNetworkBodies` | AUTOMATED | NET-009, NET-014 |  |
| `config.networkBodyMaxBytes` | NOT_CALLED | — | Internal tuning knob not in public types. |
| `config.persistence` | MANUAL | OFF-003, OFF-006, OFF-008 |  |
| `config.sessionBackgroundCapMs` | MANUAL | SES-006 |  |
| `config.idleThresholdMs` | NOT_CALLED | — | Internal tuning knob not in public types. |
| `config.finalizeOnBackground` | NOT_CALLED | — | Internal tuning knob not in public types. |
| `config.captureInteractionHeatmap` | NOT_CALLED | ANA-007 | Internal; default true is exercised by every interaction test. |
| `config.nativeOutbox` | NOT_CALLED | — | enableNativeFileOutbox / nativeOutbox* / useObjectStorage* — internal transport knobs not in public types. |
| `config.replay.delta` | NOT_CALLED | — | replay.deltaEncoding / deltaKeyframeInterval — internal. |

## Metro, CLI & native capabilities

| API / capability | Classification | Tests | Notes |
|---|---|---|---|
| `metro.withScaleBun` | AUTOMATED | INIT-014, DIAG-007 |  |
| `metro.SCALEBUN_OPTIONAL_MODULES` | AUTOMATED | INIT-014, RPL-008 |  |
| `cli.doctor` | MANUAL | INIT-015 | npm run doctor |
| `cli.init-android` | MANUAL | INIT-015 |  |
| `cli.init-ios` | MANUAL | INIT-015 |  |
| `cli.ota-publish` | MANUAL | ERR-016, OTA-009 | scripts/ota-publish-test.sh → channel sdk-test only. |
| `native.installReferrer` | PLATFORM_SPECIFIC | ATT-003 | Android Play Install Referrer, read automatically once per install. |
| `native.crashDrain` | MANUAL | ERR-012, ERR-013 | Native crash persisted and drained on next launch. |
| `native.anrWatchdog` | MANUAL | PERF-009 | Main-thread hang cannot be produced from JS; JS-thread stall is tested instead. |
| `native.bootGuard` | MANUAL | OTA-009 | OTA auto-rollback after a crashing bundle (dangerous, manual procedure). |

## Expected capabilities NOT available in the installed version

| API / capability | Classification | Tests | Notes |
|---|---|---|---|
| `missing.networkUrlExclusion` | NOT_AVAILABLE | NET-016 | NetworkFeature supports denyUrls/thirdPartyHosts internally but init never passes them (SDKBootstrapper hardcodes the options). |
| `missing.expoRouter` | NOT_AVAILABLE | NAV-007 | expo-router is an optional peer; the Test Lab is bare React Native with React Navigation, so it is intentionally not installed. |
| `missing.deferredDeepLink` | NOT_AVAILABLE | ATT-006 | No public deferred-deep-link API; only install-referrer click ids (Android) and setAttributionClickId. |
| `missing.surveyOpenApi` | NOT_AVAILABLE | — | No imperative "open survey by id" API: surveys/NPS/in-app are dashboard campaigns shown via useEngagePrompt + triggers. |
| `missing.voiceFeedbackApi` | NOT_AVAILABLE | — | Voice capture (captureVoiceAttachment) is internal; voice notes arrive only through dashboard FEEDBACK campaigns. |
| `missing.replayLink` | NOT_AVAILABLE | — | getSessionReplayLink exists on the internal replay SDK but is not on the public facade. |

## Test catalog

| ID | Category | Name | Risk | Platforms | Grading | Flags |
|---|---|---|---|---|---|---|
| INIT-001 | Setup & Init | Valid initialization (active integration mode) | SAFE | android/ios | DASHBOARD | needs: clientKey, appId |
| INIT-002 | Setup & Init | Repeated init() is idempotent | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| INIT-003 | Setup & Init | SDK calls before init resolves (identify / track / log) | SAFE | android/ios | DASHBOARD | profile: pre-init-probe · needs: appId, clientKey |
| INIT-004 | Setup & Init | Direct ScaleBun.init() integration | SAFE | android/ios | DASHBOARD | profile: direct-init/direct-legacy-root/pre-init-probe/no-auto-events · needs: sdkInitialized |
| INIT-005 | Setup & Init | Feature flags snapshot matches profile | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| INIT-006 | Setup & Init | Verbose / debug logging | SAFE | android/ios | MANUAL | profile: verbose · needs: sdkInitialized |
| INIT-007 | Setup & Init | Invalid credentials fail safely | SAFE | android/ios | DASHBOARD | profile: invalid-credentials |
| INIT-008 | Setup & Init | Malformed optional config does not crash | SAFE | android/ios | LOCAL_ONLY | profile: malformed-config |
| INIT-009 | Setup & Init | apiBaseUrl override is ignored (endpoint locked) | SAFE | android/ios | LOCAL_ONLY | profile: custom-endpoint · needs: sdkInitialized |
| INIT-010 | Setup & Init | Offline startup | SAFE | android/ios | MANUAL | interactive |
| INIT-011 | Setup & Init | Legacy credentials (README quick-start config) | SAFE | android/ios | DASHBOARD | profile: legacy-credentials |
| INIT-012 | Setup & Init | Environment & credential sanity | SAFE | android/ios | LOCAL_ONLY |  |
| INIT-013 | Setup & Init | Flush interval & batch size honored | SAFE | android/ios | DASHBOARD | profile: flush-fast · needs: sdkInitialized, online |
| INIT-014 | Setup & Init | Optional native dependencies degrade gracefully | SAFE | android/ios | LOCAL_ONLY |  |
| INIT-015 | Setup & Init | ScaleBun doctor / init codemods | SAFE | android/ios | MANUAL |  |
| INIT-016 | Setup & Init | SDK egress targets the cloud /api/v1 endpoint | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| ANA-001 | Analytics | Single custom event (ScaleBun.track) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ANA-002 | Analytics | Envelope lane events.track | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, appId |
| ANA-003 | Analytics | Property types: string/number/boolean/null/nested/array | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ANA-004 | Analytics | Unicode, Arabic, RTL and emoji properties | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ANA-005 | Analytics | Rapid event burst (100) without blocking the UI | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ANA-006 | Analytics | Automatic lifecycle events | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ANA-007 | Analytics | Automatic interaction tracking | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized |
| ANA-008 | Analytics | Screen tracking via navigation ref | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ANA-009 | Analytics | Manual flush drains the queue | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, appId, online |
| ANA-010 | Analytics | Event immediately before backgrounding | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized |
| ANA-011 | Analytics | Event immediately before restart (part 1) | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized |
| ANA-012 | Analytics | Event after restart (part 2) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ANA-013 | Analytics | Purchase via ScaleBun.trackPurchase (full fields) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ANA-014 | Analytics | Purchase via events.trackPurchase | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, appId |
| ANA-015 | Analytics | Repeated transactionId (idempotency) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ANA-016 | Analytics | Refund / dispute / adjustment sign convention | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ANA-017 | Analytics | Invalid purchases are dropped and counted | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized, appId |
| ANA-018 | Analytics | Subscription lifecycle | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, appId |
| ANA-019 | Analytics | Mini e-commerce funnel | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ANA-020 | Analytics | Typed tracking plan | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ANA-021 | Analytics | UI state dimensions (setUiState / clearUiState) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ANA-022 | Analytics | Permission outcome tracking | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ANA-023 | Analytics | Impression tracking (<ScaleBunImpression>) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ANA-024 | Analytics | Deep link opened | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| SES-001 | Sessions | Automatic session exists | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| SES-002 | Sessions | startSession(metadata) / stopSession() | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| SES-003 | Sessions | Session namespace start / emitEvent / end | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| SES-004 | Sessions | events.newSession() rotates the analytics session | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized, appId |
| SES-005 | Sessions | Foreground / background transition | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized |
| SES-006 | Sessions | Session timeout after long background | SAFE | android/ios | MANUAL | interactive · profile: short-session-cap · needs: sdkInitialized |
| SES-007 | Sessions | Multiple screens within one session | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| SES-008 | Sessions | Session attributes (setAttribute) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| SES-009 | Sessions | Installation continuity across relaunch | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized, appId |
| IDN-001 | Identity | Anonymous start | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, appId |
| IDN-002 | Identity | identify(user A, traits) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, appId |
| IDN-003 | Identity | identifyUser alias | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized, appId |
| IDN-004 | Identity | events.identify (envelope lane) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, appId |
| IDN-005 | Identity | setUser (session identity) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| IDN-006 | Identity | Update traits for the same user | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, appId |
| IDN-007 | Identity | clearUser() (logout) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, appId |
| IDN-008 | Identity | Second user, no data bleed | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, appId |
| IDN-009 | Identity | clearUser({ purgeLocal: true }) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, appId |
| IDN-010 | Identity | Replay identity (replay.setUser / clearUser) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| IDN-011 | Identity | Rapid identify / clear cycles | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized, appId |
| ERR-001 | Logs, Errors & Bugs | All log levels | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ERR-002 | Logs, Errors & Bugs | Handled Error with context | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ERR-003 | Logs, Errors & Bugs | Handled string error | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ERR-004 | Logs, Errors & Bugs | Handled error flagged fatal | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ERR-005 | Logs, Errors & Bugs | captureException / captureMessage exports | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ERR-006 | Logs, Errors & Bugs | Errors from different screens | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ERR-007 | Logs, Errors & Bugs | React render error caught by ScaleBunErrorBoundary | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, bridge |
| ERR-008 | Logs, Errors & Bugs | Unhandled promise rejection | MEDIUM | android/ios | DASHBOARD | needs: sdkInitialized |
| ERR-009 | Logs, Errors & Bugs | Uncaught JS exception (global handler) | HIGH | android/ios | MANUAL | DANGEROUS · needs: sdkInitialized |
| ERR-010 | Logs, Errors & Bugs | reportBug (legacy convenience) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ERR-011 | Logs, Errors & Bugs | reportBugDetailed returns a report id | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, clientKey, online |
| ERR-012 | Logs, Errors & Bugs | NATIVE CRASH (official test-only API) | DESTRUCTIVE | android/ios | MANUAL | DANGEROUS · needs: sdkInitialized |
| ERR-013 | Logs, Errors & Bugs | Post-crash drain check (after relaunch) | SAFE | android/ios | MANUAL | needs: sdkInitialized |
| ERR-014 | Logs, Errors & Bugs | Breadcrumbs before an error | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| ERR-015 | Logs, Errors & Bugs | Console log capture | SAFE | android/ios | DASHBOARD | profile: console-capture · needs: sdkInitialized, clientKey |
| ERR-016 | Logs, Errors & Bugs | Symbolication requirements | SAFE | android/ios | MANUAL |  |
| ERR-017 | Logs, Errors & Bugs | Error with large and circular metadata | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| NET-001 | Network | GET 200 with query parameters (fetch) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, networkServer |
| NET-002 | Network | POST JSON body (fetch) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, networkServer |
| NET-003 | Network | Redirect chain (302 ×2 → 200) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, networkServer |
| NET-004 | Network | Error status matrix 400/401/403/404/429/500 | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, networkServer |
| NET-005 | Network | Timeout (client abort after 1.5s on a 5s response) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, networkServer |
| NET-006 | Network | Cancellation mid-flight | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, networkServer |
| NET-007 | Network | Slow response (3s) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, networkServer |
| NET-008 | Network | 10 concurrent requests | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, networkServer |
| NET-009 | Network | Large response (1 MB) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, networkServer |
| NET-010 | Network | DNS / connection failure | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| NET-011 | Network | Axios (XMLHttpRequest) GET / POST / 500 | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, networkServer |
| NET-012 | Network | Authorization header redaction (transmitted) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, networkServer |
| NET-013 | Network | Cookie / Set-Cookie redaction (transmitted) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, networkServer |
| NET-014 | Network | Request/response body redaction (transmitted) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, networkServer |
| NET-015 | Network | URL query token redaction (transmitted) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, networkServer |
| NET-016 | Network | Beacon / telemetry requests are excluded | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, networkServer |
| NET-017 | Network | redactAuth:false is honoured? (privacy-relaxed) | SAFE | android/ios | MANUAL | profile: privacy-relaxed · needs: sdkInitialized, networkServer |
| NET-018 | Network | Network feature disabled → nothing captured | SAFE | android/ios | DASHBOARD | profile: no-network · needs: sdkInitialized, networkServer |
| NET-019 | Network | RN URL API capability probe (diagnostic) | SAFE | android/ios | LOCAL_ONLY |  |
| OFF-001 | Offline & Queue | Offline queue wizard: generate while offline | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized, appId |
| OFF-002 | Offline & Queue | Offline queue wizard: reconnect & drain | SAFE | android/ios | DASHBOARD | interactive · needs: sdkInitialized, appId, online |
| OFF-003 | Offline & Queue | Offline kill & relaunch persistence | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized, appId |
| OFF-004 | Offline & Queue | Stress burst 500 events (chunked) | MEDIUM | android/ios | DASHBOARD | needs: sdkInitialized |
| OFF-005 | Offline & Queue | MASSIVE stress burst 5000 events | HIGH | android/ios | DASHBOARD | DANGEROUS · needs: sdkInitialized |
| OFF-006 | Offline & Queue | Queue limit with small queue | SAFE | android/ios | MANUAL | interactive · profile: small-queue · needs: sdkInitialized, appId |
| OFF-007 | Offline & Queue | Retry behaviour while offline | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized |
| OFF-008 | Offline & Queue | Memory-only persistence loses queue on kill (expected) | SAFE | android/ios | MANUAL | interactive · profile: memory-persistence · needs: sdkInitialized |
| PERF-001 | Performance | Performance monitoring active | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| PERF-002 | Performance | Custom trace checkout_test with spans & measurement | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, networkServer |
| PERF-003 | Performance | Trace misuse is safe | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| PERF-004 | Performance | Manual screen load markers | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| PERF-005 | Performance | setCurrentScreen & onNavigationStateChange | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| PERF-006 | Performance | Raw metrics (performance.sendMetric / debug.sendMetric) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| PERF-007 | Performance | App launch timing | SAFE | android/ios | MANUAL | interactive |
| PERF-008 | Performance | Controlled JS stall (700 ms) | MEDIUM | android/ios | DASHBOARD | needs: sdkInitialized |
| PERF-009 | Performance | LONG JS stall (4 s) — dangerous | HIGH | android/ios | DASHBOARD | DANGEROUS · needs: sdkInitialized |
| PERF-010 | Performance | Performance / profiler feature handles (diagnostic) | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| PERF-011 | Performance | Performance disabled → inert | SAFE | android/ios | LOCAL_ONLY | profile: no-performance · needs: sdkInitialized |
| PERF-012 | Performance | Automatic screen load timing | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| RPL-001 | Session Replay | Replay state | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| RPL-002 | Session Replay | stop → start → pause → resume | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| RPL-003 | Session Replay | Manual frame capture & replay flush | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| RPL-004 | Session Replay | Screen name, quality and capture mode | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| RPL-005 | Session Replay | Runtime privacy options + setEnabled | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| RPL-006 | Session Replay | Replay Playground walkthrough | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized |
| RPL-007 | Session Replay | Masking of fake sensitive content | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized |
| RPL-008 | Session Replay | Screenshot dependency available | SAFE | android/ios | LOCAL_ONLY |  |
| RPL-009 | Session Replay | Auto-instrumented ScrollViews | SAFE | android/ios | MANUAL | interactive · profile: auto-scroll · needs: sdkInitialized |
| RPL-010 | Session Replay | Replay disabled → no-ops | SAFE | android/ios | LOCAL_ONLY | profile: no-replay · needs: sdkInitialized |
| NAV-001 | Navigation | Navigation ref wired to ScaleBun | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| NAV-002 | Navigation | Stack push / back sequence | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| NAV-003 | Navigation | Nested tabs, modal and repeated visits | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| NAV-004 | Navigation | Deep link navigation | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| NAV-005 | Navigation | ScaleBunScreen / useScaleBunScreen beacons | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| NAV-006 | Navigation | Legacy ScaleBunDebugRoot wrapper | SAFE | android/ios | MANUAL | profile: direct-legacy-root · needs: sdkInitialized |
| NAV-007 | Navigation | Expo Router integration | SAFE | android/ios | LOCAL_ONLY |  |
| PUSH-001 | Push | Push status & capabilities (before enable) | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| PUSH-002 | Push | enablePush (auto adapter) | SAFE | android/ios | DASHBOARD | interactive · needs: sdkInitialized, firebase |
| PUSH-003 | Push | Missing provider reports NOT_CONFIGURED clearly | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| PUSH-004 | Push | Manual provider: token + callbacks round-trip | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| PUSH-005 | Push | push.teardown() | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| PUSH-006 | Push | engage.registerForPush (native bridge) | SAFE | android/ios | MANUAL | needs: sdkInitialized, firebase |
| PUSH-007 | Push | Foreground / opened / cold-start notifications (manual) | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized, firebase |
| PUSH-008 | Push | Permission denied flow | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized, firebase |
| ENG-001 | Engagement | submitRating (valid + invalid) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, clientKey, online |
| ENG-002 | Engagement | Fetch Engage config | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized, clientKey, online |
| ENG-003 | Engagement | Debug: in-app messages served to this device | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized, clientKey, online |
| ENG-004 | Engagement | showEngagePrompt for every campaign type | SAFE | android/ios | DASHBOARD | interactive · needs: sdkInitialized, clientKey, bridge |
| ENG-005 | Engagement | In-app message show / dismiss | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, clientKey, bridge |
| ENG-006 | Engagement | Behavioural trigger events | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized |
| ENG-007 | Engagement | Survey responses (plain, attachments, confirmed) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, clientKey, online |
| ENG-008 | Engagement | Engage tracking lanes | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, clientKey |
| ENG-009 | Engagement | Native store review sheet | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized |
| ENG-010 | Engagement | Reset in-app throttle state (debug) | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| ENG-011 | Engagement | Inline placement slot | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, bridge |
| ENG-012 | Engagement | Coachmark anchors | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized |
| ENG-013 | Engagement | Renderer registry resolution | SAFE | android/ios | LOCAL_ONLY |  |
| ENG-014 | Engagement | Throttle & variant selection (pure functions) | SAFE | android/ios | LOCAL_ONLY |  |
| ENG-015 | Engagement | Send-Test preview polling / deep-link CTA / game handler | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized, clientKey |
| ATT-001 | Attribution | Platform identifiers (consent-safe only) | SAFE | ios | DASHBOARD | needs: sdkInitialized, appId |
| ATT-002 | Attribution | Attribution click id | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, appId |
| ATT-003 | Attribution | Play Install Referrer (automatic) | SAFE | android | MANUAL | needs: sdkInitialized |
| ATT-004 | Attribution | SKAdNetwork conversion value (events namespace) | SAFE | ios | DASHBOARD | needs: sdkInitialized |
| ATT-005 | Attribution | SKAdNetwork conversion value (facade, fire-and-forget) | SAFE | ios | MANUAL | needs: sdkInitialized |
| ATT-006 | Attribution | Deferred deep links | SAFE | android/ios | LOCAL_ONLY |  |
| PRIV-001 | Privacy & Consent | Effective privacy policy matches the profile | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| PRIV-002 | Privacy & Consent | setConsent(false) stops capture (transmitted) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| PRIV-003 | Privacy & Consent | setConsent(false, { purgeLocal: true }) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, appId |
| PRIV-004 | Privacy & Consent | eraseLocalData() | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, appId |
| PRIV-005 | Privacy & Consent | Fake PII in analytics properties (transmitted) | SAFE | android/ios | MANUAL | needs: sdkInitialized |
| PRIV-006 | Privacy & Consent | Fake PII in handled error message (transmitted) | SAFE | android/ios | MANUAL | needs: sdkInitialized |
| PRIV-007 | Privacy & Consent | Replay masking: images, element ids, ignored screens | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized |
| PRIV-008 | Privacy & Consent | Events-only replay (disableScreenshots) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| PRIV-009 | Privacy & Consent | Report privacy & branding round-trip | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| PRIV-010 | Privacy & Consent | redactBodies:true changes behaviour? | SAFE | android/ios | MANUAL | profile: privacy-strict/capture-bodies · needs: sdkInitialized, networkServer |
| OTA-001 | OTA | OTA orchestrator state | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| OTA-002 | OTA | Check for update on channel sdk-test (read-only) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, clientKey, online |
| OTA-003 | OTA | Check with invalid parameters surfaces an error | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized, clientKey, online |
| OTA-004 | OTA | OTA event listener add / remove | SAFE | android/ios | LOCAL_ONLY |  |
| OTA-005 | OTA | useOtaUpdate hook state | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized, clientKey, bridge |
| OTA-006 | OTA | Sync: download & stage from sdk-test | MEDIUM | android/ios | MANUAL | interactive · needs: sdkInitialized, clientKey, bridge, online |
| OTA-007 | OTA | APPLY: restart into the staged bundle | HIGH | android/ios | MANUAL | DANGEROUS · needs: sdkInitialized, bridge |
| OTA-008 | OTA | Mandatory update UI | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized, clientKey |
| OTA-009 | OTA | Rollback (boot guard) | DESTRUCTIVE | android/ios | MANUAL | DANGEROUS · interactive |
| OTA-010 | OTA | Compromised-device withhold policy | SAFE | android/ios | MANUAL | interactive · profile: ota-withhold · needs: sdkInitialized, bridge |
| DIAG-001 | Diagnostics | Debug subsystem without a desktop debugger | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| DIAG-002 | Diagnostics | Desktop debugger connection (profile desktop-debug) | SAFE | android/ios | MANUAL | profile: desktop-debug · needs: sdkInitialized, devTools |
| DIAG-003 | Diagnostics | getDebugTransport / report.export without desktop | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| DIAG-004 | Diagnostics | Calibration target + tap | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized |
| DIAG-005 | Diagnostics | IDs & queue stats | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized, appId |
| DIAG-006 | Diagnostics | Remote config, flags, rollouts, experiments | SAFE | android/ios | DASHBOARD | needs: sdkInitialized, clientKey |
| DIAG-007 | Diagnostics | devTools-excluded bundle degrades gracefully | SAFE | android/ios | MANUAL | interactive |
| FMX-001 | Feature Matrix | Cross-feature smoke under the current profile | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| EDGE-001 | Edge Cases | Rapid synchronous calls (200 in a tight loop) | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| EDGE-002 | Edge Cases | Empty / missing properties and empty names | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| EDGE-003 | Edge Cases | Very long event name and values | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| EDGE-004 | Edge Cases | Special characters and reserved prefixes | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| EDGE-005 | Edge Cases | Large but reasonable metadata (~50 KB) | SAFE | android/ios | DASHBOARD | needs: sdkInitialized |
| EDGE-006 | Edge Cases | Malformed input TypeScript would forbid | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| EDGE-007 | Edge Cases | Non-JSON-serializable values | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| EDGE-008 | Edge Cases | Concurrent flush() calls | SAFE | android/ios | LOCAL_ONLY | needs: sdkInitialized |
| EDGE-009 | Edge Cases | Calls while backgrounded | SAFE | android/ios | MANUAL | interactive · needs: sdkInitialized |
| EDGE-010 | Edge Cases | Calls right after a JS reload | SAFE | android/ios | MANUAL | interactive |
