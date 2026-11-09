#!/usr/bin/env bash
# Build the React/Vite web app and copy the generated files into the web and
# native projects. Requires Node.js 22.12+; supports repo and extracted ZIP layouts.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "$SCRIPT_DIR/../../dashboard/package.json" && -d "$SCRIPT_DIR/../../dashboard/android" ]]; then
  ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
  APP_DIR="$ROOT/dashboard"
  ANDROID_DIR="$APP_DIR/android"
  IOS_DIR="$APP_DIR/ios"
  WEB_DIR="$APP_DIR/dist"
  REPO_MODE=1
elif [[ -f "$SCRIPT_DIR/../../dashboard/package.json" && -d "$SCRIPT_DIR/../../../android" && -d "$SCRIPT_DIR/../../../ios" && -d "$SCRIPT_DIR/../../../web" ]]; then
  # Called from source/release/scripts inside the full release ZIP.
  ROOT="$(cd -- "$SCRIPT_DIR/../../.." && pwd)"
  APP_DIR="$ROOT/source/dashboard"
  ANDROID_DIR="$ROOT/android"
  IOS_DIR="$ROOT/ios"
  WEB_DIR="$ROOT/web"
  REPO_MODE=0
elif [[ -f "$SCRIPT_DIR/../source/dashboard/package.json" && -d "$SCRIPT_DIR/../android" ]]; then
  ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
  APP_DIR="$ROOT/source/dashboard"
  ANDROID_DIR="$ROOT/android"
  IOS_DIR="$ROOT/ios"
  WEB_DIR="$ROOT/web"
  REPO_MODE=0
else
  echo "Cannot locate the DARIC source/native project layout next to this script." >&2
  exit 1
fi

# Vite copies everything under public/ into dist/. Keep release ZIPs and hashes
# available to the dev server, but out of the static web/native build artifacts.
PUBLIC_BACKUP="$(mktemp -d)"
PUBLIC_ARCHIVES=(
  "DARIC-SuperApp-Full.zip"
  "daric-web.zip"
  "daric-android.zip"
  "daric-ios.zip"
  "daric-source.zip"
  "SHA256SUMS.txt"
)
restore_public_archives() {
  local status=$?
  for name in "${PUBLIC_ARCHIVES[@]}"; do
    if [[ -f "$PUBLIC_BACKUP/$name" ]]; then
      mv "$PUBLIC_BACKUP/$name" "$APP_DIR/public/$name"
    fi
  done
  rm -rf "$PUBLIC_BACKUP"
  exit "$status"
}
trap restore_public_archives EXIT
mkdir -p "$PUBLIC_BACKUP"
for name in "${PUBLIC_ARCHIVES[@]}"; do
  if [[ -f "$APP_DIR/public/$name" ]]; then
    mv "$APP_DIR/public/$name" "$PUBLIC_BACKUP/$name"
  fi
done

if [[ "${DARIC_FORCE_NPM_CI:-0}" == "1" || ! -x "$APP_DIR/node_modules/.bin/vite" ]]; then
  echo "Installing dashboard dependencies (Node.js 22.12+ is required by Vite 8 and Capacitor CLI)..."
  (cd "$APP_DIR" && npm ci)
fi

echo "Building dashboard from: $APP_DIR"
(cd "$APP_DIR" && npm run build)
DIST_DIR="$APP_DIR/dist"
[[ -f "$DIST_DIR/index.html" ]] || { echo "Build did not create $DIST_DIR/index.html" >&2; exit 1; }

# The package ZIP keeps the release web output and native projects at its root;
# the source tree intentionally contains dashboard source only.
copy_generated_tree() {
  local source="$1"
  local target="$2"
  mkdir -p "$target"
  find "$target" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
  cp -a "$source"/. "$target"/
}

if [[ "$REPO_MODE" == "1" ]]; then
  # Capacitor sync also refreshes native plugin/config metadata in the repo.
  (cd "$APP_DIR" && npx cap sync)
else
  copy_generated_tree "$DIST_DIR" "$WEB_DIR"
fi

copy_generated_tree "$DIST_DIR" "$ANDROID_DIR/app/src/main/assets/public"
copy_generated_tree "$DIST_DIR" "$IOS_DIR/App/App/public"

echo "Web build synced successfully."
echo "  Web:     $WEB_DIR"
echo "  Android: $ANDROID_DIR/app/src/main/assets/public"
echo "  iOS:     $IOS_DIR/App/App/public"
echo "Note: this sync copies web assets only; native plugin/project changes require a native Capacitor sync in the source repository."
