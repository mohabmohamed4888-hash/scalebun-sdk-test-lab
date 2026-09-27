# Test Plan — ScaleBun React Native SDK

Scope: every public capability of the installed `@scalebun/react-native` (see [SDK_COVERAGE.md](SDK_COVERAGE.md)), on Android and iOS, after every SDK release.

## 1. Principles

1. **Real SDK only.** No ScaleBun mocks. Jest covers Test Lab logic plus an automated diff of the installed SDK's public surface.
2. **Local ≠ delivered.** ScaleBun APIs are designed never to throw. A returning call is graded `LOCAL_PASS`; only a dashboard/verifier confirmation or a purely local assertion (`LOCAL_ONLY`) produces `VERIFIED`.
3. **Correlate everything.** One `testRunId` per test session (`tr_<UTC>_<hex>`). It persists across relaunches so crash and restart tests stay in the same run, and a new one is created with "New test session". It is attached to:
   - event properties, error metadata and log data;
   - session attributes (`testRunId`, `testLabProfile` via `setAttribute` on every boot);
   - user IDs (`sdk_test_user_<label>_<runId>`), transaction and subscription IDs, bug reports, rating comments;
   - network query strings, trace tags and OTA/engage metadata.
4. **Assertions come in three layers.**
   - **Captured locally:** SDK state such as `events.ids/stats`, `getEffectivePrivacyPolicy`, `replay.isRecording`, `push.status`.
   - **Transmitted:** the egress observer checks JS-lane uploads for fake-PII needles.
   - **Visible in dashboard:** checked by a person or the verifier.
5. **Safety.** Dangerous tests are never in the safe suite, need per-run confirmation, and are disabled in release builds unless `ENABLE_DANGEROUS_TESTS=true`.

## 2. Status model

`NOT_RUN → RUNNING → LOCAL_PASS | VERIFIED | FAIL | MANUAL_VERIFICATION_REQUIRED | SKIPPED`

- `SKIPPED` always carries a reason:
  - `SKIPPED WITH REASON: <platform note>` (e.g. SKAdNetwork on Android)
  - `NOT_CONFIGURED: <missing credential/provider>`
  - `Requires init profile <id>`
  - `NOT-AVAILABLE-IN-INSTALLED-VERSION`
- A test still `RUNNING` when the process died (crash tests) becomes `MANUAL_VERIFICATION_REQUIRED` on the next launch.

## 3. Execution order per SDK release

| Step | Where | What |
|---|---|---|
| 0 | dev machine | Bump the pinned version and run `npm run check`. Fix `sdkSurface.test.ts` diffs by adding tests or classifications for new APIs, then regenerate with `npm run docs:coverage`. Run `npm run doctor`. |
| 1 | device, profile **default** | RUN SAFE TEST SUITE. Then run the interactive tests of each screen. |
| 2 | device | **Offline wizard** (§5.1). |
| 3 | device, each matrix profile | Switch profile → restart → run **FMX-001** plus the profile-bound tests (table §4). |
| 4 | device, Danger Zone | Native crash → relaunch → ERR-013. JS uncaught → ERR-013. Long stall. Massive burst (optional). |
| 5 | device, profile **ota-enabled**, release build | OTA procedure (§5.3). |
| 6 | device with Firebase/APNs | Push procedure (§5.2). |
| 7 | dashboard | Export results → `npm run verifier:checklist -- report.json --out run.md` → tick every item and "Mark VERIFIED" in the app (or Mark FAIL). |
| 8 | both platforms | Repeat 1–7 on the other OS and fill in PLATFORM_MATRIX.md. |

## 4. Profile matrix (restart required between rows)

