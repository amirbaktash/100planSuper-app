# راهنمای نصب و ساخت — اپلیکیشن 100plan (DARIC Token)

> **وضعیت فعلی: نمونهٔ نمایشی/توسعه‌ای (غیرتولیدی).** این بسته فایل APK یا IPA آمادهٔ نصب ارائه نمی‌کند؛ پروژه‌های Android و iOS برای ساخت روی دستگاه توسعه‌دهنده هستند. داشبورد از داده‌های نمونهٔ ثابت استفاده می‌کند و به سرویس‌های مالی یا قراردادهای مستقر وصل نیست. با آن پول واقعی جابه‌جا نکنید، اطلاعات هویتی وارد نکنید و ارقام آن را قیمت/NAV واقعی تلقی نکنید.
>
> نام اپلیکیشن در وب و buildهای native، `100plan` است. توکن داخلیِ نمایشی با نام `DARIC Token` و نماد `DARIC` مشخص می‌شود. نشان تاج، لوگوی اپلیکیشن است؛ نشان سکهٔ طلایی فقط برای توکن DARIC استفاده می‌شود.

## پیش از انتشار عمومی

| مورد | وضعیت قابل تأیید از این بسته |
|---|---|
| شبکهٔ هدف و Chain ID | در این بسته پیکربندی یا اعلام نشده است |
| آدرس قراردادهای مستقر | ارائه نشده؛ فایل‌های Solidity صرفاً سورس‌اند |
| ممیزی قراردادها | گزارش مستقل/خروجی ممیزی همراه بسته نیست؛ وجود اسکریپت یا ادعای ابزار ممیزی جای گزارش را نمی‌گیرد |
| حریم خصوصی و KYC | داشبورد نمایشی است؛ ارائه‌دهنده، محل نگه‌داری داده و پیوند سیاست حریم خصوصی در این بسته مشخص نشده‌اند |
| مجوز کل مخزن | تعیین نشده؛ SPDX موجود در فایل‌های قرارداد فقط به همان سورس قرارداد مربوط است و مجوز کل بسته را تعیین نمی‌کند |
| کشور/حوزهٔ قضایی | مشخص نشده؛ پیش از عرضهٔ خدمات مالی یا گردونه، نظر حقوقی محلی لازم است |
| دامنهٔ `daric.fund` | در متن‌های پروژه ذکر شده، اما این بسته مالکیت یا وضعیت عملیاتی دامنه را اثبات نمی‌کند |

**این موارد را حدس نزنید.** پیش از استفادهٔ عمومی باید مقادیر معتبر، لینک گزارش ممیزی، مجوز پروژه، سیاست حریم خصوصی، کشور هدف و تأیید مالکیت دامنه ارائه و بررسی شوند. محدودیت‌های `$500 / روز`، `$25,000`، وام `$1,000` و سه چرخش روزانه مقادیر بتای نمونه‌اند؛ تضمین نقدشوندگی، ذخایر یا سقف واقعی عملیاتی نیستند.

---

## ۱. پیش‌نیازها و نسخه‌های پروژه

| ابزار | مقدار/وضعیت پروژه |
|---|---|
| Node.js | نسخهٔ 22.12 یا بالاتر؛ Vite 8 به Node `^20.19.0` یا `>=22.12.0` نیاز دارد و Capacitor CLI نیز Node 22+ می‌خواهد |
| npm | همراه Node؛ برای نصب قابل‌تکرار از `npm ci` استفاده کنید |
| Frontend | Vite `8.3.6` و `@vitejs/plugin-react` `6.2.1` در lockfile فعلی |
| Capacitor | `8.6.0` (نسخهٔ فعلی package-lock و SPM) |
| Android | JDK 17، Gradle Wrapper `8.14.3`، Android Gradle Plugin `8.13.0`، Android SDK 36؛ حداقل SDK پروژه 24 |
| iOS | macOS و Xcode لازم است؛ هدف پروژه iOS 15 و Swift tools 5.9 است. حداقل نسخهٔ Xcode در CI این مخزن تأیید نشده است |
| ابزارهای تأیید | `sha256sum` یا `shasum`؛ برای Android، `apksigner` و `adb` از Android SDK |

