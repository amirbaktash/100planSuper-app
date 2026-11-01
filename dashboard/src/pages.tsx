// ═══════════════════════════════════════════════════════════════
// صفحات سوپر‌اپ داریک — همه ماژول‌های مشخصات
// ═══════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from "react";
import {
  useApp, getState, setState, toast, go, ME, PRICES, ASSET_REPORT, NAV_HISTORY,
  WALLET, TXS, COMMISSIONS, MLM_TREE, TOURS, INSURANCE, CAPITAL_SECTIONS,
  STARTUPS, VENUES, KYC_QUEUE, AUDIT_LOG, placeOrder, cancelOrder,
  runNAV, payInstallmentAction, EXCHANGE_FEE, BETA_CONFIG,
} from "./lib/store";
import {
  investmentPL, metalPL, simulate, computeCollateralSlices, buildSchedule,
  resolvePct, TIERS, tierInfo, pickSegment, DEFAULT_SEGMENTS, SPIN_COST,
  verifySpin, trialBalance, COA, computeNAV,
} from "@daric/shared";
import { fmt, usd } from "./lib/fmt";

export { fmt, usd };

// Sparkline مشترک
export function Sparkline({ data, w = 120, h = 40, color = "#f0b429" }: any) {
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v: number, i: number) =>
    `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} className="spark">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity="0.15" />
    </svg>
  );
}

// ══════════ ۱. داشبورد ══════════
export function Dashboard() {
  const journal = useApp((s) => s.journal);
  const balances = useApp((s) => s.balances);
  const tvl = balances.reduce((a, b) => a + b.amount * (((PRICES as any)[b.asset] as number) ?? 0), 0);
  return (
    <div>
      <div className="hero" style={{ backgroundImage: "url(/daric-banner.png)" }}>
        <div className="hero-in">
          <h2>سوپر‌اپ مالی <span>داریک</span> 🏛️</h2>
          <p>
            توکن NAV‌محور داریک، صرافی، طلا و نقره، وام تا ۸۰٪ پورتفوی، باشگاه سه‌سطحی،
            گردشگری، بیمه و بازی‌ها — همه در یک اپلیکیشن. دارایی واقعی، شفافیت روی‌چین.
          </p>
          <div className="row mt">
            <a href="#/nav" className="btn gold">📊 محاسبه NAV داریک</a>
            <a href="#/exchange" className="btn">💱 شروع معامله</a>
          </div>
        </div>
      </div>

      <div className="grid g-4 mb">
        <div className="card stat">
          <div className="label">قیمت داریک (NAV محور)</div>
          <div className="value" style={{ color: "var(--gold)" }}>$1.84</div>
          <div className="sub" style={{ color: "var(--green)" }}>▲ 2.4% — ۲۴ ساعت</div>
          <Sparkline data={NAV_HISTORY} />
        </div>
        <div className="card stat">
          <div className="label">کل ارزش دارایی‌ها (NAV)</div>
          <div className="value">$125.4M</div>
          <div className="sub">۱۲ بخش فعال · ۱۲,۴۰۰ سرمایه‌گذار</div>
          <Sparkline data={NAV_HISTORY.map((x) => x * 60)} color="#3b82f6" />
        </div>
        <div className="card stat">
          <div className="label">کیف پول من</div>
          <div className="value">{usd(tvl)}</div>
          <div className="sub">۶ دارایی · ۵,۸۰۰$ قفل‌شده</div>
        </div>
        <div className="card stat">
          <div className="label">پورسانت باشگاه (ماه)</div>
          <div className="value" style={{ color: "var(--green)" }}>$501</div>
          <div className="sub">سطح L1=۲۵٪ · L2=۱۲٪ · L3=۶٪</div>
        </div>
      </div>

      <div className="grid g-3">
        <div className="card">
          <h3>⚡ بخش‌های سرمایه‌گذاری</h3>
          {CAPITAL_SECTIONS.slice(0, 5).map((s) => (
            <div key={s.id} className="between" style={{ padding: "7px 0", borderBottom: "1px solid rgba(34,48,88,.4)" }}>
              <span style={{ fontSize: 12.5 }}>{s.icon} {s.name}</span>
              <span className="row">
                <span className="muted ltr">{usd(s.value)}</span>
                <span className="badge green">+{s.growth}%</span>
              </span>
            </div>
          ))}
          <a href="#/capital" className="btn sm mt" style={{ width: "100%" }}>مشاهده همه بخش‌ها →</a>
        </div>

        <div className="card">
          <h3>📈 آخرین تراکنش‌ها</h3>
          {TXS.slice(0, 5).map((t) => (
            <div key={t.id} className="between" style={{ padding: "7px 0", borderBottom: "1px solid rgba(34,48,88,.4)" }}>
              <div>
                <div style={{ fontSize: 12.5 }}>{t.type}</div>
                <div className="muted" style={{ fontSize: 10.5 }}>{t.ts}</div>
              </div>
              <span className={t.amount.startsWith("+") ? "ltr" : "ltr"} style={{ color: t.amount.startsWith("+") ? "var(--green)" : "#fca5a5", fontWeight: 700, fontSize: 12.5 }}>
                {t.amount}
              </span>
            </div>
          ))}
          <a href="#/wallet" className="btn sm mt" style={{ width: "100%" }}>کیف پول →</a>
        </div>

        <div className="card">
          <h3>📒 سلامت دفتر حسابداری</h3>
          <div className="between mb">
            <span className="muted">قیدهای این نشست</span>
            <b className="ltr">{journal.length}</b>
          </div>
          <div className="between mb">
            <span className="muted">تراز آزمایشی</span>
            <span className="badge green">✅ متوازن</span>
          </div>
          <div className="between mb">
            <span className="muted">Hash-Chain</span>
            <span className="badge green">✅ سالم</span>
          </div>
          <div className="between mb">
            <span className="muted">هشدارهای Prometheus</span>
            <span className="badge green">۰ فعال</span>
          </div>
          <a href="#/admin/accounting" className="btn sm" style={{ width: "100%" }}>دفتر کامل →</a>
        </div>
      </div>

      <div className="card mt">
        <h3>🗺️ ماژول‌های سوپر‌اپ</h3>
        <div className="grid g-4">
          {[
            ["#/nav", "📊", "NAV داریک", "محاسبه شفاف از دارایی‌ها"],
            ["#/exchange", "💱", "صرافی", "دفتر سفارش + P2P"],
            ["#/gold", "🥇", "طلا و نقره", "اسپرد ۰.۵٪ + تسویه فیزیکی"],
            ["#/loans", "🏦", "وام", "تا ۸۰٪ پورتفوی"],
            ["#/club", "🤝", "باشگاه", "پورسانت ۳ سطحه"],
            ["#/tourism", "✈️", "گردشگری", "تور + پرداخت چندارزی"],
            ["#/insurance", "🛡️", "بیمه", "۴ دسته محصول"],
            ["#/games", "🎮", "بازی‌ها", "گردونه Provably-Fair"],
          ].map(([href, ico, t, d]) => (
            <a key={href} href={href} className="card" style={{ textAlign: "center", padding: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{ico}</div>
              <b style={{ fontSize: 13 }}>{t}</b>
              <div className="muted" style={{ fontSize: 11 }}>{d}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════ ۲. NAV داریک ══════════
export function NavPage() {
  const navCache = useApp((s) => s.navCache);
  const [busy, setBusy] = useState(false);
  const r = ASSET_REPORT;
  const preview = computeNAV(r);

  async function calc() {
    setBusy(true);
    const res = await runNAV();
    setBusy(false);
    toast("✅ NAV محاسبه و هش گزارش تولید شد");
    go("/admin/reports");
    return res;
  }

  return (
    <div>
      <div className="page-title">📊 NAV توکن داریک</div>
      <div className="page-sub">
        قیمت هر داریک = کل ارزش دارایی‌ها (NAV) ÷ عرضه کل (۱ میلیارد) — گزارش ماهانه با SHA-256 روی IPFS و امضای ۲-از-۳ اوراکل.
      </div>

      <div className="alert info">
        📐 فرمول: NAV = (سرمایه جذب‌شده + املاک + منقول + پروژه‌ها + واحدهای در حال ساخت + دارایی فیزیکی) × ضریب رشد لگاریتمی
      </div>

      <div className="grid g-2 mb">
        <div className="card">
          <h3>🧾 گزارش دارایی جاری ({r.period})</h3>
          <table className="tbl">
            <tbody>
              <tr><td>سرمایه جذب‌شده</td><td className="ltr">{usd(r.capital.attracted)}</td></tr>
              <tr><td>تعداد سرمایه‌گذار</td><td className="ltr">{fmt(r.capital.investorCount, 0)}</td></tr>
              <tr><td>املاک (غیرمنقول)</td><td className="ltr">{usd(r.properties.immovable)}</td></tr>
              <tr><td>دارایی منقول</td><td className="ltr">{usd(r.properties.movable)}</td></tr>
              <tr><td>پروژه‌ها (دام/کشاورزی/انرژی/بازی)</td><td className="ltr">{usd(Object.values(r.projects).reduce((a, b) => a + b, 0))}</td></tr>
              <tr><td>واحدهای در حال ساخت</td><td className="ltr">{usd(r.constructionUnits)}</td></tr>
              <tr><td>دارایی فیزیکی</td><td className="ltr">{usd(r.physicalAssets)}</td></tr>
              <tr><td>رشد (نصب اپ / باشگاه)</td><td className="ltr">{fmt(r.growth.appInstalls, 0)} / {fmt(r.growth.mlmClubSize, 0)}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="card" style={{ borderColor: "rgba(240,180,41,.4)" }}>
          <h3>💰 نتیجه محاسبه</h3>
          <div className="stat mb">
            <div className="label">قیمت هر توکن داریک</div>
            <div className="value" style={{ color: "var(--gold)", fontSize: 30 }}>${fmt(Number(preview.navPerToken), 4)}</div>
          </div>
          <div className="between mb"><span className="muted">کل NAV</span><b className="ltr">{usd(Number(preview.totalNAV))}</b></div>
          <div className="between mb"><span className="muted">ضریب رشد لگاریتمی</span><b className="ltr">{preview.breakdown.growthFactor}</b></div>
          <div className="between mb"><span className="muted">عرضه کل</span><b className="ltr">1,000,000,000 DARIC</b></div>
          <hr className="hr" />
          {navCache ? (
            <div>
              <div className="muted mb">هش SHA-256 گزارش (قابل تأیید):</div>
              <div className="hashbox">{navCache.reportHash}</div>
              <a href="#/admin/reports" className="btn gold mt" style={{ width: "100%" }}>📤 آپلود و امضای گزارش →</a>
            </div>
          ) : (
            <button className="btn gold" style={{ width: "100%" }} disabled={busy} onClick={calc}>
              {busy ? "در حال محاسبه..." : "🔥 محاسبه و تولید هش"}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3>📉 روند قیمت NAV (۱۲ ماه اخیر)</h3>
        <div className="row" style={{ gap: 4, alignItems: "flex-end", height: 120, direction: "ltr" }}>
          {NAV_HISTORY.map((v, i) => {
            const min = Math.min(...NAV_HISTORY), max = Math.max(...NAV_HISTORY);
            const h = 20 + ((v - min) / (max - min)) * 80;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "70%", height: h, background: "linear-gradient(180deg,var(--gold),var(--gold-2))", borderRadius: "6px 6px 0 0" }} title={`$${v}`} />
                <span className="muted" style={{ fontSize: 9 }}>{v}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════ ۳. تأیید گزارش ══════════
export function VerifyPage() {
  return (
    <div>
      <div className="page-title">🔍 تأیید گزارش NAV</div>
      <div className="page-sub">هش گزارش دارایی را وارد کنید تا صحت آن روی‌چین بررسی شود.</div>
      <div className="card">
        <input placeholder="SHA-256 گزارش..." className="mb" />
        <button className="btn gold">بررسی صحت</button>
      </div>
    </div>
  );
}

// ══════════ ۴. صرافی ══════════
export function Exchange() {
  const book = useApp((s) => s.book);
  const orders = useApp((s) => s.orders);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"limit" | "market">("limit");
  const [price, setPrice] = useState("1.83");
  const [qty, setQty] = useState("1000");

  const depth = book.depth(12);
  const last = book.lastPrice() ?? 1.84;
  const maxBid = depth.bids[0]?.price ?? 0;
  const minAsk = depth.asks[0]?.price ?? 0;

  function submit(e: any) {
    e.preventDefault();
    const q = Number(qty);
    if (!q || q <= 0) return toast("مقدار نامعتبر");
    if (type === "limit" && (!Number(price) || Number(price) <= 0)) return toast("قیمت نامعتبر");
    const { fills, fee } = placeOrder(side, type, q, Number(price));
    if (fills.length) {
      toast(`✅ ${fills.length} معامله اجرا شد — کارمزد $${fmt(fee)}`);
    } else {
      toast("📋 سفارش در دفتر ثبت شد");
    }
  }

  const maxDepth = Math.max(...depth.bids.map((b) => b.qty), ...depth.asks.map((a) => a.qty), 1);

  return (
    <div>
      <div className="page-title">💱 صرافی داریک</div>
      <div className="page-sub">
        دفتر سفارش زنده · جفت اصلی DARIC/USDT · کارمزد {EXCHANGE_FEE.base * 100}٪ پایه —{" "}
        <b style={{ color: "var(--gold)" }}>{EXCHANGE_FEE.daric * 100}٪ با پرداخت داریک</b>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 300px 1fr", gap: 14 }}>
        <div className="card ob">
          <h3 style={{ color: "var(--green)" }}>خرید (Bid)</h3>
          {depth.bids.map((b, i) => (
            <div key={i} className="ob-row bid">
              <div className="depth" style={{ width: `${(b.qty / maxDepth) * 100}%` }} />
              <span className="p">{b.price.toFixed(2)}</span>
              <span>{fmt(b.qty, 0)}</span>
            </div>
          ))}
        </div>

        <div className="card center">
          <div className="muted">آخرین قیمت</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--green)" }} className="ltr">${last.toFixed(2)}</div>
          <div className="muted" dir="ltr">Best bid {maxBid.toFixed(2)} · Best ask {minAsk.toFixed(2)}</div>
          <div className="hr" />
          <div className="grid g-2" style={{ gap: 8 }}>
            <div><div className="muted" style={{ fontSize: 10 }}>حجم ۲۴س</div><b className="ltr">$4.2M</b></div>
            <div><div className="muted" style={{ fontSize: 10 }}>تعداد معامله</div><b className="ltr">8,412</b></div>
          </div>
          <div className="hr" />
          <div className="muted" style={{ fontSize: 11 }}>📊 چارت (TradingView)</div>
          <Sparkline data={NAV_HISTORY.map((x, i) => x + Math.sin(i) * 0.02)} w={240} h={80} color="#22c55e" />
        </div>

        <div className="card ob">
          <h3 style={{ color: "var(--red)" }}>فروش (Ask)</h3>
          {depth.asks.map((a, i) => (
            <div key={i} className="ob-row ask">
              <div className="depth" style={{ width: `${(a.qty / maxDepth) * 100}%` }} />
              <span className="p">{a.price.toFixed(2)}</span>
              <span>{fmt(a.qty, 0)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid g-2 mt">
        <form className="card" onSubmit={submit}>
          <h3>📝 ثبت سفارش</h3>
          <div className="tabs">
            <button type="button" className={side === "buy" ? "on" : ""} onClick={() => setSide("buy")}>خرید</button>
            <button type="button" className={side === "sell" ? "on" : ""} onClick={() => setSide("sell")}>فروش</button>
            <span style={{ flex: 1 }} />
            <button type="button" className={type === "limit" ? "on" : ""} onClick={() => setType("limit")}>محدود</button>
            <button type="button" className={type === "market" ? "on" : ""} onClick={() => setType("market")}>بازار</button>
          </div>
          {type === "limit" && (
            <div className="mb">
              <label className="muted">قیمت (USDT)</label>
              <input value={price} onChange={(e) => setPrice(e.target.value)} className="ltr" />
            </div>
          )}
          <div className="mb">
            <label className="muted">مقدار (DARIC)</label>
            <input value={qty} onChange={(e) => setQty(e.target.value)} className="ltr" />
          </div>
          <div className="between mb">
            <span className="muted">ارزش تقریبی</span>
            <b className="ltr">{usd((Number(qty) || 0) * (type === "limit" ? Number(price) || 0 : last))}</b>
          </div>
          <div className="between mb">
            <span className="muted">کارمزد ({EXCHANGE_FEE.base * 100}٪ — نصف با داریک)</span>
            <span className="ltr muted">{fmt((Number(qty) || 0) * last * EXCHANGE_FEE.base, 4)} USDT</span>
          </div>
          <button className={`btn ${side === "buy" ? "green" : "red"}`} style={{ width: "100%" }}>
            {side === "buy" ? "🟢 خرید داریک" : "🔴 فروش داریک"}
          </button>
        </form>

        <div className="card">
          <h3>📋 سفارش‌های باز من</h3>
          {orders.length === 0 && <div className="muted center" style={{ padding: 30 }}>سفارشی ندارید</div>}
          {orders.map((o) => (
            <div key={o.id} className="between" style={{ padding: "8px 0", borderBottom: "1px solid rgba(34,48,88,.4)" }}>
              <div>
                <span className={`badge ${o.side === "buy" ? "green" : "red"}`}>{o.side === "buy" ? "خرید" : "فروش"}</span>
                <span className="muted ltr" style={{ marginRight: 8 }}>{o.price?.toFixed(2)} × {fmt(o.qty, 0)}</span>
                {o.filled > 0 && <span className="badge blue" style={{ marginRight: 6 }}>填充 {fmt((o.filled / o.qty) * 100, 0)}٪</span>}
              </div>
              <button className="btn sm red" onClick={() => { cancelOrder(o.id); toast("سفارش لغو شد"); }}>لغو</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════ ۵. P2P ══════════
export function P2P() {
  const offers = [
    { id: "OF1", seller: "D-8821", asset: "DARIC", amount: 5000, price: 1.82, method: "حواله بانکی", status: "OPEN" },
    { id: "OF2", seller: "D-4410", asset: "DARIC", amount: 12000, price: 1.86, method: "USDT_TRC20", status: "OPEN" },
    { id: "OF3", seller: "D-9932", asset: "SHARE", amount: 300, price: 42.5, method: "حواله بانکی", status: "OPEN" },
  ];
  return (
    <div>
      <div className="page-title">🤝 P2P — داریک و سهام</div>
      <div className="page-sub">معامله مستقیم با اسکرو DaricVault — توکن فروشنده تا تأیید پرداخت خریدار قفل می‌شود.</div>
      <div className="alert warn">🔒 محدودیت P2P: فقط دارایی‌های داخلی DARIC و SHARE — سایر ارزها فقط در صرافی.</div>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>فروشنده</th><th>دارایی</th><th>مقدار</th><th>قیمت هر واحد</th><th>شیوه پرداخت</th><th></th></tr></thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id}>
                <td className="ltr">{o.seller}</td>
                <td><span className="badge gold">{o.asset}</span></td>
                <td className="ltr">{fmt(o.amount, 0)}</td>
                <td className="ltr">${o.price}</td>
                <td>{o.method}</td>
                <td><button className="btn sm gold" onClick={() => toast("🔒 مبلغ در اسکرو قفل شد — پرداخت را انجام دهید")}>خرید</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card mt">
        <h3>📤 ثبت پیشنهاد فروش</h3>
        <div className="grid g-4">
          <select><option>DARIC</option><option>SHARE</option></select>
          <input placeholder="مقدار" className="ltr" />
          <input placeholder="قیمت هر واحد ($)" className="ltr" />
          <button className="btn gold" onClick={() => toast("پیشنهاد ثبت و توکن در Vault قفل شد")}>ثبت پیشنهاد</button>
        </div>
      </div>
    </div>
  );
}

// ══════════ ۶. کیف پول ══════════
export function Wallet() {
  const balances = useApp((s) => s.balances);
  const [modal, setModal] = useState<null | "deposit" | "withdraw">(null);
  const [asset, setAsset] = useState("USDT");
  const [amount, setAmount] = useState("");

  function withdraw() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast("مقدار نامعتبر");
    if (asset === "USDT" && amt > BETA_CONFIG.limits.withdraw_user_daily_usd) {
      return toast(`⛔ سقف بتا: ${BETA_CONFIG.limits.withdraw_user_daily_usd}$ در روز`);
    }
    toast("🕐 در صف برداشت — ارسال پس از Timelock ۴۸ ساعته");
    setModal(null); setAmount("");
  }

  return (
    <div>
      <div className="page-title">💳 کیف پول من</div>
      <div className="page-sub">دارایی‌های چندارزی · برداشت با KYC سطح ۲ + 2FA + سقف روزانه بتا.</div>
      <div className="card mb">
        <table className="tbl">
          <thead><tr><th>دارایی</th><th>موجودی</th><th>قفل‌شده</th><th>ارزش ($)</th><th>عملیات</th></tr></thead>
          <tbody>
            {balances.map((b) => {
              const price = (PRICES as any)[b.asset] ?? (b.asset === "GOLD" ? PRICES.GOLD : b.asset === "SILVER" ? PRICES.SILVER : 1);
              return (
                <tr key={b.asset}>
                  <td><b>{b.asset}</b></td>
                  <td className="ltr">{fmt(b.amount, b.asset === "GOLD" || b.asset === "SILVER" ? 2 : 2)}</td>
                  <td className="ltr" style={{ color: "var(--gold)" }}>{fmt(b.locked)}</td>
                  <td className="ltr">{usd(b.amount * price)}</td>
                  <td>
                    <div className="row">
                      <button className="btn sm" onClick={() => { setAsset(b.asset); setModal("deposit"); }}>واریز</button>
                      <button className="btn sm gold" onClick={() => { setAsset(b.asset); setModal("withdraw"); }}>برداشت</button>
                      <a href="#/exchange" className="btn sm">ترید</a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid g-2">
        <div className="card">
          <h3>📤 برداشت‌های در صف (Timelock)</h3>
          <div className="between" style={{ padding: "8px 0" }}>
            <div>
              <b>400.00 USDT</b>
              <div className="muted" style={{ fontSize: 11 }}>TRC20 · TX6</div>
            </div>
            <div style={{ textAlign: "left" }}>
              <span className="badge gold">🕐 +۳۱ ساعت</span>
              <div className="progress" style={{ width: 120, marginTop: 6 }}><div style={{ width: "35%" }} /></div>
              <div className="muted" style={{ fontSize: 10 }}>Timelock 48h</div>
            </div>
          </div>
          <hr className="hr" />
          <div className="muted" style={{ fontSize: 11.5 }}>
            ⚠️ برداشت‌های بالای ۱۰,۰۰۰$ نیاز به تأیید دوم ادمین (dual-approval) دارند.
          </div>
        </div>
        <div className="card">
          <h3>📥 آدرس واریز</h3>
          <div className="muted mb">شبکه انتخابی را با دقت بررسی کنید:</div>
          <div className="hashbox mb">TRC20: TDaricDemo100planXk9f2Abc4521</div>
          <div className="row">
            <span className="chip">TRC20</span><span className="chip">ERC20</span><span className="chip">BEP20</span>
          </div>
        </div>
      </div>

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setModal(null)}>
          <div className="card" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3>{modal === "deposit" ? "📥 واریز" : "📤 برداشت"} — {asset}</h3>
            <div className="mb">
              <label className="muted">مقدار</label>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} className="ltr" placeholder="0.00" autoFocus />
            </div>
            {modal === "withdraw" && (
              <div className="alert warn" style={{ fontSize: 11.5 }}>
                سقف روزانه بتا: {BETA_CONFIG.limits.withdraw_user_daily_usd}$ · ارسال پس از Timelock ۴۸ ساعته
              </div>
            )}
            <div className="row">
              <button className="btn gold" style={{ flex: 1 }} onClick={modal === "deposit" ? () => { toast("آدرس واریز نمایش داده شد"); setModal(null); } : withdraw}>
                تأیید
              </button>
              <button className="btn" onClick={() => setModal(null)}>انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════ ۷. طلا و نقره ══════════
export function GoldSilver() {
  const [metal, setMetal] = useState<"GOLD" | "SILVER">("GOLD");
  const [tab, setTab] = useState<"trade" | "pl" | "physical">("trade");
  const [grams, setGrams] = useState("10");
  const [buyPrice, setBuyPrice] = useState(String(PRICES.GOLD));

  const spot = metal === "GOLD" ? PRICES.GOLD : PRICES.SILVER;
  const buyP = spot * 1.005, sellP = spot * 0.995;

  const pl = metalPL({
    grams, buyPricePerGram: buyPrice, buyFeePct: "0.5",
    holdDays: 90, sellFeePct: "0.5",
  });

  return (
    <div>
      <div className="page-title">🥇 طلا و نقره</div>
      <div className="page-sub">خرید و فروش با اسپرد ۰.۵٪ · نگهداری در گاوصندوق · تسویه فیزیکی با NFT رسید.</div>

      <div className="grid g-2 mb">
        <div className="card stat" style={{ borderColor: "rgba(240,180,41,.4)" }}>
          <div className="label">🥇 طلا (هر گرم)</div>
          <div className="value" style={{ color: "var(--gold)" }}>${spot.toFixed(2)}</div>
          <div className="sub">خرید ${buyP.toFixed(2)} · فروش ${sellP.toFixed(2)} (اسپرد ۰.۵٪)</div>
        </div>
        <div className="card stat">
          <div className="label">🥈 نقره (هر گرم)</div>
          <div className="value" style={{ color: "#c0c8d8" }}>${PRICES.SILVER.toFixed(2)}</div>
          <div className="sub">خرید ${(PRICES.SILVER * 1.005).toFixed(3)} · فروش ${(PRICES.SILVER * 0.995).toFixed(3)}</div>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === "trade" ? "on" : ""} onClick={() => setTab("trade")}>معامله</button>
        <button className={tab === "pl" ? "on" : ""} onClick={() => setTab("pl")}>ماشین‌حساب سود/زیان</button>
        <button className={tab === "physical" ? "on" : ""} onClick={() => setTab("physical")}>تسویه فیزیکی</button>
      </div>

      {tab === "trade" && (
        <div className="grid g-2">
          <div className="card">
            <div className="tabs">
              <button className={metal === "GOLD" ? "on" : ""} onClick={() => { setMetal("GOLD"); setBuyPrice(String(PRICES.GOLD)); }}>🥇 طلا</button>
              <button className={metal === "SILVER" ? "on" : ""} onClick={() => { setMetal("SILVER"); setBuyPrice(String(PRICES.SILVER)); }}>🥈 نقره</button>
            </div>
            <div className="mb"><label className="muted">مبلغ خرید (USDT)</label><input className="ltr" defaultValue="1000" /></div>
            <div className="between mb"><span className="muted">قیمت هر گرم (خرید)</span><b className="ltr">${buyP.toFixed(2)}</b></div>
            <div className="between mb"><span className="muted">مقدار دریافتی</span><b className="ltr">{(1000 / buyP).toFixed(4)} گرم {metal === "GOLD" ? "طلا" : "نقره"}</b></div>
            <button className="btn gold" style={{ width: "100%" }} onClick={() => toast(`✅ خرید انجام شد — ${metal === "GOLD" ? "طلا" : "نقره"} به پورتفوی اضافه شد`)}>
              خرید {metal === "GOLD" ? "طلا" : "نقره"}
            </button>
          </div>
          <div className="card">
            <h3>📦 پورتفوی فلزات من</h3>
            <table className="tbl">
              <thead><tr><th>فلز</th><th>مقدار (گرم)</th><th>ارزش</th></tr></thead>
              <tbody>
                <tr><td>🥇 طلا</td><td className="ltr">12.5000</td><td className="ltr">{usd(12.5 * PRICES.GOLD)}</td></tr>
                <tr><td>🥈 نقره</td><td className="ltr">240.0000</td><td className="ltr">{usd(240 * PRICES.SILVER)}</td></tr>
              </tbody>
            </table>
            <hr className="hr" />
            <div className="muted" style={{ fontSize: 11.5 }}>فروش → اعتبار USDT در کیف پول · تبدیل → USDT | DARIC | EUR</div>
          </div>
        </div>
      )}

      {tab === "pl" && (
        <div className="grid g-2">
          <div className="card">
            <h3>⚙️ ورودی‌ها</h3>
            <div className="mb"><label className="muted">مقدار (گرم)</label><input value={grams} onChange={(e) => setGrams(e.target.value)} className="ltr" /></div>
            <div className="mb"><label className="muted">قیمت خرید هر گرم ($)</label><input value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} className="ltr" /></div>
            <div className="muted">کارمزد خرید و فروش: ۰.۵٪ · مدت نگهداری: ۹۰ روز</div>
            <hr className="hr" />
            <div className="between"><span className="muted">قیمت تمام‌شده خرید</span><b className="ltr">{usd(Number(pl.buyCost))}</b></div>
          </div>
          <div className="grid" style={{ gap: 12 }}>
            {pl.scenarios.map((s, i) => (
              <div key={i} className={`scen ${Number(s.pl) > 0 ? "best" : "worst"}`}>
                <h4>{s.name}</h4>
                <div className="between">
                  <span className="big" style={{ color: Number(s.pl) > 0 ? "var(--green)" : "#fca5a5" }}>
                    {Number(s.pl) >= 0 ? "+" : ""}{usd(Number(s.pl))}
                  </span>
                  <span className="badge {Number(s.pl) > 0 ? 'green' : 'red'}" style={{ color: Number(s.pl) > 0 ? "var(--green)" : "#fca5a5" }}>
                    {Number(s.plPct) >= 0 ? "+" : ""}{s.plPct}%
                  </span>
                </div>
                <div className="muted ltr" style={{ fontSize: 11 }}>فروش: {usd(Number(s.gross))}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "physical" && (
        <div className="card">
          <h3>🏠 تحویل فیزیکی فلز</h3>
          <div className="alert info">تحویل در گاوصندوق یا ارسال پیک · رسید مالکیت به‌صورت NFT روی‌چین ثبت می‌شود.</div>
          <div className="grid g-3 mb">
            <div><label className="muted">فلز</label><select><option>طلا</option><option>نقره</option></select></div>
            <div><label className="muted">مقدار (گرم)</label><input className="ltr" defaultValue="5" /></div>
            <div><label className="muted">شیوه تحویل</label><select><option>گاوصندوق (رزرو وقت)</option><option>پیک امن</option></select></div>
          </div>
          <button className="btn gold" onClick={() => toast("درخواست ثبت شد — منتظر تأیید ادمین")}>ثبت درخواست تحویل</button>
        </div>
      )}
    </div>
  );
}

// صفحات بخش ۲
export {
  Capital, Startups, ArshaGames, LaserTag, Club, Loans, Settings,
  Tourism, Insurance, Chat,
  AdminReports, AdminKYC, AdminAccounting, AdminRBAC, AdminAudit, NotFound,
} from "./pages2";
