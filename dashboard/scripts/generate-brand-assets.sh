#!/usr/bin/env bash
# Generate web/PWA and native app branding from the checked-in source logos.
set -euo pipefail

DASHBOARD_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
APP_LOGO="$DASHBOARD_ROOT/branding/100plan-app-source.png"
TOKEN_LOGO="$DASHBOARD_ROOT/branding/daric-token-source.png"
PUBLIC="$DASHBOARD_ROOT/public"
ANDROID="$DASHBOARD_ROOT/android/app/src/main/res"
IOS="$DASHBOARD_ROOT/ios/App/App/Assets.xcassets"

command -v convert >/dev/null || { echo "ImageMagick's convert command is required." >&2; exit 1; }
[[ -f "$APP_LOGO" && -f "$TOKEN_LOGO" ]] || { echo "Brand source PNGs are missing from dashboard/branding/." >&2; exit 1; }

mkdir -p "$PUBLIC/icons" "$ANDROID" "$IOS/AppIcon.appiconset" "$IOS/Splash.imageset"

# Web/PWA app identity: keep the crown artwork for the application icon.
convert "$APP_LOGO" -strip -resize 512x512 -define png:compression-level=9 "$PUBLIC/icons/icon-512.png"
convert "$APP_LOGO" -strip -resize 192x192 -define png:compression-level=9 "$PUBLIC/icons/icon-192.png"
convert "$APP_LOGO" -strip -resize 180x180 -define png:compression-level=9 "$PUBLIC/icons/apple-touch-icon.png"
# Maskable variants need generous safe-area padding so launchers do not clip the gold frame.
convert -size 512x512 xc:'#000000' \
  \( "$APP_LOGO" -strip -resize 350x350 \) -gravity center -composite \
  -define png:compression-level=9 "$PUBLIC/icons/icon-maskable.png"

# Token identity: remove only the connected near-white canvas around the supplied coin.
# This keeps the metallic highlights inside the coin and lets it sit cleanly on the app's dark UI.
convert "$TOKEN_LOGO" -alpha on -fuzz 3% -fill none -draw 'color 0,0 floodfill' \
  -strip -resize 512x512 -define png:compression-level=9 "$PUBLIC/daric-token-512.png"

# Android legacy launcher densities.
for spec in 'mdpi 48' 'hdpi 72' 'xhdpi 96' 'xxhdpi 144' 'xxxhdpi 192'; do
  read -r density size <<<"$spec"
  dir="$ANDROID/mipmap-$density"
  mkdir -p "$dir"
  convert "$APP_LOGO" -strip -resize "${size}x${size}" -define png:compression-level=9 "$dir/ic_launcher.png"
  cp "$dir/ic_launcher.png" "$dir/ic_launcher_round.png"
done

# Android adaptive-icon foregrounds: centered inside the launcher safe area.
for spec in 'mdpi 108 76' 'hdpi 162 114' 'xhdpi 216 152' 'xxhdpi 324 228' 'xxxhdpi 432 302'; do
  read -r density canvas artwork <<<"$spec"
  dir="$ANDROID/mipmap-$density"
  convert -size "${canvas}x${canvas}" xc:none \
    \( "$APP_LOGO" -strip -resize "${artwork}x${artwork}" \) -gravity center -composite \
    -define png:compression-level=9 "$dir/ic_launcher_foreground.png"
done
convert -size 108x108 xc:none \
  \( "$APP_LOGO" -strip -resize 76x76 \) -gravity center -composite \
  -define png:compression-level=9 "$ANDROID/drawable-v24/ic_launcher_foreground.png"

# iOS app icon (1024x1024 universal asset catalog entry).
convert "$APP_LOGO" -strip -resize 1024x1024 -define png:compression-level=9 \
  "$IOS/AppIcon.appiconset/AppIcon-512@2x.png"

# Use a black launch-screen canvas to blend with the source icon’s black outer corners.
convert -size 640x640 xc:'#000000' \
  \( "$APP_LOGO" -strip -resize 400x400 \) -gravity center -composite \
  -define png:compression-level=9 "$ANDROID/drawable/splash.png"
for orientation in land port; do
  if [[ "$orientation" == land ]]; then width=480; height=320; else width=320; height=480; fi
  for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    dir="$ANDROID/drawable-${orientation}-${density}"
    mkdir -p "$dir"
    convert -size "${width}x${height}" xc:'#000000' \
      \( "$APP_LOGO" -strip -resize 190x190 \) -gravity center -composite \
      -define png:compression-level=9 "$dir/splash.png"
  done
done
for splash in "$IOS/Splash.imageset/splash-2732x2732.png" \
              "$IOS/Splash.imageset/splash-2732x2732-1.png" \
              "$IOS/Splash.imageset/splash-2732x2732-2.png"; do
  convert -size 2732x2732 xc:'#000000' \
    \( "$APP_LOGO" -strip -resize 920x920 \) -gravity center -composite \
    -colors 256 -dither FloydSteinberg -define png:compression-level=9 "$splash"
done

# Match the adaptive-icon canvas to the artwork's near-black outer background.
cat > "$ANDROID/values/ic_launcher_background.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#000000</color>
</resources>
XML
cat > "$ANDROID/drawable/ic_launcher_background.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#000000" />
</shape>
XML

printf 'Generated 100plan app icons/splash and DARIC token logo assets.\n'
