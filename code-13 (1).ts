p2pRouter.get("/offers", async (_req, res) =>
  res.json(await prisma.p2POffer.findMany({ where: { status: "OPEN" } })));

p2pRouter.post("/offer", auth, async (req, res) => {
  const { asset, amount, pricePerUnit, payment, side } = req.body;
  if (!INTERNAL.includes(asset)) return res.status(400).json({ error: "P2P limited to DARIC/SHARE" });

  if (side === "SELL") {
    // قفل توکن فروشنده در DaricVault به‌عنوان Escrow
    const vault = new ethers.Contract(process.env.DARIC_VAULT!, VAULT_ABI, signer);
    const tx = await vault.lock(asset, ethers.parseUnits(amount, 18));
    await tx.wait();
  }
  res.status(201).json(await prisma.p2POffer.create({
    data: { makerId: req.user.id, asset, amount, pricePerUnit, payment, side,
      status: "OPEN", escrowTx: side === "SELL" ? tx.hash : null } }));
});

p2pRouter.post("/fill/:offerId", auth, require2FA, async (req, res) => {
  const offer = await prisma.p2POffer.findUniqueOrThrow({ where: { id: req.params.offerId } });
  if (offer.status !== "OPEN") return res.status(400).json({ error: "not open" });
  if (offer.makerId === req.user.id) return res.status(400).json({ error: "own offer" });

  // 1. خریدار پرداخت می‌کند → 2. تأیید پرداخت → 3. release از Vault
  await prisma.p2POffer.update({ where: { id: offer.id }, data: { status: "LOCKED" } });
  // پس از تأیید ادمین/اتوماتیک:
  // await vault.release(offer.escrowTx, req.user.id);
  res.status(201).json({ status: "LOCKED", nextStep: "buyer-confirms-payment" });
});
