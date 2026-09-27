# Platform Matrix

Legend: ✅ passed · ❌ failed · ⏳ NOT RUN · ➖ not applicable (SKIPPED WITH REASON) · 🟡 passed with caveat

**Honesty rule:** a feature is marked tested on a platform only after it has actually been run there. As of 2026-09-27, **no on-device run has happened on either platform**. The build machine is Windows 11 with no JDK, Android SDK or emulator, and iOS cannot be built on Windows. No ScaleBun app/client key was available yet, so no delivery could be verified.

## Build & static checks

| Check | Android | iOS | Evidence |
|---|---|---|---|
| Native project generated (RN 0.81.6, New Arch, Hermes) | ✅ | ✅ | `android/`, `ios/` |
| `scalebun init android/ios` wiring | ✅ codemod applied | 🟡 manual; SDK snippet broken (KSI-004), runtime wrapper used | `npm run doctor:*` |
| `npx scalebun doctor` | 🟡 1 blocking: not logged in (dev-machine credential); ⚠️ no OTA signing key | same (shared) | README → Doctor status |
| Production JS bundle (`react-native bundle --dev false`) | ✅ 2.50 MB | ✅ 2.50 MB | `npm run bundle:check` |
| Bundle secret scan | ✅ only validation regex literals | ✅ | README → Security |
| TypeScript strict / ESLint / Jest (47) / tool self-tests | ✅ platform-independent | ✅ | `npm run check` |
| Gradle build (`assembleDebug` / `assembleRelease`) | ⏳ no JDK/Android SDK on this machine | ➖ | — |
| `pod install` + Xcode build | ➖ | ⏳ needs macOS | — |
| App launches on device/emulator | ⏳ | ⏳ | — |

## Capability status (on device)

| Capability | Android | iOS | Platform-specific notes |
|---|---|---|---|
| Setup & init (INIT-*) | ⏳ | ⏳ | |
| Analytics (ANA-*) | ⏳ | ⏳ | |
| Sessions (SES-*) | ⏳ | ⏳ | |
| Identity (IDN-*) | ⏳ | ⏳ | |
| Logs/errors/bugs (ERR-*) | ⏳ | ⏳ | Native crash handlers differ per OS; run ERR-012 on both |
| Network (NET-*) | ⏳ | ⏳ | Android release builds block cleartext: run against the LAN server in debug/debugOptimized, or use an HTTPS tunnel |
| Offline (OFF-*) | ⏳ | ⏳ | |
| Performance (PERF-*) | ⏳ | ⏳ | Native ANR watchdog not reproducible from JS (JS-thread stall used) |
| Session replay (RPL-*) | ⏳ | ⏳ | Android PixelCopy vs iOS snapshot capture |
| Navigation (NAV-*) | ⏳ | ⏳ | Expo Router ➖ (not installed, NAV-007) |
| Push (PUSH-*) | ⏳ NOT_CONFIGURED (no google-services.json) | ⏳ NOT_CONFIGURED (no APNs key / plist; needs a physical iPhone) | |
| Engagement (ENG-*) | ⏳ | ⏳ | Store review: Play In-App Review vs SKStoreReviewController |
| Attribution (ATT-*) | ⏳ ATT-003 Play Install Referrer only; ATT-001/004/005 ➖ | ⏳ ATT-001 IDFV, ATT-004/005 SKAN; ATT-003 ➖ | IDFA/GAID never collected |
| Privacy (PRIV-*) | ⏳ | ⏳ | |
| OTA (OTA-*) | ⏳ needs release build | ⏳ needs release build + working AppDelegate hook (KSI-004) | |
| Diagnostics (DIAG-*) | ⏳ | ⏳ | Desktop debugger is a future product |
| Feature matrix (FMX-001 × profiles) | ⏳ | ⏳ | |
| Edge cases (EDGE-*) | ⏳ | ⏳ | |

## Platform-restricted tests

| Test | Android | iOS | Reason |
|---|---|---|---|
| ATT-001 setIdentifiers(idfv) | ➖ | runs | GAID needs the AdID permission + consent flow the Test Lab deliberately doesn't implement |
| ATT-003 Play Install Referrer | runs (manual) | ➖ | Google Play only |
| ATT-004 / ATT-005 SKAdNetwork | ➖ | runs | Apple framework |

## To fill in after a device run

Record for each platform: device/OS, build type, profile(s), testRunId, exported report file, and pass/fail counts per category.
