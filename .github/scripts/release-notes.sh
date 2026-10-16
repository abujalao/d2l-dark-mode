#!/bin/bash
# Prints release notes in the style of past releases: one bullet per commit
# since the previous v* tag, with the type prefix dropped and the short hash
# after it. Merges and the version-bump commit are left out.
# Usage: bash .github/scripts/release-notes.sh

set -euo pipefail

prev="$(git describe --tags --abbrev=0 --match 'v[0-9]*' HEAD 2>/dev/null || true)"
range="${prev:+$prev..}HEAD"

notes="$(git log --no-merges --format='%h%x09%s' "$range" \
  | grep -Eiv $'\t''chore(\([^)]*\))?: bump version' \
  | sed -E $'s/^([0-9a-f]+)\t([a-z]+(\\([^)]*\\))?!?: )?(.*)$/- \\4 (\\1)/' \
  || true)"

if [ -n "$notes" ]; then
  echo "$notes"
else
  echo "- Maintenance release"
fi
