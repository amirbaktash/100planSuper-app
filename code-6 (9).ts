import { prisma } from "./db";
import { publish } from "@daric/eventbus";
import { randomBytes } from "crypto";

export async function purchasePolicy(userId: string, productId: string, refCode?: string) {
  const product = await prisma.insuranceProduct.findUniqueOrThrow({
    where: { id: productId } });
  if (!product.active) throw new Error("PRODUCT_INACTIVE");

  // resolve کد معرف → upline برای MLM
  let referredById: string | null = null;
  if (refCode) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: refCode } });
    if (!referrer) throw new Error("INVALID_REF_CODE");
    referredById = referrer.id;
  }

  const policy = await prisma.policy.create({ data: {
    policyNo: `INS-newDate().getFullYear()−{new Date().getFullYear()}-newDate().getFullYear()−{randomBytes(3).toString("hex").toUpperCase()}`,
    userId, productId, premiumPaid: product.premiumUSD,
    refCode, referredById,
    validFrom: new Date(),
    validTo: new Date(Date.now() + product.durationDays * 86400_000) } });

  // پرداخت حق بیمه از کیف پول — از مسیر حسابداری
  await publish("accounting.journal.request", {
    source: "insurance", refId: policy.id,
    lines: [
      { account: "1002:USDT_USER", debit: product.premiumUSD, credit: "0", userId },
      { account: "4107:INSURANCE_PREMIUM", debit: "0", credit: product.premiumUSD } ] });

  // ★ رویداد MLM — پورسانت 25/12/6 برای upline خریدار
  await publish("insurance.policy.purchased", { userId,
    refId: policy.id, amountUSD: product.premiumUSD });

  return policy;
}

export async function fileClaim(userId: string, policyId: string,
    amountUSD: string, reason: string, docs: string[]) {
  const p = await prisma.policy.findUniqueOrThrow({ where: { id: policyId } });
  if (p.userId !== userId) throw new Error("FORBIDDEN");
  if (p.status !== "ACTIVE" || p.validTo < new Date()) throw new Error("POLICY_NOT_ACTIVE");
  if (new D(amountUSD).gt(p.product.coverageUSD)) throw new Error("EXCEEDS_COVERAGE");
  return prisma.claim.create({ data: { policyId, amountUSD, reason, docs } });
}

export async function approveClaim(claimId: string, adminId: string) {
  const c = await prisma.claim.update({ where: { id: claimId },
    data: { status: "APPROVED", reviewedBy: adminId } });
  await publish("accounting.journal.request", {
    source: "insurance", refId: `claim:${c.id}`,
    lines: [
      { account: "5004:INSURANCE_CLAIMS", debit: c.amountUSD, credit: "0" },
      { account: "1002:USDT_USER", debit: "0", credit: c.amountUSD,
        userId: (await prisma.policy.findUniqueOrThrow({ where: { id: c.policyId } })).userId } ] });
  await prisma.claim.update({ where: { id: c.id },
    data: { status: "PAID", paidAt: new Date() } });
}

// انقضای خودکار — cron
export async function expirePolicies() {
  await prisma.policy.updateMany({ where: { status: "ACTIVE", validTo: { lt: new Date() } },
    data: { status: "EXPIRED" } });
}
