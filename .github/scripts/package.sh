#!/bin/bash
# Builds the store packages with scripts/build.mjs and zips them:
#  - darkspace-chrome-vX.zip for the Chrome Web Store and Edge Add-ons, under a
#    darkspace-chrome/ folder like every past release
#  - darkspace-firefox-vX.zip for addons.mozilla.org, files at the zip root (AMO needs that)
# Usage: bash .github/scripts/package.sh <out-dir>
# Prints the two zip paths, Chrome first.

set -euo pipefail

OUT="$(mkdir -p "${1:?usage: package.sh <out-dir>}" && cd "$1" && pwd)"
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
VERSION="$(jq -r .version "$SRC/manifest.json")"
STAGE="$OUT/stage"
CHROME="$OUT/darkspace-chrome-v$VERSION.zip"
FIREFOX="$OUT/darkspace-firefox-v$VERSION.zip"

rm -rf "$STAGE" "$CHROME" "$FIREFOX"
# build.mjs also checks that every file a manifest names is in its package
node "$SRC/scripts/build.mjs" chrome "$STAGE" >&2
node "$SRC/scripts/build.mjs" firefox "$STAGE" >&2
mv "$STAGE/chrome" "$STAGE/darkspace-chrome"

(cd "$STAGE" && zip -qr "$CHROME" darkspace-chrome -x '*.DS_Store')
(cd "$STAGE/firefox" && zip -qr "$FIREFOX" . -x '*.DS_Store')
echo "$CHROME"
echo "$FIREFOX"
