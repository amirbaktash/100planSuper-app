#!/usr/bin/env bash
# Build/sync the web bundle and open the Xcode project; archive/export is manual in Xcode.
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Building an iOS archive/IPA requires macOS and Xcode." >&2
  echo "For a no-Mac preview, publish the web/ folder over HTTPS and use Add to Home Screen." >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/sync-web.sh"

if [[ -d "$SCRIPT_DIR/../../dashboard/ios/App" ]]; then
  IOS_DIR="$(cd -- "$SCRIPT_DIR/../../dashboard/ios" && pwd)"
elif [[ -d "$SCRIPT_DIR/../../../ios/App" && -d "$SCRIPT_DIR/../../dashboard/package.json" ]]; then
  IOS_DIR="$(cd -- "$SCRIPT_DIR/../../../ios" && pwd)"
elif [[ -d "$SCRIPT_DIR/../ios/App" ]]; then
  IOS_DIR="$(cd -- "$SCRIPT_DIR/../ios" && pwd)"
else
  echo "iOS project was not found next to the release source." >&2
  exit 1
fi

PROJECT="$IOS_DIR/App/App.xcodeproj"
[[ -d "$PROJECT" ]] || { echo "Xcode project not found: $PROJECT" >&2; exit 1; }
open "$PROJECT"
cat <<'EOF'
In Xcode:
  1. Select the App target and configure Signing & Capabilities / Team.
  2. Select Any iOS Device (arm64), then Product > Archive.
  3. In Organizer, choose Distribute App and the appropriate Development,
     Ad Hoc, or App Store distribution method; export the IPA.

This script syncs the web assets and opens Xcode. It does not export an IPA automatically.
EOF