نسخهٔ Android Studio یا Xcode را «تأییدشده در CI» فرض نکنید؛ این مخزن خروجی native را در CI نمی‌سازد. فایل‌های APK/IPA در این ZIP وجود ندارند.

## ۲. نسخهٔ وب / PWA

پوشهٔ `web/` خروجی build‌شدهٔ وب است.

### پیش‌نمایش روی همان رایانه

```bash
python3 -m http.server 8080 --directory web
```

سپس در همان دستگاه `http://localhost:8080` را باز کنید. `localhost` برای آزمایش محلی secure context محسوب می‌شود. اگر با گوشی از طریق `http://<IP-رایانه>:8080` وصل شوید، این فقط پیش‌نمایش HTTP است: Service Worker و نصب کامل PWA قابل اتکا/فعال نیستند.

### انتشار و نصب PWA

1. محتوای `web/` را روی هاست با **HTTPS** منتشر کنید.
2. روی Android با Chrome، منوی ⋮ → **Install app** را انتخاب کنید.
3. روی iPhone با Safari، Share → **Add to Home Screen** را بزنید.

برای تست روی گوشی در شبکهٔ محلی از HTTPS (برای مثال گواهی توسعهٔ مورد اعتماد با `mkcert`) یا یک هاست/تونل HTTPS استفاده کنید؛ HTTP روی IP شبکه را با نصب PWA اشتباه نگیرید.

`daric-web.zip` فقط فایل‌های وب را در بر دارد و ZIPهای دیگر را داخل خودش حمل نمی‌کند. اگر می‌خواهید پیوندهای دانلود و hash داخل صفحهٔ وب کار کنند، ZIPهای خروجی موردنظر و `SHA256SUMS.txt` را جداگانه کنار `index.html` در هاست قرار دهید؛ `daric-web.zip` طبیعتاً نمی‌تواند شامل نسخهٔ خودش باشد.

## ۳. اندروید — ساخت APK

پروژهٔ مستقل Android در `android/` است. برای ساخت از بستهٔ کامل، فرمان‌ها را از ریشهٔ پوشهٔ `DARIC-SuperApp/` اجرا کنید.

### ساخت سریع Debug

```bash
bash scripts/build-apk.sh
```

این اسکریپت ابتدا سورس `source/dashboard` را build و خروجی را در پروژهٔ وب، Android و iOS همگام می‌کند، سپس `assembleDebug` را اجرا می‌کند. پیش‌نیازها: Node.js 22.12+، JDK 17 و Android SDK 36.

خروجی:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

ساخت دستی در Android Studio: **Open** → پوشهٔ `android/` → صبر برای Gradle Sync → **Build → Build APK(s)**. یا در Linux/macOS:

```bash
cd android
./gradlew assembleDebug
```

### همگام‌سازی پس از تغییر وب

از ریشهٔ بسته اجرا کنید:

```bash
bash scripts/sync-web.sh
```

این فرمان وب را build می‌کند و خروجی را در `web/` و مسیرهای `android/app/src/main/assets/public/` و `ios/App/App/public/` جایگزین می‌کند. اسکریپت `build-apk.sh` و `build-ipa.sh` نیز همین sync را پیش از ساخت انجام می‌دهند. تغییر افزونه‌ها یا تنظیمات native با کپی وب اعمال نمی‌شود و باید در پروژهٔ اصلی Capacitor همگام‌سازی شود.

### ساخت APK انتشار و امضا

1. در Android SDK همراه `keytool` یک کلید بسازید. کلید را پشتیبان‌گیری کنید و هرگز در Git یا برای دیگران منتشر نکنید:

```bash
keytool -genkeypair -v -storetype JKS \
  -keystore daric-upload.jks -alias daric-upload \
  -keyalg RSA -keysize 4096 -validity 10000
```

2. در پوشهٔ `android/` فایل نمونه را کپی و فقط در رایانهٔ خود ویرایش کنید:

```bash
cp keystore.properties.example keystore.properties
```

مقدارهای `storeFile`، `storePassword`، `keyAlias` و `keyPassword` را تنظیم کنید. `keystore.properties` و فایل کلید به‌طور عمدی در `.gitignore` هستند؛ آن‌ها را commit نکنید.

3. در Linux/macOS اجرا کنید:

```bash
bash scripts/build-apk.sh release
```

