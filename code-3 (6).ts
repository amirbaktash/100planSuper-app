// user-service
test("OTP wrong 3 times → locked", async () => {
  for (let i = 0; i < 3; i++) await expect(verifyOtp(phone, "000000", "LOGIN")).rejects.toThrow();
  await expect(verifyOtp(phone, correctCode, "LOGIN")).rejects.toThrow(/INVALID_OR_EXPIRED/);
});

test("face match ≥ 0.90 → KYC L2 approved", async () => {
  const r = await verifyFace(uid, selfieBuf, videoBuf);
  expect(r.approved).toBe(true); expect(r.score).toBeGreaterThanOrEqual(0.9);
});

// mlm-service
test("L1=25% L2=12% L3=6% — and nothing beyond L3", async () => {
  await processPurchase({ userId: "leaf", category: "GOLDSILVER",
    amountUSD: "1000", refId: "t1" });
  const cs = await prisma.commission.findMany();
  const get = (l: number) => cs.find(c => c.level === l)!.amount;
  expect(get(1).toString()).toBe("250.00");
  expect(get(2).toString()).toBe("120.00");
  expect(get(3).toString()).toBe("60.00");
  expect(cs.filter(c => c.level > 3)).toHaveLength(0);   // ۳ سطح فقط
});

test("DIAMOND override beats general rate", async () => {
  await prisma.commissionRule.create({ data: {
    category: "CASINO", level: 1, tier: "DIAMOND", pct: 30 } });
  const pct = await resolvePct("CASINO", 1, "DIAMOND");
  expect(pct.toString()).toBe("30");
});

test("duplicate event → no double commission (idempotent)", async () => {
  const e = { userId: "leaf", category: "TOURISM", amountUSD: "500", refId: "b1" };
  await processPurchase(e); const n1 = await prisma.commission.count();
  await processPurchase(e); const n2 = await prisma.commission.count();
  expect(n1).toBe(n2);
});

// game-service
test("segment weights determine probability", () => {
  const segs = [{ index: 0, weight: 0, active: true },   // وزن صفر = هرگز
                { index: 1, weight: 1, active: true },
                { index: 2, weight: 9, active: true }];
  const trials = 10_000, counts: any = {};
  for (let i = 0; i < trials; i++) counts[pickSegment(segs).index] = (counts[pickSegment(segs).index] ?? 0) + 1;
  expect(counts[0]).toBeUndefined();                    // خانه غیرفعال هرگز
  expect(counts[2] / trials).toBeCloseTo(0.9, 1);       // ۹۰٪ ≈
});

test("house edge tracked — wheel P/L reconciles", async () => {
  const agg = await prisma.wheelSpin.aggregate({ _sum: { cost: true, prizeValue: true } });
  const pl = new D(agg._sum.cost!).minus(agg._sum.prizeValue!);
  expect(pl.eq(await housePL())).toBe(true);
});

// pl-calcs
test("exchange LONG 10x liquidation detected", () => {
  const r = exchangePL({ side: "LONG", entry: "100", exit: "89",
    qty: "1", leverage: 10, feePct: "0.1" });
  expect(r.liquidated).toBe(true);
});
test("loan verdict positive when collateral return > interest", () => {
  const r = loanPL({ principal: "1000", annualRate: "12", months: 12,
    collateralInvestmentPct: "125", collateralReturnPct: "30" });
  expect(r.netAdvantageOfLoan.startsWith("-")).toBe(false);
});
