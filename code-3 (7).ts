import Decimal from "decimal.js";
const D = Decimal;
import { prisma } from "./db";
import { publish } from "@daric/eventbus";

/**
 * پرداخت ترکیبی به هر ارز: کاربر هر ترکیبی از دارایی‌های کیف پولش می‌پردازد.
 * هر ارز با نرخ لحظه‌ای (از oracle/nav-service فاز ۲) به USD تبدیل می‌شود.
 */
export async function payBooking(userId: string, bookingId: string,
    payments: { asset: string; amount: string }[]) {
  return prisma.$transaction(async tx => {
    const b = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
    if (b.status !== "PENDING") throw new Error("ALREADY_PAID");
    if (b.userId !== userId) throw new Error("FORBIDDEN");

    let totalUSD = new D(0);
    for (const p of payments) {
      const rate = await getAssetUSDPrice(p.asset);      // از NAV service (فاز ۲)
      const usd = new D(p.amount).times(rate);
      totalUSD = totalUSD.plus(usdPositive(usd, p, tx, userId)); // قفل و کسر
    }

    if (totalUSD.lt(b.amountUSD)) throw new Error("INSUFFICIENT_PAYMENT");

    await tx.booking.update({ where: { id: bookingId },
      data: { status: "PAID", paymentLines: payments } });

    // قید حسابداری + رویداد MLM (TOURISM)
    await publish("accounting.journal.request", {
      source: "tourism", refId: bookingId,
      narrative: `رزرو b.kind—{b.kind} —b.kind—{b.travelers} نفر`,
      lines: [
        { account: "1002:USDT_USER", debit: b.amountUSD, credit: "0", userId },
        { account: "4106:TOURISM_INCOME", debit: "0", credit: b.amountUSD } ] });

    await publish("tourism.booking.confirmed", { userId,
      refId: bookingId, amountUSD: b.amountUSD });  // ← MLM پورسانت می‌دهد
    return { ok: true, totalUSD };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** ظرفیت تور با قفل اتمیک — جلوگیری از overbooking */
export async function createTourBooking(userId: string, tourId: string,
    departureId: string, travelers: number, passengers: any[]) {
  const res = await prisma.$transaction(async tx => {
    const dep = await tx.tourDeparture.findUniqueOrThrow({ where: { id: departureId } });
    if (dep.status !== "OPEN" || dep.capacity - dep.booked < travelers)
      throw new Error("DEPARTURE_FULL");
    await tx.tourDeparture.update({ where: { id: departureId },
      data: { booked: { increment: travelers } } });
    const tour = await tx.tour.findUniqueOrThrow({ where: { id: tourId } });
    return tx.booking.create({ data: {
      userId, kind: "TOUR", itemId: tourId, travelers, passengers,
      amountUSD: new D(tour.priceUSD).times(travelers) } });
  });
  await publish("tourism.booking.created", { bookingId: res.id, userId });
  return res;
}

/** موجودی هتل/پرواز — رزرو اتمیک + انقضای رزرو موقت ۱۵ دقیقه‌ای */
export async function reserveInventory(userId: string, itemId: string, qty: number) {
  const r = await prisma.inventoryItem.updateMany({
    where: { id: itemId, stock: { gte: qty }, active: true },
    data: { stock: { decrement: qty } } });       // atomic — r.count===0 یعنی موجود نیست
  if (r.count === 0) throw new Error("OUT_OF_STOCK");
  const booking = await prisma.booking.create({ data: {
    userId, kind: (await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } })).type,
    itemId, travelers: qty, amountUSD:
      (await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } })).priceUSD.times(qty) } });
  setTimeout(() => expireIfUnpaid(booking.id), 15 * 60_000); // رزرو موقت
  return booking;
}
