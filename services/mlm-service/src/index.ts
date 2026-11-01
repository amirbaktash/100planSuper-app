// سرویس باشگاه (MLM) — پورسانت ۲۵/۱۲/۶ تا ۳ سطح، تایرها، درخت زیرمجموعه
import express from "express";
import { processPurchase, CATEGORY_MAP, recalcTier, TIERS, type CommissionRule } from "@daric/shared";
import { prisma } from "@daric/shared/db";
import { subscribe, publish } from "@daric/eventbus";
import { auth } from "./auth";

const app = express();
app.use(express.json());
app.use(auth);

app.get("/healthz", (_q, r) => r.json({ ok: true, service: "mlm" }));

// ── consumer: رویدادهای ۵ ماژول → پردازش پورسانت ──
export async function startMlmConsumer() {
  await subscribe("mlm-service", "mlm-worker-1", async (e: any) => {
    const category = CATEGORY_MAP[e.type];
    if (!category) return; // فقط ۵ دسته پورسانت‌دار
    const buyer = await uplineOf(e.payload.userId); // upline تا ۳ سطح + tier هر کدام
    const rules = (await prisma.commissionRule.findMany({ where: { active: true } })) as CommissionRule[];
    const { commissions, events } = processPurchase(buyer, category, e.payload.amountUSD, rules);
    for (const ev of events) await publish(ev.type, ev.payload); // accounting consumes
    await prisma.commission.createMany({ data: commissions as any });
  });
}

app.get("/my", async (req, res) =>
  res.json({
    commissions: await prisma.commission.findMany({ where: { receiverId: req.user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    tier: (await prisma.user.findUniqueOrThrow({ where: { id: req.user.id } })).clubTier,
    tiers: TIERS,
  })
);

// درخت زیرمجموعه (گراف برای رسم در داشبورد)
app.get("/tree", async (req, res) => {
  const nodes = await prisma.referral.findMany({
    where: { referrerId: req.user.id },
    select: { userId: true, parentId: true, depth: true },
  });
  res.json({ root: req.user.id, nodes });
});

// ارتقای خودکار تایر — cron روزانه
export async function recalcTiers() {
  for (const user of await prisma.user.findMany()) {
    const stats = await downlineStats(user.id);
    const { changed, from, to } = recalcTier(user.clubTier as any, stats.directCount, stats.volumeUSD);
    if (changed) {
      await prisma.user.update({ where: { id: user.id }, data: { clubTier: to } });
      await publish("club.tier.upgraded", { userId: user.id, from, to });
    }
  }
}

async function uplineOf(userId: string) { return { userId, upline: [] }; }
async function downlineStats(_userId: string) { return { directCount: 0, volumeUSD: 0 }; }

startMlmConsumer();
app.listen(process.env.PORT ?? 4060);
declare module "express-serve-static-core" { interface Request { user: { id: string } } }
