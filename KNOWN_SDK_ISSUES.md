# Known ScaleBun SDK Issues (suspected SDK defects, not Test Lab bugs)

SDK: **@scalebun/react-native 2.4.0** (npm, published 2026-09-23) · Host: React Native 0.81.6 · Found: 2026-09-27

Every entry names the smallest Test Lab test that reproduces it. **Status** is explicit. *Static* means
the evidence comes from reading the installed SDK source/declarations. It has not yet been observed
on a device, because no Android/iOS toolchain was available in this environment (see PLATFORM_MATRIX.md).
No Test Lab code silently works around an issue. Where a workaround exists, it is marked at the call
site with the KSI id.

| ID | Severity | Area | Status |
|---|---|---|---|
| KSI-001 | High | Analytics / init | Static — confirm with INIT-003 |
| KSI-002 | High | Docs / init | Static — confirm with INIT-011 |
| KSI-003 | Medium | Privacy | Static — confirm with NET-017, PRIV-010 |
| KSI-004 | High (iOS build) | iOS integration | Static — confirm in Xcode |
| KSI-005 | Medium | Types / OTA | Confirmed (types vs runtime schema) |
| KSI-006 | Medium | Init / DX | Static — confirm with INIT-008 |
| KSI-007 | Low | Docs / config | Confirmed (source) |
| KSI-008 | Low | Docs | Confirmed |
| KSI-009 | Medium | Privacy / Android | Confirmed (manifest) |
| KSI-010 | Low | Network | Confirmed (feature gap) |
| KSI-011 | Low | Docs / push | Confirmed |
| KSI-012 | Medium (Android build) | Push setup advice | Confirmed (CI build) |

---

## KSI-001 — `track()` before `init()` resolves drops the event, contradicting the documented pre-init buffer

- **Repro:** Profile `pre-init-probe` → restart → run **INIT-003**. The app calls `identify()`, `track('test_pre_init_event')`, `log()` and `captureError()` *before* `init()`.
- **Expected** (facade source doc on `_preInitBuffer`): *"Events tracked before init() completes are buffered here, then drained into the real persistent queue post-init."*
- **Actual** (`lib/module/public/ScaleBunFacade.js`, `track()`):
  ```js
  if (!this.initialized && !name.startsWith('$')) {
    logger.warn('SDK not initialized. Event dropped:', name);
    return;
  }
  ```
  So every non-`$` event is dropped before init. Only `identify()` is buffered (`_pendingIdentity`).
- **Impact:** Events emitted during startup, or before `ScaleBunProvider` mounts, are silently lost in production, where the warning log is not visible.
- **Workaround:** Don't call `track()` until `onReady`. The Test Lab records the behavior and does not paper over it.

## KSI-002 — README quick-start config selects the legacy lane, which the SDK itself says has no backend

- **Repro:** Profile `legacy-credentials`, where the config is exactly the README's `{ projectId, publishableKey }` → run **INIT-011**. Compare the egress paths and dashboard results.
- **Expected:** The README quick start produces a working integration.
- **Actual (static):** Without `clientKey`, `track()` takes the *"Legacy mode (projectId/publishableKey): persistent queue → /sdk/events"* branch. In `SDKBootstrapper.js`, the SDK's own comment says *"no backend controller has ever served '/sdk/events' — even a wired dispatcher would have 404'd forever"*. SaaS-only lanes are also skipped without `clientKey`: Engage, ratings, `reportBugDetailed`, the Logs lane, the `/batch` envelope lane and push registration. The README never mentions `appId` / `clientKey`, while the ScaleBun MCP integration plan and `useOtaUpdate` docs do.
- **Impact:** An integrator following the README may see an app that "works" but never reports.

## KSI-003 — `privacy.redactAuth / redactCookies / redactBodies` are accepted and reported, but are inert

