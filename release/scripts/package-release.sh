#!/usr/bin/env bash
# Rebuild the five user-facing ZIPs from the current repository.
# Run from anywhere: bash release/scripts/package-release.sh
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ ! -d "$ROOT/dashboard/android" || ! -d "$ROOT/dashboard/ios" ]]; then
  echo "package-release.sh must be run from a repository checkout; the release ZIP already contains the packaged projects." >&2
  exit 2
fi
RELEASE_DIR="$ROOT/release"
PUBLIC_DIR="$ROOT/dashboard/public"
TMP_DIR="$(mktemp -d)"
BACKUP_DIR="$TMP_DIR/previous-public-zips"
mkdir -p "$BACKUP_DIR"

ZIP_NAMES=(
  "DARIC-SuperApp-Full.zip"
  "daric-web.zip"
  "daric-android.zip"
  "daric-ios.zip"
  "daric-source.zip"
)
for name in "${ZIP_NAMES[@]}"; do
  if [[ -f "$PUBLIC_DIR/$name" ]]; then
    mv "$PUBLIC_DIR/$name" "$BACKUP_DIR/$name"
  fi
done
if [[ -f "$PUBLIC_DIR/SHA256SUMS.txt" ]]; then
  mv "$PUBLIC_DIR/SHA256SUMS.txt" "$BACKUP_DIR/SHA256SUMS.txt"
fi

restore_on_failure() {
  local status=$?
  if [[ "$status" -ne 0 ]]; then
    for name in "${ZIP_NAMES[@]}"; do rm -f "$PUBLIC_DIR/$name"; done
    for name in "${ZIP_NAMES[@]}"; do
      [[ -f "$BACKUP_DIR/$name" ]] && mv "$BACKUP_DIR/$name" "$PUBLIC_DIR/$name"
    done
    [[ -f "$BACKUP_DIR/SHA256SUMS.txt" ]] && mv "$BACKUP_DIR/SHA256SUMS.txt" "$PUBLIC_DIR/SHA256SUMS.txt"
  fi
  rm -rf "$TMP_DIR"
  exit "$status"
}
trap restore_on_failure EXIT

command -v zip >/dev/null || { echo "The zip utility is required." >&2; exit 1; }
command -v unzip >/dev/null || { echo "The unzip utility is required for validation." >&2; exit 1; }

# Keep generated archives out of Vite's public-copy step. The preview server
# receives the new archives after the build completes.
(cd "$ROOT/dashboard" && npm audit --audit-level=moderate)
"$ROOT/release/scripts/sync-web.sh"

STAGE="$TMP_DIR/stage"
FULL_ROOT="$STAGE/DARIC-SuperApp"
SOURCE_ROOT="$FULL_ROOT/source"
mkdir -p "$FULL_ROOT/web" "$FULL_ROOT/scripts"
cp "$RELEASE_DIR/README-INSTALL.md" "$FULL_ROOT/README-INSTALL.md"
if [[ -f "$RELEASE_DIR/RELEASE-NOTES.md" ]]; then
  cp "$RELEASE_DIR/RELEASE-NOTES.md" "$FULL_ROOT/RELEASE-NOTES.md"
fi
cp "$RELEASE_DIR/scripts/sync-web.sh" "$FULL_ROOT/scripts/sync-web.sh"
cp "$RELEASE_DIR/scripts/build-apk.sh" "$FULL_ROOT/scripts/build-apk.sh"
cp "$RELEASE_DIR/scripts/build-ipa.sh" "$FULL_ROOT/scripts/build-ipa.sh"
chmod +x "$FULL_ROOT/scripts/"*.sh
cp -a "$ROOT/dashboard/dist"/. "$FULL_ROOT/web"/
cp -a "$ROOT/dashboard/android" "$FULL_ROOT/android"
cp -a "$ROOT/dashboard/ios" "$FULL_ROOT/ios"

# Remove only generated build/cache/local-machine files from the staged native projects.
find "$FULL_ROOT/android" -type d \( -name .gradle -o -name build \) -prune -exec rm -rf -- {} +
find "$FULL_ROOT/android" -type f \( -name keystore.properties -o -name '*.jks' -o -name '*.keystore' -o -name '*.p12' -o -name '*.pfx' -o -name google-services.json -o -name local.properties -o -name '.env*' \) -delete
rm -f "$FULL_ROOT/android/local.properties"
find "$FULL_ROOT/ios" -type d \( -name DerivedData -o -name .build -o -name xcuserdata \) -prune -exec rm -rf -- {} +

# Copy source without repository metadata, dependencies, build outputs, ZIPs,
# or duplicate native projects (those are packaged at the bundle root above).
python3 - "$ROOT" "$SOURCE_ROOT" <<'PY'
from pathlib import Path
import shutil
import sys

