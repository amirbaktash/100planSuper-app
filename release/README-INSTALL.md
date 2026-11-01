# 📦 راهنمای نصب و ساخت — سوپر‌اپ داریک (DARIC Super App)

> این بسته شامل **نسخه وب (PWA)**، **پروژه اندروید (آماده خروجی APK)**،
> **پروژه iOS (آماده خروجی IPA)** و **کد کامل منبع** است.

---

## ۱. 🌐 نسخه وب — نصب‌شدنی (همین حالا)

پوشه `web/` یک **PWA کامل** است (قابل نصب روی موبایل و دسکتاپ):

### راه‌اندازی سریع
```bash
# با هر سرور استاتیکی:
npx serve web
# یا
python3 -m http.server 8080 --directory web
```
سپس `http://localhost:8080` را باز کنید.

### نصب به‌عنوان اپلیکیشن
| پلتفرم | مراحل |
|---|---|
| **اندروید (Chrome)** | منوی ⋮ → **Install app** / «نصب برنامه» |
| **آیفون (Safari)** | دکمه Share → **Add to Home Screen** → افزودن به صفحه اصلی |
| **ویندوز/مک (Chrome/Edge)** | آیکون نصب در نوار آدرس |

> ⚙️ برای انتشار عمومی: محتوای `web/` را روی هاست HTTPS (Netlify/Vercel/S3/nginx) بریزید.
> `service-worker` و `manifest` از قبل پیکربندی شده‌اند.

---

## ۲. 🤖 اندروید — ساخت فایل نصبی APK

پوشه `android/` یک پروژه **Android Studio / Gradle کامل** با WebView همان PWA است
(assets وب از قبل داخل پروژه کپی شده — `android/app/src/main/assets/public/`).

### پیش‌نیازها
- **Android Studio** (یا Android SDK + JDK 17)
- یک‌بار: باز کردن Android Studio و دانلود SDK

### روش A — Android Studio (آسان)
1. Android Studio → **Open** → پوشه `android`
2. صبر تا Sync گرادل تمام شود
3. منوی **Build → Build App Bundle(s) / APK(s) → Build APK(s)**
4. خروجی:
   `android/app/build/outputs/apk/debug/app-debug.apk`
   ✅ همین فایل را روی گوشی نصب کنید

### روش B — خط فرمان
```bash
cd android
# لینوکس/مک:
./gradlew assembleDebug
# ویندوز:
gradlew.bat assembleDebug
```
خروجی: `app/build/outputs/apk/debug/app-debug.apk`

### ساخت نسخه انتشار (امضاشده)
```bash
./gradlew assembleRelease
# + تنظیم keystore در android/app/build.gradle (بخش signingConfigs)
```
یا از منوی Android Studio: **Build → Generate Signed Bundle / APK**

### یک‌دستوری (از ریشه بسته)
```bash
bash scripts/build-apk.sh
```

---

## ۳. 🍎 iOS — ساخت فایل نصبی IPA

پوشه `ios/` یک پروژه **Xcode کامل** (Swift Package Manager — بدون CocoaPods) است.

### پیش‌نیازها
- **مک** با macOS + **Xcode 15+** (از App Store)
- حساب اپل برای امضا (Apple ID رایگان برای نصب روی دستگاه خودتان)

### مراحل
```bash
cd ios/App
open App.xcodeproj        # یا CapApp-SPM/App.xcworkspace
```
1. در Xcode: پروژه → **Signing & Capabilities** → انتخاب تیم (Team)
2. انتخاب دستگاه: **Any iOS Device**
3. منوی **Product → Archive**
4. در Organizer: **Distribute App → Ad Hoc / Development** → **Export IPA**
   خروجی: `App.ipa`

### نصب روی گوشی بدون اپ‌استور
- IPA را با **AltStore** یا **Xcode → Window → Devices** نصب کنید
- یا نسخه وب (بخش ۱) را در Safari باز کرده و **Add to Home Screen** بزنید ← بدون نیاز به Mac!

### یک‌دستوری (فقط مک)
```bash
bash scripts/build-ipa.sh
```

---

## ۴. 📱 نصب فوری روی موبایل (بدون کامپایل)

سریع‌ترین راه — نسخه وب را روی سرور HTTPS بگذارید و لینک را در موبایل باز کنید:

```bash
# مثال: اجرا روی شبکه محلی
cd web && python3 -m http.server 8080
# سپس در گوشی: http://<IP-کامپیوتر>:8080
```
- **اندروید:** Chrome → منوی ⋮ → Install app
- **آیفون:** Safari → Share → Add to Home Screen

---

## ۵. 🗂️ محتوای بسته

```
DARIC-SuperApp/
├── README-INSTALL.md      ← همین فایل
├── web/                   ← نسخه وب PWA آماده انتشار (build شده)
├── android/               ← پروژه اندروید (Gradle + WebView + assets وب)
├── ios/                   ← پروژه iOS (Xcode + SPM + assets وب)
├── source/                ← کد کامل منبع
│   ├── contracts/         ← ۴ قرارداد سالیدیتی داریک
│   ├── packages/          ← shared/eventbus/database (منطق کسب‌وکار)
│   ├── services/          ← ۱۳ میکروسرویس
│   ├── dashboard/         ← سورس داشبورد (React + Vite + فارسی RTL)
│   ├── deployment/        ← docker-compose + monitoring
│   ├── security/          ← bug bounty + beta-config
│   ├── e2e/ + scripts/    ← تست و اسکریپت‌ها
│   └── code-*.*           ← فایل‌های کد منبع اصلی (آرشیو)
└── scripts/               ← build-apk.sh / build-ipa.sh
```

## ۶. 🔐 نکات امنیتی بتا

- سقف برداشت: **۵۰۰$ / روز / کاربر** · جهانی: ۲۵,۰۰۰$
- سقف وام: **۱,۰۰۰$** · گردونه: **۳ چرخش / روز**
- برداشت: KYC سطح ۲ + 2FA + Timelock 48 ساعته
- Rollback اضطراری: `BETA_PAUSED=true`

---

**داریک** — دارایی واقعی، شفافیت روی‌چین · daric.fund · v1.0.0-beta
