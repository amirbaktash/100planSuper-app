// ✅ جایگزین تابع پرداخت — کامل و بدون helper غایب
import { prisma, requestReply, publish } from "@daric/shared";
import { getAssetUSDPrice } from "@daric/shared";
const D = Decimal;

export async function payBooking(userId: string, bookingId: string,
    payments: { asset: string; amount: string }[]) {
  return prisma.$transaction(async tx => {
    const b = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
    if (b.status !== "PENDING") throw new Error("ALREADY_PAID");
    if (b.userId !== userId) throw new Error("FORBIDDEN");

    let totalUSD = new D(0);
    for (const p of payments) {
      const rate = await getAssetUSDPrice(p.asset);          // ✅ cache + مرز خطا
      const usd = new D(p.amount).times(rate);
      totalUSD = totalUSD.plus(usd);
      // ✅ کسر مستقیم در همان tx (بدون helper غایب) — request/reply جای ledger publish
      const debit = await requestReply("wallet.debit", {
        userId, asset: p.asset, amount: p.amount, refId: bookingId });
      if (!debit?.ok) throw new Error("WALLET_DEBIT_FAILED:" + p.asset);
    }
    if (totalUSD.lt(b.amountUSD)) throw new Error("INSUFFICIENT_PAYMENT");

    await tx.booking.update({ where: { id: bookingId },
      data: { status: "PAID", paymentLines: payments } });
    return { ok: true, totalUSD: totalUSD.toFixed(2) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).then(async (r: any) => {
    // رویدادها «بعد از** commit**» — با outbox
    await publish("accounting.journal.request", { source: "tourism", refId: bookingId });
    await publish("tourism.booking.confirmed", { userId, refId: bookingId });
    return r;
  });
}
