import Decimal from "decimal.js";
import { prisma } from "./db";
import { publish } from "@daric/eventbus";

const DEFAULT_RATES = { 1: "25", 2: "12", 3: "6" };

/** نرخ نهایی: override سطح باشگاه > نرخ عمومی دسته > پیش‌فرض */
async function resolvePct(category: string, level: number, tier: string): Promise<Decimal> {
  const override = await prisma.commissionRule.findFirst({
    where: { category, level, tier, active: true } });
  if (override) return new Decimal(override.pct);
  const general = await prisma.commissionRule.findFirst({
    where: { category, level, tier: null, active: true } });
  return new Decimal(general?.pct ?? DEFAULT_RATES[level as 1 | 2 | 3]);
}

/**
 * پردازش خرید: از upline خریدار تا ۳ سطح بالا پورسانت می‌رود.
 * L1 نامحدود است (هر تعداد زیرمجموعه) ولی پورسانت فقط ۳ سطح.
 */
export async function processPurchase(e: {
  userId: string; category: string; amountUSD: string; refId: string }) {
  const buyer = await prisma.user.findUniqueOrThrow({ where: { id: e.userId } });
  const ref = await prisma.referral.findUniqueOrThrow({ where: { userId: e.userId } });

  // upline = اجداد در path، نزدیک‌ترین = L1
  const ancestorIds = ref.path.split("/").filter(Boolean).slice(0, -1).reverse().slice(0, 3);
  const created: any[] = [];

  for (let i = 0; i < ancestorIds.length; i++) {
    const level = i + 1;
    const up = await prisma.user.findUnique({ where: { id: ancestorIds[i] } });
    if (!up) continue;
    const pct = await resolvePct(e.category, level, up.clubTier);
    const amount = new Decimal(e.amountUSD).times(pct).div(100);

    const c = await prisma.commission.upsert({
      where: { category_refId_beneficiaryId_level: {
        category: e.category, refId: e.refId, beneficiaryId: up.id, level } },
      create: { beneficiaryId: up.id, sourceUserId: e.userId, category: e.category,
        level, baseAmount: e.amountUSD, pct, amount, refId: e.refId },
      update: {} });  // idempotent — تکرار = بدون تغییر
    created.push(c);
  }

  await publish("mlm.commissions.created",
    { refId: e.refId, category: e.category, count: created.length });
  return created;
}

/** اجرای دسته پرداخت — ادمین */
export async function runPayoutBatch(adminId: string) {
  const pending = await prisma.commission.findMany({ where: { status: "PENDING" } });
  const total = pending.reduce((s, c) => s.plus(c.amount), new Decimal(0));

  const batch = await prisma.payoutBatch.create({ data: {
    total, count: pending.length, status: "EXECUTED", executedBy: adminId } });

  for (const c of pending) {
    // اعتبار به کیف پول فقط از طریق حسابداری (فاز ۳)
    await publish("accounting.journal.request", {
      source: "mlm", refId: `payout:${c.id}`,
      narrative: `پورسانت Lc.level{c.level}c.level{c.category}`,
      lines: [
        { account: "5003:MLM_COMMISSION", debit: c.amount, credit: "0" },
        { account: "1002:USDT_USER", debit: "0", credit: c.amount, userId: c.beneficiaryId } ] });
    await prisma.commission.update({ where: { id: c.id },
      data: { status: "PAID", batchId: batch.id } });
  }
  return batch;
}

export async function downlineStats(userId: string) {
  const me = await prisma.referral.findUnique({ where: { userId } });
  const direct = await prisma.referral.findMany({ where: { parentId: userId } });
  const levels: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  if (me) for (let d = 1; d <= 3; d++)
    levels[d] = await prisma.referral.count({
      where: { path: { startsWith: me.path + me.userId + "/" }, depth: me.depth + d } });
  const earnings = await prisma.commission.groupBy({
    by: ["level"], where: { beneficiaryId: userId, status: "PAID" }, _sum: { amount: true } });
  return { directCount: direct.length, downline: levels, earnings, volumeUSD: 0 };
}
