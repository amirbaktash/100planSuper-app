}

/** ۲. طلا/نقره — خرید با اسپرد، فروش در آینده، ارزیابی در ۳ سناریوی قیمت */
export function metalPL(input: { grams: string; buyPricePerGram: string; buyFeePct: string;
  holdDays: number; sellFeePct: string;
  scenarios?: { name: string; futurePricePerGram: string }[] }) {
  const buyCost = new D(input.grams).times(input.buyPricePerGram)
    .times(new D(1).plus(new D(input.buyFeePct).div(100)));
  const calc = (future: string) => {
    const gross = new D(input.grams).times(future)
      .times(new D(1).minus(new D(input.sellFeePct).div(100)));
    return { gross: gross.toFixed(2), pl: gross.minus(buyCost).toFixed(2),
      plPct: gross.minus(buyCost).div(buyCost).times(100).toFixed(2) };
  };
  const scenarios = input.scenarios ?? [
    { name: "ریزش ۱۰٪", futurePricePerGram: new D(input.buyPricePerGram).times(0.9).toFixed(2) },
    { name: "بدون تغییر", futurePricePerGram: input.buyPricePerGram },
    { name: "رشد ۲۰٪", futurePricePerGram: new D(input.buyPricePerGram).times(1.2).toFixed(2) }];
  return { buyCost: buyCost.toFixed(2), holdDays: input.holdDays,
    scenarios: scenarios.map(s => ({ name: s.name, ...calc(s.futurePricePerGram) })) };
}

/** ۳. وام — مقایسه: ارزش آزادشده وثیقه سرمایه‌گذاری‌شده vs هزینه سود */
export function loanPL(input: { principal: string; annualRate: string; months: number;
  collateralInvestmentPct: string; collateralReturnPct: string }) {
  const r = new D(input.annualRate).div(100).div(12);
  const n = input.months;
  const pmt = new D(input.principal).times(r)
    .div(new D(1).minus(new D(1).minus(r).pow(-n)));
  const totalInterest = pmt.times(n).minus(input.principal);
  // اگر کل وثیقه (125% وام) آزادانه می‌ماند چون وام نگرفتیم:
  const collateral = new D(input.principal).times(1.25);
  const investReturn = collateral.times(new D(input.collateralInvestmentPct).div(100))
    .times(new D(input.collateralReturnPct).div(100)); // سود پورتفوی
  const netAdvantage = investReturn.minus(totalInterest);
  return { monthlyPayment: pmt.toFixed(2), totalInterest: totalInterest.toFixed(2),
    collateralLocked: collateral.toFixed(2),
    collateralOpportunityReturn: investReturn.toFixed(2),
    netAdvantageOfLoan: netAdvantage.toFixed(2),
    verdict: netAdvantage.gt(0)
      ? "✅ گرفتن وام به‌صرفه است — سود سرمایه‌گذاری از هزینه سود وام بیشتر است"
      : "⚠️ گرفتن وام زیان‌ده است — هزینه سود از بازده سرمایه بیشتر است" };
}

/** ۴. صرافی — P/L پوزیشن با leverage، entry/exit، fee، liquidation price */
export function exchangePL(input: { side: "LONG" | "SHORT"; entry: string; exit: string;
  qty: string; leverage: number; feePct: string; margin?: string }) {
  const qty = new D(input.qty), entry = new D(input.entry), exit = new D(input.exit);
  const fee = qty.times(entry).plus(qty.times(exit)).times(new D(input.feePct).div(100));
  const gross = input.side === "LONG"
    ? exit.minus(entry).times(qty)
    : entry.minus(exit).times(qty);
  const net = gross.minus(fee);
  const notional = qty.times(entry);
  const margin = input.margin ? new D(input.margin) : notional.div(input.leverage);
  const liq = input.side === "LONG"
    ? entry.minus(margin.div(qty).times(0.9))    // ~۹۰٪ مارجین
    : entry.plus(margin.div(qty).times(0.9));
  return { gross: gross.toFixed(2), fees: fee.toFixed(2), net: net.toFixed(2),
    roe: net.div(margin).times(100).toFixed(2) + "%",
    liquidationPrice: liq.toFixed(2),
    liquidated: input.side === "LONG" ? exit.lt(liq) : exit.gt(liq) };
}

// API
app.post("/calc/:type", auth, async (q, r) => {
  const fn = { investment: investmentPL, metal: metalPL,
               loan: loanPL, exchange: exchangePL }[q.params.type];
  if (!fn) return r.status(404).end();
  try { r.json(fn(q.body)); } catch (e: any) { r.status(400).json({ error: e.message }); }
});
