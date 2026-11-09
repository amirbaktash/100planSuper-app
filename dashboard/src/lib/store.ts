// ═══════════════════════════════════════════════════════════════
// لایه داده دمو — منطق واقعی از @daric/shared + state سراسری
// (در production: همین اینتراکشن‌ها به API سرویس‌ها می‌روند)
// ═══════════════════════════════════════════════════════════════
import { useSyncExternalStore } from "react";
import {
  OrderBook, Ledger, computeNAV, processPurchase, buildSchedule, hashPayload,
  DEFAULT_SEGMENTS, TIERS, EXCHANGE_FEE, BETA_CONFIG,
  type AssetReport, type Order, type JournalEntry, type ClubTier,
} from "@daric/shared";

// ── کاربر جاری (دمو) ──
export const ME = {
  name: "علی محمدی",
  phone: "۰۹۱۲••••۴۵۲۱",
  referralCode: "DARIC-A7K2",
  clubTier: "SILVER" as ClubTier,
  kycStatus: "APPROVED" as const,
  kycLevel: 2,
  twoFA: true,
};

// ── قیمت‌های بازار (دمو، قابل‌اتصال به فید) ──
export const PRICES = {
  DARIC: 1.84, USDT: 1, EUR: 1.08, IRR: 0.0000239,
  GOLD: 78.4, // $/gram
  SILVER: 0.92,
  BTC: 67250, ETH: 3210, BNB: 585, SOL: 168, XRP: 0.52,
};

export const ASSET_REPORT: AssetReport = {
  reportDate: new Date().toISOString(),
  period: "monthly",
  capital: { attracted: 42_500_000, investorCount: 12_400 },
  properties: { immovable: 31_200_000, movable: 8_400_000 },
  projects: { livestock: 6_100_000, agriculture: 9_800_000, energy: 14_200_000, games: 3_500_000 },
  constructionUnits: 11_700_000,
  physicalAssets: 7_900_000,
  growth: { appInstalls: 240_000, mlmClubSize: 12_400 },
  currency: "USD",
};

export const NAV_HISTORY = [1.62, 1.65, 1.63, 1.68, 1.71, 1.69, 1.74, 1.78, 1.76, 1.8, 1.82, 1.84];

// ── کیف پول ──
export const WALLET = [
  { asset: "USDT", amount: 12450.5, locked: 800 },
  { asset: "DARIC", amount: 25000, locked: 5000 },
  { asset: "SHARE", amount: 1200, locked: 0 },
  { asset: "EUR", amount: 1500, locked: 0 },
  { asset: "GOLD", amount: 12.5, locked: 0 }, // گرم
  { asset: "SILVER", amount: 240, locked: 0 }, // گرم
];

// ── سفارش‌های باز ──
export const OPEN_ORDERS: Order[] = [
  { id: "O-101", userId: ME.referralCode, pair: "DARIC/USDT", side: "buy", type: "limit", price: 1.78, qty: 2000, filled: 500, ts: Date.now() - 36e5 },
  { id: "O-102", userId: ME.referralCode, pair: "DARIC/USDT", side: "sell", type: "limit", price: 1.95, qty: 3000, filled: 0, ts: Date.now() - 72e5 },
];

// ── تاریخچه تراکنش‌ها ──
export const TXS = [
  { id: "TX9", type: "خرید طلا", asset: "GOLD", amount: "+2.5 گرم", usd: -196, ts: "۱۴۰۳/۰۸/۱۲", status: "DONE" },
  { id: "TX8", type: "پورسانت L1", asset: "USDT", amount: "+250.00", usd: 250, ts: "۱۴۰۳/۰۸/۱۱", status: "DONE" },
  { id: "TX7", type: "خرید داریک", asset: "DARIC", amount: "+5,000", usd: -9200, ts: "۱۴۰۳/۰۸/۱۰", status: "DONE" },
  { id: "TX6", type: "برداشت USDT", asset: "USDT", amount: "-400.00", usd: -400, ts: "۱۴۰۳/۰۸/۰۹", status: "TIMELOCK", eta: "+۳۱ ساعت" },
  { id: "TX5", type: "قسط ۳ وام", asset: "USDT", amount: "-361.85", usd: -361.85, ts: "۱۴۰۳/۰۸/۰۱", status: "DONE" },
];

