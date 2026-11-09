#!/usr/bin/env bash
# Verify the configured web build/PWA assets in the Git checkout, source ZIP,
# or the source/ subtree inside the full release ZIP. This does not claim that
# Solidity or Playwright/E2E tests pass; those runners are not configured here.
set -euo pipefail
SOURCE_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

# In the full release bundle, source/ intentionally omits duplicate native
# projects; the standalone projects live one directory above it.
if [[ -f "$SOURCE_ROOT/../README-INSTALL.md" && \
      -f "$SOURCE_ROOT/../scripts/sync-web.sh" && \
      -d "$SOURCE_ROOT/../android" && -d "$SOURCE_ROOT/../ios" && -d "$SOURCE_ROOT/../web" ]]; then
  ROOT="$SOURCE_ROOT"
  PACKAGE_ROOT="$(cd -- "$SOURCE_ROOT/.." && pwd)"
  SYNC_SCRIPT="$PACKAGE_ROOT/scripts/sync-web.sh"
  WEB_DIR="$PACKAGE_ROOT/web"
  ANDROID_PUBLIC="$PACKAGE_ROOT/android/app/src/main/assets/public"
  IOS_PUBLIC="$PACKAGE_ROOT/ios/App/App/public"
else
  ROOT="$SOURCE_ROOT"
  SYNC_SCRIPT="$ROOT/release/scripts/sync-web.sh"
  WEB_DIR="$ROOT/dashboard/dist"
  ANDROID_PUBLIC="$ROOT/dashboard/android/app/src/main/assets/public"
  IOS_PUBLIC="$ROOT/dashboard/ios/App/App/public"
fi

if [[ -n "${PACKAGE_ROOT:-}" ]]; then
  NATIVE_ANDROID="$PACKAGE_ROOT/android"
  NATIVE_IOS="$PACKAGE_ROOT/ios"
else
  NATIVE_ANDROID="$ROOT/dashboard/android"
  NATIVE_IOS="$ROOT/dashboard/ios"
fi

command -v node >/dev/null || { echo "Node.js is required." >&2; exit 1; }
command -v npm >/dev/null || { echo "npm is required." >&2; exit 1; }
command -v python3 >/dev/null || { echo "Python 3 is required for manifest validation." >&2; exit 1; }

"$SYNC_SCRIPT"

python3 -m json.tool "$WEB_DIR/manifest.webmanifest" >/dev/null
python3 - "$WEB_DIR" "$ROOT" "$NATIVE_ANDROID" "$NATIVE_IOS" <<'PY'
from pathlib import Path
import json
import plistlib
import struct
import sys
import xml.etree.ElementTree as ET

web, root, android, ios = map(Path, sys.argv[1:])
manifest = json.loads((web / "manifest.webmanifest").read_text(encoding="utf-8"))
if manifest.get("short_name") != "100plan":
    raise SystemExit("PWA short_name must be 100plan.")


def png_size(path: Path) -> tuple[int, int, int, bool]:
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n" or len(data) < 26:
        raise SystemExit(f"Invalid PNG asset: {path}")
    color_type = data[25]
    has_transparency = color_type in (4, 6) or b"tRNS" in data
    return (*struct.unpack(">II", data[16:24]), color_type, has_transparency)

for icon in manifest.get("icons", []):
    src = icon["src"].removeprefix("./")
    if src == "daric-token-512.png":
        raise SystemExit("The token logo must not be used as the 100plan app icon.")
    size = int(icon["sizes"].split("x", 1)[0])
    path = web / src
    if png_size(path)[:2] != (size, size):
        raise SystemExit(f"PWA icon size mismatch: {path} (expected {size}x{size})")

token = web / "daric-token-512.png"
width, height, _color_type, has_transparency = png_size(token)
if (width, height) != (512, 512) or not has_transparency:
    raise SystemExit("DARIC token logo must be a 512x512 PNG with transparency.")

html = (web / "index.html").read_text(encoding="utf-8")
if "100plan" not in html or "./icons/icon-512.png" not in html:
    raise SystemExit("Web title or app-icon link is not branded as 100plan.")
config = root / "dashboard/capacitor.config.ts"
if config.exists() and 'appName: "100plan"' not in config.read_text(encoding="utf-8"):
    raise SystemExit("Capacitor appName must be 100plan.")

android_strings = android / "app/src/main/res/values/strings.xml"
if android_strings.exists():
    strings = ET.parse(android_strings).getroot()
    labels = {entry.attrib.get("name"): entry.text for entry in strings.findall("string")}
    if labels.get("app_name") != "100plan" or labels.get("title_activity_main") != "100plan":
        raise SystemExit("Android launch labels must be 100plan.")
    if png_size(android / "app/src/main/res/mipmap-xxxhdpi/ic_launcher.png")[:2] != (192, 192):
        raise SystemExit("Android 100plan launcher icon has an unexpected size.")

info = ios / "App/App/Info.plist"
if info.exists():
    with info.open("rb") as stream:
        plist = plistlib.load(stream)
    if plist.get("CFBundleDisplayName") != "100plan":
        raise SystemExit("iOS display name must be 100plan.")
    app_icon = ios / "App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
    if png_size(app_icon)[:2] != (1024, 1024):
        raise SystemExit("iOS app icon must be 1024x1024.")
PY
for path in \
  "$WEB_DIR/index.html" \
  "$WEB_DIR/sw.js" \
  "$WEB_DIR/manifest.webmanifest" \
  "$ANDROID_PUBLIC/index.html" \
  "$IOS_PUBLIC/index.html"; do
  [[ -s "$path" ]] || { echo "Required output missing or empty: $path" >&2; exit 1; }
done

if ! grep -q 'نسخهٔ نمایشی' "$ROOT/dashboard/src/App.tsx"; then
  echo "Expected demo-status disclosure is missing from the dashboard." >&2
  exit 1
fi

echo "✅ Web TypeScript/Vite build, PWA manifest and native web asset sync passed."
echo "ℹ️ Contract compilation/audit and Playwright E2E were not run: no configured test project/runner is present in this repository."