- **Repro:** **PRIV-001** (policy echo), **NET-017** (profile `privacy-relaxed`: `redactAuth:false`), **PRIV-010** (`redactBodies:true` with a non-denylisted body field).
- **Expected:** `getEffectivePrivacyPolicy()` is documented as *"the effective privacy policy actually in force"*. `PrivacyConfig.redactBodies` says *"Redact request/response bodies"*.
- **Actual (static):**
  - `SDKBootstrapper.js` maps only `maskTextInputs` and `maskImages` into the replay policy.
  - `NetworkFeature` is constructed with a hard-coded `redactNetwork: true`.
  - `debug/redaction.js` always redacts `SENSITIVE_HEADERS` and a fixed key denylist.
  - Nothing reads `redactAuth`, `redactCookies` or `redactBodies`.
  - Header redaction therefore cannot be turned off. That is the safe direction, but it contradicts the API.
  - `redactBodies:true` adds nothing beyond the fixed denylist. That is the unsafe direction: a host that relies on it to hide arbitrary body fields is not protected. The policy getter still reports the configured values, which is misleading.

## KSI-004 — Documented iOS AppDelegate hooks do not compile (Swift and ObjC)

- **Repro:** `npx scalebun init ios` on a Swift AppDelegate prints `import scalebun_react_native` + `ScaleBunEngage.didFinishLaunching(...)` + `ScaleBunOtaModule.getBundleURL()`. On an ObjC AppDelegate it inserts `[ScaleBunOtaModule getBundleURL]` (`bin/lib/iosCodemod.js`).
- **Evidence:**
  - `ios/Engage/ScaleBunEngageModule.swift` declares `@objc(ScaleBunEngage) class ScaleBunEngageModule`, and `ios/Ota/ScaleBunOtaModule.swift` declares `@objc(ScaleBunOta) class ScaleBunOtaModule`.
  - Both are **internal**; no Swift class in the SDK's iOS sources is `public`.
  - A library module's generated `scalebun_react_native-Swift.h` / Swift interface exposes only public/open declarations.
  - Swift callers therefore can't see `ScaleBunEngage` (it's the ObjC name) or `ScaleBunOtaModule` (it's internal).
  - ObjC callers get `undeclared identifier 'ScaleBunOtaModule'` because the ObjC class name is `ScaleBunOta`.
- **Status:** Static analysis with high confidence. Confirm with an Xcode build of a clean app using the printed snippet.
- **Workaround in the Test Lab** (`ios/ScaleBunSdkTestLab/AppDelegate.swift`, marked KSI-004): call the same `@objc static` methods through the ObjC runtime (`NSClassFromString("ScaleBunOta")` / `"ScaleBunEngage"`). The doctor's iOS check is a text match (`getBundleURL()`) and passes on this wrapper. That is disclosed here, not hidden.

## KSI-005 — Runtime-accepted init options are missing from the public TypeScript types

- `core/config/schema.js` validates and uses `ota.{enabled, checkOnForeground, channelOverride, mandatoryBlocksUi, onCompromisedDevice}` (+ `healthyAfterMs`), `logLevel`, `captureNetworkBodies`, `networkBodyMaxBytes`, `persistence.*`, `sessionBackgroundCapMs`, `idleThresholdMs` and more. None of them appear in `SimplifiedInitConfig` / `ScaleBunInitConfig`.
- The facade's own comments describe `ota: { enabled: true }` as the documented OTA path.
- `init(rawConfig: … | any)` means typos compile silently. **Repro:** `__tests__/sdkSurface.test.ts` inventories these as `config-runtime-only`, and profiles `ota-enabled` / `capture-bodies` / `short-session-cap` use them.

## KSI-006 — No public "is initialized" signal, and `ScaleBunProvider.onReady` fires when init failed

- **Repro:** Profile `malformed-config` (`flushIntervalMs: 10`) → **INIT-008**, or profile `invalid-credentials` → INIT-007.
- **Actual:**
  - `SDKBootstrapper.bootstrap()` returns `null` on schema rejection or a failed legacy handshake.
  - `ScaleBunFacade.init()` catches that and resolves normally.
  - `ScaleBunProvider` calls `onReady()` whenever `init()` resolves; `onInitError` is not called.
  - The SDK is inert, yet the host believes it is ready.
  - There is no public accessor: the Test Lab reads the private `initialized` flag, labelled DIAGNOSTIC in the UI (`src/scalebun/bootstrap.ts`).

## KSI-007 — `apiBaseUrl` is documented as configuration but silently locked

- `ScaleBunFacade.init()` JSDoc shows `apiBaseUrl: 'https://api.scalebun.com'`, which also lacks the `/api/v1` the SDK needs.
- The facade header says *"Config model preserved exactly: projectId, publishableKey, apiBaseUrl"*.
- The types mark the field `@deprecated … ignored`, and the bootstrapper overwrites it with `https://api.scalebun.com/api/v1`, logging a warning. Staging and self-hosted testing therefore requires rebuilding the SDK.
- **Repro:** **INIT-009** (profile `custom-endpoint`) asserts the override is ignored.

## KSI-008 — README subscription schema version is stale

- README: *"Subscription lifecycle payloads use schema v2."*
- Code: `SUBSCRIPTION_SCHEMA_VERSION = 3` (`analytics/subscription.d.ts`).

## KSI-009 — `RECORD_AUDIO` is merged into every Android host app

- `android/src/main/AndroidManifest.xml` in the SDK declares `<uses-permission android:name="android.permission.RECORD_AUDIO" />` for opt-in voice feedback.
- Every host app therefore requests microphone permission in its merged manifest, whether or not it uses voice notes. This has privacy-review and Play-policy impact.
- **Host workaround:** `<uses-permission android:name="android.permission.RECORD_AUDIO" tools:node="remove"/>`. The Test Lab keeps the permission because voice feedback is under test.

## KSI-010 — Network URL exclusion exists but is not configurable

- `NetworkFeature` supports `denyUrls`, `thirdPartyHosts` and `captureThirdParty`, but `SDKBootstrapper` constructs it with hard-coded options. Hosts cannot exclude their own sensitive endpoints from capture. Only the built-in beacon host list applies.
- **Repro:** **NET-016** proves the built-in beacon exclusion works; custom exclusion is untestable (inventory `missing.networkUrlExclusion`).

## KSI-011 — Push documentation points at the wrong optional peer

- The README's "Optional peer dependencies" table maps *Push notifications → `@notifee/react-native`*.
- The push subsystem selects `@react-native-firebase/messaging` first (full callbacks), then the native bridge (token-only), then manual. `doctor` / `init android` ask for RNFirebase.
- The Test Lab installs both. Notifee is only used for local display when present.

## KSI-012 — Following `scalebun init android` push advice breaks the Android build with RNFirebase messaging

- **Repro:** `npx scalebun init android --check` (or `doctor`) asks you to *"Declare a default FCM channel meta-data in AndroidManifest.xml (com.google.firebase.messaging.default_notification_channel_id)"*. Add it as plain `<meta-data android:name=… android:value="my_channel"/>`, install `@react-native-firebase/messaging` (the adapter the SDK selects first), then run `./gradlew assembleRelease`.
- **Actual:** `:app:processReleaseMainManifest` fails: *"Manifest merger failed : Attribute meta-data#com.google.firebase.messaging.default_notification_channel_id@value … is also present at [:react-native-firebase_messaging]"*. This was first observed in this repo's CI (GitHub Actions, Android job).
- **Fix:** add `xmlns:tools="http://schemas.android.com/tools"` and `tools:replace="android:value"` to the meta-data (done in `android/app/src/main/AndroidManifest.xml`). The SDK's advice should say so.

---

### Not SDK defects, but worth knowing

- **Registry lookalike:** npm has a second scope, `@scalebun-release/react-native` / `@scalebun-release/cli` (2.5.17, maintainer `scalebun-release`, different from `scalebun-sdk`). The Test Lab uses only `@scalebun/react-native`, as requested. Confirm with ScaleBun whether the other scope is official before anyone installs it.
- **Doctor "Not logged in"** is a developer-machine credential check (`scalebun login`), not an app integration defect.
