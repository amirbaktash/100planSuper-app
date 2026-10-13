import Decimal from "decimal.js";
import { buildSchedule } from "./schedule";
import { computeCollateralSlices } from "./collateral";

export function simulate(input: {
  portfolio: { asset: string; amount: string; priceUSD: string }[];
  requestedUSD: string; annualRate: string; installments: number;
}) {
  const principal = new Decimal(input.requestedUSD);
  const maxEligible = input.portfolio
    .reduce((s, p) => s.plus(new Decimal(p.amount).times(p.priceUSD)), new Decimal(0))
    .times(0.80);

  const schedule = buildSchedule(principal, new Decimal(input.annualRate), input.installments);
  const slices = computeCollateralSlices(
    input.portfolio.map(p => ({ asset: p.asset,
      amount: new Decimal(p.amount), priceUSD: new Decimal(p.priceUSD) })), principal);

  return {
    approved: principal.lte(maxEligible),
    maxEligibleUSD: maxEligible.toFixed(2),
    monthlyPayment: schedule[0].total.toFixed(2),
    totalInterest: schedule.reduce((s, r) => s.plus(r.interest), new Decimal(0)).toFixed(2),
    totalRepayment: schedule.reduce((s, r) => s.plus(r.total), new Decimal(0)).toFixed(2),
    schedule: schedule.map(r => ({ no: r.no, dueDate: r.dueDate,
      payment: r.total.toFixed(2), unlockPct: r.collateralUnlockPct })),
    collateralLocks: slices.map(s => ({ asset: s.asset, lockAmount: s.lockAmount })),
  };
}
