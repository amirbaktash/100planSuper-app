import Decimal from "decimal.js";
D = Decimal;

/** ۱. سرمایه‌گذاری NAV — سود مرکب با نرخ سالانه متغیر */
export function investmentPL(input: { principal: string; annualPct: string;
  years: number; scenarios?: { name: string; annualPct: string }[] }) {
  const calc = (pct: string) => new D(input.principal)
    .times(new D(1).plus(new D(pct).div(100)).pow(input.years));
  return {
    base: { final: calc(input.annualPct).toFixed(2),
      profit: calc(input.annualPct).minus(input.principal).toFixed(2) },
    scenarios: (input.scenarios ?? [{ name: "بدبینانه", annualPct: "-10" },
      { name: "محتمل", annualPct: input.annualPct }, { name: "خوش‌بینانه", annualPct: "30" }])
      .map(s => ({ name: s.name, final: calc(s.annualPct).toFixed(2),
        profit: calc(s.annualPct).minus(input.principal).toFixed(2) })),
  };


> ⚠️ The response reached the length limit. Reply **continue** to get the rest.