بدون keystore خروجی Release امضانشده است و برای توزیع نصب‌شدنی نیست. با Android Studio می‌توانید از **Build → Generate Signed Bundle / APK** هم استفاده کنید. امضای release باید با همان کلیدِ پشتیبان‌گیری‌شده برای به‌روزرسانی‌های آینده حفظ شود.

## ۴. iOS — ساخت IPA

ساخت IPA به macOS و Xcode نیاز دارد. مسیر مرجع این بسته فقط این پروژه است:

```bash
cd ios/App
open App.xcodeproj
```

مسیر `CapApp-SPM/App.xcworkspace` وجود ندارد؛ پوشهٔ `CapApp-SPM/` فایل `Package.swift` برای وابستگی‌های Swift Package Manager دارد.

در Xcode:

1. Target برنامه را انتخاب کنید؛ در **Signing & Capabilities** تیم و شناسهٔ Bundle معتبر را تنظیم کنید.
2. دستگاه **Any iOS Device (arm64)** را انتخاب کنید.
3. **Product → Archive** را اجرا کنید.
4. در Organizer گزینهٔ توزیع متناسب با کاربرد (Development، Ad Hoc یا App Store) را انتخاب و IPA را export کنید. برای نصب/توزیع، provisioning و نوع حساب Apple متناسب با همان روش لازم است.

اسکریپت زیر وب را sync و پروژهٔ صحیح را در Xcode باز می‌کند؛ **خودکار IPA صادر نمی‌کند**:

```bash
bash scripts/build-ipa.sh
```

راه PWA بدون Mac، جایگزین بخش نصب وب است و مراحل ساخت IPA نیست: میزبانی HTTPS و سپس Safari → Share → Add to Home Screen.

## ۵. ساخت داشبورد از سورس

در بستهٔ کامل، سورس React/Vite در `source/dashboard/` و منطق مشترک در `source/packages/shared/` است:

```bash
cd source/dashboard
npm ci
npm audit --audit-level=moderate
npm run build
```

برای build و sync هم‌زمان وب و پروژه‌های native، از ریشهٔ بسته `bash scripts/sync-web.sh` را اجرا کنید. اعداد و تعامل‌های داشبورد فعلی نمونه‌اند و build موفق به معنای اتصال سرویس‌ها یا آماده‌بودن عملیات مالی نیست.

## ۶. بررسی خروجی‌ها

### وب

```bash
python3 -m json.tool web/manifest.webmanifest >/dev/null
# Run from the directory where daric-web.zip was downloaded:
sha256sum daric-web.zip 2>/dev/null || shasum -a 256 daric-web.zip
```

هنگام تست روی هاست، DevTools → Application را بررسی کنید: manifest و Service Worker باید از HTTPS بارگیری شوند. این Service Worker فقط shell و منابع ایستای نسخه‌دار را cache می‌کند؛ درخواست‌های API/auth/کاربر را نباید به فهرست cache اضافه کرد.

### APK

```bash
APK=android/app/build/outputs/apk/debug/app-debug.apk
sha256sum "$APK" 2>/dev/null || shasum -a 256 "$APK"
APKSIGNER="$(find "$ANDROID_HOME/build-tools" -type f -name apksigner | sort | tail -n 1)"
test -x "$APKSIGNER" || { echo "Install Android SDK Build Tools first"; exit 1; }
"$APKSIGNER" verify --verbose --print-certs "$APK"
adb install -r "$APK"
```

برای Release همین بررسی را روی فایل Release امضاشده انجام دهید. `apksigner` را از مسیر Build Tools نصب‌شدهٔ SDK اجرا کنید.

### IPA

پس از Export در Xcode:

```bash
shasum -a 256 App.ipa
unzip -t App.ipa
```

سپس IPA را روی یک دستگاه آزمایشی مطابق روش provisioning انتخاب‌شده نصب کنید. محاسبهٔ hash به‌تنهایی معتبر بودن امضا یا امنیت برنامه را ثابت نمی‌کند.

### بررسی خودکار مخزن

فرمان متناسب با محل استخراج را اجرا کنید:

```bash
# از ریشهٔ مخزن Git یا ریشهٔ daric-source.zip:
bash scripts/verify-all.sh
```

