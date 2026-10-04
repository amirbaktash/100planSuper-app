// ── گالری ──
app.post("/admin/media", requirePermission("cms", "EDIT"), upload.single("file"), async (q, r) => {
  const meta = await imageMeta(q.file!.buffer);           // ابعاد + بهینه‌سازی (sharp → webp)
  r.status(201).json(await prisma.media.create({ data: {
    url: await uploadToS3(q.file!, "media/"), type: q.body.type ?? "IMAGE",
    title: q.body.title, tags: (q.body.tags ?? "").split(","), ...meta,
    uploadedBy: q.user.id } }));
});

// ── انتخابگر رسانه (Media Picker) برای هر صفحه/ماژول ──
app.get("/admin/media/pick", requirePermission("cms", "VIEW"), async (q, r) =>
  r.json(await prisma.media.findMany({
    where: q.query.tag ? { tags: { has: q.query.tag } } : {},
    orderBy: { createdAt: "desc" }, take: 60 })));

// ── WYSIWYG: ذخیره بلوک‌های صفحه → نیاز به APPROVE ادمین دیگر (Maker-Checker) ──
app.put("/admin/pages/:slug", requirePermission("cms", "EDIT"), async (q, r) =>
  r.json(await prisma.page.upsert({
    where: { slug: q.params.slug },
    create: { slug: q.params.slug, title: q.body.title, blocks: q.body.blocks,
      status: "PENDING", updatedBy: q.user.id },
    update: { blocks: q.body.blocks, status: "PENDING", updatedBy: q.user.id } })));

app.post("/admin/pages/:id/approve", requirePermission("cms", "APPROVE"), async (q, r) => {
  const page = await prisma.page.update({ where: { id: q.params.id },
    data: { status: "PUBLISHED", publishedBy: q.user.id, publishedAt: new Date() } });
  await publish("cms.page.published", { slug: page.slug });
  r.json(page);
});

// ── CRUD عمومی روی همه بخش‌ها (Generic Admin CRUD) ──
const RESOURCES = { tours: prisma.tour, products: prisma.insuranceProduct,
  wheelSegments: prisma.wheelSegment, commissionRules: prisma.commissionRule,
  inventory: prisma.inventoryItem, claims: prisma.claim, kycDocs: prisma.kycDoc };

for (const [name, model] of Object.entries(RESOURCES)) {
  app.get(   `/admin/${name}`,  requirePermission(name, "VIEW"),   list(model));
  app.post(  `/admin/${name}`,  requirePermission(name, "EDIT"),   create(model, q.user.id));
  app.put(   `/admin/${name}/:id`, requirePermission(name, "EDIT"), update(model, q.user.id));
  app.delete(`/admin/${name}/:id`, requirePermission(name, "APPROVE"), softDelete(model, q.user.id));
}

// ── Audit Log viewer ──
app.get("/admin/audit", requirePermission("users", "VIEW"), async (q, r) =>
  r.json(await prisma.adminAuditLog.findMany({
    where: q.query.adminId ? { adminId: q.query.adminId } : {},
    orderBy: { createdAt: "desc" }, take: 200 })));
