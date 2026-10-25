#!/bin/sh
# Install this theme plugin into a DSH profile.
#
# Usage:
#   ./scripts/install-local.sh            # web profile (default)
#   ./scripts/install-local.sh desktop    # DSH Desktop profile (quit the app first)
#   DSH_CLI=/path/to/dsh ./scripts/install-local.sh web
set -eu

PROFILE="${1:-web}"
PLUGIN_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

if [ -n "${DSH_CLI:-}" ]; then
  DSH="$DSH_CLI"
elif command -v dsh >/dev/null 2>&1; then
  DSH=dsh
elif [ -x "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" ]; then
  DSH="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"
else
  echo "error: dsh CLI not found. Set DSH_CLI to the bundled dsh binary." >&2
  exit 1
fi

if [ "$PROFILE" = "desktop" ]; then
  echo "DSH Desktop must be closed while its profile is modified."
  echo "Quit the app, run this script, then reopen it."
fi

echo "Installing $PLUGIN_DIR into profile '$PROFILE' ..."
"$DSH" plugin --profile "$PROFILE" add "$PLUGIN_DIR"

echo
echo "Installed. Restart the app / dsh web server once, then open:"
echo "  Settings → 通用 → Stripe 紫光主题"
