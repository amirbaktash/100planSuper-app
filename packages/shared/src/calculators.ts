// ═══════════════════════════════════════════════════════════════
// ماشین‌حساب‌های سود/زیان — سرمایه‌گذاری NAV، طلا/نقره، وام
// همه با چندسناریوی خوش‌بینانه / محتمل / بدبینانه
// ═══════════════════════════════════════════════════════════════

export interface Scenario<T> {
  name: string;
  final: string;
  profit: string;
  extra?: T;
}

/** ۱. سرمایه‌گذاری NAV — سود مرکب با نرخ سالانه متغیر */
export function investmentPL(input: {
  principal: string;
  annualPct: string;
  years: number;
  scenarios?: { name: string; annualPct: string }[];
}) {
  const calc = (pct: string) =>
    Number(input.principal) * Math.pow(1 + Number(pct) / 100, input.years);

  const mk = (s: { name: string; annualPct: string }): Scenario<never> => {
    const final = calc(s.annualPct);
    return {
      name: s.name,
      final: final.toFixed(2),
      profit: (final - Number(input.principal)).toFixed(2),
    };
  };

  return {
    base: mk({ name: "پایه", annualPct: input.annualPct }),
    scenarios: (
      input.scenarios ?? [
        { name: "بدبینانه", annualPct: "-10" },
        { name: "محتمل", annualPct: input.annualPct },
        { name: "خوش‌بینانه", annualPct: "30" },
      ]
    ).map(mk),
  };
}

/** ۲. طلا/نقره — خرید با اسپرد، فروش در آینده، ارزیابی در ۳ سناریوی قیمت */
export function metalPL(input: {
  grams: string;
  buyPricePerGram: string;
  buyFeePct: string;
  holdDays: number;
  sellFeePct: string;
  scenarios?: { name: string; futurePricePerGram: string }[];
}) {
  const buyCost =
    Number(input.grams) * Number(input.buyPricePerGram) * (1 + Number(input.buyFeePct) / 100);

  const calc = (future: string) => {
    const gross = Number(input.grams) * Number(future) * (1 - Number(input.sellFeePct) / 100);
    return {
      gross: gross.toFixed(2),
      pl: (gross - buyCost).toFixed(2),
      plPct: (((gross - buyCost) / buyCost) * 100).toFixed(2),
    };
  };

  const scenarios =
    input.scenarios ?? [
      { name: "ریزش ۱۰٪", futurePricePerGram: (Number(input.buyPricePerGram) * 0.9).toFixed(2) },
      { name: "بدون تغییر", futurePricePerGram: input.buyPricePerGram },
      { name: "رشد ۲۰٪", futurePricePerGram: (Number(input.buyPricePerGram) * 1.2).toFixed(2) },
    ];

  return {
    buyCost: buyCost.toFixed(2),
    holdDays: input.holdDays,
    scenarios: scenarios.map((s) => ({ name: s.name, ...calc(s.futurePricePerGram) })),
  };
}

/** ۳. وام — جدول بازپرداخت در نرخ‌های مختلف (re-export از loan.simulate) */
export { simulate as loanPL } from "./loan";
