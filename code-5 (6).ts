import Decimal from "decimal.js";
import { prisma } from "./db";
import { publish } from "@daric/eventbus";

export interface InstallmentRow {
  no: number; dueDate: Date;
  principal: Decimal; interest: Decimal; total: Decimal;
  collateralUnlockPct: string;   // درصد آزادسازی وثیقه در این قسط
  status: "DUE" | "PAID" | "LATE" | "FORECLOSED";
}

export function buildSchedule(principalUSD: Decimal,
    annualRate: Decimal, installments: number): InstallmentRow[] {
  const r = annualRate.div(100).div(installments); // نرخ دوره‌ای
  const pmt = principalUSD.times(r).div(new Decimal(1).minus(
    new Decimal(1).minus(r).pow(-installments)));   // فرمول annuity
  let balance = principalUSD;
  const rows: InstallmentRow[] = [];
  for (let i = 1; i <= installments; i++) {
    const interest = balance.times(r);
    const principal = pmt.minus(interest);
    balance = balance.minus(principal);
    rows.push({
      no: i,
      dueDate: new Date(Date.now() + i * 30 * 86400_000),
      principal, interest, total: pmt,
      collateralUnlockPct: (i / installments * 100).toFixed(4),
      status: "DUE",
    });
  }
  return rows;
}

/** پرداخت قسط — کل جریان با Event Bus */
export async function payInstallment(loanId: string, installmentNo: number, sourceAsset = "USDT") {
  const loan = await prisma.loan.findUniqueOrThrow({ where: { id: loanId } });
  const inst = loan.schedule[installmentNo - 1];
  if (inst.status === "PAID") throw new Error("ALREADY_PAID");

  // ۱. کسر مبلغ از کیف پول (از wallet-service — نه مستقیم! ← از طریق قید حسابداری)
  await publish("accounting.journal.request", {
    source: "loan", refId: `loanId:inst:{loanId}:inst:loanId:inst:{installmentNo}`,
    narrative: `پرداخت قسط installmentNoوام{installmentNo} وامinstallmentNoوام{loanId}`,
    lines: [
      { account: "1002:USDT_USER", userId: loan.userId, debit: inst.total.toFixed(2), credit: "0" },
      { account: "4001:LOAN_RECEIVABLE", debit: inst.principal.toFixed(2), credit: "0" },
      { account: "4101:INTEREST_INCOME",  debit: "0", credit: inst.interest.toFixed(2) },
      { account: "1002:USDT_USER", userId: loan.userId, debit: "0", credit: inst.total.toFixed(2) },
    ]});

  // ۲. رویداد پرداخت → consumer آزادسازی وثیقه را اجرا می‌کند
  await publish("loan.installment.paid", { loanId, installmentNo,
    amount: inst.total.toFixed(2), userId: loan.userId });

  // ۳. به‌روزرسانی schedule
  inst.status = "PAID";
  await prisma.loan.update({ where: { id: loanId },
    data: { schedule: loan.schedule, lastPaidAt: new Date() } });
}

/** اقساط معوق — cron روزانه */
export async function markLateInstallments() {
  const now = new Date();
  const loans = await prisma.loan.findMany({ where: { status: "ACTIVE" } });
  for (const loan of loans) {
    for (const inst of loan.schedule) {
      if (inst.status === "DUE" && inst.dueDate < now) {
        inst.status = "LATE";
        inst.lateDays = Math.floor((now.getTime() - inst.dueDate.getTime()) / 86400_000);
        inst.lateFee = new Decimal(inst.total).times(0.001).times(inst.lateDays) // 0.1٪ روزانه
          .toFixed(2);
        await publish("loan.installment.late", { loanId: loan.id,
          installmentNo: inst.no, lateDays: inst.lateDays, lateFee: inst.lateFee });
      }
    }
    await prisma.loan.update({ where: { id: loan.id }, data: { schedule: loan.schedule } });
  }
}

/** فورکلوز ادمین — مصادره کل وثیقه باقیمانده */
export async function foreclose(loanId: string, adminId: string) {
  await prisma.$transaction(async tx => {
    const loan = await tx.loan.findUniqueOrThrow({ where: { id: loanId } });
    if (!["ACTIVE"].includes(loan.status)) throw new Error("NOT_FORECLOSEABLE");
    for (const s of loan.collateral) {
      const remaining = new Decimal(s.lockAmount).minus(s.unlockedSoFar);
      if (remaining.gt(0)) {
        // انتقال وثیقه به حساب صندوق (TREASURY) + آزادسازی قفل کاربر
        await tx.balance.update({ where: { userId_asset: { userId: loan.userId, asset: s.asset } },
          data: { amount: { decrement: remaining }, locked: { decrement: remaining } } });
        await tx.balance.upsert({ where: { userId_asset: { userId: "TREASURY", asset: s.asset } },
          create: { userId: "TREASURY", asset: s.asset, amount: remaining },
          update: { amount: { increment: remaining } } });
        await tx.ledgerEntry.create({ data: { userId: loan.userId, asset: s.asset,
          amount: "0", type: "LOAN_FORECLOSE", refId: loanId,
          meta: { amount: remaining, adminId } } });
      }
    }
    await tx.loan.update({ where: { id: loanId }, data: { status: "FORECLOSED" } });
  });
  await publish("loan.foreclosed", { loanId, adminId });
}
