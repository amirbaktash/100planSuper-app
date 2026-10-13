import express from "express";
import { auth, requireKYC, require2FA } from "./auth";
import { prisma } from "./db";
import { LoanApplicationSchema } from "./types";
import { computeCollateralSlices, lockCollateral } from "./collateral";
import { buildSchedule, payInstallment, markLateInstallments, foreclose } from "./schedule";
import { simulate } from "./simulator";
import { startLoanConsumers } from "./consumer";
import { publish } from "@daric/eventbus";
import { getInterestSettings } from "./settings";
import cron from "node-cron";

const app = express();
app.use(express.json());
app.use(auth);
startLoanConsumers();
cron.schedule("0 6 * * *", markLateInstallments); // روزانه ۶ صبح

// ── درخواست وام ──
app.post("/apply", requireKYC, require2FA, async (req, res) => {
  const parsed = LoanApplicationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.issues);

  const settings = await getInterestSettings(); // از پنل ادمین
  const portfolio = await fetchPortfolio(req.user.id); // ← از wallet + gold + investments
  const rate = new Decimal(settings.annualRate);

  try {
    const slices = computeCollateralSlices(
      portfolio.map(p => ({ asset: p.asset, amount: new Decimal(p.amount),
        priceUSD: new Decimal(p.priceUSD) })),
      new Decimal(parsed.data.amountUSD));

    const schedule = buildSchedule(new Decimal(parsed.data.amountUSD),
      rate, parsed.data.installments);

    const loan = await prisma.loan.create({ data: {
      userId: req.user.id, ...parsed.data,
      annualRate: settings.annualRate,
      totalRepaymentUSD: schedule.reduce((s, r) => s.plus(r.total), new Decimal(0)).toFixed(2),
      installmentUSD: schedule[0].total.toFixed(2),
      schedule, collateral: slices, status: "PENDING" } });

    await publish("loan.applied", { loanId: loan.id, userId: req.user.id,
      amountUSD: parsed.data.amountUSD });
    res.status(201).json({ loanId: loan.id, monthlyPayment: loan.installmentUSD, schedule });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── شبیه‌ساز عمومی ──
app.post("/simulate", auth, async (req, res) => {
  const settings = await getInterestSettings();
  res.json(simulate({ ...req.body, annualRate: settings.annualRate }));
});

// ── پرداخت قسط ──
app.post("/:id/pay/:installmentNo", require2FA, async (req, res) => {
  try { res.json(await payInstallment(req.params.id, +req.params.installmentNo)); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── ادمین ──
app.post("/admin/:id/approve", require2FA, async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);
  const loan = await prisma.loan.findUniqueOrThrow({ where: { id: req.params.id } });
  await lockCollateral(loan.id, loan.userId, loan.collateral); // قفل متناسب
  // وام‌دهی: انتشار رویداد — حسابداری قید می‌کند
  await publish("accounting.journal.request", {
    source: "loan", refId: loan.id, narrative: `پرداخت وام ${loan.id}`,
    lines: [
      { account: "2001:LOAN_PAYABLE", debit: loan.amountUSD, credit: "0" },
      { account: "1002:USDT_USER", userId: loan.userId, debit: "0", credit: loan.amountUSD },
    ]});
  res.json({ ok: true });
});
app.post("/admin/:id/reject", require2FA, async (req, res) => { /* status=REJECTED */ });
app.post("/admin/:id/foreclose", require2FA, async (req, res) => {
  try { await foreclose(req.params.id, req.user.id); res.json({ ok: true }); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── پنل نرخ سود ادمین ──
app.get("/admin/settings", require2FA, async (_q, res) => res.json(await getInterestSettings()));
app.put("/admin/settings", require2FA, async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);
  res.json(await updateInterestSettings(req.body)); // { annualRate, lateFeeDaily, maxTermMonths }
});

app.listen(process.env.PORT ?? 4030);
