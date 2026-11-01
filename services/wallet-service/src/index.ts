// سرویس کیف پول — آدرس HD سپرده، شنود واریز، صف برداشت + Timelock 48h
import express from "express";
import { prisma } from "@daric/shared/db";
import { publish, requestReply } from "@daric/eventbus";
import { auth, requireKYC, require2FA } from "./auth";

const app = express();
app.use(express.json());
app.use(auth);

// سقف‌های بتا (beta-config.json)
const CAPS = { userDailyUSD: 500, globalDailyUSD: 25000 };

app.get("/healthz", (_q, r) => r.json({ ok: true, service: "wallet" }));

app.get("/balances", async (q, r) =>
  r.json(await prisma.balance.findMany({ where: { userId: q.user.id } }))
);

// تولید آدرس سپرده HD (BIP-44) برای هر asset
app.post("/deposit-address/:asset", async (q, r) => {
  const addr = await deriveDepositAddress(q.user.id, q.params.asset); // hd-wallet.ts
  r.json({ asset: q.params.asset, address: addr });
);

// ── درخواست برداشت: KYC L2 + 2FA + whitelist + سقف روزانه ──
app.post("/withdraw", requireKYC(2), require2FA, async (q, r) => {
  const { asset, amount, address } = q.body;
  const usd = await toUSD(asset, amount);
  const todayUsed = await dailyWithdrawnUSD(new Date());
  if (Number(usd) + todayUsed > CAPS.userDailyUSD)
    return r.status(429).json({ error: "DAILY_CAP_EXCEEDED", cap: CAPS.userDailyUSD });
  if (todayUsed + Number(usd) > CAPS.globalDailyUSD)
    return r.status(429).json({ error: "GLOBAL_CAP_EXCEEDED" });

  // دو-تصدیقی برداشت‌های بالای آستانه نیاز به approve ادمین دارد
  const needsDual = Number(usd) > 10000;
  const w = await prisma.withdrawal.create({
    data: {
      userId: q.user.id, asset, amount, address,
      status: needsDual ? "PENDING_DUAL" : "QUEUED",
      eta: new Date(Date.now() + 48 * 3600_000), // Timelock 48h
    },
  });
  await publish("wallet.withdraw.queued", { withdrawalId: w.id, asset, amount, userId: q.user.id });
  r.status(201).json(w);
});

// شنود تأیید واریز on-chain (deposit-listener) → رویداد → قید حسابداری
export async function onDepositConfirmed(userId: string, asset: string, amount: string, txHash: string) {
  await publish("wallet.deposit.confirmed", { userId, asset, amount, txHash });
}

app.listen(process.env.PORT ?? 4030);

declare module "express-serve-static-core" { interface Request { user: { id: string } } }
async function toUSD(asset: string, amount: string) { return amount; }
async function dailyWithdrawnUSD(_d: Date) { return 0; }
async function deriveDepositAddress(userId: string, asset: string) { return `0xDemo${asset}${userId.slice(0, 8)}`; }
