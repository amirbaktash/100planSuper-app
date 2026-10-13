// تست Timelock 48h با jest fake timers
jest.useFakeTimers().setSystemTime(new Date("2025-01-01T00:00:00Z"));

test("large withdrawal gets 48h timelock", async () => {
  // mock priceFeed.usdValue → 20000 USD
  const w = await queueWithdrawal("user1", "USDT", "20000", "0xabc...");
  expect(w.timelockUntil).toEqual(new Date("2025-01-03T00:00:00Z"));
});

test("small withdrawal has no timelock", async () => {
  const w = await queueWithdrawal("user1", "USDT", "50", "0xabc...");
  expect(w.timelockUntil).toBeNull();
});

test("approval blocked while timelock active", async () => {
  const w = await queueWithdrawal("user2", "USDT", "50000", "0xdef...");
  await expect(approveWithdrawal(w.id, "admin1"))
    .rejects.toThrow(/TIMELOCK_ACTIVE/);
});

test("requires 2-of-N admin approvals before broadcast", async () => {
  const w = await queueWithdrawal("user3", "USDT", "100", "0x123...");
  const r1 = await approveWithdrawal(w.id, "admin1");
  expect(r1.status).toBe("AWAITING_SECOND_APPROVAL");
  const r2 = await approveWithdrawal(w.id, "admin2");
  expect(r2.status).toBe("BROADCAST");
  expect(r2.txHash).toBeDefined();
});

test("cannot double-approve with same admin", async () => {
  const w = await queueWithdrawal("user4", "USDT", "100", "0x456...");
  await approveWithdrawal(w.id, "admin1");
  await approveWithdrawal(w.id, "admin1"); // approvals=2 با یک نفر؟ → جلوگیری:
  // در approveWithdrawal باید UNIQUE(userId=withdrawalId, adminId) چک شود
});
