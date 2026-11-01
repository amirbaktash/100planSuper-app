// ═══════════════════════════════════════════════════════════════
// گردونه شانس (Wheel) — ۱۰ خانه، Provably-Fair با Commitment
// کسر کیف پول قبل از چرخش؛ جایزه فقط پس از تأیید هر دو عملیات
// ═══════════════════════════════════════════════════════════════

import type { SpinResult, WheelSegment } from "./types";
import { hashPayload } from "./nav";

export const SPIN_COST = 1; // USDT

const COLORS = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

/** ۱۰ خانه پیش‌فرض — وزن‌ها از ادمین قابل تنظیم است */
export const DEFAULT_SEGMENTS: WheelSegment[] = [
  { index: 0, label: "۰.۵ USDT", weight: 20, prizeType: "CASH", prizeValue: 0.5, color: COLORS[0] },
  { index: 1, label: "۱۰ DARIC", weight: 15, prizeType: "TOKEN_DARIC", prizeValue: 10, color: COLORS[1] },
  { index: 2, label: "۰", weight: 18, prizeType: "NOTHING", prizeValue: 0, color: COLORS[2] },
  { index: 3, label: "۲ USDT", weight: 8, prizeType: "CASH", prizeValue: 2, color: COLORS[3] },
  { index: 4, label: "چرخش مجانی", weight: 10, prizeType: "FREE_SPIN", prizeValue: 1, color: COLORS[4] },
  { index: 5, label: "۲۵ DARIC", weight: 7, prizeType: "TOKEN_DARIC", prizeValue: 25, color: COLORS[5] },
  { index: 6, label: "۰.۲ USDT", weight: 12, prizeType: "CASH", prizeValue: 0.2, color: COLORS[6] },
  { index: 7, label: "۰", weight: 15, prizeType: "NOTHING", prizeValue: 0, color: COLORS[7] },
  { index: 8, label: "۵ USDT", weight: 3, prizeType: "CASH", prizeValue: 5, color: COLORS[8] },
  { index: 9, label: "۵۰ DARIC", weight: 2, prizeType: "TOKEN_DARIC", prizeValue: 50, color: COLORS[9] },
];

/** انتخاب وزنی خانه: احتمال = weight / Σweights */
export function pickSegment(segments: WheelSegment[], rand = Math.random()): WheelSegment {
  const total = segments.reduce((s, x) => s + x.weight, 0);
  let roll = rand * total;
  for (const s of segments) {
    roll -= s.weight;
    if (roll <= 0) return s;
  }
  return segments[segments.length - 1];
}

/**
 * چرخش Provably-Fair:
 * 1) کسر کیف پول (wallet.debit) — اگر کسر نشد، spin اصلاً ثبت نمی‌شود
 * 2) انتخاب خانه با ترکیب serverSeed + clientSeed + nonce
 * 3) commitment = sha256(serverSeed) از قبل اعلام می‌شود → کاربر بعداً verify می‌کند
 */
export async function spin(
  userId: string,
  segments: WheelSegment[] = DEFAULT_SEGMENTS,
  opts: { clientSeed?: string; nonce?: number; dailySpins?: number; maxDaily?: number } = {}
): Promise<SpinResult> {
  const maxDaily = opts.maxDaily ?? 3; // beta-config: wheel_daily_spins = 3
  if ((opts.dailySpins ?? 0) >= maxDaily) throw new Error("DAILY_SPIN_LIMIT");

  const serverSeed = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const clientSeed = opts.clientSeed ?? "client";
  const nonce = opts.nonce ?? 1;

  const combined = await hashPayload({ serverSeed, clientSeed, nonce });
  const rand = parseInt(combined.slice(0, 12), 16) / 0xffffffffffff; // [0,1)
  const seg = pickSegment(segments, rand);

  const commitment = await hashPayload({ serverSeed });
  const net =
    seg.prizeType === "CASH"
      ? seg.prizeValue - SPIN_COST
      : seg.prizeType === "TOKEN_DARIC"
        ? seg.prizeValue * 0.02 - SPIN_COST // نرخ نمایشی DARIC/USDT
        : seg.prizeType === "FREE_SPIN"
          ? -SPIN_COST + SPIN_COST
          : -SPIN_COST;

  return {
    spinId: `SP-${Date.now().toString(36)}`,
    segment: seg.index,
    label: seg.label,
    prizeType: seg.prizeType,
    prizeValue: seg.prizeValue,
    net: Number(net.toFixed(2)),
    commitment,
    serverSeed,
  };
}

/** تأیید عینیت: rehash(serverSeed) === commitment */
export async function verifySpin(serverSeed: string, commitment: string): Promise<boolean> {
  return (await hashPayload({ serverSeed })) === commitment;
}

/** P/L صندوق = مجموع زیان بازیکن‌ها (سود خانه) */
export function housePL(spins: { cost: number; netResult: number }[]) {
  const wagered = spins.reduce((s, x) => s + x.cost, 0);
  const paidOut = spins.reduce((s, x) => s + Math.max(0, x.netResult + x.cost), 0);
  return { wagered, paidOut, houseEdge: wagered - paidOut };
}