```bash
# از ریشهٔ بستهٔ کامل DARIC-SuperApp:
cd source && bash scripts/verify-all.sh
```

این فرمان build وب و وجود فایل‌های خروجی PWA را بررسی می‌کند. در وضعیت فعلی، Playwright به‌عنوان وابستگی/config اجرا تعریف نشده و تست `e2e/cross-module-flow.spec.ts` را نباید تست CI موفق‌شده تلقی کرد. قراردادها نیز گزارش تست/ممیزی همراه این بسته ندارند.

## ۷. امنیت و محدودیت‌های نسخهٔ فعلی

- این نسخه داشبورد نمایشی است؛ هیچ عملیات واقعی و هیچ پردازش واقعی KYC/برداشت/وام از UI فعلی انجام نمی‌شود.
- `AndroidManifest.xml` فعلی `allowBackup=false` دارد. اگر بعداً دادهٔ محلی/خصوصی اضافه شد، قواعد Android Data Extraction و رفتار backup روی نسخه‌های هدف را دوباره بررسی کنید.
- تنظیم Capacitor فعلی Mixed Content و WebView debugging را خاموش کرده و `MainActivity` پل JavaScript سفارشی اضافه نمی‌کند. SSL pinning برای APIهای HTTPS نیازمند تعیین endpoint و مدل شبکه است؛ در این بسته API عملیاتی تعریف نشده و نباید ادعای pinning شود.
- پیش از اتصال API، هیچ پاسخ دارای اطلاعات شخصی/اعتبارنامه را به Cache Storage، Service Worker یا log اضافه نکنید. برای تغییر سیاست cache، نسخهٔ `CACHE_NAME` در `dashboard/public/sw.js` را افزایش دهید؛ activation cacheهای قبلی با پیشوند `daric-static-` و cache قدیمی `daric-v1` را پاک می‌کند. برای پاک‌سازی دستی: DevTools → Application → Storage → **Clear site data**.
- گردونه و ویژگی‌های مالی نیازمند بررسی انطباق، مجوزها، شرایط استفاده و محدودیت جغرافیایی متناسب با کشور عرضه‌اند. این راهنما مشاورهٔ حقوقی نیست.

## ۸. عیب‌یابی سریع

| نشانه | بررسی |
|---|---|
| Gradle Sync یا ساخت APK شکست می‌خورد | `java -version` را بررسی کنید (JDK 17)، Android SDK 36 را نصب کنید و بار اول Gradle را با اینترنت اجرا کنید |
| Release به‌صورت unsigned ساخته می‌شود | وجود `android/keystore.properties`، چهار مقدار کامل و مسیر درست `storeFile` را بررسی کنید؛ فایل کلید را وارد Git نکنید |
| PWA روی IP محلی نصب نمی‌شود | طبیعی است اگر آدرس HTTP باشد؛ HTTPS واقعی/توسعه‌ای مورد اعتماد استفاده کنید یا فقط روی همان دستگاه از localhost آزمایش کنید |
| تغییر وب در APK/iOS دیده نمی‌شود | از ریشه بسته `bash scripts/sync-web.sh`، سپس build native را دوباره اجرا کنید |
| نسخهٔ قدیمی پس از انتشار دیده می‌شود | cache را از DevTools پاک کنید، Service Worker را unregister کنید و در صورت تغییر سیاست cache نسخهٔ `CACHE_NAME` را افزایش دهید |
| Xcode خطای دریافت وابستگی SPM می‌دهد | از macOS و Xcode سازگار با Swift tools 5.9 استفاده و در Xcode بخش Package Dependencies را resolve کنید؛ نسخهٔ حداقل Xcode در CI این مخزن تأیید نشده است |

## ۹. ساختار بستهٔ کامل

```text
DARIC-SuperApp/
├── README-INSTALL.md
├── RELEASE-NOTES.md
├── web/                   # خروجی وب build‌شده
├── android/               # پروژهٔ Gradle مستقل
├── ios/                   # پروژهٔ Xcode مستقل
├── scripts/               # sync-web.sh / build-apk.sh / build-ipa.sh
└── source/                # قراردادها، پکیج‌ها، سرویس‌ها، داشبورد و فایل‌های اصلی
```

**داریک — پروتوتایپ توسعه‌ای · نسخهٔ نمایشی 1.0.0-beta**
