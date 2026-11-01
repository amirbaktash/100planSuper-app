// ═══════════════════════════════════════════════════════════════
// سرویس وام — حداکثر ۸۰٪ ارزش پورتفولیو، قفل متناسب وثیقه
// جدول اقساط ماهانه + آزادسازی وثیقه به‌ازای هر قسط
// ═══════════════════════════════════════════════════════════════

import type { CollateralSlice, LoanScheduleRow } from "./types";

export const MAX_LTV = 0.8; // ۸۰٪
export const DEFAULT_ANNUAL_RATE = "18"; // درصد سالانه پیش‌فرض

/** سهم هر دارایی در پورتفولیو → مبلغ قفل‌شده برای هر برش */
export function computeCollateralSlices(
  portfolio: { asset: string; amountUSD: string }[],
  loanAmountUSD: string
): CollateralSlice[] {
  const total = portfolio.reduce((s, p) => s + Number(p.amountUSD), 0);
  if (total <= 0) return [];
  if (Number(loanAmountUSD) > total * MAX_LTV) {
    throw new Error(`LOAN_EXCEEDS_${Math.round(MAX_LTV * 100)}_PCT_LTV`);
  }
  return portfolio.map((p) => {
    const share = Number(p.amountUSD) / total;
    return {
      asset: p.asset,
      portfolioValue: Number(p.amountUSD).toFixed(8),
      // قفل متناسب: هر دارایی به نسبت سهمش وام را پوشش می‌دهد
      lockAmount: (Number(loanAmountUSD) * share).toFixed(8),
    };
  });
}

/** جدول اقساط (برابر) — سود ماهانه = اصل × نرخ سالانه / 12 / 100 */
export function buildSchedule(
  principalUSD: number,
  months: number,
  annualRatePct: string = DEFAULT_ANNUAL_RATE,
  startDate: Date = new Date()
): LoanScheduleRow[] {
  const r = Number(annualRatePct) / 100 / 12;
  const total = r === 0 ? principalUSD / months : (principalUSD * r) / (1 - Math.pow(1 + r, -months));
  const rows: LoanScheduleRow[] = [];
  let remaining = principalUSD;

  for (let i = 1; i <= months; i++) {
    const interest = remaining * r;
    let principal = total - interest;
    if (i === months) principal = remaining; // تسویه نهایی
    remaining -= principal;
    const due = new Date(startDate);
    due.setMonth(due.getMonth() + i);
    rows.push({
      no: i,
      dueDate: due.toISOString().slice(0, 10),
      total: total.toFixed(2),
      principal: principal.toFixed(2),
      interest: interest.toFixed(2),
      // آزادسازی وثیقه: متناسب با پیشرفت اقساط (قسط جاری قفل‌شده)
      collateralUnlockPct: Math.floor(((i - 1) / months) * 100),
      status: "PENDING",
    });
  }
  return rows;
}

/** شبیه‌ساز: سود/زیان بازپرداخت در چند سناریوی نرخ */
export function simulate(
  principalUSD: number,
  months: number,
  baseRatePct: string
) {
  const scenarios = [
    { name: "بهینه (۱۲٪)", rate: "12" },
    { name: "پایه", rate: baseRatePct },
    { name: "پرفشار (۲۴٪)", rate: "24" },
  ];
  return scenarios.map((s) => {
    const sched = buildSchedule(principalUSD, months, s.rate);
    const paid = sched.reduce((sum, x) => sum + Number(x.total), 0);
    const interest = sched.reduce((sum, x) => sum + Number(x.interest), 0);
    return { name: s.name, rate: s.rate, totalPayable: paid.toFixed(2), totalInterest: interest.toFixed(2) };
  });
}

/** علامت‌گذاری اقساط معوق (cron روزانه ۶ صبح) */
export function markLateInstallments(rows: LoanScheduleRow[], today = new Date()): LoanScheduleRow[] {
  return rows.map((r) => {
    if (r.status !== "PENDING") return r;
    const due = new Date(r.dueDate);
    if (due < today) {
      const lateDays = Math.floor((today.getTime() - due.getTime()) / 86400000);
      return { ...r, status: "LATE" as const, lateDays };
    }
    return r;
  });
}

/** پرداخت قسط → آزادسازی وثیقه + رویدادهای دفتر */
export function payInstallment(rows: LoanScheduleRow[], no: number) {
  const row = rows.find((r) => r.no === no);
  if (!row) throw new Error("INSTALLMENT_NOT_FOUND");
  if (row.status === "PAID") throw new Error("ALREADY_PAID");
  row.status = "PAID";
  const next = rows.find((r) => r.status === "PENDING");
  const unlockPct = next ? Math.min(100, Math.floor(((no) / rows.length) * 100)) : 100;
  return {
    row,
    unlockPct,
    event: {
      type: "loan.installment.paid",
      payload: {
        installmentNo: no,
        amount: row.total,
        principalPart: row.principal,
        interestPart: row.interest,
      },
    },
  };
}
