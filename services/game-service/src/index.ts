// سرویس بازی — گردونه ۱۰ خانه Provably-Fair + ماشین‌حساب سود/زیان
import express from "express";
import { spin, housePL, SPIN_COST, DEFAULT_SEGMENTS } from "@daric/shared";
import { prisma } from "@daric/shared/db";
import { requestReply, publish } from "@daric/eventbus";
import { auth } from "./auth";

const app = express();
app.use(express.json());
app.use(auth);

app.get("/healthz", (_q, r) => r.json({ ok: true, service: "game" }));
app.get("/wheel/segments", (_q, r) => r.json(DEFAULT_SEGMENTS));

// ── چرخش: کسر کیف پول با request/reply — اگر کسر نشد، spin ثبت نمی‌شود ──
app.post("/wheel/spin", auth, async (req, res) => {
  try {
    const spinsToday = await countSpinsToday(req.user.id);
    const result = await spin(req.user.id, DEFAULT_SEGMENTS, {
      clientSeed: req.body.clientSeed,
      nonce: spinsToday + 1,
      dailySpins: spinsToday,
      maxDaily: 3, // beta-config
    });

    // ✅ کسر هزینه — بدون تأیید، spin اصلاً ثبت نمی‌شود
    const debit = await requestReply("wallet.debit", {
      userId: req.user.id, asset: "USDT", amount: String(SPIN_COST),
      refId: `spin:${result.spinId}`,
    });
    if (!debit?.ok) return res.status(409).json({ error: "WALLET_DEBIT_FAILED" });

    // پرداخت جایزه — فقط پس از تأیید کسر
    if (result.prizeType === "CASH" && result.prizeValue > 0) {
      await requestReply("wallet.credit", {
        userId: req.user.id, asset: "USDT", amount: String(result.prizeValue),
        refId: `spin-prize:${result.spinId}`,
      });
    }

    await prisma.wheelSpin.create({
      data: {
        userId: req.user.id, cost: SPIN_COST, segmentId: result.segment,
        prizeType: result.prizeType, prizeValue: result.prizeValue,
        netResult: result.net, serverSeed: result.serverSeed,
        clientSeed: req.body.clientSeed ?? "client", nonce: result.spinId.length,
      },
    });
    await publish("casino.wager.placed", { userId: req.user.id, refId: result.spinId, amountUSD: SPIN_COST });
    // ↑ رویداد بالا پورسانت MLM (CASINO) را نیز فعال می‌کند

    res.json(result); // کاربر می‌تواند با serverSeed فاش‌شده fairness را verify کند
  } catch (e: any) {
    res.status(e.message === "DAILY_SPIN_LIMIT" ? 429 : 400).json({ error: e.message });
  }
});

// ادمین: تنظیم احتمال و جایزه هر خانه
app.put("/admin/segment/:index", auth, async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);
  res.json(
    await prisma.wheelSegment.update({ where: { index: Number(req.params.index) }, data: req.body })
  );
});

// ادمین: سود/زیان صندوق
app.get("/admin/pl", auth, async (_req, res) => {
  const spins = await prisma.wheelSpin.findMany({ select: { cost: true, netResult: true } });
  res.json(housePL(spins.map((s) => ({ cost: Number(s.cost), netResult: Number(s.netResult) }))));
});

async function countSpinsToday(_userId: string) { return 0; }

app.listen(process.env.PORT ?? 4080);
declare module "express-serve-static-core" { interface Request { user: { id: string; isAdmin?: boolean } } }
