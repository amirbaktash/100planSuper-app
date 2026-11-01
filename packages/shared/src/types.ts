// ═══════════════════════════════════════════════════════════════
// DARIC Super App — انواع مشترک (packages/shared)
// برگرفته از مشخصات چت‌های قبلی: AssetReport، وام، پورسانت، معاملات
// ═══════════════════════════════════════════════════════════════

/** گزارش دارایی — ورودی محاسبه NAV توکن داریک */
export interface AssetReport {
  reportDate: string; // ISO datetime
  period: "daily" | "weekly" | "monthly";
  capital: {
    attracted: number; // سرمایه جذب‌شده
    investorCount: number;
  };
  properties: {
    immovable: number; // غیرمنقول
    movable: number; // منقول
  };
  projects: {
    livestock: number; // دام‌داری
    agriculture: number; // کشاورزی
    energy: number; // انرژی
    games: number; // بازی‌ها
  };
  constructionUnits: number; // واحدهای در حال ساخت
  physicalAssets: number; // دارایی فیزیکی
  growth: {
    appInstalls: number;
    mlmClubSize: number;
  };
  currency: "USD" | "EUR" | "IRR";
}

export interface NAVResult {
  navPerToken: string; // رشته Decimal، ۱۸ اعشار
  totalNAV: string;
  breakdown: Record<string, string>;
  reportHash: string; // hash گزارش برای ثبت روی-chain
}

/** نوع دارایی کیف پول */
export type WalletAsset = "USDT" | "DARIC" | "SHARE" | "EUR" | "IRR" | "GOLD" | "SILVER";

export interface Balance {
  asset: WalletAsset | string;
  amount: string;
  locked: string; // قفل‌شده در سفارش/وثیقه
}

/** سفارش صرافی */
export interface Order {
  id: string;
  userId: string;
  pair: string;
  side: "buy" | "sell";
  type: "limit" | "market";
  price?: number;
  qty: number;
  filled: number;
  ts: number;
}

export interface Fill {
  price: number;
  qty: number;
  buyOrder: string;
  sellOrder: string;
}

/** وام — حداکثر ۸۰٪ ارزش پورتفولیو */
export interface LoanApplication {
  amountUSD: string;
  months: number;
  annualRatePct?: string;
}

export interface CollateralSlice {
  asset: string;
  portfolioValue: string;
  lockAmount: string;
}

export interface LoanScheduleRow {
  no: number;
  dueDate: string;
  total: string;
  principal: string;
  interest: string;
  collateralUnlockPct: number;
  status: "PENDING" | "PAID" | "LATE";
  lateDays?: number;
}

/** باشگاه — سطوح پورسانت: L1=25% L2=12% L3=6% */
export type ClubTier = "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";

export interface Commission {
  id: string;
  level: 1 | 2 | 3;
  amount: string;
  category: string;
  from: string;
  ts: string;
}

/** گردونه شانس — ۱۰ خانه، Provably-Fair */
export type PrizeType = "CASH" | "TOKEN_DARIC" | "FREE_SPIN" | "NOTHING";

export interface WheelSegment {
  index: number;
  label: string;
  weight: number;
  prizeType: PrizeType;
  prizeValue: number;
  color: string;
}

export interface SpinResult {
  spinId: string;
  segment: number;
  label: string;
  prizeType: PrizeType;
  prizeValue: number;
  net: number;
  commitment: string;
  serverSeed: string;
}

/** رویدادهای ماژول‌ها → دفتر حسابداری */
export type ModuleEventType =
  | "wallet.deposit.confirmed"
  | "wallet.withdraw.broadcast"
  | "exchange.trade.fill"
  | "gold.trade.executed"
  | "loan.disbursed"
  | "loan.installment.paid"
  | "loan.foreclosed"
  | "mlm.commission.paid"
  | "investment.attracted"
  | "tourism.booking.confirmed"
  | "insurance.policy.purchased"
  | "casino.wager.placed";

export interface JournalLine {
  account: string;
  debit: string;
  credit: string;
  userId?: string;
  asset?: string;
}

export interface JournalEntry {
  id: string;
  source: string;
  refId: string;
  narrative: string;
  fiscalDate: string;
  seq: number;
  hash: string;
  prevHash: string;
  lines: JournalLine[];
}

/** ثبت‌نام OTP + KYC */
export type KycStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export interface UserProfile {
  phone: string;
  referralCode: string;
  clubTier: ClubTier;
  kycStatus: KycStatus;
  kycLevel: number;
  twoFA: boolean;
}

/** بیمه */
export interface InsuranceProduct {
  id: string;
  name: string;
  kind: "TRAVEL" | "HEALTH" | "LIFE" | "PROPERTY";
  premiumPct: number;
  coverageUSD: number;
  active: boolean;
}

/** تور گردشگری */
export interface Tour {
  id: string;
  title: string;
  origin: string;
  destination: string;
  days: number;
  priceUSD: number;
  seats: number;
  sold: number;
  status: "OPEN" | "FULL" | "CLOSED";
}

/** Beta launch — سقف‌ها و KPI‌ها (beta-config.json) */
export const BETA_CONFIG = {
  phase: "BETA_SOFT_LAUNCH",
  duration_weeks: 4,
  entry: "invite_only",
  invite_codes: 200,
  limits: {
    withdraw_user_daily_usd: 500,
    withdraw_global_daily_usd: 25000,
    loan_max_usd: 1000,
    wheel_daily_spins: 3,
  },
  kpis: { uptime_pct: 99.5, p95_latency_ms: 500, accounting_drift: 0 },
} as const;

/** کارمزدهای صرافی: ۰.۲٪ پایه — ۰.۱٪ با پرداخت داریک */
export const EXCHANGE_FEE = { base: 0.002, daric: 0.001 } as const;

/** اسپرد طلا/نقره: ۰.۵٪ */
export const METAL_SPREAD = 0.005;

/** عرضه کل توکن داریک */
export const TOTAL_SUPPLY = "1000000000"; // 1B DARIC
