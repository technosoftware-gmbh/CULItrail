#!/usr/bin/env bash
#
# Copies the built plugin into a vault's plugin folder.
#
# Build first: this script deliberately does not build, so that what lands in a
# vault is whatever was last verified rather than whatever compiles right now.
#
# Usage:  ./scripts/install-into-vault.sh /path/to/Vault
set -euo pipefail

VAULT="${1:?usage: install-into-vault.sh /path/to/Vault}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$VAULT/.obsidian/plugins/culitrail"

if [ ! -f "$ROOT/main.js" ]; then
  echo "No main.js. Run npm run build first." >&2
  exit 1
fi

mkdir -p "$DEST"
cp "$ROOT/main.js" "$ROOT/styles.css" "$ROOT/manifest.json" "$DEST/"
echo "installed culitrail -> $DEST"
echo "Reload Obsidian, or disable and re-enable the plugin, to pick the new build up."
