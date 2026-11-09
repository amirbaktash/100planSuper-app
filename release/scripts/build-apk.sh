#!/usr/bin/env bash
# Build a debug APK, or a release APK when a signing keystore is configured.
# Usage: bash scripts/build-apk.sh [debug|release]
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
VARIANT="${1:-debug}"
case "$VARIANT" in
  debug) TASK="assembleDebug"; APK_REL="app/build/outputs/apk/debug/app-debug.apk" ;;
  release) TASK="assembleRelease"; APK_REL="app/build/outputs/apk/release/app-release.apk" ;;
  *) echo "Usage: $0 [debug|release]" >&2; exit 2 ;;
esac

"$SCRIPT_DIR/sync-web.sh"

if [[ -d "$SCRIPT_DIR/../../dashboard/android" ]]; then
  ANDROID_DIR="$(cd -- "$SCRIPT_DIR/../../dashboard/android" && pwd)"
elif [[ -d "$SCRIPT_DIR/../../../android" && -d "$SCRIPT_DIR/../../dashboard/package.json" ]]; then
  ANDROID_DIR="$(cd -- "$SCRIPT_DIR/../../../android" && pwd)"
elif [[ -d "$SCRIPT_DIR/../android" ]]; then
  ANDROID_DIR="$(cd -- "$SCRIPT_DIR/../android" && pwd)"
else
  echo "Android project was not found next to the release source." >&2
  exit 1
fi

if [[ ! -x "$ANDROID_DIR/gradlew" ]]; then
  echo "Gradle wrapper is missing or not executable: $ANDROID_DIR/gradlew" >&2
  exit 1
fi

(cd "$ANDROID_DIR" && ./gradlew "$TASK")
APK="$ANDROID_DIR/$APK_REL"
if [[ ! -f "$APK" && "$VARIANT" == "release" ]]; then
  APK="$ANDROID_DIR/app/build/outputs/apk/release/app-release-unsigned.apk"
fi
[[ -f "$APK" ]] || { echo "APK output not found. Check Android SDK/Gradle logs." >&2; exit 1; }
echo "APK created: $APK"
ls -lh "$APK"
if command -v sha256sum >/dev/null 2>&1; then sha256sum "$APK"; else shasum -a 256 "$APK"; fi
if [[ "$VARIANT" == "release" && "$APK" == *unsigned.apk ]]; then
  echo "WARNING: this release APK is unsigned. Configure android/keystore.properties before distribution." >&2
fi