// ── پورسانت‌ها ──
export const COMMISSIONS = [
  { id: "C1", level: 1 as const, amount: "250.00", category: "GOLDSILVER", from: "رضا کریمی", ts: "۱۴۰۳/۰۸/۱۱" },
  { id: "C2", level: 1 as const, amount: "125.00", category: "TOURISM", from: "سارا احمدی", ts: "۱۴۰۳/۰۸/۰۹" },
  { id: "C3", level: 2 as const, amount: "60.00", category: "INSURANCE", from: "مهدی رضایی", ts: "۱۴۰۳/۰۸/۰۷" },
  { id: "C4", level: 2 as const, amount: "48.00", category: "CASINO", from: "نگار شریفی", ts: "۱۴۰۳/۰۸/۰۵" },
  { id: "C5", level: 3 as const, amount: "18.00", category: "GOLDSILVER", from: "امیر صادقی", ts: "۱۴۰۳/۰۸/۰۲" },
];

// ── درخت زیرمجموعه (دمو) ──
export const MLM_TREE = {
  root: { name: "علی (شما)", tier: "SILVER" },
  children: [
    {
      name: "رضا کریمی", tier: "GOLD",
      children: [
        { name: "مهدی رضایی", tier: "BRONZE", children: [
          { name: "امیر صادقی", tier: "BRONZE", children: [] },
          { name: "لیلا نوری", tier: "BRONZE", children: [] },
        ] },
        { name: "نگار شریفی", tier: "SILVER", children: [] },
      ],
    },
    { name: "سارا احمدی", tier: "SILVER", children: [
      { name: "بهرام کاوه", tier: "BRONZE", children: [] },
    ] },
    { name: "حسین مرادی", tier: "BRONZE", children: [] },
    { name: "زهرا فرهادی", tier: "BRONZE", children: [] },
    { name: "کامران ایزدی", tier: "BRONZE", children: [] },
  ],
};

// ── تورها ──
export const TOURS = [
  { id: "T1", title: "کاپادوکیا بالون‌سواری", origin: "تهران", destination: "کاپادوکیا", days: 5, priceUSD: 890, seats: 30, sold: 22, status: "OPEN" },
  { id: "T2", title: "دبی مال و آبنما", origin: "تهران", destination: "دبی", days: 4, priceUSD: 720, seats: 40, sold: 40, status: "FULL" },
  { id: "T3", title: "استانبول ترکیبی", origin: "شیراز", destination: "استانبول", days: 6, priceUSD: 980, seats: 25, sold: 11, status: "OPEN" },
  { id: "T4", title: "مشهد زیارتی ویژه", origin: "تهران", destination: "مشهد", days: 3, priceUSD: 260, seats: 50, sold: 18, status: "OPEN" },
];

// ── بیمه‌ها ──
export const INSURANCE = [
  { id: "I1", name: "بیمه مسافرتی", kind: "TRAVEL" as const, premiumPct: 2.5, coverageUSD: 50000, active: true },
  { id: "I2", name: "بیمه سلامت خانواده", kind: "HEALTH" as const, premiumPct: 6, coverageUSD: 20000, active: true },
  { id: "I3", name: "بیمه عمر پس‌انداز", kind: "LIFE" as const, premiumPct: 12, coverageUSD: 100000, active: true },
  { id: "I4", name: "بیمه اموال و منزل", kind: "PROPERTY" as const, premiumPct: 4, coverageUSD: 30000, active: true },
];

// ── پروژه‌های سرمایه‌گذاری (بخش‌های سرمایه) ──
export const CAPITAL_SECTIONS = [
  { id: "S1", name: "انرژی (پنل خورشیدی)", value: 14_200_000, growth: 12.4, investors: 3100, icon: "⚡", status: "ACTIVE" },
  { id: "S2", name: "کشاورزی گلخانه‌ای", value: 9_800_000, growth: 8.1, investors: 2400, icon: "🌾", status: "ACTIVE" },
  { id: "S3", name: "دام‌داری صنعتی", value: 6_100_000, growth: 6.5, investors: 1800, icon: "🐄", status: "ACTIVE" },
  { id: "S4", name: "بازی‌ها و سرگرمی", value: 3_500_000, growth: 15.2, investors: 950, icon: "🎮", status: "ACTIVE" },
  { id: "S5", name: "املاک و ساخت", value: 42_900_000, growth: 5.8, investors: 4150, icon: "🏗️", status: "ACTIVE" },
];

