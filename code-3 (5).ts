import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "./db";
import { publish } from "@daric/eventbus";
import { randomInt, randomBytes } from "crypto";

const OTP_TTL = 2 * 60_000;           // ۲ دقیقه
const MAX_ATTEMPTS = 3;

export async function sendOtp(phone: string, purpose: string) {
  // Rate limit: حداکثر ۳ کد در ساعت per phone
  const recent = await prisma.otpCode.count({ where: {
    phone, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  if (recent >= 3) throw new Error("OTP_RATE_LIMITED");

  const code = randomInt(100000, 999999).toString();
  await prisma.otpCode.create({ data: {
    phone, code: await bcrypt.hash(code, 10), purpose,
    expiresAt: new Date(Date.now() + OTP_TTL) } });
  await sendSMS(phone, `کد داریک: ${code}`);   // Kavenegar/SMS.ir
  return { sent: true, expiresInSec: 120 };
}

export async function verifyOtp(phone: string, code: string, purpose: string) {
  const otp = await prisma.otpCode.findFirst({
    where: { phone, purpose, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" } });
  if (!otp || otp.attempts >= MAX_ATTEMPTS) throw new Error("OTP_INVALID_OR_EXPIRED");
  if (!(await bcrypt.compare(code, otp.code))) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new Error("OTP_WRONG");
  }
  await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });
}

/** ثبت‌نام: phone + OTP + کد معرف اختیاری */
export async function register(phone: string, otp: string, password: string, refCode?: string) {
  await verifyOtp(phone, otp, "REGISTER");
  if (await prisma.user.findUnique({ where: { phone } })) throw new Error("PHONE_EXISTS");

  const referrer = refCode
    ? await prisma.user.findUnique({ where: { referralCode: refCode } }) : null;

  const user = await prisma.user.create({ data: {
    phone, passwordHash: await bcrypt.hash(password, 12),
    referralCode: randomBytes(4).toString("hex").toUpperCase(),  // مثلاً "A3F9C21B"
    referredById: referrer?.id ?? null } });

  await publish("user.registered", { userId: user.id, referredById: referrer?.id });
  return createSession(user.id);
}

export async function login(phone: string, otp: string) {
  await verifyOtp(phone, otp, "LOGIN");
  const user = await prisma.user.findUniqueOrThrow({ where: { phone } });
  const s = await createSession(user.id);
  await publish("user.login", { userId: user.id, ip: s.ip });
  return s;
}

async function createSession(userId: string) {
  const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET!, { expiresIn: "24h" });
  return prisma.session.create({ data: { userId, token, ip: "auto", device: "auto",
    expiresAt: new Date(Date.now() + 86400_000) } });
}

// middleware
export const auth = async (req, res, next) => {
  const s = await prisma.session.findUnique({ where: { token: req.headers.authorization?.slice(7) } });
  if (!s || s.revoked || s.expiresAt < new Date()) return res.sendStatus(401);
  req.user = { id: s.userId };
  next();
};
