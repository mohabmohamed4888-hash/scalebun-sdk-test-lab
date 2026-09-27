# Dashboard Verification

`LOCAL_PASS` is not delivery. Use this checklist, or the per-run checklist generated from an exported report, to move tests to `VERIFIED`.

```bash
npm run verifier:checklist -- ~/Downloads/scalebun-test-lab-<runId>.json --out reports/<runId>.md
```

## Can verification be automated?

- **ScaleBun MCP `verify_ingestion`** is the only supported programmatic delivery proof found. It searches the ingestion debugger for an event by name plus `correlationId` (event ID or installation ID) or `installationId`. `node tools/scalebun-verifier/verify.js mcp <report.json>` prints ready-to-use calls: installation ID from INIT-001/DIAG-005 plus events such as `test_boot_probe` and `test_single_event`.
- **REST:** `@scalebun/cli` 2.4.0 only uses auth, org/app/env, SDK-key, push-credential and OTA/symbols endpoints. There is **no documented query endpoint** for events, errors, logs or sessions, so the verifier does **not** guess private routes, which would produce false VERIFIED results. `npm run verifier:auth` validates the server-side token (`GET /auth/me`, `GET /apps/:id/environments`).
- **Everything else** is manual using the checklists below. Search every view for `testRunId = <run>` first.

> As of 2026-09-27 no live delivery has been verified: no ScaleBun app/client key was available for the Test Lab yet. Provision one (development environment), put it in `.env`, and start with the MCP `verify_ingestion` check above.

## Recommended dashboard setup (one time, development environment)

| Item | Configuration | Used by |
|---|---|---|
| App | Dedicated app "ScaleBun SDK Test Lab", env `development`, bundle `com.scalebun.sdktestlab` | all |
| OTA channel | `sdk-test` (never promote to production) | OTA-* |
| Remote config | `sdk_test_config_max_items = 25`, flag `sdk_test_flag = on`, rollout `sdk_test_rollout = 100%`, experiment `sdk_test_experiment` (control/treatment) | DIAG-006 |
| NPS campaign | type NPS, trigger `custom_event` event `test_trigger_nps`, throttle showOnce **off** for testing | ENG-004, ENG-006 |
| CSAT / FEEDBACK / CUSTOM survey | trigger `custom_event` `test_trigger_survey` / `test_trigger_feedback`; FEEDBACK with screenshot + voice attachments enabled | ENG-004/006/007 |
| Rating prompt | type RATING_PROMPT, `highRatingThreshold 4`, `routeLowToFeedback` on | ENG-004 (provider ratingRouting) |
| In-app message | trigger `custom_event` `test_trigger_in_app`; one banner, one modal; one CTA with deep link `scalebuntestlab://nav/a` | ENG-005, ENG-015 |
| Inline campaign | placementKey `sdk_test.inline` | ENG-011 |
| Coachmark tour | steps on anchor keys `sdk_test.anchor.button`, `sdk_test.anchor.card` | ENG-012 |
| Push | APNs .p8 key (topic `com.scalebun.sdktestlab`, sandbox) plus Firebase for Android | PUSH-* |

Use **Send Test** for previews: `previewPollMs=4000` in debug builds picks them up within about 5 s while the app is open.

## Checklists by area

**Sessions & lifecycle**
- [ ] INIT-001: a session for the installation ID on Home, with `app_open`, `session_start` (and `first_open` on a fresh install).
- [ ] Session attributes `testRunId`, `testLabProfile` set on every boot.
- [ ] SES-002/003: explicit sessions with metadata `purpose`, ended with reasons `ended` / `timeout`.
- [ ] SES-007: one session lists Sessions → Identity → Network → Performance → Home in order.
- [ ] SES-005/006: background/foreground in the same session, and a new session after the cap.

