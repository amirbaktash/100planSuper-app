// سرویس صرافی — OrderBook داخلی (DARIC/SHARE) + Top20 از فید خارجی
// کارمزد: ۰.۲٪ پایه — ۰.۱٪ با پرداخت داریک (EXCHANGE_FEE)
import express from "express";
import { OrderBook, EXCHANGE_FEE } from "@daric/shared";
import type { Order } from "@daric/shared";
import { prisma } from "@daric/shared/db";
import { publish } from "@daric/eventbus";
import { auth, require2FA } from "./auth";
import { getDaricPrice } from "./feeds/daric-feed";
import { priceFeed } from "./feeds/external";
import { p2pRouter } from "./p2p";

const app = express();
app.use(express.json());
app.use(auth);

const books = new Map<string, OrderBook>();
export const book = (pair: string) => {
  if (!books.has(pair)) books.set(pair, new OrderBook());
  return books.get(pair)!;
};

app.get("/healthz", (_q, r) => r.json({ ok: true, service: "exchange" }));

// ── ثبت سفارش (limit/market) ──
app.post("/order", require2FA, async (q, r) => {
  const { pair, side, type, price, qty } = q.body;
  const ob = book(pair);
  const order: Order = {
    id: `O-${Date.now().toString(36)}`, userId: q.user.id, pair, side, type,
    price, qty, filled: 0, ts: Date.now(),
  };
  const fills = ob.place(order);

  let feeTotal = 0;
  for (const f of fills) {
    const quote = f.price * f.qty;
    // کارمزد: ۵۰٪ خریدار + ۵۰٪ فروشنده، ارز پرداخت داریک = نصف
    const fee = quote * EXCHANGE_FEE.base;
    feeTotal += fee;
    await publish("exchange.trade.fill", {
      fillId: `${f.buyOrder}:${f.sellOrder}`, pair,
      base: pair.split("/")[0], quote: pair.split("/")[1],
      quoteAmount: quote.toFixed(8), baseAmount: f.qty.toFixed(8),
      fee: fee.toFixed(8), feeAsset: "USDT",
    });
  }
  r.status(201).json({ order, fills, fee: feeTotal.toFixed(4), feeWithDARIC: (feeTotal / 2).toFixed(4) });
});

app.get("/depth/:pair", (q, r) => r.json(book(q.params.pair).depth(20)));
app.get("/price/:asset", async (q, r) => {
  const price = q.params.asset === "DARIC" ? await getDaricPrice() : await priceFeed(q.params.asset);
  r.json({ price });
});
app.delete("/order/:id", (q, r) => { book("DARIC/USDT").cancel(q.params.id); r.json({ ok: true }); });

// ── P2P: اسکرو از DaricVault — محدود به DARIC/SHARE ──
app.use("/p2p", p2pRouter);

app.listen(process.env.PORT ?? 4010);
declare module "express-serve-static-core" { interface Request { user: { id: string } } }
