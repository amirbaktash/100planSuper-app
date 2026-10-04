import { prisma } from "./db";
import { publish } from "@daric/eventbus";

const COOLING_HOURS = 24;   // قفل زمانی: برداشت ۲۴ ساعت پس از تغییر whitelist

/** افزودن آدرس/IBAN به whitelist — با تأیید 2FA و شروع cooling period */
export async function addWithdrawalAddress(userId: string, address: string,
    chain: string, twoFAToken: string) {
  if (!(await verify2FA(userId, twoFAToken))) throw new Error("2FA_REQUIRED");
  const w = await prisma.whitelistAddress.create({ data: {
    userId, address, chain,
    activeAt: new Date(Date.now() + COOLING_HOURS * 3600_000) } }); // ★ time-lock
  await notifyUser(userId, "آدرس جدید اضافه شد — فعال‌سازی ۲۴ ساعت بعد. اگر شما نبودید: توقف فوری");
  await publish("security.whitelist.added", { userId, address, activeAt: w.activeAt });
  return w;
}

export async function requestWithdrawal(userId: string, asset: string,
    amount: string, toAddress: string) {
  const wl = await prisma.whitelistAddress.findFirst({
    where: { userId, address: toAddress, activeAt: { lte: new Date() } } });
  if (!wl) throw new Error("ADDRESS_NOT_WHITELISTED_OR_LOCKED");

  // جدا شدن از حسابداری: قید pending در escrow داخلی → تأیید → آنچین
  const w = await prisma.withdrawal.create({ data: {
    userId, asset, amount, toAddress, status: "REVIEW",
    riskScore: await scoreWithdrawal(userId, amount, toAddress) } });

  if (w.riskScore >= 80) {   // ← مسیر military-grade همانند قرارداد: تأیید دوم
    await publish("security.withdrawal.manual_review", { withdrawalId: w.id });
    return { status: "MANUAL_REVIEW" };
  }
  return executeWithdrawal(w.id);
}

async function scoreWithdrawal(userId: string, amount: string, addr: string) {
  let score = 0;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.kycLevel < 2) score += 40;                          // KYC ناقص
  if (new D(amount).gt("5000")) score += 30;                   // مبلغ بزرگ
  const recent = await prisma.device.findFirst({ where: { userId, trusted: false } });
  if (recent) score += 20;                                     // دستگاه جدید
  const peers = await prisma.withdrawal.count({                 // اشتراک آدرس با دیگران
    where: { toAddress: addr, userId: { not: userId } } });
  if (peers > 0) score += 50;                                  // ★ نشانه پول‌شویی
  return score;
}
