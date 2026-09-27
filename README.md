# ScaleBun SDK Test Lab

An internal **integration, regression and end-to-end harness** for `@scalebun/react-native`: one Android/iOS app that exercises every public SDK capability, shows the local result, tags every piece of data with a `testRunId`, and separates *local pass* from *dashboard-verified*.

- SDK under test: **@scalebun/react-native 2.4.0** (pinned exactly) · React Native **0.81.6** (bare, New Architecture, Hermes) · TypeScript strict
- Coverage: **251** inventoried APIs/capabilities, **200** tests → [SDK_COVERAGE.md](SDK_COVERAGE.md)
- Suspected SDK defects → [KNOWN_SDK_ISSUES.md](KNOWN_SDK_ISSUES.md) · Plan → [TEST_PLAN.md](TEST_PLAN.md) · Dashboard checks → [DASHBOARD_VERIFICATION.md](DASHBOARD_VERIFICATION.md) · Platforms → [PLATFORM_MATRIX.md](PLATFORM_MATRIX.md)

> The real SDK is used everywhere. Nothing ScaleBun-related is mocked. Jest tests cover only the Test Lab's own logic.

## Layout

```
src/
  scalebun/      sdk.ts (the ONLY SDK runtime import) · bootstrap · labState · labBridge · apiInventory · integrationErrors
  config/        env + validation (rejects server secrets) · init profiles (feature-disable matrix, privacy combos, failure modes)
  testRunner/    types · runner (gating/grading/timeouts) · store · report (export + redaction) · labRunner (app wiring)
  tests/         ~200 test definitions by capability (init, analytics, sessions, identity, errors, network, offline,
                 performance, replay, navigation, push, engage, attribution, privacy, ota, diagnostics, featureMatrix, edge)
  screens/       Home dashboard · per-capability screens · Results · Config · Danger Zone · Replay Playground · Egress …
  services/      egressObserver (pass-through fetch observer) · networkClient (fetch + axios) · persistence
  components/ hooks/ utils/ navigation/
tools/
  network-test-server/   deterministic HTTP server (zero deps)
  scalebun-verifier/     server-side companion (uses a gitignored .env.verifier; never bundled)
.maestro/                UI flows · __tests__/ Jest · scripts/ OTA publish + coverage doc generator
```

## Prerequisites

- Node ≥ 20, npm 10+
- **Android:** JDK 17, Android SDK (API 36 platform + build-tools 36.0.0, NDK 27.1.12297006), an emulator or device
- **iOS (macOS only):** Xcode 16+, CocoaPods (`bundle install` uses the project Gemfile), a physical iPhone for APNs push
- Not Expo Go: native crash, replay capture, native performance, push and OTA require this native build.

## Setup

```bash
npm install
```

```bash
cp .env.example .env
```

Fill in `.env` with **client-safe** values only: `SCALEBUN_APP_ID` and the development-environment **SDK client key** (`…_ck_…`). The app rejects anything that looks like a server secret or personal access token and runs in NOT_CONFIGURED mode instead. With no credentials at all the app still runs, and SDK-dependent tests report `SKIPPED — NOT_CONFIGURED`.

Optional configuration:
- **Network tests:** run the server (below) and set `NETWORK_TEST_SERVER_URL`. Use `http://10.0.2.2:4545` on the Android emulator, `http://localhost:4545` on the iOS simulator, or the LAN IP the server prints for a physical device.
- **Push:** add `android/app/google-services.json` and `ios/GoogleService-Info.plist` (both gitignored), and upload the APNs .p8 key in the ScaleBun dashboard. Without them the Push screen shows NOT_CONFIGURED and the Firebase Gradle plugin is skipped automatically.
- **OTA:** set `SCALEBUN_OTA_CHANNEL=sdk-test` and pick the `ota-enabled` profile in the app.

### Android

```bash
npm run android
```

Release variant, which is required to test OTA bundle loading and symbolicated release crashes:

```bash
npm run android:release
```

### iOS

```bash
npm run pods
```

```bash
npm run ios
```

Push needs a physical iPhone. `ios/ScaleBunSdkTestLab/ScaleBunSdkTestLab.entitlements` sets `aps-environment=development`, and the Background Modes → remote-notification key is present in Info.plist. Set your signing team in Xcode.

### Metro

```bash
npm start
```

After editing `.env`, restart Metro with a clean cache:

```bash
npm run start:reset
```

## Commands

