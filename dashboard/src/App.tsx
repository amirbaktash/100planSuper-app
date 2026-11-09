// ═══════════════════════════════════════════════════════════════
// 100plan Super App — روتر + لیوت (سایدبار منوی اصلی + ادمین)
// منوی اصلی از مشخصات: داشبورد | سرمایه‌گذاری | استارتاپ | آرشا گیم |
// تکاوُ لیزرتگ | کیف پول | شبکه | وام‌ها | تنظیمات
// ═══════════════════════════════════════════════════════════════
import { useApp, go, ME, BETA_CONFIG } from "./lib/store";
import {
  Dashboard, Capital, Startups, ArshaGames, LaserTag, Wallet, Club, Loans,
  Settings, NavPage, VerifyPage, Exchange, P2P, GoldSilver, Chat,
  Tourism, Insurance, AdminReports, AdminKYC, AdminAccounting, AdminRBAC,
  AdminAudit, NotFound,
} from "./pages";
import { DownloadPage } from "./download";

const MAIN_NAV = [
  { section: "منوی اصلی" },
  { href: "/", label: "داشبورد", icon: "🏠" },
  { href: "/capital", label: "سرمایه‌گذاری", icon: "💼" },
  { href: "/startups", label: "استارتاپ‌هاب", icon: "🚀" },
  { href: "/games", label: "آرشا گیم", icon: "🎮" },
  { href: "/laser", label: "تکاوُ لیزرتگ", icon: "🔫" },
  { section: "مالی" },
  { href: "/wallet", label: "کیف پول", icon: "💳" },
  { href: "/exchange", label: "صرافی", icon: "💱" },
  { href: "/p2p", label: "P2P داریک و سهام", icon: "🤝" },
  { href: "/gold", label: "طلا و نقره", icon: "🥇" },
  { href: "/loans", label: "وام‌ها", icon: "🏦" },
  { href: "/nav", label: "NAV داریک", icon: "📊" },
  { section: "شبکه و ارتباط" },
  { href: "/club", label: "شبکه (باشگاه)", icon: "🤝" },
  { href: "/tourism", label: "گردشگری", icon: "✈️" },
  { href: "/insurance", label: "بیمه", icon: "🛡️" },
  { href: "/chat", label: "چت پشتیبانی", icon: "💬" },
  { href: "/settings", label: "تنظیمات", icon: "⚙️" },
  { section: "دانلود" },
  { href: "/download", label: "دانلود بسته‌ها", icon: "⬇️" },
];

const ADMIN_NAV = [
  { section: "پنل ادمین" },
  { href: "/admin/reports", label: "آپلود گزارش NAV", icon: "📤" },
  { href: "/admin/kyc", label: "صف KYC", icon: "🪪" },
  { href: "/admin/accounting", label: "دفتر حسابداری", icon: "📒" },
  { href: "/admin/rbac", label: "دسترسی‌ها (RBAC)", icon: "🔐" },
  { href: "/admin/audit", label: "Audit Log", icon: "📝" },
];

const ROUTES: Record<string, React.ComponentType<any>> = {
  "/": Dashboard,
  "/capital": Capital,
  "/startups": Startups,
  "/games": ArshaGames,
  "/laser": LaserTag,
  "/wallet": Wallet,
  "/exchange": Exchange,
  "/p2p": P2P,
  "/gold": GoldSilver,
  "/loans": Loans,
  "/nav": NavPage,
  "/club": Club,
  "/tourism": Tourism,
  "/insurance": Insurance,
  "/chat": Chat,
  "/settings": Settings,
  "/download": DownloadPage,
  "/admin/reports": AdminReports,
  "/admin/kyc": AdminKYC,
  "/admin/accounting": AdminAccounting,
  "/admin/rbac": AdminRBAC,
  "/admin/audit": AdminAudit,
};

function NavList({ items, route }: { items: typeof MAIN_NAV; route: string }) {
  return (
    <nav className="nav">
      {items.map((it: any, i) =>
        it.section ? (
          <div key={i} className="nav-section">{it.section}</div>
        ) : (
          <a key={it.href} href={`#${it.href}`} className={route === it.href ? "active" : ""}>
            <span className="ico">{it.icon}</span>
            {it.label}
          </a>
        )
      )}
    </nav>
  );
}

export default function App() {
  const route = useApp((s) => s.route);
  const toast = useApp((s) => s.toast);
  const Page = ROUTES[route];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <img src="/icons/icon-512.png" alt="لوگوی 100plan" />
          <h1 dir="ltr">100<span>plan</span><small dir="rtl">سوپر‌اپ مالی · DARIC TOKEN</small></h1>
        </div>
        <NavList items={MAIN_NAV} route={route} />
        <NavList items={ADMIN_NAV} route={route} />
        <div style={{ padding: "14px 16px 20px" }}>
          <div className="alert warn" style={{ marginBottom: 8, fontSize: 11.5 }}>
            <b>فاز بتا — {BETA_CONFIG.invite_codes} دعوت‌نامه</b><br />
            سقف برداشت: ${BETA_CONFIG.limits.withdraw_user_daily_usd}/روز<br />
            سقف وام: ${BETA_CONFIG.limits.loan_max_usd} · گردونه: {BETA_CONFIG.limits.wheel_daily_spins} چرخش/روز
          </div>
          <div className="muted" style={{ fontSize: 10.5, direction: "ltr", textAlign: "center" }}>
            پروتوتایپ · v1.0.0-beta
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="row">
            <img src="/icons/icon-192.png" className="logo-mini" alt="" />
            <b style={{ fontSize: 14 }} dir="ltr">100plan</b>
            <span className="chip" style={{ color: "var(--gold)" }}>● نسخهٔ نمایشی</span>
            <span className="muted" dir="ltr">DEMO · DARIC/USDT 1.84 +2.4%</span>
          </div>
          <div className="userchip">
            <span className="badge gold">🥈 {ME.clubTier}</span>
            <span className="badge green">نمونهٔ KYC L{ME.kycLevel}</span>
            <div className="avatar">ع</div>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{ME.name}</div>
              <div className="muted" style={{ fontSize: 10.5 }}>{ME.phone}</div>
            </div>
          </div>
        </header>

        <main className="content">
          <div className="alert warn" role="status" style={{ marginBottom: 14 }}>
            <b>نسخهٔ نمایشی — برای پول واقعی یا اطلاعات هویتی استفاده نکنید.</b> موجودی، قیمت، NAV و KYC نمونه‌اند؛ داشبورد به سرویس مالی یا قرارداد مستقر متصل نیست.
          </div>
          {Page ? <Page /> : <NotFound />}
        </main>
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: "50%", transform: "translateX(50%)",
          background: "var(--gold)", color: "#14100a", padding: "11px 22px",
          borderRadius: 12, fontWeight: 800, zIndex: 99, boxShadow: "0 8px 30px rgba(240,180,41,.4)",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
