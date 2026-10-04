/**
 * قوانین ضد تقلب باشگاه:
 *  F1: self-referral     → معرف و معرفی‌شده همان device/IP/بانک/مدرک
 *  F2: wash-trading      → خرید چرخشی برای تولید پورسانت
 *  F3: volume inflation  → معاملات هم‌زمان متقابل یک نفر
 *  F4: rapid accumulation → رشد غیرعادی شبکه
 */
export async function screenRegistration(newUserId: string, refCode: string) {
  const referrer = await prisma.user.findUniqueOrThrow({
    where: { referralCode: refCode } });
  const signals: string[] = [];

  const [newDevices, refDevices] = await Promise.all([
    prisma.device.findMany({ where: { userId: newUserId } }),
    prisma.device.findMany({ where: { userId: referrer.id } }) ]);
  if (newDevices.some(d => refDevices.some(r => r.fp === d.fp)))
    signals.push("SELF_REFERRAL_DEVICE");                        // F1

  const [newIPs, refIPs] = await Promise.all([
    lastIPs(newUserId), lastIPs(referrer.id) ]);
  if (newIPs.some(ip => refIPs.includes(ip))) signals.push("SELF_REFERRAL_IP");

  if (signals.length) {
    await prisma.fraudFlag.create({ data: {
      userId: newUserId, referrerId: referrer.id,
      kind: "SELF_REFERRAL", signals, severity: 80 } });
    // پورسانت‌های مرتبط تا بررسی نگه داشته می‌شوند (PENDING با hold)
    await holdCommissionsFor(referrer.id);
    await notifyAdmin("🚨 self-referral suspicious", { newUserId, referrerId: referrer.id });
  }
}

/** F2/F3: تشخیص wash-trade — خرید و فروش متقابل در بازه کوتاه توسط یک واحد اقتصادی */
export async function screenTrade(trade: { userId: string; side: string;
  asset: string; amount: string; counterpartyId?: string }) {
  if (trade.counterpartyId === trade.userId)
    return flag(trade, "WASH_SELF_MATCH", 90);                   // F3

  const roundTrip = await prisma.trade.findFirst({ where: {
    userId: trade.userId, asset: trade.asset,
    side: trade.side === "BUY" ? "SELL" : "BUY",
    amount: trade.amount,
    createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  if (roundTrip)
    return flag(trade, "WASH_ROUND_TRIP_1H", 70);                // F2

  // پورسانت از معاملات مشکوک → بدون hold صادر نمی‌شود
}

export async function holdCommissionsFor(userId: string) {
  await prisma.commission.updateMany({
    where: { beneficiaryId: userId, status: "PENDING" },
    data: { status: "HELD" } });
}

// پنل ادمین: /admin/fraud → flags با severity، دکمه «تأیید پاک» / «بازپرداخت پورسانت‌ها»
