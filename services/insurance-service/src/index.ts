// سرویس بیمه — محصولات (سفر/سلامت/عمر/اموال)، صدور با کد معرف، مطالبات
import express from "express";
import { prisma } from "@daric/shared/db";
import { notifyAdmin, publish } from "@daric/eventbus";
import { auth, requireKYC } from "./auth";

const app = express();
app.use(express.json());

app.get("/healthz", (_q, r) => r.json({ ok: true, service: "insurance" }));
app.get("/products", async (_q, r) =>
  r.json(await prisma.insuranceProduct.findMany({ where: { active: true } }))
);

// خرید بیمه‌نامه — KYC سطح ۲ + کد معرف (پورسانت MLM دسته INSURANCE)
app.post("/policies", auth, requireKYC(2), async (req, res) => {
  const { productId, refCode } = req.body;
  const product = await prisma.insuranceProduct.findUniqueOrThrow({ where: { id: productId } });
  const premiumUSD = (req.body.declaredValueUSD * product.premiumPct) / 100;
  const policy = await prisma.policy.create({
    data: {
      userId: req.user.id, productId, premiumUSD,
      coverageUSD: product.coverageUSD, status: "ACTIVE",
      refCode: refCode ?? null, policyNo: genPolicyNo(),
    },
  });
  await publish("insurance.policy.purchased", { userId: req.user.id, refId: policy.id, amountUSD: premiumUSD });
  res.status(201).json(policy);
});

// ثبت مطالبه خسارت
app.post("/policies/:id/claims", auth, async (req, res) => {
  const { amountUSD, reason, docs } = req.body;
  const claim = await prisma.claim.create({
    data: {
      policyId: req.params.id, userId: req.user.id,
      amountUSD, reason, docs: docs ?? [], status: "NEW",
    },
  });
  await notifyAdmin(`🛡️ مطالبه جدید #${claim.id}: ${amountUSD}$ — ${reason}`, claim);
  res.status(201).json(claim);
});

// تأیید مطالبه (ادمین)
app.post("/admin/claims/:id/approve", auth, async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);
  const claim = await prisma.claim.update({
    where: { id: req.params.id },
    data: { status: "APPROVED", approvedBy: req.user.id },
  });
  // wallet.credit خسارت به کاربر + قید حسابداری
  res.json(claim);
});

function genPolicyNo() { return "DAR-" + Date.now().toString(36).toUpperCase(); }

app.listen(process.env.PORT ?? 4100);
declare module "express-serve-static-core" { interface Request { user: { id: string; isAdmin?: boolean } } }
