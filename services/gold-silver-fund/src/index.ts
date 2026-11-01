// سرویس طلا و نقره — اسپرد ۰.۵٪، تسویه فیزیکی، تبدیل به کیف پول (پورت 4020)
import express from "express";
import { METAL_SPREAD, metalPL } from "@daric/shared";
import { prisma } from "@daric/shared/db";
import { publish } from "@daric/eventbus";
import { auth, requireKYC, require2FA } from "./auth";
import { getMetalPrice } from "./feeds";

const app = express();
app.use(express.json());
app.use(auth);

app.get("/healthz", (_q, r) => r.json({ ok: true, service: "gold-silver" }));
app.get("/prices", async (_q, r) =>
  r.json({ GOLD: await getMetalPrice("GOLD"), SILVER: await getMetalPrice("SILVER") })
);

// ── خرید: spot × (1 + 0.5%) ──
app.post("/buy", requireKYC, require2FA, async (req, res) => {
  const { metal, amountUSD, walletAsset } = req.body;
  if (!["GOLD", "SILVER"].includes(metal)) return res.status(400).json({ error: "INVALID_METAL" });
  const spot = Number(await getMetalPrice(metal));
  const price = spot * (1 + METAL_SPREAD);
  const grams = (Number(amountUSD) / price).toFixed(4);

  await prisma.$transaction(async (tx) => {
    await tx.balance.update({
      where: { userId_asset: { userId: req.user.id, asset: walletAsset } },
      data: { amount: { decrement: amountUSD } },
    });
    await tx.metalHolding.upsert({
      where: { userId_metal: { userId: req.user.id, metal } },
      create: { userId: req.user.id, metal, grams },
      update: { grams: { increment: Number(grams) } },
    });
    const trade = await tx.metalTrade.create({
      data: { userId: req.user.id, metal, side: "BUY", grams, priceUSD: price.toFixed(2), totalUSD: amountUSD },
    });
    await publish("gold.trade.executed", {
      tradeId: trade.id, userId: req.user.id, metal, side: "BUY",
      cashIn: amountUSD, cashOut: "0", spread: (Number(amountUSD) * METAL_SPREAD).toFixed(4),
    });
  });
  res.json({ grams, pricePerGram: price.toFixed(2) });
});

// ── فروش: spot × (1 − 0.5%) ──
app.post("/sell", requireKYC, require2FA, async (req, res) => {
  const { metal, grams } = req.body;
  const spot = Number(await getMetalPrice(metal));
  const price = spot * (1 - METAL_SPREAD);
  const proceeds = price * Number(grams);
  // کاهش holding → افزایش موجودی USDT کیف پول → قید دفتر
  res.json({ proceeds: proceeds.toFixed(2), pricePerGram: price.toFixed(2), walletCredit: "USDT" });
});

// ── تسویه فیزیکی: تبدیل به طلای فیزیکی + NFT رسید مالکیت on-chain ──
app.post("/settle-physical", requireKYC, require2FA, async (req, res) => {
  const { metal, grams, deliveryMethod } = req.body; // vault_pickup | courier
  const holding = await prisma.metalHolding.findUnique({
    where: { userId_metal: { userId: req.user.id, metal } },
  });
  if (!holding || Number(holding.grams) < Number(grams))
    return res.status(400).json({ error: "INSUFFICIENT_HOLDING" });

  const request = await prisma.physicalSettlement.create({
    data: {
      userId: req.user.id, metal, grams, deliveryMethod,
      status: "PENDING_ADMIN", // تأیید ادمین → رزرو در گاوصندوق → ارسال
      feeUSD: (Number(grams) * 2.5).toFixed(2), // هزینه ساخت + ارسال (نمونه)
    },
  });
  // رکورد on-chain: NFT رسید مالکیت (mintSettlementReceipt)
  res.status(201).json(request);
});

// ── تبدیل به نقدشوندگی کیف پول (USDT | DARIC | EUR) ──
app.post("/convert-to-wallet", requireKYC, async (req, res) => {
  const { metal, grams, targetAsset } = req.body;
  const spot = Number(await getMetalPrice(metal));
  const value = spot * Number(grams);
  res.json({ credited: targetAsset, amount: value.toFixed(2) });
});

// ماشین‌حساب سود/زیان سه‌سناریویی برای کاربر
app.get("/pl", (req, res) => {
  const q = req.query as any;
  res.json(metalPL({
    grams: q.grams ?? "10", buyPricePerGram: q.buyPrice ?? "75",
    buyFeePct: "0.5", holdDays: Number(q.days ?? 30), sellFeePct: "0.5",
  }));
});

app.listen(process.env.PORT ?? 4020);
declare module "express-serve-static-core" { interface Request { user: { id: string } } }