**Events & analytics**
- [ ] ANA-001/002/003/004: property types preserved; Arabic/emoji rendered correctly.
- [ ] ANA-005: 100 `test_burst` with seq 1..100, no gaps or duplicates.
- [ ] ANA-008 / NAV-002/003/005: screen sequence including nested tabs, modal and beacon names.
- [ ] ANA-013..016: Revenue shows gross $29, net 26.00, product `pro_monthly_test`; the duplicate transaction is counted **once**; refund −29, dispute −5, adjustments +1.50/−0.50.
- [ ] ANA-017: none of the 3 invalid purchases appear.
- [ ] ANA-018: subscription ledger with 6 transitions; the repeated `renewed` is kept once.
- [ ] ANA-019: funnel Product Viewed → Add To Cart → Checkout Started → Purchase Completed at 100% for the run user.
- [ ] ANA-021: taps attributed to UI state `filter-sheet:open`; the long value is sanitized (≤ 32 chars, no `;:|`).
- [ ] ANA-022: `permission_result` for the 5 simulated permissions. ANA-023: `element_viewed sdk_test_promo` exactly once.

**Identity**
- [ ] IDN-002..008: user A has traits `plan=enterprise_test, seats=5` after the update; user B has **only** `plan_b`; `test_after_logout` is not attributed to A.
- [ ] INIT-003 (pre-init-probe): user `sdk_test_user_preinit_<run>` exists. Record whether `test_pre_init_event` exists (KSI-001).

**Errors, logs, bugs**
- [ ] ERR-001: 4 log levels in Diagnose → Logs.
- [ ] ERR-002..006, 014, 017: handled errors with screen names, metadata and breadcrumbs.
- [ ] ERR-007: render error from `ErrorBoundaryProbe` with a component stack.
- [ ] ERR-008: record whether the unhandled rejection was captured.
- [ ] ERR-011: bug report with title `SDK Test Lab bug <run>`, linked to the session.
- [ ] ERR-010: record where `reportBug` lands (event vs bug report).
- [ ] ERR-012/013: native crash present after relaunch. ERR-009: fatal JS crash.

**Symbolication**
- [ ] Release build: ERR-002 stack frames map to `src/tests/errors.ts`. If they don't, note it: 2.4.0 has no standalone sourcemap upload for store bundles (only `ota publish --sourcemap`), and no dSYM/R8 mapping upload command.

**Network**
- [ ] NET-001..011: every request with the correct status, duration and size; aborts and failures marked as errors; axios entries identical in shape to fetch.
- [ ] NET-012/013/015: search the dashboard for `FAKE_AUTH_TOKEN_`, `FAKE_COOKIE_`, `FAKE_QUERY_TOKEN_` + run → **no results**.
- [ ] NET-014 (capture-bodies): `password`, `card_number` and `access_token` are `[REDACTED]`; the email in free text is scrubbed.
- [ ] NET-016/018: no entry for the beacon path or for requests made under `no-network`.

**Performance**
- [ ] PERF-002: trace `checkout_test` with spans cart_validation / fake_api_call / render and `item_count=3`.
- [ ] PERF-004: screen load `sdk_test_manual_screen` ≈ 350 ms. PERF-007: app start. PERF-008/009: js_stall ≈ 700 ms / 4000 ms.

**Replay:** see TEST_PLAN §5.5.

**Engagement:** each campaign shows impression/completion/dismiss events; ratings 5★ and 2★ once each (idempotent `clientRatingId`); survey responses (ENG-007 may be rejected for the fake survey ID, so record it); rating funnel eligible→shown→selected.

**Push:** device token registered; deliveries and opens recorded; `permission_result notification`.

**OTA:** release funnel CHECK → OFFERED → DOWNLOAD_COMPLETE → INSTALLED → BOOT_SUCCESS; AUTO_ROLLBACK for the broken bundle.

**Attribution:** click ID `sdk_test_click_<run>`; IDFV (iOS); `install_referrer` (Android, Play install only).

**Privacy/consent**
- [ ] PRIV-002: `test_consent_during` absent, `test_consent_after` present.
- [ ] PRIV-003: `test_before_purge_unsent` absent.
- [ ] PRIV-005/006: record whether fake PII in track properties or error messages is visible. The SDK does not document scrubbing these; host apps must not send PII.
