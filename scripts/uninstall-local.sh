#!/bin/sh
# Remove this theme plugin from a DSH profile.
#
# Usage:
#   ./scripts/uninstall-local.sh            # web profile (default)
#   ./scripts/uninstall-local.sh desktop    # DSH Desktop profile (quit the app first)
set -eu

PROFILE="${1:-web}"

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

echo "Removing dsh-theme-neo-brutalist from profile '$PROFILE' ..."
"$DSH" plugin --profile "$PROFILE" remove dsh-theme-neo-brutalist
echo
echo "Removed. Restart the app / dsh web server to unload the client bundle."
