import express from "express";
import { prisma } from "@daric/shared";
import { notifyAdmin } from "@daric/shared";

const app = express();
app.use(express.json());

// وب‌هوک Immunefi / فرم اختصاصی
app.post("/bounty/submit", async (req, res) => {
  const { reporter, title, severity, target, poc } = req.body;
  if (!title || !poc || poc.length < 100) return res.status(400).json({ error: "POC_REQUIRED" });
  const report = await prisma.bountyReport.create({ data: {
    reporter, title, severity: severity.toUpperCase(), target, poc,
    status: "NEW", rewardUSD: REWARD_TABLE[severity.toUpperCase()] ?? 0 } });
  await notifyAdmin(`🐞 گزارش جدید #report.id[{report.id} [report.id[{severity}]: ${title}`, report);
  // تریاژ SLA: پاسخ ۴۸h — چک خودکار
  setTimeout(() => checkSLA(report.id), 48 * 3600_000);
  res.status(201).json({ id: report.id, ack: true });
});

async function checkSLA(id: string) {
  const r = await prisma.bountyReport.findUniqueOrThrow({ where: { id } });
  if (r.status === "NEW") await notifyAdmin(`⏰ SLA breach: report #${id} بدون پاسخ ۴۸h`, r);
}

app.patch("/bounty/:id", async (req, res) => { // فقط ادمین (RBAC)
  const r = await prisma.bountyReport.update({ where: { id: req.params.id },
    data: { status: req.body.status, rewardUSD: req.body.rewardUSD } });
  if (r.status === "PAID") await notifyUser(r.reporter, `جایزه {r.rewardUSD} پرداخت شد 🎉`);
  res.json(r);
});

const REWARD_TABLE: Record<string, number> = { CRITICAL: 25000, HIGH: 5000, MEDIUM: 1000, LOW: 200 };
app.listen(4010);
```

---

## 3️⃣ لانچ نرم — Beta با سقف برداشت

### `security/launch/launch-flags.ts` ★

```typescript
import { redis } from "@daric/shared";
import { prisma } from "@daric/shared";
import Decimal from "decimal.js";
const D = Decimal;

export const BETA_CONFIG = {
  enabled: true,
  maxWithdrawPerUserPerDay_USD: new D("500"),      // سقف هر کاربر
  maxWithdrawGlobalPerDay_USD:  new D("25000"),    // سقف کل پلتفرم
  maxLoanAmount_USD:            new D("1000"),
  maxWheelBet:                  3,                 // اسپین در روز
  kycLevelRequiredForWithdraw:  2,
  manualReviewAbove_USD:        new D("100"),
  newAccountsAllowed:           50,                // ظرفیت beta
};

export async function checkBetaWithdrawal(userId: string, amountUSD: string) {
  if (!BETA_CONFIG.enabled) return { ok: true };

  const amt = new D(amountUSD);
  if (amt.gt(BETA_CONFIG.maxWithdrawPerUserPerDay_USD))
    return { ok: false, reason: `BETA_LIMIT: سقف هر کاربر{BETA_CONFIG.maxWithdrawPerUserPerDay_USD}/روز` };

  // سقف سراسری روزانه — اتمیک با Redis
  const today = new Date().toISOString().slice(0, 10);
  const used = await redis.incrbyfloat(`beta:wcap:${today}`, amt.toNumber());
  await redis.expire(`beta:wcap:${today}`, 86400 * 2);
  if (used > BETA_CONFIG.maxWithdrawGlobalPerDay_USD.toNumber())
    return { ok: false, reason: "BETA_GLOBAL_CAP_REACHED" };

  // ظرفیت حساب‌های جدید
  const users = await prisma.user.count();
  if (users > BETA_CONFIG.newAccountsAllowed) { /* فقط کاربران موجود */ }

  return { ok: true };
}

/** ادغام در withdrawal-guard.ts (فاز ۶) — یک خط قبل از executeWithdrawal:
 *   const beta = await checkBetaWithdrawal(userId, amountUSD);
 *   if (!beta.ok) throw new Error(beta.reason);
 */
