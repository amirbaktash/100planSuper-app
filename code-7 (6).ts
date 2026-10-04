app.get("/products",  async (q, r) => r.json(await prisma.insuranceProduct.findMany({ where: { active: true } })));
app.post("/policies", auth, requireKYC(2), async (q, r) =>
  r.status(201).json(await purchasePolicy(q.user.id, q.body.productId, q.body.refCode)));
app.post("/policies/:id/claims", auth, async (q, r) =>
  r.status(201).json(await fileClaim(q.user.id, q.params.id, q.body.amountUSD, q.body.reason, q.body.docs ?? [])));
app.post("/admin/claims/:id/approve", auth, async (q, r) => { /* adminOnly + approveClaim */ });
