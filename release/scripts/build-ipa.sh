#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# ساخت فایل نصبی iOS (IPA) — فقط روی مک با Xcode
# خروجی: App.ipa از طریق Product → Archive → Distribute
# ═══════════════════════════════════════════════════════════════
set -e
if [ "$(uname)" != "Darwin" ]; then
  echo "⚠️ ساخت IPA نیاز به مک + Xcode دارد."
  echo "   جایگزین فوری: نسخه وب (پوشه web/) را روی سرور HTTPS بگذارید"
  echo "   و در Safari گوشی: Share → Add to Home Screen"
  exit 1
fi

echo "🔹 ۱. build وب..."
(cd dashboard && npm install --silent && npm run build)

echo "🔹 ۲. sync به پروژه iOS..."
(cd dashboard && npx cap sync ios)

echo "🔹 ۳. باز کردن Xcode..."
cd dashboard/ios/App
if [ -f App.xcodeproj/project.pbxproj ]; then
  open App.xcodeproj
else
  open CapApp-SPM 2>/dev/null || open .
fi

echo "✅ در Xcode:"
echo "   1) Signing & Capabilities → انتخاب Team"
echo "   2) Product → Archive"
echo "   3) Distribute App → Development/Ad Hoc → Export IPA"
