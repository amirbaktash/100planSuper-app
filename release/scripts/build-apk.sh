#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# ساخت فایل نصبی اندروید (APK) از پروژه Capacitor
# پیش‌نیاز: Android SDK + JDK 17 (Android Studio)
# خروجی: android/app/build/outputs/apk/debug/app-debug.apk
# ═══════════════════════════════════════════════════════════════
set -e
echo "🔹 ۱. build وب..."
(cd dashboard && npm install --silent && npm run build)

echo "🔹 ۲. sync دارایی‌های وب به پروژه اندروید..."
(cd dashboard && npx cap sync android)

echo "🔹 ۳. کامپایل APK با گرادل..."
cd dashboard/android
if [ -x ./gradlew ]; then GW=./gradlew; else GW=gradlew.bat; fi
$GW assembleDebug

APK="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK" ]; then
  cp "$APK" ../../release/daric-superapp-debug.apk 2>/dev/null || true
  echo "✅ فایل نصبی آماده: dashboard/android/$APK"
  ls -lh "$APK"
else
  echo "❌ APK ساخته نشد — Android SDK را بررسی کنید (local.properties)"
  exit 1
fi
