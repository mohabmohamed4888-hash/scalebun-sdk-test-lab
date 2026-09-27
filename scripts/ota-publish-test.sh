#!/usr/bin/env bash
# Publish a Test Lab JS bundle to the dedicated NON-production OTA channel.
#
#   scripts/ota-publish-test.sh android|ios [--mandatory] [--note "text"]
#
# Credentials: `npx scalebun login` once (stored by the CLI on THIS machine),
# or SCALEBUN_TOKEN + SCALEBUN_API_URL in the environment for CI. Signing keys
# (if any) live in ./.scalebun (gitignored). Nothing here is bundled in the app.
set -euo pipefail

PLATFORM="${1:-}"
shift || true
if [[ "$PLATFORM" != "android" && "$PLATFORM" != "ios" ]]; then
  echo "usage: $0 android|ios [--mandatory] [--note text]" >&2
  exit 2
fi

CHANNEL="${SCALEBUN_OTA_CHANNEL:-sdk-test}"
case "$CHANNEL" in
  *prod*|default|production|live)
    echo "Refusing to publish Test Lab bundles to channel '$CHANNEL'. Use a dedicated channel such as sdk-test." >&2
    exit 3
    ;;
esac

APP_ID="${SCALEBUN_APP_ID:-$(grep -E '^SCALEBUN_APP_ID=' .env 2>/dev/null | cut -d= -f2- || true)}"
if [[ -z "$APP_ID" ]]; then
  echo "SCALEBUN_APP_ID not set (env or .env)." >&2
  exit 2
fi

INSTALL_MODE="ON_NEXT_RESTART"
NOTE="SDK Test Lab bundle $(date -u +%Y-%m-%dT%H:%M:%SZ)"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mandatory) INSTALL_MODE="IMMEDIATE"; shift ;;
    --resume) INSTALL_MODE="ON_NEXT_RESUME"; shift ;;
    --note) NOTE="$2"; shift 2 ;;
    *) echo "unknown arg $1" >&2; exit 2 ;;
  esac
done

echo "Publishing $PLATFORM bundle → app $APP_ID, channel '$CHANNEL', install mode $INSTALL_MODE"
npx scalebun ota publish \
  --app-id "$APP_ID" \
  --channel "$CHANNEL" \
  --platform "$PLATFORM" \
  --install-mode "$INSTALL_MODE" \
  --release-note "$NOTE" \
  --sourcemap
