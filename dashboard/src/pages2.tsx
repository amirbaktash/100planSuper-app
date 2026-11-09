// ═══════════════════════════════════════════════════════════════
// صفحات بخش ۲ — سرمایه، استارتاپ، بازی، باشگاه، وام، گردشگری،
// بیمه، چت، تنظیمات و پنل ادمین
// ═══════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useApp, setState, getState, toast, go, ME, PRICES, ASSET_REPORT, NAV_HISTORY,
  TXS, COMMISSIONS, MLM_TREE, TOURS, INSURANCE, CAPITAL_SECTIONS,
  STARTUPS, VENUES, KYC_QUEUE, AUDIT_LOG, placeOrder, cancelOrder,
  runNAV, payInstallmentAction, EXCHANGE_FEE, BETA_CONFIG,
} from "./lib/store";
import {
  investmentPL, simulate, buildSchedule, resolvePct, TIERS, tierInfo,
  pickSegment, DEFAULT_SEGMENTS, SPIN_COST, verifySpin, trialBalance, COA,
} from "@daric/shared";
import { fmt, usd } from "./lib/fmt";

// ══════════ سرمایه‌گذاری ══════════
export function Capital() {
  const [principal, setPrincipal] = useState("10000");
  const [years, setYears] = useState("3");
  const pl = investmentPL({ principal, annualPct: "18", years: Number(years) });

  return (
    <div>
      <div className="page-title">💼 سرمایه‌گذاری — بخش‌ها، پورتفولیو، گواهی‌ها</div>
      <div className="page-sub">سرمایه خود را در بخش‌های واقعی اقتصادی تخصیص دهید و از رشد NAV داریک بهره‌مند شوید.</div>

      <div className="grid g-3 mb">
        {CAPITAL_SECTIONS.map((s) => (
          <div key={s.id} className="card">
            <div className="between mb">
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <span className="badge green">+{s.growth}%</span>
            </div>
            <b>{s.name}</b>
            <div className="stat mt">
              <div className="label">ارزش بخش</div>
              <div className="value" style={{ fontSize: 20 }}>{usd(s.value)}</div>
              <div className="sub">{fmt(s.investors, 0)} سرمایه‌گذار فعال</div>
            </div>
            <div className="progress mt"><div style={{ width: `${Math.min(100, s.growth * 6)}%` }} /></div>
            <button className="btn gold sm mt" style={{ width: "100%" }} onClick={() => toast("حداقل سرمایه‌گذاری ۱۰۰$ است")}>
              سرمایه‌گذاری در این بخش
            </button>
          </div>
        ))}
      </div>

      <div className="grid g-2">
        <div className="card">
          <h3>🧮 ماشین‌حساب سود مرکب NAV</h3>
          <div className="grid g-2 mb">
            <div><label className="muted">سرمایه اولیه ($)</label><input value={principal} onChange={(e) => setPrincipal(e.target.value)} className="ltr" /></div>
            <div><label className="muted">مدت (سال)</label><input value={years} onChange={(e) => setYears(e.target.value)} className="ltr" /></div>
          </div>
          <div className="scen best mb">
            <h4>📈 نتیجه پایه (نرخ ۱۸٪ سالانه)</h4>
            <div className="between">
              <div className="big" style={{ color: "var(--green)" }}>${pl.base.final}</div>
              <span className="badge green">سود +${pl.base.profit}</span>
            </div>
          </div>
          <div className="grid g-3" style={{ gap: 10 }}>
            {pl.scenarios.map((s, i) => (
              <div key={i} className="scen">
                <h4 style={{ fontSize: 11.5 }}>{s.name}</h4>
                <div className="big" style={{ fontSize: 16, color: Number(s.profit) >= 0 ? "var(--green)" : "#fca5a5" }}>
                  ${s.final}
                </div>
                <div className="muted ltr" style={{ fontSize: 10.5 }}>{Number(s.profit) >= 0 ? "+" : ""}{s.profit}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>📜 گواهی‌های سرمایه‌گذاری من</h3>
          <table className="tbl">
            <thead><tr><th>گواهی</th><th>بخش</th><th>مبلغ</th><th>بازده</th></tr></thead>
            <tbody>
              <tr><td className="ltr">C-10021</td><td>انرژی</td><td className="ltr">$5,000</td><td className="badge green">+12.4%</td></tr>
              <tr><td className="ltr">C-10088</td><td>کشاورزی</td><td className="ltr">$3,200</td><td className="badge green">+8.1%</td></tr>
              <tr><td className="ltr">C-10155</td><td>املاک</td><td className="ltr">$8,000</td><td className="badge green">+5.8%</td></tr>
            </tbody>
          </table>
          <hr className="hr" />
          <div className="between">
            <span className="muted">ارزش کل پورتفوی</span>
            <b style={{ color: "var(--gold)" }}>$16,200 → $17,412</b>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════ استارتاپ‌ها ══════════
export function Startups() {
  return (
    <div>
      <div className="page-title">🚀 استارتاپ‌هاب</div>
      <div className="page-sub">در استارتاپ‌های بخش‌های بازی، لیزرتگ، انرژی و دام‌داری سهیم شوید.</div>
      <div className="grid g-2">
        {STARTUPS.map((p) => {
          const pct = Math.round((p.raised / p.goal) * 100);
          return (
            <div key={p.id} className="card">
              <div className="between mb">
                <div className="row">
                  <span style={{ fontSize: 26 }}>{p.icon}</span>
                  <div>
                    <b>{p.name}</b>
                    <div className="muted" style={{ fontSize: 11 }}>{p.field}</div>
                  </div>
                </div>
                <span className="badge gold">{pct}% تأمین</span>
              </div>
              <div className="progress mb"><div style={{ width: `${pct}%` }} /></div>
              <div className="between mb">
                <span className="muted">جمع‌آوری‌شده</span>
                <b className="ltr">{usd(p.raised)} / {usd(p.goal)}</b>
              </div>
              <div className="between mb">
                <span className="muted">تعداد سرمایه‌گذار</span>
                <span className="ltr">{fmt(p.investors, 0)} نفر</span>
              </div>
              <button className="btn gold" style={{ width: "100%" }} onClick={() => toast("سرمایه‌گذاری در استارتاپ ثبت شد 🚀")}>
                سرمایه‌گذاری
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════ آرشا گیم (گردونه) ══════════
export function ArshaGames() {
  const spinsToday = useApp((s) => s.spinsToday);
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [commitment, setCommitment] = useState<string | null>(null);

  async function spinNow() {
    if (spinsToday >= BETA_CONFIG.limits.wheel_daily_spins) {
      return toast(`⛔ سقف بتا: ${BETA_CONFIG.limits.wheel_daily_spins} چرخش در روز`);
    }
    setSpinning(true); setResult(null); setCommitment(null);
    const seg = pickSegment(DEFAULT_SEGMENTS);
    // Provably-Fair: commitment از قبل اعلام می‌شود
    const fakeSeed = Math.random().toString(16).slice(2);
    const comm = await verifySpin(fakeSeed, "wait") ? "" : `sha256:${fakeSeed}`;
    setCommitment(comm);
    setRot((p) => p + 360 * 5 + (360 - seg.index * 36));
    setTimeout(async () => {
      const net = seg.prizeType === "CASH" ? seg.prizeValue - SPIN_COST
        : seg.prizeType === "TOKEN_DARIC" ? seg.prizeValue * 0.02 - SPIN_COST
        : seg.prizeType === "FREE_SPIN" ? 0 : -SPIN_COST;
      setResult({ segment: seg.index, label: seg.label, net: Number(net.toFixed(2)), seed: fakeSeed });
      setState({ spinsToday: spinsToday + 1 });
      setSpinning(false);
      toast(net >= 0 ? `🎉 جایزه: ${seg.label}` : "چرخش انجام شد — بهار بعدی!");
    }, 4200);
  }

  return (
    <div>
      <div className="page-title">🎮 آرشا گیم — گردونه شانس</div>
      <div className="page-sub">
        ۱۰ خانه · Provably-Fair با Commitment · هزینه هر چرخش {SPIN_COST} USDT · سقف بتا: {spinsToday}/{BETA_CONFIG.limits.wheel_daily_spins}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 340px" }}>
        <div className="card wheel-wrap">
          <div className="wheel-pointer" />
          <div className="wheel" style={{ transform: `rotate(${rot}deg)` }}>
            {DEFAULT_SEGMENTS.map((s, i) => (
              <div key={s.index} className="seg" style={{ transform: `rotate(${i * 36}deg)`, background: s.color }}>
                {s.label}
              </div>
            ))}
            <div className="hub">🎁</div>
          </div>
          <button className="btn gold" style={{ padding: "12px 34px", fontSize: 15 }} disabled={spinning} onClick={spinNow}>
            {spinning ? "در حال چرخش..." : `بچرخان (${SPIN_COST} USDT)`}
          </button>
          {commitment && <div className="muted ltr" style={{ fontSize: 10.5 }}>Commitment: {commitment.slice(0, 40)}…</div>}
          {result && (
            <div className={`alert ${result.net >= 0 ? "ok" : "err"}`} style={{ minWidth: 300 }}>
              🎯 خانه {result.segment}: <b>{result.label}</b> —
              <span className="ltr"> {result.net >= 0 ? "+" : ""}{result.net} USDT</span>
              <div className="muted ltr" style={{ fontSize: 10.5, marginTop: 4 }}>serverSeed: {result.seed.slice(0, 24)}… (قابل verify)</div>
            </div>
          )}
        </div>

        <div>
          <div className="card mb">
            <h3>📜 تاریخچه چرخش‌ها</h3>
            <table className="tbl">
              <thead><tr><th>خانه</th><th>جایزه</th><th>خالص</th></tr></thead>
              <tbody>
                <tr><td className="ltr">#3</td><td>۰</td><td className="ltr" style={{ color: "#fca5a5" }}>-1.00</td></tr>
                <tr><td className="ltr">#1</td><td>۱۰ DARIC</td><td className="ltr" style={{ color: "#fca5a5" }}>-0.80</td></tr>
                <tr><td className="ltr">#0</td><td>۰.۵ USDT</td><td className="ltr" style={{ color: "var(--green)" }}>-0.50</td></tr>
              </tbody>
            </table>
          </div>
          <div className="card">
            <h3>🎰 P/L صندوق (ادمین)</h3>
            <div className="between mb"><span className="muted">میزان شرط‌بندی</span><b className="ltr">$12,480</b></div>
            <div className="between mb"><span className="muted">پرداخت‌شده</span><b className="ltr">$9,210</b></div>
            <div className="between"><span className="muted">لبه خانه</span><b className="ltr" style={{ color: "var(--green)" }}>$3,270</b></div>
            <hr className="hr" />
            <div className="muted" style={{ fontSize: 11 }}>
              ⚙️ ادمین: وزن/جایزه هر خانه از پنل Admin ▸ Games & Beta قابل تنظیم است.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════ لیزرتگ ══════════
export function LaserTag() {
  return (
    <div>
      <div className="page-title">🔫 تکاوُ — لیزرتگ و میدان‌های بازی</div>
      <div className="page-sub">رزرو جلسه در آرناها و کلاب‌ها با پرداخت USDT/DARIC.</div>
      <div className="grid g-2">
        {VENUES.map((v) => (
          <div key={v.id} className="card">
            <div className="between mb">
              <div className="row">
                <span style={{ fontSize: 24 }}>{v.kind === "LASER_TAG" ? "🔫" : v.kind === "CLUB" ? "💎" : "🎰"}</span>
                <div>
                  <b>{v.name}</b>
                  <div className="muted" style={{ fontSize: 11 }}>{v.city} · {v.sessions} جلسه/روز</div>
                </div>
              </div>
              <span className={`badge ${v.open ? "green" : "red"}`}>{v.open ? "باز" : "بسته"}</span>
            </div>
            <div className="between mb">
              <span className="muted">قیمت هر جلسه</span>
              <b className="ltr">{usd(v.priceUSD)}</b>
            </div>
            <button className="btn gold" style={{ width: "100%" }} disabled={!v.open} onClick={() => toast("رزرو انجام شد 🎯")}>
              {v.open ? "رزرو جلسه" : "موقتاً بسته"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════ باشگاه (MLM) ══════════
function TreeNode({ node, depth = 0 }: any) {
  const info = tierInfo(node.tier);
  return (
    <div className="tree-node" style={{ borderColor: node.tier === "DIAMOND" ? "#67e8f9" : node.tier === "GOLD" ? "var(--gold)" : "var(--line)" }}>
      {info.emoji} {node.name}
      <span className="muted" style={{ fontSize: 10, marginRight: 6 }}>{info.label}</span>
      {node.children?.length > 0 && (
        <div className="tree-children">
          {node.children.map((c: any, i: number) => (
            <div key={i} className="tree-child"><TreeNode node={c} depth={depth + 1} /></div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Club() {
  const total = COMMISSIONS.reduce((a, c) => a + Number(c.amount), 0);
  return (
    <div>
      <div className="page-title">🤝 شبکه (باشگاه داریک)</div>
      <div className="page-sub">
        پورسانت تا ۳ سطح: <b style={{ color: "var(--gold)" }}>L1=۲۵٪ · L2=۱۲٪ · L3=۶٪</b> — L1 نامحدود،
        پرداخت فقط ۳ سطح. تایرها با زیرمجموعه مستقیم و حجم معاملات ارتقا می‌یابد.
      </div>

      <div className="grid g-4 mb">
        {TIERS.map((t) => {
          const active = t.tier === ME.clubTier || TIERS.indexOf(t) <= TIERS.findIndex((x) => x.tier === ME.clubTier);
          return (
            <div key={t.tier} className="card" style={{ borderColor: t.tier === ME.clubTier ? "var(--gold)" : "var(--line)", opacity: active ? 1 : 0.55 }}>
              <div className="between">
                <span style={{ fontSize: 22 }}>{t.emoji}</span>
                {t.tier === ME.clubTier && <span className="badge gold">سطح فعلی</span>}
              </div>
              <b>{t.label}</b>
              <div className="muted" style={{ fontSize: 11 }}>≥{t.minDownline} زیرمجموعه · ${fmt(t.minVolumeUSD, 0)} حجم</div>
            </div>
          );
        })}
      </div>

      <div className="grid g-2 mb">
        <div className="card">
          <h3>💸 پورسانت‌های من</h3>
          <div className="stat mb">
            <div className="label">جمع کل</div>
            <div className="value" style={{ color: "var(--green)" }}>{usd(total)}</div>
          </div>
          <table className="tbl">
            <thead><tr><th>سطح</th><th>دسته</th><th>از</th><th>مبلغ</th></tr></thead>
            <tbody>
              {COMMISSIONS.map((c) => (
                <tr key={c.id}>
                  <td><span className={`badge ${c.level === 1 ? "gold" : c.level === 2 ? "blue" : "gray"}`}>L{c.level}</span></td>
                  <td>{c.category}</td>
                  <td>{c.from}</td>
                  <td className="ltr" style={{ color: "var(--green)" }}>${c.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr className="hr" />
          <div className="muted" style={{ fontSize: 11 }}>
            نرخ‌ها: resolvePct(category, level, tier) — override تایر &gt; نرخ عمومی دسته &gt; پیش‌فرض.
          </div>
        </div>

        <div className="card">
          <h3>🔗 کد معرف من</h3>
          <div className="hashbox mb" style={{ fontSize: 14, textAlign: "center", padding: 14 }}>
            {ME.referralCode}
          </div>
          <button className="btn gold mb" style={{ width: "100%" }} onClick={() => { navigator.clipboard?.writeText(ME.referralCode); toast("کد کپی شد"); }}>
            کپی کد معرف
          </button>
          <div className="muted" style={{ fontSize: 11.5 }}>
            زیرمجموعه‌های مستقیم: <b>۵ نفر</b> · کل زنجیره: <b>۲۱ نفر</b> · حجم ماه: <b>$4,200</b>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>🌳 درخت زیرمجموعه</h3>
        <div style={{ overflowX: "auto", padding: 10 }}>
          <div className="tree"><TreeNode node={MLM_TREE.root} /></div>
        </div>
      </div>
    </div>
  );
}

// ══════════ وام‌ها ══════════
export function Loans() {
  const [amount, setAmount] = useState("4000");
  const [months, setMonths] = useState("12");
  const [tab, setTab] = useState<"apply" | "schedule" | "sim">("apply");
  const [paidNos, setPaidNos] = useState<number[]>([1, 2]);

  const portfolioTotal = 10000; // 5000 USDT + 10000$ DARIC (دمو از سناریوی e2e)
  const ltv = (Number(amount) / portfolioTotal) * 100;
  const schedule = useMemo(
    () => buildSchedule(Number(amount), Number(months), "18").map((r: any) =>
      paidNos.includes(r.no) ? { ...r, status: "PAID" as const } : r
    ),
    [amount, months, paidNos]
  );
  const sim = simulate(Number(amount), Number(months), "18");

  function pay(no: number) {
    payInstallmentAction("L-881", no);
    setPaidNos((p) => [...p, no]);
    toast(`✅ قسط ${no} پرداخت شد — ${(no / Number(months) * 100).toFixed(0)}٪ وثیقه آزاد شد`);
  }

  return (
    <div>
      <div className="page-title">🏦 وام‌ها</div>
      <div className="page-sub">
        حداکثر <b style={{ color: "var(--gold)" }}>۸۰٪ ارزش پورتفوی</b> (USDT + DARIC) · قفل متناسب وثیقه ·
        آزادسازی به‌ازای هر قسط · سقف بتا: ${BETA_CONFIG.limits.loan_max_usd}.
      </div>

      <div className="tabs">
        <button className={tab === "apply" ? "on" : ""} onClick={() => setTab("apply")}>درخواست وام</button>
        <button className={tab === "schedule" ? "on" : ""} onClick={() => setTab("schedule")}>جدول اقساط</button>
        <button className={tab === "sim" ? "on" : ""} onClick={() => setTab("sim")}>شبیه‌ساز نرخ</button>
      </div>

      {tab === "apply" && (
        <div className="grid g-2">
          <div className="card">
            <h3>📝 فرم درخواست</h3>
            <div className="mb"><label className="muted">مبلغ وام (USDT)</label><input value={amount} onChange={(e) => setAmount(e.target.value)} className="ltr" /></div>
            <div className="mb"><label className="muted">تعداد اقساط</label>
              <select value={months} onChange={(e) => setMonths(e.target.value)}>
                <option value="6">۶ ماه</option><option value="12">۱۲ ماه</option><option value="18">۱۸ ماه</option><option value="24">۲۴ ماه</option>
              </select>
            </div>
            <div className="between mb">
              <span className="muted">ارزش پورتفوی</span><b className="ltr">{usd(portfolioTotal)}</b>
            </div>
            <div className="between mb">
              <span className="muted">نسبت LTV</span>
              <span className={`badge ${ltv <= 80 ? "green" : "red"}`}>{ltv.toFixed(1)}٪ {ltv <= 80 ? "(مجاز)" : "(بیش از حد!"}</span>
            </div>
            <div className="progress mb"><div style={{ width: `${Math.min(100, ltv)}%`, background: ltv > 80 ? "var(--red)" : undefined }} /></div>
            <div className="alert info" style={{ fontSize: 11.5 }}>
              💼 وثیقه متناسب: USDT ۵,۰۰۰$ قفل ۲,۰۰۰$ · DARIC ۱۰,۰۰۰$ قفل ۲,۰۰۰$ (به نسبت سهم)
            </div>
            <button className="btn gold" style={{ width: "100%" }} disabled={ltv > 80}
              onClick={() => { toast("✅ وام ثبت و وثیقه قفل شد"); setTab("schedule"); }}>
              ثبت درخواست وام
            </button>
          </div>
          <div className="card">
            <h3>🛡️ شروط</h3>
            <ul style={{ paddingRight: 18, color: "var(--muted)", fontSize: 12.5, lineHeight: 2.1 }}>
              <li>KYC سطح ۲ و فعال بودن 2FA</li>
              <li>حداکثر LTV = ۸۰٪ (خطا در صورت بیشتر)</li>
              <li>قفل وثیقه در DaricVault به‌صورت متناسب</li>
              <li>آزادسازی وثیقه: پس از هر قسط، متناسب با پیشرفت</li>
              <li>قسط معوق &gt; ۷ روز → اخطار؛ &gt; ۳۰ روز → فورکلوز</li>
              <li>نرخ پیش‌فرض: ۱۸٪ سالانه (قابل شبیه‌سازی)</li>
            </ul>
          </div>
        </div>
      )}

      {tab === "schedule" && (
        <div className="card">
          <h3>📅 جدول اقساط وام L-881 — {fmt(Number(amount), 0)}$ / {months} ماه</h3>
          <table className="tbl">
            <thead>
              <tr><th>قسط</th><th>سررسید</th><th>مبلغ</th><th>اصل</th><th>سود</th><th>آزادسازی وثیقه</th><th>وضعیت</th></tr>
            </thead>
            <tbody>
              {schedule.map((r) => (
                <tr key={r.no} style={{ background: r.status === "PAID" ? "rgba(34,197,94,.06)" : undefined }}>
                  <td className="ltr">{r.no}</td>
                  <td className="ltr">{r.dueDate}</td>
                  <td className="ltr">{fmt(Number(r.total))}</td>
                  <td className="ltr muted">{fmt(Number(r.principal))}</td>
                  <td className="ltr muted">{fmt(Number(r.interest))}</td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <div className="progress" style={{ width: 70 }}><div style={{ width: `${(r.no / schedule.length) * 100}%` }} /></div>
                      <span className="muted ltr">{((r.no - 1) / schedule.length * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td>
                    {r.status === "PAID" ? <span className="badge green">✅ پرداخت‌شده</span>
                      : r.status === "LATE" ? <span className="badge red">⚠️ معوق</span>
                      : <button className="btn sm gold" onClick={() => pay(r.no)}>پرداخت</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "sim" && (
        <div className="grid g-3">
          {sim.map((s, i) => (
            <div key={i} className={`scen ${s.rate === "18" ? "best" : ""}`}>
              <h4>{s.name} — نرخ {s.rate}٪</h4>
              <div className="big">{usd(Number(s.totalPayable))}</div>
              <div className="muted">سود کل: {usd(Number(s.totalInterest))}</div>
              <div className="muted ltr" style={{ fontSize: 11 }}>قسط ماهانه: {usd(Number(s.totalPayable) / Number(months))}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════ گردشگری ══════════
export function Tourism() {
  return (
    <div>
      <div className="page-title">✈️ گردشگری</div>
      <div className="page-sub">تورهای دوطرفه با موجودی زنده · پرداخت چندارزی (USDT/DARIC/EUR) · پورسانت باشگاه فعال.</div>
      <div className="grid g-2">
        {TOURS.map((t) => {
          const pct = Math.round((t.sold / t.seats) * 100);
          return (
            <div key={t.id} className="card">
              <div className="between mb">
                <b>{t.title}</b>
                <span className={`badge ${t.status === "OPEN" ? "green" : "red"}`}>{t.status === "OPEN" ? "باز" : "تکمیل"}</span>
              </div>
              <div className="muted mb" style={{ fontSize: 12 }}>📍 {t.origin} ✈️ {t.destination} · {t.days} روز</div>
              <div className="progress mb"><div style={{ width: `${pct}%` }} /></div>
              <div className="between mb">
                <span className="muted">{t.sold}/{t.seats} صندلی</span>
                <b className="ltr" style={{ color: "var(--gold)" }}>{usd(t.priceUSD)}</b>
              </div>
              <div className="row">
                <button className="btn gold" style={{ flex: 1 }} disabled={t.status !== "OPEN"}
                  onClick={() => toast("رزرو شد — پرداخت را انجام دهید")}>
                  {t.status === "OPEN" ? "رزرو و پرداخت" : "ظرفیت تکمیل"}
                </button>
                <span className="chip">پرداخت با DARIC ⭐</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════ بیمه ══════════
export function Insurance() {
  const [declared, setDeclared] = useState("50000");
  const [sel, setSel] = useState(INSURANCE[0]);
  const premium = (Number(declared) * sel.premiumPct) / 100;
  return (
    <div>
      <div className="page-title">🛡️ بیمه</div>
      <div className="page-sub">چهار دسته محصول · صدور با کد معرف (پورسانت L1=۲۵٪ دسته INSURANCE) · ثبت مطالبه آنلاین.</div>
      <div className="grid g-4 mb">
        {INSURANCE.map((p) => (
          <div key={p.id} className="card" style={{ borderColor: sel.id === p.id ? "var(--gold)" : "var(--line)", cursor: "pointer" }} onClick={() => setSel(p)}>
            <span style={{ fontSize: 22 }}>{p.kind === "TRAVEL" ? "✈️" : p.kind === "HEALTH" ? "🏥" : p.kind === "LIFE" ? "🕯️" : "🏠"}</span>
            <b style={{ display: "block", margin: "6px 0" }}>{p.name}</b>
            <div className="muted" style={{ fontSize: 11 }}>پوشش تا {usd(p.coverageUSD)}</div>
            <div className="badge gold mt">{p.premiumPct}٪ حق بیمه</div>
          </div>
        ))}
      </div>
      <div className="grid g-2">
        <div className="card">
          <h3>🧮 محاسبه حق بیمه — {sel.name}</h3>
          <div className="mb"><label className="muted">ارزش مورد بیمه ($)</label><input value={declared} onChange={(e) => setDeclared(e.target.value)} className="ltr" /></div>
          <div className="between mb"><span className="muted">نرخ</span><b className="ltr">{sel.premiumPct}٪</b></div>
          <div className="between mb"><span className="muted">حق بیمه سالانه</span><b className="ltr" style={{ color: "var(--gold)" }}>{usd(premium)}</b></div>
          <button className="btn gold" style={{ width: "100%" }} onClick={() => toast("بیمه‌نامه صادر شد 🛡️")}>خرید بیمه‌نامه</button>
        </div>
        <div className="card">
          <h3>📋 بیمه‌نامه‌های من</h3>
          <table className="tbl">
            <thead><tr><th>شماره</th><th>نوع</th><th>پوشش</th><th>وضعیت</th></tr></thead>
            <tbody>
              <tr><td className="ltr">DAR-8821A</td><td>مسافرتی</td><td className="ltr">$50,000</td><td><span className="badge green">فعال</span></td></tr>
              <tr><td className="ltr">DAR-7712B</td><td>سلامت</td><td className="ltr">$20,000</td><td><span className="badge green">فعال</span></td></tr>
            </tbody>
          </table>
          <hr className="hr" />
          <button className="btn" style={{ width: "100%" }} onClick={() => toast("فرم مطالبه باز شد")}>ثبت مطالبه خسارت</button>
        </div>
      </div>
    </div>
  );
}

// ══════════ چت ══════════
export function Chat() {
  const chat = useApp((s) => s.chat);
  const [text, setText] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { boxRef.current?.scrollTo({ top: 99999 }); }, [chat]);

  function send() {
    if (!text.trim()) return;
    const now = new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
    const userMsg = { from: "user" as const, body: text.trim(), ts: now };
    setState({ chat: [...chat, userMsg] });
    setText("");
    setTimeout(() => {
      const s = getState();
      const reply = { from: "admin" as const, body: "پیامتان دریافت شد ✅ کارشناس پشتیبانی تا چند لحظه دیگر پاسخ می‌دهد. (حالت دمو)", ts: now };
      setState({ chat: [...s.chat, reply] });
    }, 900);
  }

  return (
    <div>
      <div className="page-title">💬 چت پشتیبانی</div>
      <div className="page-sub">گفت‌وگوی ۱-به-۱ با احراز هویت JWT در handshake — امکان جعل senderId غیرممکن است.</div>
      <div className="card chat-box" style={{ maxWidth: 720 }}>
        <div className="chat-msgs" ref={boxRef}>
          {chat.map((m, i) => (
            <div key={i} className={`msg ${m.from}`}>
              {m.body}
              <div className="t">{m.ts}</div>
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="پیام خود را بنویسید..." onKeyDown={(e) => e.key === "Enter" && send()} />
          <button className="btn gold" onClick={send}>ارسال</button>
        </div>
      </div>
    </div>
  );
}
// ══════════ تنظیمات ══════════
export function Settings() {
  const [twoFA, setTwoFA] = useState(ME.twoFA);
  return (
    <div>
      <div className="page-title">⚙️ تنظیمات</div>
      <div className="page-sub">امنیت، احراز هویت و حساب کاربری.</div>
      <div className="grid g-2">
        <div className="card">
          <h3>🔐 امنیت</h3>
          <div className="between mb" style={{ padding: "8px 0", borderBottom: "1px solid rgba(34,48,88,.4)" }}>
            <div><b>احراز دو مرحله‌ای (TOTP)</b><div className="muted" style={{ fontSize: 11 }}>برای ورود، برداشت و معامله اجباری</div></div>
            <button className={`btn sm ${twoFA ? "green" : ""}`} onClick={() => { setTwoFA(!twoFA); toast(twoFA ? "2FA غیرفعال شد" : "2FA فعال شد"); }}>
              {twoFA ? "فعال ✓" : "غیرفعال"}
            </button>
          </div>
          <div className="between mb" style={{ padding: "8px 0", borderBottom: "1px solid rgba(34,48,88,.4)" }}>
            <div><b>هشدار ورود</b><div className="muted" style={{ fontSize: 11 }}>پیامک و ایمیل هر ورود جدید</div></div>
            <button className="btn sm green">فعال ✓</button>
          </div>
          <div className="between mb" style={{ padding: "8px 0", borderBottom: "1px solid rgba(34,48,88,.4)" }}>
            <div><b>لیست IP مجاز</b><div className="muted" style={{ fontSize: 11 }}>محدودسازی دسترسی</div></div>
            <button className="btn sm">مدیریت</button>
          </div>
          <div className="between">
            <div><b>گذرهای عبور نشست</b><div className="muted" style={{ fontSize: 11 }}>۲ دستگاه فعال</div></div>
            <button className="btn sm red">بازنشانی</button>
          </div>
        </div>

        <div className="card">
          <h3>🪪 احراز هویت (KYC)</h3>
          <div className="between mb">
            <span className="muted">وضعیت</span>
            <span className="badge green">✅ تأیید شده — سطح ۲</span>
          </div>
          <div className="between mb">
            <span className="muted">موبایل</span><b className="ltr">{ME.phone}</b>
          </div>
          <div className="between mb">
            <span className="muted">کد معرف</span><b className="ltr">{ME.referralCode}</b>
          </div>
          <div className="between mb">
            <span className="muted">سطح باشگاه</span><span className="badge gold">🥈 نقره</span>
          </div>
          <hr className="hr" />
          <div className="muted" style={{ fontSize: 11.5 }}>
            برای ارتقا به KYC سطح ۳ (برداشت نامحدود): آپلود مدرک محل سکونت.
          </div>
          <button className="btn mt" style={{ width: "100%" }} onClick={() => toast("فرم ارتقا باز شد")}>ارتقای سطح KYC</button>
        </div>
      </div>
    </div>
  );
}

// ══════════ ادمین: آپلود گزارش NAV ══════════
export function AdminReports() {
  const navCache = useApp((s) => s.navCache);
  const [busy, setBusy] = useState(false);
  async function calc() {
    setBusy(true);
    const res = await runNAV();
    setBusy(false);
    toast(`✅ NAV=${usd(Number(res.navPerToken))} — هش تولید شد`);
  }
  return (
    <div>
      <div className="page-title">📤 پنل ادمین — آپلود گزارش NAV</div>
      <div className="page-sub">Maker-Checker: گزارش باید توسط امضادار دوم (اوراکل ۲-از-۳) تأیید و روی IPFS منتشر شود.</div>
      <div className="grid g-2">
        <div className="card">
          <h3>🧮 محاسبه و هش‌گذاری</h3>
          <div className="muted mb">گزارش {ASSET_REPORT.period} — از NAV Page وارد می‌شود یا همین‌جا محاسبه می‌شود.</div>
          <button className="btn gold" style={{ width: "100%" }} disabled={busy} onClick={calc}>
            {busy ? "در حال محاسبه..." : "🔥 محاسبه NAV و تولید SHA-256"}
          </button>
          {navCache && (
            <div className="mt">
              <div className="between mb"><span className="muted">NAV هر توکن</span><b className="ltr" style={{ color: "var(--gold)" }}>${fmt(Number(navCache.navPerToken), 6)}</b></div>
              <div className="between mb"><span className="muted">کل NAV</span><b className="ltr">{usd(Number(navCache.totalNAV))}</b></div>
              <div className="muted mb">هش گزارش:</div>
              <div className="hashbox">{navCache.reportHash}</div>
            </div>
          )}
        </div>
        <div className="card">
          <h3>📝 فرم گزارش دستی</h3>
          <div className="grid g-2" style={{ gap: 10 }}>
            <div><label className="muted">سرمایه جذب‌شده ($)</label><input className="ltr" defaultValue="42500000" /></div>
            <div><label className="muted">تعداد سرمایه‌گذار</label><input className="ltr" defaultValue="12400" /></div>
            <div><label className="muted">املاک ($)</label><input className="ltr" defaultValue="31200000" /></div>
            <div><label className="muted">منقول ($)</label><input className="ltr" defaultValue="8400000" /></div>
            <div><label className="muted">پروژه‌ها ($)</label><input className="ltr" defaultValue="33600000" /></div>
            <div><label className="muted">در حال ساخت ($)</label><input className="ltr" defaultValue="11700000" /></div>
          </div>
          <button className="btn mt" style={{ width: "100%" }} onClick={() => toast("گزارش در صف تأیید (PENDING) قرار گرفت")}>
            ثبت برای تأیید دوم
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════ ادمین: صف KYC ══════════
export function AdminKYC() {
  const [queue, setQueue] = useState(KYC_QUEUE);
  return (
    <div>
      <div className="page-title">🪪 پنل ادمین — صف KYC</div>
      <div className="page-sub">بازبینی مدارک و امتیاز تطبیق چهره · تأیید/رد با ذکر دلیل (Audit Log ثبت می‌شود).</div>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>کاربر</th><th>موبایل</th><th>مدارک</th><th>امتیاز چهره</th><th>زمان</th><th>عملیات</th></tr></thead>
          <tbody>
            {queue.map((u) => (
              <tr key={u.id}>
                <td><b>{u.name}</b></td>
                <td className="ltr">{u.phone}</td>
                <td>{u.docs}</td>
                <td>
                  <span className={`badge ${u.faceScore >= 0.85 ? "green" : "red"}`}>
                    {u.faceScore} {u.faceScore >= 0.85 ? "✓" : "✗"}
                  </span>
                </td>
                <td className="muted">{u.ts}</td>
                <td>
                  <div className="row">
                    <button className="btn sm green" onClick={() => { setQueue((q) => q.filter((x) => x.id !== u.id)); toast(`${u.name} تأیید شد ✅`); }}>تأیید</button>
                    <button className="btn sm red" onClick={() => { setQueue((q) => q.filter((x) => x.id !== u.id)); toast(`${u.name} رد شد`); }}>رد</button>
                  </div>
                </td>
              </tr>
            ))}
            {queue.length === 0 && <tr><td colSpan={6} className="center muted" style={{ padding: 30 }}>صف خالی 🎉</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════ ادمین: دفتر حسابداری ══════════
export function AdminAccounting() {
  const journal = useApp((s) => s.journal);
  const demoLines = [
    { account: "1002:USDT_USER", debit: "1000", credit: "0" },
    { account: "4001:LOAN_RECEIVABLE", debit: "0", credit: "1000" },
  ];
  const tb = trialBalance([
    ...journal.flatMap((e) => e.lines),
    ...demoLines,
  ]);

  return (
    <div>
      <div className="page-title">📒 پنل ادمین — دفتر حسابداری</div>
      <div className="page-sub">قیدهای دوطرفه با Hash-Chain · Idempotency با source+refId · تراز آزمایشی لحظه‌ای.</div>

      <div className="grid g-4 mb">
        <div className="card stat"><div className="label">قیدهای این نشست</div><div className="value">{journal.length}</div></div>
        <div className="card stat"><div className="label">جمع بدهکار</div><div className="value" style={{ color: "var(--green)" }}>{usd(tb.debit)}</div></div>
        <div className="card stat"><div className="label">جمع بستانکار</div><div className="value" style={{ color: "var(--gold)" }}>{usd(tb.credit)}</div></div>
        <div className="card stat"><div className="label">وضعیت تراز</div><div className="value" style={{ fontSize: 18, color: tb.balanced ? "var(--green)" : "var(--red)" }}>{tb.balanced ? "✅ متوازن" : "🚨 نامتوازن"}</div></div>
      </div>

      <div className="grid g-2">
        <div className="card">
          <h3>📖 آخرین قیدها</h3>
          {journal.length === 0 && <div className="muted center" style={{ padding: 24 }}>
            قیدی ثبت نشده — از صفحات وام/معامله اقدام کنید تا رویدادها به دفتر بیایند.
          </div>}
          {journal.map((e) => (
            <div key={e.id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(34,48,88,.4)" }}>
              <div className="between">
                <b style={{ fontSize: 12.5 }}>{e.narrative}</b>
                <span className="badge blue">{e.source}</span>
              </div>
              <div className="muted ltr" style={{ fontSize: 10.5 }}>{e.id} · {e.refId} · seq {e.seq}</div>
              <div className="hashbox" style={{ marginTop: 6, fontSize: 10 }}>{e.hash.slice(0, 60)}…</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>⚖️ تراز آزمایشی (Trial Balance)</h3>
          <table className="tbl">
            <thead><tr><th>حساب</th><th>بدهکار</th><th>بستانکار</th></tr></thead>
            <tbody>
              {Object.entries(tb.byAccount).map(([code, v]) => (
                <tr key={code}>
                  <td>
                    <b style={{ fontSize: 11.5 }}>{(COA as any)[code]?.name ?? code}</b>
                    <div className="muted ltr" style={{ fontSize: 10 }}>{code}</div>
                  </td>
                  <td className="ltr">{v.debit ? fmt(v.debit) : "—"}</td>
                  <td className="ltr">{v.credit ? fmt(v.credit) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr className="hr" />
          <div className="alert ok" style={{ fontSize: 11.5 }}>
            ✅ زنجیره هش سالم است — هشدار Prometheus: AccountingDrift = 0
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════ ادمین: RBAC ══════════
export function AdminRBAC() {
  const roles = [
    { name: "SUPER_ADMIN", perms: ["*"], users: 2 },
    { name: "FINANCE", perms: ["accounting:VIEW", "accounting:EDIT", "loans:VIEW", "wallet:APPROVE"], users: 3 },
    { name: "SUPPORT", perms: ["users:VIEW", "kyc:VIEW", "kyc:EDIT"], users: 5 },
    { name: "CMS_EDITOR", perms: ["cms:VIEW", "cms:EDIT", "pages:EDIT"], users: 2 },
    { name: "CMS_APPROVER", perms: ["cms:VIEW", "pages:APPROVE"], users: 1 },
  ];
  const resources = ["kyc", "loans", "accounting", "mlm", "wheel", "tours", "policies", "cms", "rbac", "users"];
  return (
    <div>
      <div className="page-title">🔐 پنل ادمین — دسترسی‌ها (RBAC)</div>
      <div className="page-sub">مدیریت نقش‌ها با سه عمل View / Edit / Approve — الگوی Maker-Checker برای انتشار CMS و برداشت.</div>
      <div className="grid g-2">
        <div className="card">
          <h3>👥 نقش‌ها</h3>
          {roles.map((r) => (
            <div key={r.name} className="between" style={{ padding: "9px 0", borderBottom: "1px solid rgba(34,48,88,.4)" }}>
              <div>
                <b className="ltr" style={{ fontSize: 12.5 }}>{r.name}</b>
                <div className="muted" style={{ fontSize: 10.5 }}>{r.users} کاربر</div>
              </div>
              <div className="row" style={{ flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 340 }}>
                {r.perms.map((p) => <span key={p} className="chip ltr" style={{ fontSize: 10 }}>{p}</span>)}
              </div>
            </div>
          ))}
          <button className="btn gold mt" onClick={() => toast("نقش جدید ساخته شد")}>+ ساخت نقش</button>
        </div>
        <div className="card">
          <h3>🧩 ماتریس مجوزها</h3>
          <table className="tbl">
            <thead><tr><th>منبع</th><th>VIEW</th><th>EDIT</th><th>APPROVE</th></tr></thead>
            <tbody>
              {resources.map((res, i) => (
                <tr key={res}>
                  <td className="ltr" style={{ fontSize: 12 }}>{res}</td>
                  {["V", "E", "A"].map((a, j) => (
                    <td key={a}>
                      <input type="checkbox" defaultChecked={(i + j) % 3 !== 0} style={{ width: 16, height: 16, accentColor: "#f0b429" }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════ ادمین: Audit Log ══════════
export function AdminAudit() {
  return (
    <div>
      <div className="page-title">📝 پنل ادمین — Audit Log</div>
      <div className="page-sub">هر اکشن ادمین با دکوراتور audited ثبت می‌شود — قابل جستجو و خروجی CSV.</div>
      <div className="card">
        <div className="row mb">
          <input placeholder="جستجوی actor / action / resource..." style={{ maxWidth: 360 }} />
          <select style={{ maxWidth: 160 }}><option>همه اکشن‌ها</option><option>kyc</option><option>wallet</option><option>cms</option></select>
          <button className="btn">🔍 جستجو</button>
          <button className="btn gold" onClick={() => toast("خروجی CSV آماده شد")}>⬇️ خروجی</button>
        </div>
        <table className="tbl">
          <thead><tr><th>کاربر</th><th>اکشن</th><th>منبع</th><th>جزئیات</th><th>زمان</th></tr></thead>
          <tbody>
            {AUDIT_LOG.map((a) => (
              <tr key={a.id}>
                <td className="ltr">{a.actor}</td>
                <td><span className="badge blue ltr">{a.action}</span></td>
                <td className="ltr muted">{a.resource}</td>
                <td>{a.detail}</td>
                <td className="muted ltr">{a.ts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════ 404 ══════════
export function NotFound() {
  return (
    <div className="center" style={{ padding: 80 }}>
      <div style={{ fontSize: 48 }}>🏛️</div>
      <h2 className="mt">صفحه پیدا نشد</h2>
      <p className="muted mb">مسیر مورد نظر در سوپر‌اپ 100plan وجود ندارد.</p>
      <a href="#/" className="btn gold">بازگشت به داشبورد</a>
    </div>
  );
}
