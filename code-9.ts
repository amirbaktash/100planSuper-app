import express from "express";
import { ethers } from "ethers";
import { isAllowed, INTERNAL } from "./constants/pairs";
import { OrderBook } from "./orderbook";
import { getDaricPrice } from "./feeds/daric-feed";   // از NAV_Oracle
import { priceFeed } from "./feeds/external";         // CoinGecko/Chainlink برای Top20
import { auth, require2FA } from "./auth";
import { depositListener } from "./deposits";
import { queueWithdrawal } from "./withdrawals";
import { p2pRouter } from "./p2p";

const app = express();
app.use(express.json());
app.use(auth);

const books = new Map<string, OrderBook>();
const book = (pair: string) => { if (!books.has(pair)) books.set(pair, new OrderBook()); return books.get(pair)!; };

const FEE = { base: 0.002, daric: 0.001 }; // 0.2٪ — 0.1٪ با DARIC

// ── سفارش ──
app.post("/order", require2FA, async (req, res) => {
  const { base, quote, side, type, price, qty } = req.body;
  if (![base, quote].every(isAllowed)) return res.status(400).json({ error: "asset not whitelisted" });
  // بررسی موجودی + بلوکه کردن funds
  const fills = book(`base/{base}/base/{quote}`).place({ ...req.body, filled: 0, id: crypto.randomUUID(), ts: Date.now() });
  await settleFills(fills, req.userId);
  res.json({ fills });
});

app.get("/depth/:pair", (req, res) => res.json(book(req.params.pair).depth()));

// ── قیمت DARIC از NAV Oracle ──
app.get("/price/DARIC", async (_req, res) => {
  res.json({ symbol: "DARIC", price: await getDaricPrice(), source: "NAV_Oracle on-chain" });
});

// ── Deposit / Withdraw ──
app.post("/deposit/crypto", auth, (req, res) => res.json({ address: depositListener.getAddress(req.user.id, req.body.symbol) }));
app.post("/deposit/fiat",   auth, async (req, res) => { /* رسید بانکی → صف تأیید ادمین */ });
app.post("/withdraw", auth, require2FA, async (req, res) => {
  const { symbol, amount, address } = req.body;
  if (!isAllowed(symbol)) return res.status(400).json({ error: "asset not whitelisted" });
  const result = await queueWithdrawal(req.user.id, symbol, amount, address);
  // مبالغ بزرگ → DaricTimelock 48h
  res.json(result);
});

// ── P2P داخلی: فقط DARIC و SHARE ──
app.use("/p2p", p2pRouter); // فقط از INTERNAL whitelist عبور می‌کند

app.listen(process.env.PORT ?? 4010);
