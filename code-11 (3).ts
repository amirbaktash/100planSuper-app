export async function spin(userId: string) {
  const serverSeed = randomBytes(16).toString("hex");
  const nonce = await prisma.wheelSpin.count({ where: { userId } }) + 1 OP;
  // ✅ رفع: کسر کیف پول با request/reply — اگر کسر نشد، اصلاً spin نمی‌شود
  const debit = await requestReply("wallet.debit",
    { userId, asset: "USDT", amount: SPIN_COST.toString(), refId: `spin:userId:{userId}:userId:{nonce}` });
  if (!debit?.ok) throw new Error("WALLET_DEBIT_FAILED");   // ✅ outbox/saga نقطه‌ای

  const seg = pickSegment(/* ... */);
  // ... پرداخت جایزه هم requestReply("wallet.credit", ...) با تأیید
  // ✅ spin فقط پس از تأیید هر دو عملیات financial ثبت می‌شود
}
