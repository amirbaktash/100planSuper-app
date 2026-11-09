// صفحه دانلود — بسته‌های کد و پروژهٔ نمایشی داریک
const FILES = [
  {
    href: "./DARIC-SuperApp-Full.zip",
    name: "DARIC-SuperApp-Full.zip",
    size: "۳۲.۷ MB",
    icon: "📦",
    title: "بستهٔ کامل",
    desc: "خروجی وب + پروژه‌های Android و iOS + کد منبع و راهنمای نصب؛ APK/IPA امضاشده داخل بسته نیست.",
    hot: true,
  },
  {
    href: "./daric-web.zip",
    name: "daric-web.zip",
    size: "۵.۹۶ MB",
    icon: "🌐",
    title: "خروجی وب / PWA",
    desc: "نسخهٔ نمایشی build‌شده؛ برای نصب PWA روی هاست HTTPS منتشر شود.",
  },
  {
    href: "./daric-android.zip",
    name: "daric-android.zip",
    size: "۷.۰۴ MB",
    icon: "🤖",
    title: "پروژهٔ Android",
    desc: "سورس پروژهٔ Gradle؛ برای ساخت APK به JDK و Android SDK نیاز است. فایل APK آماده نیست.",
  },
  {
    href: "./daric-ios.zip",
    name: "daric-ios.zip",
    size: "۸.۴۰ MB",
    icon: "🍎",
    title: "پروژهٔ iOS",
    desc: "سورس پروژهٔ Xcode/SPM؛ ساخت IPA به macOS، Xcode و signing نیاز دارد.",
  },
  {
    href: "./daric-source.zip",
    name: "daric-source.zip",
    size: "۱۴.۸ MB",
    icon: "💻",
    title: "کد منبع",
    desc: "سورس رابط و سرویس‌ها، قراردادها، اسناد و فایل‌های اولیه؛ کد منبع به‌معنی استقرار یا ممیزی‌شدن نیست.",
  },
];

export function DownloadPage() {
  return (
    <div>
      <div className="page-title">⬇️ دانلود بسته‌های داریک</div>
      <div className="page-sub">
        این فایل‌ها سورس یا build نمایشی‌اند؛ APK و IPA امضاشده ارائه نمی‌شود.
      </div>

      <div className="alert warn">
        نسخهٔ فعلی پروتوتایپ است: داده‌ها ساختگی‌اند و به API مالی یا قرارداد مستقر وصل نیستند.
        با آن پول یا اطلاعات هویتی واقعی جابه‌جا نکنید.
      </div>

      <div className="alert info">
        راهنمای کامل نصب، HTTPS، sync و امضای Android در فایل <b>README-INSTALL.md</b> داخل بستهٔ کامل است.
        <br />
        <a href="./SHA256SUMS.txt" style={{ color: "var(--gold)" }}>مشاهدهٔ فهرست SHA-256 بسته‌های ZIP</a>
      </div>

      <div className="grid g-2">
        {FILES.map((f) => (
          <a
            key={f.name}
            href={f.href}
            download={f.name}
            className="card"
            style={{
              display: "block",
              borderColor: f.hot ? "rgba(240,180,41,.55)" : "var(--line)",
              background: f.hot ? "linear-gradient(180deg, rgba(240,180,41,.1), var(--panel))" : undefined,
              transition: "transform .12s, border .12s",
            }}
          >
            <div className="between mb">
              <div className="row">
                <span style={{ fontSize: 30 }}>{f.icon}</span>
                <div>
                  <b>{f.title}</b>
                  <div className="muted ltr" style={{ fontSize: 11 }}>{f.name}</div>
                </div>
              </div>
              <span className={`badge ${f.hot ? "gold" : "gray"}`}>{f.size}</span>
            </div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>{f.desc}</p>
            <span className={`btn ${f.hot ? "gold" : ""}`} style={{ width: "100%" }}>
              ⬇️ دانلود {f.name}
            </span>
          </a>
        ))}
      </div>

      <div className="card mt">
        <h3>🚀 راهنمای سریع</h3>
        <div className="grid g-3">
          <div className="scen">
            <h4>🌐 وب / PWA</h4>
            <div className="muted" style={{ fontSize: 12, lineHeight: 2 }}>
              ۱. web ZIP را استخراج کنید<br />
              ۲. برای نصب PWA روی HTTPS میزبانی کنید<br />
              ۳. HTTP روی IP محلی فقط پیش‌نمایش است
            </div>
          </div>
          <div className="scen">
            <h4>🤖 Android</h4>
            <div className="muted" style={{ fontSize: 12, lineHeight: 2 }}>
              ۱. پروژهٔ <span className="kbd">android</span> را در Android Studio باز کنید<br />
              ۲. برای Debug از Build APK(s) استفاده کنید<br />
              ۳. Release نیازمند keystore و امضاست
            </div>
          </div>
          <div className="scen">
            <h4>🍎 iOS</h4>
            <div className="muted" style={{ fontSize: 12, lineHeight: 2 }}>
              ۱. نیاز به Mac + Xcode<br />
              ۲. پروژهٔ مرجع <span className="kbd">ios/App/App.xcodeproj</span> را باز کنید<br />
              ۳. Archive → Distribute → Export IPA
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
