import { createHash } from "crypto";
import { prisma } from "./db";
import UAParser from "ua-parser-js";

/**
 * FP = hash(CF-IPCountry? + accept-language + UA specs + TLS JA3 + client canvas token)
 * سمت کلاینت: fingerprintjs2 → token ارسال می‌شود؛ سمت سرور ترکیب و hash.
 */
export async function fingerprintDevice(req: any, userId: string) {
  const clientToken = req.headers["x-device-token"] as string;
  const ua = new UAParser(req.headers["user-agent"]).getResult();
  const fp = createHash("sha256").update([
    clientToken, ua.browser.name, ua.os.name, ua.device.model,
    req.headers["accept-language"] ].join("|")).digest("hex");

  const known = await prisma.device.findUnique({
    where: { userId_fp: { userId, fp } } });

  if (!known) {
    const device = await prisma.device.create({
      data: { userId, fp, label: `ua.browser.name⋅{ua.browser.name} ·ua.browser.name⋅{ua.os.name}`, trusted: false } });
    // دستگاه جدید + عملیات حساس → نیاز به تأیید OTP/2FA مجدد
    await publish("security.new_device", { userId, fp, ip: req.ip });
    return { device, isNew: true };
  }
  return { device: known, isNew: false };
}

// قانون: برداشت/وام/تغییر امنیت از دستگاه non-trusted → گام تأیید دوم
export const requireTrustedDevice = async (req, res, next) => {
  const { device, isNew } = await fingerprintDevice(req, req.user.id);
  if (isNew || !device.trusted)
    return res.status(403).json({ error: "DEVICE_NOT_TRUSTED",
      hint: "تأیید OTP روی این دستگاه لازم است" });
  next();
};