// ── استارتاپ‌ها ──
export const STARTUPS = [
  { id: "P1", name: "آرشاکی (ArshaQ)", field: "بازی‌های رقابتی", goal: 500000, raised: 312000, investors: 420, icon: "🎮" },
  { id: "P2", name: "تکاوُ (Takav)", field: "لیزرتگ و میدان تیر", goal: 350000, raised: 198000, investors: 260, icon: "🔫" },
  { id: "P3", name: "سوله‌بان (SolehBan)", field: "انرژی تجدیدپذیر", goal: 800000, raised: 640000, investors: 780, icon: "⚡" },
  { id: "P4", name: "دامینو (Damineh)", field: "دام‌داری هوشمند", goal: 420000, raised: 89000, investors: 140, icon: "🐄" },
];

// ── مکان‌های لیزرتگ/کلاب/کازینو ──
export const VENUES = [
  { id: "V1", name: "آرنا مرکزی تهران", kind: "LASER_TAG", city: "تهران", sessions: 14, priceUSD: 25, open: true },
  { id: "V2", name: "کلاب الماس کیش", kind: "CLUB", city: "کیش", sessions: 6, priceUSD: 120, open: true },
  { id: "V3", name: "آرنا اصفهان", kind: "LASER_TAG", city: "اصفهان", sessions: 10, priceUSD: 22, open: true },
  { id: "V4", name: "سالن بازی شیراز", kind: "CASINO_FLOOR", city: "شیراز", sessions: 8, priceUSD: 40, open: false },
];

// ── کوئی KYC ادمین ──
export const KYC_QUEUE = [
  { id: "U1", name: "مینا حسینی", phone: "۰۹۱۲••••۱۱۲۲", docs: "کارت ملی + سلفی", faceScore: 0.91, ts: "۲ ساعت پیش" },
  { id: "U2", name: "پارسا نیکو", phone: "۰۹۳۵••••۸۸۹۱", docs: "گذرنامه + ویدیو", faceScore: 0.88, ts: "۵ ساعت پیش" },
  { id: "U3", name: "الناز کاظمی", phone: "۰۹۱۹••••۴۵۶۷", docs: "کارت ملی + سلفی", faceScore: 0.79, ts: "۱ روز پیش" },
];

// ── Audit Log ──
export const AUDIT_LOG = [
  { id: "A1", actor: "admin@daric", action: "kyc.approve", resource: "users/U9", ts: "۱۴۰۳/۰۸/۱۲ ۱۴:۳۲", detail: "تأیید KYC سطح ۲" },
  { id: "A2", actor: "finance@daric", action: "accounting.journal.post", resource: "journal/JE-001204", ts: "۱۴۰۳/۰۸/۱۲ ۱۳:۰۵", detail: "قسط ۳ وام L-881" },
  { id: "A3", actor: "admin@daric", action: "cms.page.approve", resource: "pages/hero", ts: "۱۴۰۳/۰۸/۱۲ ۱۱:۴۸", detail: "انتشار بنر جدید" },
  { id: "A4", actor: "support@daric", action: "withdraw.approve", resource: "wallet/W-5521", ts: "۱۴۰۳/۰۸/۱۱ ۱۹:۲۰", detail: "دو-تصدیقی برداشت ۱۲,۰۰۰$" },
  { id: "A5", actor: "admin@daric", action: "mlm.rule.override", resource: "commission/GOLDSILVER/L1", ts: "۱۴۰۳/۰۸/۱۰ ۰۹:۱۵", detail: "nرخ ویژه تایر GOLD" },
];

// ── چت پشتیبانی ──
export const CHAT_SEED: { from: "user" | "admin"; body: string; ts: string }[] = [
  { from: "admin", body: "سلام علی عزیز 👋 به پشتیبانی داریک خوش آمدید. چطور کمکتان کنم؟", ts: "۱۴:۰۲" },
  { from: "user", body: "سلام، برداشتم هنوز ارسال نشده؟", ts: "۱۴:۰۳" },
  { from: "admin", body: "برداشت شما (۴۰۰ USDT) در صف Timelock ۴۸ ساعته است و تا فردا ساعت ۱۴:۰۰ ارسال می‌شود. 🕐", ts: "۱۴:۰۴" },
];

