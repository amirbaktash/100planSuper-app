mobile/ (React Native + Expo)
├── app.json   → bundleId: com.daricfund
├── eas.json   → build: preview (APK) | production (AAB + iOS ipa)
└── src/       → WebView-bridge به داشبورد + push (FCM/APNs) + biometric login

# Android APK/AAB:
eas build -p android --profile preview    # → APK تست
eas build -p android --profile production # → AAB فروشگاه
# iOS:
eas build -p ios --profile production     # → ipa (App Store Connect)
# Certificate pinning در React Native: react-native-ssl-pinning روی api.daric.fund

PWA (dashboard):
manifest.json  → name "صندوق داریک", display standalone, icons 192/512, theme #0f172a
sw.js          → precache shell + stale-while-revalidate برای API GET قیمت‌ها؛
                 POST/برداشت هرگز cache نمی‌شود (security)
