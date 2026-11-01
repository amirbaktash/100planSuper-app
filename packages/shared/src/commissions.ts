// ═══════════════════════════════════════════════════════════════
// سیستم پورسانت باشگاه (MLM) — ۳ سطح: ۲۵٪ / ۱۲٪ / ۶٪
// override سطح باشگاه > نرخ عمومی دسته > پیش‌فرض
// L1 نامحدود (هر تعداد زیرمجموعه) ولی پورسانت فقط ۳ سطح
// ═══════════════════════════════════════════════════════════════

import type { ClubTier, Commission } from "./types";

export const DEFAULT_RATES: Record<number, string> = { 1: "25", 2: "12", 3: "6" };

export interface CommissionRule {
  category: string;
  level: 1 | 2 | 3;
  tier: ClubTier | null;
  pct: string;
  active: boolean;
}

/** دسته‌های رویدادی که پورسانت فعال می‌کنند */
export const CATEGORY_MAP: Record<string, string> = {
  "tourism.booking.confirmed": "TOURISM",
  "insurance.policy.purchased": "INSURANCE",
  "investment.attracted": "INVESTMENT",
  "gold.trade.executed": "GOLDSILVER",
  "casino.wager.placed": "CASINO",
};

/** نرخ نهایی: override سطح باشگاه > نرخ عمومی دسته > پیش‌فرض */
export function resolvePct(
  category: string,
  level: 1 | 2 | 3,
  tier: ClubTier,
  rules: CommissionRule[] = []
): number {
  const override = rules.find((r) => r.category === category && r.level === level && r.tier === tier && r.active);
  if (override) return Number(override.pct);
  const general = rules.find((r) => r.category === category && r.level === level && r.tier === null && r.active);
  if (general) return Number(general.pct);
  return Number(DEFAULT_RATES[level]);
}

export interface Upline {
  userId: string;
  username: string;
  level: 1 | 2 | 3;
  tier: ClubTier;
}

/**
 * پردازش خرید: از upline خریدار تا ۳ سطح بالا پورسانت می‌رود.
 * خروجی: لیست قابل پرداخت + رویداد mlm.commission.paid برای هر سطح
 */
export function processPurchase(
  buyer: { userId: string; upline: Upline[] },
  category: string,
  amountUSD: number,
  rules: CommissionRule[] = []
): { commissions: Commission[]; events: { type: string; payload: any }[] } {
  const commissions: Commission[] = [];
  const events: { type: string; payload: any }[] = [];

  for (const u of buyer.upline.slice(0, 3)) {
    const pct = resolvePct(category, u.level, u.tier, rules);
    const amount = (amountUSD * pct) / 100;
    if (amount <= 0) continue;
    const id = `CM-${buyer.userId}-${u.level}-${Math.round(amountUSD * 100)}`;
    commissions.push({
      id,
      level: u.level,
      amount: amount.toFixed(2),
      category,
      from: buyer.userId,
      ts: new Date().toISOString(),
    });
    events.push({
      type: "mlm.commission.paid",
      payload: { commissionId: id, userId: u.userId, amount: amount.toFixed(2) },
    });
  }
  return { commissions, events };
}

/** توزیع: ۵۰٪ L1، ۳۰٪ L2، ۲۰٪ L3 از کل پورسانت (اختیاری، برای payout batch) */
export const PAYOUT_SPLIT = { 1: 0.5, 2: 0.3, 3: 0.2 } as const;