| Command | What it does |
|---|---|
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint |
| `npm test` | Jest: runner/store/report/env/egress logic + **SDK surface diff** + **coverage contract** |
| `npm run test:tools` | Self-tests for the network server and the verifier |
| `npm run bundle:check` | Builds production JS bundles for Android **and** iOS (catches Metro/resolution/codegen issues without native toolchains) |
| `npm run check` | All of the above |
| `npm run doctor` · `doctor:android` · `doctor:ios` | Official `scalebun doctor` and `init --check` |
| `npm run network-server` | Deterministic test server on :4545 |
| `npm run verifier:auth` | Verifier: validate the server-side token (`tools/scalebun-verifier/.env.verifier`) |
| `npm run verifier:checklist -- report.json --out run.md` | Per-run dashboard checklist from an exported report |
| `npm run docs:coverage` | Regenerate SDK_COVERAGE.md |
| `npm run ota:publish:android` / `:ios` | Publish a test bundle to **`sdk-test` only**. The script refuses production-like channels |
| `npm run e2e:maestro` | Maestro UI flows (`.maestro/`) |

## CI (GitHub Actions)

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests:

| Job | What it proves |
|---|---|
| **JS checks** | `npm run check` (types, lint, Jest, tool self-tests, Android + iOS release JS bundles), and that SDK_COVERAGE.md was regenerated |
| **Android release build + emulator smoke** | `assembleRelease` (arm64-v8a + x86_64) compiles every native module. The APK is installed on an API 34 emulator, cold-launched, checked for fatal errors, and driven through Results, Config, all 18 capability screens and the Replay Playground with Maestro. The APK, screenshots and logcat are uploaded as artifacts |
| **iOS simulator build** (manual) | `pod install` + unsigned Release `xcodebuild` for the simulator. Start it from Actions → CI → Run workflow → tick **ios** (macOS minutes are billed at 10x on private repos) |

CI builds have no `.env`, so the app runs in NOT_CONFIGURED mode. The smoke run proves the native build, app start and that every screen renders. It does not prove ScaleBun delivery.

## Using the app

- **Home:** the dashboard shows the SDK/RN/OS/app version, environment, app ID, init phase, user and IDs, feature flags, network, OTA bundle, push, replay, performance, the last result, and status counts. From Home you can **RUN SAFE TEST SUITE**, start a new test session (new `testRunId`), and see integration errors (any SDK call that threw or rejected).
- **Capability screens:** each has a description, prerequisites, live state, quick-action buttons (Identify User, Clear User, Flush, Enable Push, Check OTA and so on) and every test card. A card shows risk, platforms, preconditions, expected local / ScaleBun / dashboard results, the live log, output and error.
- **Config:** init profiles. Because `ScaleBun.init()` is once per JS runtime, a profile applies after a restart. Profiles cover the feature-off matrix, privacy combinations, invalid/malformed/legacy credentials, the endpoint lock, pre-init calls, OTA, the debugger and a custom combination.
- **Danger Zone:** native crash, uncaught JS crash, 4s JS stall, a 5000-event burst, OTA apply and rollback. These are never in the safe suite, need per-run confirmation, and are disabled in release builds unless the app was built with `ENABLE_DANGEROUS_TESTS=true`.
- **Results:** filters (ALL / VERIFIED / LOCAL_PASS / FAIL / NOT_RUN / MANUAL / SKIPPED), reset, and **Export Results (JSON)** via the share sheet. Exports carry the SDK/app/OS versions and a redacted config snapshot, and never include credentials.
- **Egress observer:** a pass-through `fetch` observer installed before the SDK loads. It lets privacy tests assert what the SDK's JS lanes *transmitted*. It stores only method/host/path/status/size plus fake-PII needle hits. Native uploads (replay frames, native crash drain) are not visible to it.

### Status semantics

`LOCAL_PASS` means the SDK call behaved correctly on the device. It is **not** delivery proof. A test becomes `VERIFIED` only when its assertion is purely local (`LOCAL_ONLY`), or when a tester or the verifier confirms the dashboard result ("Mark VERIFIED").

## Security

- The app only ever embeds **publishable/client** values. `.env`, `.env.verifier`, Firebase/APNs files, `*.p8`, `.scalebun/` signing keys and exported reports are gitignored.
- `tools/` is excluded from the Metro bundle (`metro.config.js` blockList), and `npm run bundle:check` output was scanned for secret markers.
- Only fake PII is used: `example.test` emails, the Stripe test card, and `FAKE_…` tokens that embed the run ID. TLS validation is never disabled. Android cleartext is allowed only in debug builds (for the LAN test server).

## Doctor status (this repo)

`npm run doctor` currently reports: ✅ RN 0.81.6 bare · ✅ hermesc · ✅ Android bundle resolution wired · ✅ iOS bundle resolution wired · ❌ **Not logged in** · ⚠️ **No OTA signing key**.
- **Not logged in:** run `npx scalebun login` with your own access token. This is a machine-local credential and is never stored in the repo.
- **No signing key:** after login, run `npx scalebun ota generate-key-pair --app-id <id> --name "sdk-test key"`. The key is written to `.scalebun/`, which is gitignored.
- **iOS:** the ✅ is earned through a runtime wrapper. The SDK's own Swift/ObjC snippets do not compile; see KNOWN_SDK_ISSUES.md KSI-004.
