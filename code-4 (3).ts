import { prisma } from "./db";
import { publish } from "@daric/eventbus";
import Decimal from "decimal.js";

export interface CollateralSlice {
  asset: string;        // DARIC | USDT | BTC | GOLD | SHARE | ...
  lockAmount: string;   // مقدار قفل‌شده از این دارایی برای وام
  unlockedSoFar: string;
}

/**
 * محاسبه برش متناسب: هر دارایی به نسبت سهمش از کل پرتفوی
 * تا سقف 80% ارزش خودش (LTV per-asset) قفل می‌شود.
 */
export function computeCollateralSlices(
  portfolio: { asset: string; amount: Decimal; priceUSD: Decimal }[],
  loanUSD: Decimal
): CollateralSlice[] {
  const requiredCollateral = loanUSD.div(LOAN_TO_VALUE); // = 125% وام
  const totalValue = portfolio.reduce((s, p) => s.plus(p.amount.times(p.priceUSD)), new Decimal(0));
  if (totalValue.isZero()) throw new Error("EMPTY_PORTFOLIO");
  // وام حداکثر 80% کل پرتفوی
  if (loanUSD.gt(totalValue.times(LOAN_TO_VALUE)))
    throw new Error("LOAN_EXCEEDS_80PCT_OF_PORTFOLIO");

  const slices: CollateralSlice[] = [];
  let remaining = requiredCollateral;

  for (const p of portfolio) {
    if (remaining.lte(0)) break;
    const assetValue = p.amount.times(p.priceUSD);
    // سهم این دارایی از وثیقه لازم = (ارزش دارایی / کل) × وثیقه لازم
    let needUSD = assetValue.div(totalValue).times(requiredCollateral);
    needUSD = Decimal.min(needUSD, remaining, assetValue.times(LOAN_TO_VALUE)); // per-asset LTV
    const lockAmount = needUSD.div(p.priceUSD); // به واحد دارایی
    slices.push({ asset: p.asset, lockAmount: lockAmount.toFixed(8), unlockedSoFar: "0" });
    remaining = remaining.minus(needUSD);
  }
  if (remaining.gt("0.01")) throw new Error("INSUFFICIENT_ELIGIBLE_COLLATERAL");
  return slices;
}

/** قفل اولیه — transactional + idempotent با loanId */
export async function lockCollateral(loanId: string, userId: string, slices: CollateralSlice[]) {
  await prisma.$transaction(async tx => {
    const existing = await tx.loan.findUnique({ where: { id: loanId } });
    if (existing?.status !== "PENDING") throw new Error("IDEMPOTENT_SKIP"); // دوباره اجرا نشود
    for (const s of slices) {
      const r = await tx.balance.updateMany({
        where: { userId, asset: s.asset, amount: { gte: s.lockAmount } },
        data: { locked: { increment: s.lockAmount } },
      });
      if (r.count === 0) throw new Error(`INSUFFICIENT_${s.asset}`);
      await tx.ledgerEntry.create({ data: { userId, asset: s.asset,
        amount: "0", type: "LOAN_COLLATERAL_LOCK",
        refId: loanId, meta: { lockAmount: s.lockAmount } } });
    }
    await tx.loan.update({ where: { id: loanId },
      data: { status: "ACTIVE", collateral: slices } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/**
 * آزادسازی متناسب پس از هر قسط — دقیقاً همان نسبت، اتمیک و idempotent
 * unlockShare = (مبلغ پرداخت‌شده تا این قسط / کل بدهی) × وثیقه قفل‌شده
 */
export async function unlockProportional(loanId: string, installmentNo: number) {
  const result = await prisma.$transaction(async tx => {
    const loan = await tx.loan.findUniqueOrThrow({ where: { id: loanId } });
    if (loan.status !== "ACTIVE") throw new Error("LOAN_NOT_ACTIVE");

    // idempotency: این قسط قبلاً آزاد شده؟
    const already = await tx.unlockRecord.findUnique({
      where: { loanId_installmentNo: { loanId, installmentNo } } });
    if (already) return { skipped: true, unlocked: [] };

    const totalDebt = new Decimal(loan.totalRepaymentUSD);
    const paidSoFar = new Decimal(loan.paidUSD).plus(loan.installmentUSD); // پس از پرداخت این قسط
    const ratio = paidSoFar.div(totalDebt).toFixed(18); // نسبت دقیق

    const unlocked: { asset: string; amount: string }[] = [];
    for (const s of loan.collateral as CollateralSlice[]) {
      const lockedRemaining = new Decimal(s.lockAmount).minus(s.unlockedSoFar);
      // آزادسازی = قفل اولیه × نسبت پیشرفت − قبلاً آزادشده
      const targetUnlocked = new Decimal(s.lockAmount).times(ratio);
      let amount = Decimal.min(targetUnlocked.minus(s.unlockedSoFar), lockedRemaining);
      if (installmentNo === loan.installmentsTotal) // قسط آخر → همه باقیمانده
        amount = lockedRemaining;
      if (amount.lte(0)) continue;
      amount = amount.toFixed(8);

      await tx.balance.update({
        where: { userId_asset: { userId: loan.userId, asset: s.asset } },
        data: { locked: { decrement: amount } } });
      await tx.ledgerEntry.create({ data: { userId: loan.userId, asset: s.asset,
        amount: "0", type: "LOAN_COLLATERAL_UNLOCK",
        refId: loanId, meta: { installmentNo, amount } } });

      s.unlockedSoFar = new Decimal(s.unlockedSoFar).plus(amount).toFixed(8);
      unlocked.push({ asset: s.asset, amount });
    }

    await tx.loan.update({ where: { id: loanId },
      data: { collateral: loan.collateral, paidUSD: paidSoFar.toFixed(2),
        paidInstallments: { increment: 1 },
        status: installmentNo === loan.installmentsTotal ? "SETTLED" : "ACTIVE" } });

    await tx.unlockRecord.create({ data: { loanId, installmentNo,
      unlocked: unlocked, ratio } }); // کلید idempotency UNIQUE

    return { skipped: false, unlocked };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  await publish("loan.collateral.unlocked", { loanId, installmentNo, ...result });
  return result;
}
