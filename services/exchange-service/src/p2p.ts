// سرویس P2P — پیشنهاد فروش DARIC/SHARE با اسکرو Vault
import { Router } from "express";
import { INTERNAL } from "./constants/pairs";
import { prisma } from "@daric/shared/db";
import { publish } from "@daric/eventbus";
import { auth } from "./auth";

export const p2pRouter = Router();

// Escrow از طریق DaricVault — پیشنهاد فروش DARIC/SHARE
p2pRouter.post("/offer", auth, async (req, res) => {
  const { asset, amount, pricePerUnit, paymentMethod } = req.body;
  if (!INTERNAL.includes(asset)) return res.status(400).json({ error: "P2P_LIMITED_TO_DARIC_SHARE" });

  // ۱. قفل توکن فروشنده در Vault (lockFor با id پیشنهاد)
  const offer = await prisma.p2pOffer.create({
    data: { sellerId: req.user.id, asset, amount, pricePerUnit, paymentMethod, status: "OPEN" },
  });
  // await vault.lockFor(offer.id, seller, amountWei, 72h);
  res.status(201).json(offer);
});

p2pRouter.post("/fill/:offerId", auth, async (req, res) => {
  const offer = await prisma.p2pOffer.findUniqueOrThrow({ where: { id: req.params.offerId } });
  if (offer.status !== "OPEN") return res.status(409).json({ error: "OFFER_NOT_ACTIVE" });
  // ۲. پرداخت فیات/کریپتوی خریدار → تأیید فروشنده/اتوماسیون
  // ۳. release از Vault به خریدار
  const updated = await prisma.p2pOffer.update({ where: { id: offer.id }, data: { status: "FILLED", buyerId: req.user.id } });
  await publish("p2p.filled", { offerId: offer.id, buyerId: req.user.id });
  res.json(updated);
});

p2pRouter.get("/offers", async (_req, res) => {
  res.json(await prisma.p2pOffer.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" } }));
});