root = Path(sys.argv[1]).resolve()
destination = Path(sys.argv[2]).resolve()
exclude_native = True
skip_dirs = {".git", "node_modules", "dist", "build", ".gradle", "DerivedData", ".build", "coverage", ".next", ".cache", "__pycache__"}
exact_skip = {
    Path("dashboard/android"),
    Path("dashboard/ios"),
    Path("dashboard/android/app/src/main/assets/public"),
    Path("dashboard/ios/App/App/public"),
}

def ignore(current, names):
    relative = Path(current).resolve().relative_to(root)
    ignored = set()
    for name in names:
        rel = relative / name
        if name in skip_dirs or name.endswith(".zip") or name.endswith(".tsbuildinfo") or name == "SHA256SUMS.txt":
            ignored.add(name)
        env_secret = name in {".env", ".env.local", ".env.prod", ".env.production"} or (
            name.startswith(".env.") and not name.endswith((".example", ".sample", ".template"))
        )
        if name in {"keystore.properties", "local.properties", "google-services.json", ".netrc"} or env_secret or name.endswith((".jks", ".keystore", ".p12", ".pfx")):
            ignored.add(name)
        if rel in exact_skip:
            ignored.add(name)
        if exclude_native and relative == Path("dashboard") and name in {"android", "ios"}:
            ignored.add(name)
    return ignored

shutil.copytree(root, destination, ignore=ignore)
PY

# Build a standalone source ZIP as a second deliverable. It includes source and
# project metadata but omits Git history, dependencies, build outputs and zips.
python3 - "$ROOT" "$TMP_DIR/source-only" <<'PY'
from pathlib import Path
import shutil
import sys

root = Path(sys.argv[1]).resolve()
destination = Path(sys.argv[2]).resolve()
skip_dirs = {".git", "node_modules", "dist", "build", ".gradle", "DerivedData", ".build", "coverage", ".next", ".cache", "__pycache__"}
exact_skip = {
    Path("dashboard/android/app/src/main/assets/public"),
    Path("dashboard/ios/App/App/public"),
}

def ignore(current, names):
    relative = Path(current).resolve().relative_to(root)
    ignored = set()
    for name in names:
        rel = relative / name
        if name in skip_dirs or name.endswith(".zip") or name.endswith(".tsbuildinfo") or name == "SHA256SUMS.txt":
            ignored.add(name)
        env_secret = name in {".env", ".env.local", ".env.prod", ".env.production"} or (
            name.startswith(".env.") and not name.endswith((".example", ".sample", ".template"))
        )
        if name in {"keystore.properties", "local.properties", "google-services.json", ".netrc"} or env_secret or name.endswith((".jks", ".keystore", ".p12", ".pfx")):
            ignored.add(name)
        if rel in exact_skip:
            ignored.add(name)
    return ignored

shutil.copytree(root, destination, ignore=ignore)
PY

# Recreate, rather than update-in-place, so old hashed Vite assets cannot linger.
rm -f "$RELEASE_DIR/DARIC-SuperApp-Full.zip" "$RELEASE_DIR/daric-web.zip" \
  "$RELEASE_DIR/daric-android.zip" "$RELEASE_DIR/daric-ios.zip" "$RELEASE_DIR/daric-source.zip"
(
  cd "$STAGE"
  zip -qr "$RELEASE_DIR/DARIC-SuperApp-Full.zip" DARIC-SuperApp
)
(
  cd "$FULL_ROOT/web"
  zip -qr "$RELEASE_DIR/daric-web.zip" .
)
(
  cd "$FULL_ROOT/android"
  zip -qr "$RELEASE_DIR/daric-android.zip" .
)
(
  cd "$FULL_ROOT/ios"
  zip -qr "$RELEASE_DIR/daric-ios.zip" .
)
(
  cd "$TMP_DIR/source-only"
  zip -qr "$RELEASE_DIR/daric-source.zip" .
)

cp "$RELEASE_DIR/DARIC-SuperApp-Full.zip" "$ROOT/DARIC-SuperApp-Full.zip"
for name in "${ZIP_NAMES[@]}"; do cp "$RELEASE_DIR/$name" "$PUBLIC_DIR/$name"; done

(
  cd "$RELEASE_DIR"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "${ZIP_NAMES[@]}" > SHA256SUMS.txt
  else
    shasum -a 256 "${ZIP_NAMES[@]}" > SHA256SUMS.txt
  fi
)
cp "$RELEASE_DIR/SHA256SUMS.txt" "$PUBLIC_DIR/SHA256SUMS.txt"

for name in "${ZIP_NAMES[@]}"; do
  unzip -t "$RELEASE_DIR/$name" >/dev/null
  size="$(wc -c < "$RELEASE_DIR/$name" | tr -d ' ')"
  printf '✅ %-28s %s bytes\n' "$name" "$size"
done
printf '\nSHA-256 checksums: %s\n' "$RELEASE_DIR/SHA256SUMS.txt"
cat "$RELEASE_DIR/SHA256SUMS.txt"
