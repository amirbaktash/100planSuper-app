import RedisStore from "rate-limit-redis";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { redis } from "@daric/eventbus";

/** لایه ۱: عمومی — هر IP */
export const globalLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...a: any) => redis.call(...a) }),
  windowMs: 60_000, max: 120, standardHeaders: true,
  keyGenerator: (req) => `rl:ip:${req.ip}` });

/** لایه ۲: مسیرهای حساس — سخت‌گیرانه */
export const sensitiveLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...a: any) => redis.call(...a) }),
  windowMs: 15 * 60_000, max: 5,
  keyGenerator: (req) => `rl:sens:req.ip:{req.ip}:req.ip:{req.path}`,
  message: { error: "TOO_MANY_ATTEMPTS" } });

/** لایه ۳: کند کردن تدریجی brute-force */
export const slowDownOTP = slowDown({
  windowMs: 60_000, delayAfter: 2, delayMs: () => 2000,
  keyGenerator: (req) => `sd:${req.ip}` });

// اعمال: /auth/otp, /auth/login, /kyc/*, /withdraw → sensitiveLimiter + slowDownOTP
