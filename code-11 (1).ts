import { Router } from "express";
import { INTERNAL } from "./constants/pairs";
export const p2pRouter = Router();

// Escrow از طریق DaricVault — پیشنهاد فروش DARIC/SHARE
p2pRouter.post("/offer", auth, async (req, res) => {
  const { asset, amount, pricePerUnit, paymentMethod } = req.body;
  if (!INTERNAL.includes(asset)) return res.status(400).json({ error: "P2P limited to DARIC/SHARE" });
  // قفل توکن فروشنده در Vault → ساخت offer
});

p2pRouter.post("/fill/:offerId", auth, async (req, res) => {
  // پرداخت فیات/کریپتو → تأیید → release از Vault به خریدار
});

p2pRouter.get("/offers", (_req, res) => { /* لیست فعال */ });
