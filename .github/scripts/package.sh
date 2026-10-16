#!/bin/bash
# Assembles the Chrome store package from the repo, the same files build.sh
# copies, zipped under a darkspace-chrome/ folder like every past release.
# Usage: bash .github/scripts/package.sh <out-dir>
# Prints the path of the zip it wrote.

set -euo pipefail

OUT="${1:?usage: package.sh <out-dir>}"
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
VERSION="$(jq -r .version "$SRC/manifest.json")"
STAGE="$OUT/darkspace-chrome"
ZIP="darkspace-chrome-v$VERSION.zip"

rm -rf "$STAGE" "$OUT/$ZIP"
mkdir -p "$STAGE"/{background,content,shared,popup,options,icons}

cp "$SRC/manifest.json"                       "$STAGE/"
cp "$SRC/background/service-worker.js"        "$STAGE/background/"
cp "$SRC/content/"*.js "$SRC/content/"*.css   "$STAGE/content/"
cp "$SRC/shared/"*.js                         "$STAGE/shared/"
cp "$SRC/popup/popup."{html,js,css}           "$STAGE/popup/"
cp "$SRC/options/options."{html,js,css}       "$STAGE/options/"
cp "$SRC/icons/"*.png                         "$STAGE/icons/"

# Every file the manifest names must be in the package, or the store
# rejects it (or worse, it loads with a script missing).
missing=0
for f in $(jq -r '
    [.background.service_worker?, .action.default_popup?, .options_page?,
     (.content_scripts[]? | (.js[]?, .css[]?)),
     (.icons? // {} | .[]), (.action.default_icon? // {} | .[])]
    | map(select(. != null)) | unique | .[]' "$STAGE/manifest.json"); do
  if [ ! -f "$STAGE/$f" ]; then
    echo "error: manifest references $f, which is not in the package" >&2
    missing=1
  fi
done
[ "$missing" -eq 0 ]

(cd "$OUT" && zip -qr "$ZIP" darkspace-chrome -x '*.DS_Store')
echo "$OUT/$ZIP"
