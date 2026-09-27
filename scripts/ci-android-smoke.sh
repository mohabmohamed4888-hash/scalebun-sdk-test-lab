#!/usr/bin/env bash
# CI smoke test for the Android release APK on a booted emulator (run by
# .github/workflows/ci.yml): install, cold-launch, fail if the process dies or a
# fatal error is logged, then drive the UI with the Maestro smoke flows.
# Artifacts (screenshots, logcat, Maestro output) are written to build/smoke/.
set -uo pipefail

APK="${1:?usage: ci-android-smoke.sh <path-to-apk>}"
PKG=com.scalebun.sdktestlab
OUT=build/smoke
FATAL='FATAL EXCEPTION|JavascriptException|Unhandled JS Exception'
mkdir -p "$OUT"
fail=0

# -g grants runtime permissions up front so no system dialog blocks the run.
adb install -r -g "$APK" || exit 1
adb logcat -c
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 30
adb exec-out screencap -p >"$OUT/launch.png"
adb logcat -d >"$OUT/logcat-launch.txt"

if [ -z "$(adb shell pidof "$PKG" | tr -d '\r')" ]; then
  echo "::error::$PKG is not running 30 s after launch"
  fail=1
fi
if grep -nE "$FATAL" "$OUT/logcat-launch.txt"; then
  echo "::error::fatal error logged during launch (see logcat-launch.txt)"
  fail=1
fi
echo "--- ReactNativeJS output during launch"
grep -E 'ReactNativeJS' "$OUT/logcat-launch.txt" | tail -n 60 || true

if [ "$fail" -eq 0 ]; then
  curl -fsSL https://get.maestro.mobile.dev | bash
  export PATH="$PATH:$HOME/.maestro/bin" MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_DRIVER_STARTUP_TIMEOUT=180000
  for flow in 01_smoke_navigation 03_replay_playground; do
    if ! maestro test --format junit --output "$OUT/$flow.xml" --debug-output "$OUT/$flow" ".maestro/$flow.yaml"; then
      echo "::error::Maestro flow $flow failed (see the android-smoke artifact)"
      fail=1
    fi
  done
  adb exec-out screencap -p >"$OUT/after-maestro.png"
  adb logcat -d >"$OUT/logcat-full.txt"
  if grep -nE "$FATAL" "$OUT/logcat-full.txt"; then
    echo "::error::fatal error logged while driving the UI (see logcat-full.txt)"
    fail=1
  fi
fi
exit "$fail"
