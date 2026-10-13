import express from "express";
import Decimal from "decimal.js";
import { auth, requireKYC, require2FA } from "./auth";
import { getMetalPrice } from "./feeds";           // طلا/نقره لحظه‌ای
import { prisma } from "./db";

const app = express();
app.use(express.json());
app.use(auth);
const SPREAD = new Decimal("0.005"); // 0.5٪

// ── خرید ──
app.post("/buy", requireKYC, require2FA, async (req, res) => {
  const { metal, amountUSD, walletAsset } = req.body; // metal: GOLD | SILVER
  if (!["GOLD", "SILVER"].includes(metal)) return res.status(400).json({ error: "invalid metal" });
  const spot = new Decimal(await getMetalPrice(metal));
  const price = spot.times(new Decimal(1).plus(SPREAD));
  const grams = new Decimal(amountUSD).div(price).toFixed(4);

  await prisma.$transaction(async tx => {
    await tx.balance.update({ where: { userId_asset: { userId: req.user.id, asset: walletAsset } },
      data: { amount: { decrement: amountUSD } } });
    await tx.metalHolding.upsert({ where: { userId_metal: { userId: req.user.id, metal } },
      create: { userId: req.user.id, metal, grams },
      update: { grams: { increment: new Decimal(grams) } } });
    await tx.metalTrade.create({ data: { userId: req.user.id, metal, side: "BUY",
      grams, priceUSD: price.toString(), totalUSD: amountUSD } });
  });
  res.json({ grams, pricePerGram: price.toString() });
});

// ── فروش ──
app.post("/sell", requireKYC, require2FA, async (req, res) => {
  const { metal, grams } = req.body;
  const spot = new Decimal(await getMetalPrice(metal));
  const price = spot.times(new Decimal(1).minus(SPREAD));
  const proceeds = price.times(grams);
  // کاهش holding → افزایش موجودی کیف پول (USDT یا انتخاب کاربر)
  res.json({ proceeds: proceeds.toString(), walletCredit: "USDT" });
});

// ── تسویه فیزیکی: تبدیل دارایی به طلای فیزیکی ──
app.post("/settle-physical", requireKYC, require2FA, async (req, res) => {
  const { metal, grams, deliveryMethod } = req.body; // vault_pickup | courier
  const holding = await prisma.metalHolding.findUnique({
    where: { userId_metal: { userId: req.user.id, metal } } });
  if (!holding || holding.grams.lessThan(grams))
    return res.status(400).json({ error: "insufficient holding" });

  const request = await prisma.physicalSettlement.create({ data: {
    userId: req.user.id, metal, grams, deliveryMethod,
    status: "PENDING_ADMIN",      // تأیید ادمین → رزرو در گاوصندوق → ارسال
    feeUSD: /* هزینه ساخت + ارسال */ } });

  // رکورد on-chain: NFT رسید مالکیت (آدرس قرارداد رسید)
  // await mintSettlementReceipt(req.user.id, request.id, grams, metal);
  res.status(201).json(request);
});

// ── تبدیل به نقدشوندگی کیف پول ──
app.post("/convert-to-wallet", requireKYC, async (req, res) => {
  const { metal, grams, targetAsset } = req.body; // target: USDT | DARIC | EUR ...
  const spot = new Decimal(await getMetalPrice(metal));
  const value = spot.times(grams);
  // کاهش holding → اعتبار target asset به کیف پول → قابل برداشت/ترید در صرافی
  res.json({ credited: targetAsset, amount: value.toString() });
});

app.get("/prices", async (_req, res) =>
  res.json({ GOLD: await getMetalPrice("GOLD"), SILVER: await getMetalPrice("SILVER") }));

app.listen(process.env.PORT ?? 4020);
