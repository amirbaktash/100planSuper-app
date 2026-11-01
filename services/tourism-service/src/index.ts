// سرویس گردشگری — کاتالوگ تور دوطرفه + رزرو + پرداخت چند-ارزی
import express from "express";
import { prisma } from "@daric/shared/db";
import { notifyAdmin, getAssetUSDPrice, requestReply, publish } from "@daric/shared/db";
import { auth, requireKYC } from "./auth";

const app = express();
app.use(express.json());

app.get("/healthz", (_q, r) => r.json({ ok: true, service: "tourism" }));

// کاتالوگ تورها + موجودی (هتل/قطار/اتوبوس/هواپیما)
app.get("/catalog", async (_q, res) =>
  res.json(await prisma.tour.findMany({ where: { status: "OPEN" }, orderBy: { departure: "asc" } }))
);

// ── رزرو: قفل صندلی + ساخت booking در انتظار پرداخت ──
app.post("/bookings", auth, requireKYC, async (req, res) => {
  const { tourId, seats, passengers } = req.body;
  const booking = await prisma.$transaction(async (tx) => {
    const tour = await tx.tour.findUniqueOrThrow({ where: { id: tourId } });
    if (tour.sold + seats > tour.seats) throw new Error("OVERBOOKING_BLOCKED");
    await tx.tour.update({ where: { id: tourId }, data: { sold: { increment: seats } } });
    return tx.booking.create({
      data: { userId: req.user.id, tourId, seats, passengers, status: "PENDING", totalUSD: tour.priceUSD * seats },
    });
  });
  res.status(201).json(booking);
});

// ── پرداخت چند-ارزی (USDT | DARIC | EUR): کسر هر asset با نرخ لحظه‌ای ──
app.post("/bookings/:id/pay", auth, async (req, res) => {
  const { payments } = req.body as { payments: { asset: string; amount: string }[] };
  const b = await prisma.booking.findUniqueOrThrow({ where: { id: req.params.id } });
  if (b.status !== "PENDING") return res.status(409).json({ error: "ALREADY_PAID" });
  if (b.userId !== req.user.id) return res.status(403).json({ error: "FORBIDDEN" });

  let totalUSD = 0;
  for (const p of payments) {
    const rate = await getAssetUSDPrice(p.asset);
    totalUSD += Number(p.amount) * rate;
    const debit = await requestReply("wallet.debit", {
      userId: req.user.id, asset: p.asset, amount: p.amount, refId: b.id,
    });
    if (!debit?.ok) return res.status(409).json({ error: "WALLET_DEBIT_FAILED:" + p.asset });
  }
  const paid = await prisma.booking.update({ where: { id: b.id }, data: { status: "PAID", paidUSD: totalUSD } });
  await publish("tourism.booking.confirmed", { userId: req.user.id, refId: b.id, amountUSD: totalUSD });
  // ✅ رویداد tourism.booking.confirmed → MLM پورسانت دسته TOURISM
  res.json(paid);
});

app.listen(process.env.PORT ?? 4090);
declare module "express-serve-static-core" { interface Request { user: { id: string } } }