// ═══════ State سراسری ═══════
export interface AppState {
  route: string;
  balances: typeof WALLET;
  orders: Order[];
  book: OrderBook;
  ledger: Ledger;
  journal: JournalEntry[];
  spinsToday: number;
  wheelResult: { segment: number; label: string; net: number } | null;
  chat: { from: "user" | "admin"; body: string; ts: string }[];
  navCache: { navPerToken: string; totalNAV: string; reportHash: string } | null;
  toast: string | null;
}

let state: AppState = {
  route: location.hash.replace("#", "") || "/",
  balances: WALLET.map((b) => ({ ...b })),
  orders: OPEN_ORDERS.map((o) => ({ ...o })),
  book: (() => {
    const ob = new OrderBook();
    // seed دفتر بازار برای نمایش عمق
    for (let i = 0; i < 12; i++) {
      ob.place({ id: `seed-b${i}`, userId: "mkt", pair: "DARIC/USDT", side: "buy", type: "limit", price: 1.84 - i * 0.01, qty: 400 + i * 130, filled: 0, ts: Date.now() });
      ob.place({ id: `seed-a${i}`, userId: "mkt", pair: "DARIC/USDT", side: "sell", type: "limit", price: 1.85 + i * 0.01, qty: 350 + i * 110, filled: 0, ts: Date.now() });
    }
    return ob;
  })(),
  ledger: new Ledger(),
  journal: [],
  spinsToday: 0,
  wheelResult: null,
  chat: CHAT_SEED.map((c) => ({ ...c })),
  navCache: null,
  toast: null,
};

const listeners = new Set<() => void>();
export function setState(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export function getState() { return state; }
export function useApp<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => sel(state)
  );
}

// ── هشدار کوتاه‌مدت ──
export function toast(msg: string) {
  setState({ toast: msg });
  setTimeout(() => setState({ toast: null }), 3500);
}

// ── ناوبری ──
window.addEventListener("hashchange", () => {
  setState({ route: location.hash.replace("#", "") || "/" });
});
export function go(path: string) {
  location.hash = path;
}

// ── اکشن‌های دامنه (فراخوانی منطق shared) ──
export async function runNAV() {
  const res = computeNAV(ASSET_REPORT);
  const reportHash = await hashPayload(ASSET_REPORT);
  const nav = { navPerToken: res.navPerToken, totalNAV: res.totalNAV, reportHash };
  setState({ navCache: nav });
  return nav;
}

export function placeOrder(side: "buy" | "sell", type: "limit" | "market", qty: number, price?: number) {
  const s = getState();
  const order: Order = {
    id: `O-${Date.now().toString(36)}`, userId: ME.referralCode,
    pair: "DARIC/USDT", side, type, price: type === "limit" ? price : undefined,
    qty, filled: 0, ts: Date.now(),
  };
  const fills = s.book.place(order);
  const feeRate = EXCHANGE_FEE.base; // در production با DARIC نصف می‌شود
  const fee = fills.reduce((a, f) => a + f.price * f.qty * feeRate, 0);
  const rest = order.filled < order.qty ? order : null;
  setState({
    orders: [...s.orders.filter((o) => o.id !== order.id), ...(rest ? [rest] : [])],
    book: s.book,
  });
  return { fills, fee };
}

export function cancelOrder(id: string) {
  const s = getState();
  s.book.cancel(id);
  setState({ orders: s.orders.filter((o) => o.id !== id), book: s.book });
}

export function payInstallmentAction(loanId: string, no: number) {
  // نمونه: آزادسازی وثیقه + قید دفتر + رویداد
  const s = getState();
  const entry = {
    id: `JE-${s.journal.length + 1}`, source: "loan", refId: `${loanId}:inst:${no}`,
    narrative: `قسط ${no} وام`, fiscalDate: new Date().toISOString(),
    seq: s.journal.length + 1, hash: "demo" + Date.now().toString(16),
    prevHash: s.journal.at(-1)?.hash ?? "GENESIS",
    lines: [
      { account: "1002:USDT_USER", debit: "361.85", credit: "0" },
      { account: "4001:LOAN_RECEIVABLE", debit: "0", credit: "286.85" },
      { account: "4101:INTEREST_INCOME", debit: "0", credit: "75.00" },
    ],
  };
  setState({ journal: [...s.journal, entry] });
  return entry;
}

export { TIERS, EXCHANGE_FEE, BETA_CONFIG, DEFAULT_SEGMENTS, processPurchase, buildSchedule };
