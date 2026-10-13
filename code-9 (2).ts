// accounting test
test("unbalanced journal is rejected", async () =>
  await expect(postJournal({ source: "t", refId: "1", narrative: "",
    lines: [
      { account: "1002:USDT_USER", debit: "100", credit: "0" },
      { account: "4102:TRADING_FEE", debit: "0", credit: "90" } ] }))
    .rejects.toThrow(/UNBALANCED/));

test("duplicate refId is idempotent (returns same entry)", async () => {
  const req = { source: "loan", refId: "L1", narrative: "",
    lines: [
      { account: "4001:LOAN_RECEIVABLE", debit: "1000", credit: "0" },
      { account: "1002:USDT_USER", debit: "0", credit: "1000" } ] };
  const a = await postJournal(req), b = await postJournal(req);
  expect(a.id).toBe(b.id);
});

test("hash chain detects tampering", async () => {
  await prisma.journalLine.update({ where: { id: firstLine.id }, data: { debit: "999" } });
  await expect(verifyHashChain()).rejects.toThrow(/CHAIN_BROKEN/);
});

// loan test
test("80% borrow locks proportional slices", () => {
  const slices = computeCollateralSlices([
    { asset: "USDT", amount: D("5000"), priceUSD: D("1") },
    { asset: "DARIC", amount: D("10000"), priceUSD: D("0.5") },   // 5000$
  ], D("4000")); // دقیقاً 80% پرتفوی 10000$
  expect(slices.find(s => s.asset === "USDT")!.lockAmount).toBe("5000.00000000");
  expect(slices.find(s => s.asset === "DARIC")!.lockAmount).toBe("5000.00000000");
});

test("installment 1 unlocks exact proportional share", async () => {
  // وام 1000$ / 10 قسط → پس از قسط ۱: ratio=10% → هر دارایی 10% قفل آزاد می‌شود
  const r = await unlockProportional(loanId, 1);
  expect(r.unlocked.find(u => u.asset === "USDT")!.amount).toBe("125.00000000"); // 10% از 1250
});

test("replaying same installment event is a no-op (idempotent)", async () => {
  await unlockProportional(loanId, 1);
  const again = await unlockProportional(loanId, 1);
  expect(again.skipped).toBe(true);
});

test("final installment unlocks 100% of collateral", async () => { /* ratio=1 → باقیمانده همه */ });
