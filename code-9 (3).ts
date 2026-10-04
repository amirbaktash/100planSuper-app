export const TIERS = [
  { tier: "BRONZE",  minDownline: 0,   minVolumeUSD: 0 },
  { tier: "SILVER",  minDownline: 5,   minVolumeUSD: 500 },
  { tier: "GOLD",    minDownline: 25,  minVolumeUSD: 5000 },
  { tier: "DIAMOND", minDownline: 100, minVolumeUSD: 50000 },
] as const;

export type Tier = "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";

/** ارتقای خودکار سطح — cron روزانه */
export async function recalcTiers() {
  for (const user of await prisma.user.findMany()) {
    const { directCount, volumeUSD } = await downlineStats(user.id);
    const target = [...TIERS].reverse().find(t =>
      directCount >= t.minDownline && volumeUSD >= t.minVolumeUSD)?.tier ?? "BRONZE";
    if (target !== user.clubTier) {
      await prisma.user.update({ where: { id: user.id }, data: { clubTier: target } });
      await publish("club.tier.upgraded", { userId: user.id, from: user.clubTier, to: target });
    }
  }
}
