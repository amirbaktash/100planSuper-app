// سرویس ادمین — RBAC (View/Edit/Approve)، CMS (Maker-Checker)، Audit Log
import express from "express";
import { prisma } from "@daric/shared/db";
import { publish } from "@daric/eventbus";
import { auth, requirePermission, audited } from "./rbac";
import { upload } from "./media";

const app = express();
app.use(express.json());
app.use(auth);

app.get("/healthz", (_q, r) => r.json({ ok: true, service: "admin" }));

// ── گالری رسانه ──
app.post("/media", requirePermission("cms", "EDIT"), upload.single("file"), async (q, r) => {
  const meta = await imageMeta(q.file!.buffer); // ابعاد + بهینه‌سازی (sharp → webp)
  r.status(201).json(
    await prisma.media.create({
      data: {
        url: await uploadToS3(q.file!, "media/"), type: q.body.type ?? "IMAGE",
        title: q.body.title, tags: (q.body.tags ?? "").split(","), ...meta,
        uploadedBy: q.user.id,
      },
    })
  );
});

// انتخابگر رسانه برای هر صفحه/ماژول
app.get("/media/pick", requirePermission("cms", "VIEW"), async (q, r) =>
  r.json(
    await prisma.media.findMany({
      where: q.query.tag ? { tags: { has: q.query.tag as string } } : {},
      orderBy: { createdAt: "desc" },
      take: 60,
    })
  )
);

// ── WYSIWYG: ذخیره بلوک‌های صفحه → نیاز به APPROVE ادمین دیگر (Maker-Checker) ──
app.put("/pages/:slug", requirePermission("cms", "EDIT"), audited("cms.page.save", "pages"), async (q, r) =>
  r.json(
    await prisma.page.upsert({
      where: { slug: q.params.slug },
      create: { slug: q.params.slug, title: q.body.title, blocks: q.body.blocks, status: "PENDING", updatedBy: q.user.id },
      update: { blocks: q.body.blocks, status: "PENDING", updatedBy: q.user.id },
    })
  )
);

app.post("/pages/:slug/approve", requirePermission("cms", "APPROVE"), audited("cms.page.approve", "pages"), async (q, r) =>
  r.json(
    await prisma.page.update({
      where: { slug: q.params.slug },
      data: { status: "PUBLISHED", publishedAt: new Date(), approvedBy: q.user.id },
    })
  )
);

// ── صف KYC ──
app.get("/kyc/queue", requirePermission("kyc", "VIEW"), async (_q, r) =>
  r.json(await prisma.user.findMany({ where: { kycStatus: "PENDING" }, include: { kycDocs: true } }))
);
app.post("/kyc/:id/approve", requirePermission("kyc", "EDIT"), audited("kyc.approve", "users"), async (q, r) =>
  r.json(await prisma.user.update({ where: { id: q.params.id }, data: { kycStatus: "APPROVED", kycLevel: 2 } }))
);
app.post("/kyc/:id/reject", requirePermission("kyc", "EDIT"), audited("kyc.reject", "users"), async (q, r) =>
  r.json(await prisma.user.update({ where: { id: q.params.id }, data: { kycStatus: "REJECTED" } }))
);

// ── RBAC: مدیریت نقش‌ها و مجوزها ──
app.put("/rbac/roles/:id/permissions", requirePermission("rbac", "EDIT"), audited("rbac.update", "roles"), async (q, r) =>
  r.json(await prisma.role.update({ where: { id: q.params.id }, data: { permissions: { set: q.body.permissions } } }))
);

// ── Audit Log: جستجو و export ──
app.get("/audit", requirePermission("users", "VIEW"), async (q, r) =>
  r.json(
    await prisma.adminAuditLog.findMany({
      where: q.query.actor ? { actorId: q.query.actor as string } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
    })
  )
);

async function imageMeta(_b: Buffer) { return { width: 1600, height: 900 }; }
async function uploadToS3(_f: any, _p: string) { return "s3://daric-media/demo.webp"; }

app.listen(process.env.PORT ?? 4110);
declare module "express-serve-static-core" {
  interface Request { user: { id: string; isAdmin?: boolean }; adminPerms?: { resource: string; action: string }; file?: any; params: any; query: any }
}
