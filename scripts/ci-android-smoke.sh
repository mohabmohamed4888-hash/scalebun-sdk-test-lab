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

# GitHub annotation (readable without downloading logs): annotate <title> <text>
annotate() { local m="${2//'%'/'%25'}"; m="${m//$'\r'/}"; echo "::error title=$1::${m//$'\n'/'%0A'}"; }
# First fatal error in a logcat dump plus its stack trace.
fatal_excerpt() { grep -m1 -A 40 -E "$FATAL" "$1" | cut -c1-300; }

# -g grants runtime permissions up front so no system dialog blocks the run.
adb install -r -g "$APK" || exit 1
adb logcat -c
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 30
adb exec-out screencap -p >"$OUT/launch.png"
adb logcat -d >"$OUT/logcat-launch.txt"

if [ -z "$(adb shell pidof "$PKG" | tr -d '\r')" ]; then
  annotate "App not running 30 s after launch" "$(grep -E 'AndroidRuntime|ReactNativeJS|DEBUG  :|libc' "$OUT/logcat-launch.txt" | tail -n 40 | cut -c1-300)"
  fail=1
fi
if grep -nE "$FATAL" "$OUT/logcat-launch.txt"; then
  annotate "Fatal error during launch" "$(fatal_excerpt "$OUT/logcat-launch.txt")"
  fail=1
fi
echo "--- ReactNativeJS output during launch"
grep -E 'ReactNativeJS' "$OUT/logcat-launch.txt" | tail -n 60 || true

if [ "$fail" -eq 0 ]; then
  curl -fsSL https://get.maestro.mobile.dev | bash
  export PATH="$PATH:$HOME/.maestro/bin" MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_DRIVER_STARTUP_TIMEOUT=180000
  for flow in 01_smoke_navigation 03_replay_playground; do
    if ! maestro test --format junit --output "$OUT/$flow.xml" --debug-output "$OUT/$flow" ".maestro/$flow.yaml" 2>&1 | tee "$OUT/$flow.log"; then
      annotate "Maestro flow $flow failed" "$(tail -n 40 "$OUT/$flow.log" | cut -c1-300)"
      fail=1
    fi
  done
  adb exec-out screencap -p >"$OUT/after-maestro.png"
  adb logcat -d >"$OUT/logcat-full.txt"
  if grep -nE "$FATAL" "$OUT/logcat-full.txt"; then
    annotate "Fatal error while driving the UI" "$(fatal_excerpt "$OUT/logcat-full.txt")"
    fail=1
  fi
fi
exit "$fail"