| Profile | Purpose | Tests bound to it |
|---|---|---|
| default | Provider integration, everything on | safe suite |
| direct-init | Imperative `ScaleBun.init` + `setNavigationRef` + `EngagePromptProvider` | INIT-004, FMX-001 |
| direct-legacy-root | Deprecated `ScaleBunDebugRoot` still mounts | NAV-006 |
| pre-init-probe | SDK calls before `init()` | INIT-003 (KSI-001) |
| legacy-credentials | README quick-start config | INIT-011 (KSI-002) |
| verbose | Debug logging | INIT-006 |
| invalid-credentials | Fake client key; app must stay usable | INIT-007 |
| malformed-config | Schema rejection; no crash | INIT-008 (KSI-006) |
| custom-endpoint | `apiBaseUrl` override ignored | INIT-009 |
| flush-fast / small-queue | Batching & queue limits | INIT-013, OFF-006 |
| no-replay / no-network / no-crashes / no-session / no-journey / no-performance | Feature-disable matrix | FMX-001, RPL-010, NET-018, PERF-011 |
| replay-record-off / replay-low-navigation | Replay capture options | RPL-001, RPL-004 |
| privacy-strict / privacy-relaxed / capture-bodies / custom | Privacy combinations | PRIV-001, NET-012..017, PRIV-010, RPL-007 |
| perf-full-sampling | Deterministic tier-2 collectors | PERF-008 |
| console-capture | `captureConsoleLogs` | ERR-015 |
| auto-scroll | `autoInstrumentScrollViews` | RPL-009 |
| no-auto-events | Automatic lanes off (direct init) | ANA-006 (expect absence), FMX-001 |
| short-session-cap | Background cap 60 s | SES-006 |
| memory-persistence | Queue not persisted | OFF-008 |
| ota-enabled / ota-withhold | OTA orchestration | OTA-001..010 |
| desktop-debug | Desktop debugger (future product) | DIAG-002 |

## 5. Manual procedures

### 5.1 Offline queue (OFF-001..003, OFF-007)
1. Offline screen → confirm "connected=true". Enable airplane mode and wait for "connected=false".
2. Run **OFF-001**: 50 numbered events, 5 logs, 3 errors. The counts are persisted, and `pending` should be ≥ 50.
3. (Kill test) Force-stop the app, relaunch while still offline, run **OFF-003**: `pending > 0` means the leftovers were reloaded from disk.
4. (Optional) Run **OFF-007** while offline to record retry spacing.
5. Disable airplane mode, run **OFF-002**: `pending → 0` within 30 s.
6. Dashboard: exactly 50 `test_offline_event` with `seq` 1..50 (no gaps or duplicates), 5 logs, 3 errors for the run. Ordering is only guaranteed per lane (FIFO within a batch). Note any cross-batch reordering, but it is not a failure unless documented otherwise.

### 5.2 Push (PUSH-002, 006..008)
Prerequisites:
- Firebase project with Android app `com.scalebun.sdktestlab` → `android/app/google-services.json`.
- iOS: `GoogleService-Info.plist` if routing through FCM, otherwise direct APNs.
- ScaleBun dashboard → Push → upload the APNs .p8 key (Key ID, Team ID, topic `com.scalebun.sdktestlab`, sandbox for dev builds).

Steps:
1. Push screen → **Enable Push** → grant. Expect `ok:true`, adapter `rnfirebase` (Android) or `native`/`rnfirebase` (iOS), and `tokenRegistered:true`.
2. Send a test push from the dashboard with data `{ "deepLink": "scalebuntestlab://nav/b", "testRunId": "<run>" }`.
   - App in foreground → the log shows `foreground`.
   - App in background → tap the notification → `opened`, and the app navigates to NavB.
   - App killed → tap → cold start → `opened` (re-armed on boot once push was enabled).
3. Denied flow: uninstall, reinstall, deny the prompt → **PUSH-008** expects `permission:"denied"`, `ok:false`, and a clear reason.

### 5.3 OTA (OTA-002, 005..010) — never a production channel
1. Log in once (`npx scalebun login`). Optionally generate a signing key with `npx scalebun ota generate-key-pair --app-id <id> --name "sdk-test key"` (written to `.scalebun/`, gitignored).
2. Build and install a **release** build: `npm run android:release` / `npm run ios:release`. Debug builds always load Metro.
3. Make a visible JS change (e.g. the Home title), then `npm run ota:publish:android` (or `:ios`). The script refuses any channel containing `prod`/`default`/`live`.
4. In the app, choose profile `ota-enabled` → restart → OTA screen → **Check OTA** (`sync`).
   - Watch the event log: CHECK → OFFERED → DOWNLOAD_STARTED → DOWNLOAD_PROGRESS → DOWNLOAD_COMPLETE → INSTALLED.
   - Expect `syncResult.status = UPDATE_INSTALLED` and `isRestartRequired = true`.
