// ═══════════════════════════════════════════════════════════════
// صفحه دانلود — بسته‌های نصبی سوپر‌اپ داریک
// ═══════════════════════════════════════════════════════════════
const FILES = [
  {
    href: "./DARIC-SuperApp-Full.zip",
    name: "DARIC-SuperApp-Full.zip",
    size: "۳۲ MB",
    icon: "📦",
    title: "بسته کامل (پیشنهادی)",
    desc: "نسخه وب + پروژه اندروید + پروژه iOS + کد کامل منبع + راهنمای فارسی — ۵۵۳ فایل",
    hot: true,
  },
  {
    href: "./daric-web.zip",
    name: "daric-web.zip",
    size: "۵.۷ MB",
    icon: "🌐",
    title: "نسخه وب (PWA)",
    desc: "خروجی build شده آماده انتشار روی هاست + قابل نصب روی اندروید/iOS",
  },
  {
    href: "./daric-android.zip",
    name: "daric-android.zip",
    size: "۶.۸ MB",
    icon: "🤖",
    title: "پروژه اندروید",
    desc: "پروژه Gradle کامل با آیکون داریک — با Android Studio: Build APK(s)",
  },
  {
    href: "./daric-ios.zip",
    name: "daric-ios.zip",
    size: "۸.۱ MB",
    icon: "🍎",
    title: "پروژه iOS",
    desc: "پروژه Xcode (SPM) — با Xcode: Archive → Export IPA",
  },
  {
    href: "./daric-source.zip",
    name: "daric-source.zip",
    size: "۱۱ MB",
    icon: "💻",
    title: "کد منبع",
    desc: "قراردادها، ۱۳ سرویس، پکیج مشترک، سورس داشبورد و فایل‌های code-* اصلی",
  },
];

export function DownloadPage() {
  return (
    <div>
      <div className="page-title">⬇️ دانلود بسته‌های سوپر‌اپ داریک</div>
      <div className="page-sub">
        همه فایل‌ها از طریق همین سرور پیش‌نمایش سرو می‌شوند — روی دکمه بزنید تا دانلود شود.
      </div>

      <div className="alert info">
        📌 پس از دانلود، راهنمای فارسی نصب داخل هر بسته است: <b>README-INSTALL.md</b>
        — شامل ساخت APK (یک کلیک در Android Studio) و IPA (Xcode روی مک) و نصب PWA.
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
        <h3>🚀 راهنمای سریع پس از دانلود</h3>
        <div className="grid g-3">
          <div className="scen">
            <h4>🌐 وب</h4>
            <div className="muted" style={{ fontSize: 12, lineHeight: 2 }}>
              ۱. از zip خارج کنید<br />
              ۲. پوشه <span className="kbd">web</span> را روی هاست بگذارید<br />
              ۳. یا <span className="kbd">npx serve web</span>
            </div>
          </div>
          <div className="scen">
            <h4>🤖 اندروید (APK)</h4>
            <div className="muted" style={{ fontSize: 12, lineHeight: 2 }}>
              ۱. پوشه <span className="kbd">android</span> را در Android Studio باز کنید<br />
              ۲. Build → Build APK(s)<br />
              ۳. خروجی: <span className="kbd">app-debug.apk</span>
            </div>
          </div>
          <div className="scen">
            <h4>🍎 iOS (IPA)</h4>
            <div className="muted" style={{ fontSize: 12, lineHeight: 2 }}>
              ۱. نیاز به مک + Xcode<br />
              ۲. پوشه <span className="kbd">ios</span> را باز کنید<br />
              ۳. Archive → Distribute → Export IPA
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
