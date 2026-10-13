test("debit rejects when balance insufficient", async () => {
  await expect(debitBalance("user1", "USDT", "999999", "TRADE"))
    .rejects.toThrow("INSUFFICIENT_BALANCE");
});

test("lock then unlock restores available balance", async () => {
  await lockFunds("user1", "USDT", "100");
  let b = await prisma.balance.findUnique({ where: { userId_asset: { userId: "user1", asset: "USDT" } } });
  expect(b.locked.toString()).toBe("100");
  await unlockFunds("user1", "USDT", "100");
  b = await prisma.balance.findUnique({ where: { userId_asset: { userId: "user1", asset: "USDT" } } });
  expect(b.locked.toString()).toBe("0");
});

test("ledger is append-only and reconciles with balances", async () => {
  // جمع همه LedgerEntry باید با Balance برابر باشد (reconciliation job)
  const sum = await prisma.ledgerEntry.aggregate({
    where: { userId: "user1", asset: "USDT" },
    _sum: { amount: true } });
  const bal = await prisma.balance.findUnique({ where: { userId_asset: { userId: "user1", asset: "USDT" } } });
  expect(sum._sum.amount!.toString()).toBe(bal!.amount.toString());
});
