// ═══════════════════════════════════════════════════════════════
// باشگاه — سطوح BRONZE / SILVER / GOLD / DIAMOND
// ارتقای خودکار: cron روزانه بر اساس زیرمجموعه مستقیم + حجم
// ═══════════════════════════════════════════════════════════════

import type { ClubTier } from "./types";

export const TIERS = [
  { tier: "BRONZE" as ClubTier, minDownline: 0, minVolumeUSD: 0, label: "برنز", emoji: "🥉" },
  { tier: "SILVER" as ClubTier, minDownline: 5, minVolumeUSD: 500, label: "نقره", emoji: "🥈" },
  { tier: "GOLD" as ClubTier, minDownline: 25, minVolumeUSD: 5000, label: "طلا", emoji: "🥇" },
  { tier: "DIAMOND" as ClubTier, minDownline: 100, minVolumeUSD: 50000, label: "الماس", emoji: "💎" },
];

/** محاسبه هدف کاربر از آمار زیرمجموعه */
export function targetTier(directCount: number, volumeUSD: number): ClubTier {
  const target = [...TIERS].reverse().find((t) => directCount >= t.minDownline && volumeUSD >= t.minVolumeUSD);
  return target?.tier ?? "BRONZE";
}

/** تغییر سطح؟ → رویداد club.tier.upgraded */
export function recalcTier(
  current: ClubTier,
  directCount: number,
  volumeUSD: number
): { changed: boolean; from: ClubTier; to: ClubTier } {
  const to = targetTier(directCount, volumeUSD);
  return { changed: to !== current, from: current, to };
}

export function tierInfo(tier: ClubTier) {
  return TIERS.find((t) => t.tier === tier)!;
}
