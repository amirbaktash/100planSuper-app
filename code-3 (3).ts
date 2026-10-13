import { prisma } from "./db";
import { COA } from "./chart-of-accounts";

/** تراز آزمایشی — جمع بدهکار و بستانکار هر حساب */
export async function trialBalance(fiscalDate?: Date) {
  const rows = await prisma.journalLine.groupBy({
    by: ["account"],
    where: fiscalDate ? { entry: { fiscalDate: { lte: fiscalDate } } } : {},
    _sum: { debit: true, credit: true },
  });
  const tb = rows.map(r => {
    const d = r._sum.debit ?? "0", c = r._sum.credit ?? "0";
    const net = new Decimal(d).minus(c);
    return { account: r.account, name: COA[r.account as keyof typeof COA]?.name,
      debit: net.gt(0) ? net.toFixed(2) : "0",
      credit: net.lt(0) ? net.neg().toFixed(2) : "0" };
  });
  // کنترل تعادل: Σdebit === Σcredit
  const totalD = tb.reduce((s, r) => s.plus(r.debit), new Decimal(0));
  const totalC = tb.reduce((s, r) => s.plus(r.credit), new Decimal(0));
  if (!totalD.eq(totalC)) throw new Error(`TRIAL_BALANCE_OUT_OF_BALANCE: totalD≠{totalD} ≠totalD={totalC}`);
  return { rows: tb, totals: { debit: totalD.toFixed(2), credit: totalC.toFixed(2) } };
}

/** دفتر کل — همه قیدهای یک حساب با مانده رونده */
export async function generalLedger(account: string, from: Date, to: Date) {
  const lines = await prisma.journalLine.findMany({
    where: { account, entry: { fiscalDate: { gte: from, lte: to } } },
    include: { entry: true }, orderBy: [{ entry: { seq: "asc" } }] });
  let running = new Decimal(0);
  return lines.map(l => {
    running = running.plus(l.debit).minus(l.credit);
    return { date: l.entry.fiscalDate, narrative: l.entry.narrative,
      debit: l.debit, credit: l.credit, balance: running.toFixed(2) };
  });
}

/** گزارش دوره‌ای: daily | weekly | monthly | yearly */
export async function periodReport(kind: "daily" | "weekly" | "monthly" | "yearly",
    refDate = new Date()) {
  const MS = { daily: 86400_000, weekly: 7 * 86400_000,
               monthly: 30 * 86400_000, yearly: 365 * 86400_000 };
  const from = new Date(refDate.getTime() - MS[kind]);
  const [tb, income] = await Promise.all([
    trialBalance(from),
    prisma.journalLine.groupBy({
      by: ["account"],
      where: { account: { startsWith: "41" }, entry: { fiscalDate: { gte: from } } },
      _sum: { credit: true } }),
  ]);
  const expenses = await prisma.journalLine.groupBy({
    by: ["account"],
    where: { account: { startsWith: "50" }, entry: { fiscalDate: { gte: from } } },
    _sum: { debit: true } });
  const totalIncome = income.reduce((s, r) => s.plus(r._sum.credit ?? 0), new Decimal(0));
  const totalExpense = expenses.reduce((s, r) => s.plus(r._sum.debit ?? 0), new Decimal(0));
  return { kind, from, to: refDate, trialBalance: tb,
    incomeStatement: {
      income: income.map(r => ({ account: r.account, amount: r._sum.credit })),
      expense: expenses.map(r => ({ account: r.account, amount: r._sum.debit })),
      netProfit: totalIncome.minus(totalExpense).toFixed(2) } };
}