5. **Apply OTA** (OTA-007) → the app restarts → the active bundle shows the new ID → after 10 s the dashboard shows BOOT_SUCCESS.
6. Mandatory: `npm run ota:publish:android -- --mandatory` → the blocking overlay appears (`mandatoryUpdatePending`).
7. Rollback (OTA-009, DESTRUCTIVE):
   - Publish a bundle whose entry throws at startup (temporarily add `throw new Error('sdk_test_boot_crash')` at the top of `index.js`, publish, then revert immediately).
   - Sync and apply. The app crashes on boot; relaunch twice. The native boot guard (`MAX_BOOT_ATTEMPTS = 2`) reverts, and the dashboard shows AUTO_ROLLBACK.
   - Afterwards, `npx scalebun ota rollback` the broken release on `sdk-test`.
8. Up-to-date: with no newer release, OTA-002 reports `action: NONE` and `sync` reports `UP_TO_DATE`.

### 5.4 Native crash & symbolication (ERR-012, ERR-013, ERR-016)
1. Danger Zone → **ERR-012** → confirm. The app terminates via `ScaleBun.nativeCrash()`.
2. Relaunch, stay online ≥ 30 s, run **ERR-013**. Check Dashboard → Crashes for the native crash (same installation ID).
3. JS symbolication needs a release build plus its sourcemap uploaded for that exact bundle. 2.4.0 uploads sourcemaps **only** through `scalebun ota publish --sourcemap` (server secret). There is no CLI path for the store-bundle sourcemap or for native dSYM/R8 mapping files. Record whether release stacks are symbolicated; see DASHBOARD_VERIFICATION.md.

### 5.5 Replay & masking (RPL-006, RPL-007, PRIV-007/008)
1. Open the Replay Playground and follow its checklist: type in every field, open the modal, scroll both lists, long-press, fast-tap, dismiss the keyboard, fire the network and 500 calls.
2. Dashboard replay:
   - TextInputs (including password) are masked. Plain `<Text>` with the fake card is **visible** by default, because masking applies to inputs and images, not text.
   - The view with nativeID `sdk-test-secret-view` is masked after RPL-005/PRIV-007.
   - PrivacySecret has no frames.
   - Repeat with `privacy-strict` (images masked) and `privacy-relaxed` (inputs visible, fake data only).
3. Masking happens on-device (native `PrivacyMaskProcessor`) before the native outbox uploads. Replay frames are not visible to the JS egress observer. To prove "not transmitted" at the byte level, capture device traffic with mitmproxy (user CA installed on a test device only) and search the frame uploads for the fake strings. Never disable TLS validation in the app.

## 6. Automation

- `npm run check`: typecheck, lint, Jest (47 tests including the surface diff and coverage contract), tool self-tests, and Android + iOS release JS bundles.
- `.github/workflows/ci.yml`: JS checks plus an Android release build and emulator smoke run (Maestro `01` + `03`) on every push; iOS simulator build on demand.
- `.maestro/`: `01_smoke_navigation`, `02_run_safe_suite`, `03_replay_playground`, `04_category_safe_runs`. These assert Test Lab UI only; delivery is verified separately.
- The verifier (`tools/scalebun-verifier`) provides an auth check and generates the per-run checklist plus ScaleBun MCP `verify_ingestion` calls.

## 7. Exit criteria for an SDK release

- `npm run check` is green and SDK_COVERAGE.md is regenerated with no unexplained API.
- No `FAIL` in the safe suite, or each failure is filed in KNOWN_SDK_ISSUES.md with a repro.
- Every DASHBOARD test is `VERIFIED` on both platforms, or explicitly waived in PLATFORM_MATRIX.md.
- Danger Zone procedures (native crash, OTA apply/rollback) are executed at least once per platform.
