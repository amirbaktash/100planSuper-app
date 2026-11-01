// سرویس وام — حداکثر ۸۰٪ پورتفوی، قفل متناسب وثیقه، cron روزانه ۶ صبح
import express from "express";
import { computeCollateralSlices, buildSchedule, payInstallment, markLateInstallments, simulate } from "@daric/shared";
import { LoanApplicationSchema } from "./types";
import { prisma } from "@daric/shared/db";
import { publish } from "@daric/eventbus";
import { auth, requireKYC, require2FA } from "./auth";
import { foreclose } from "./schedule";
import { BETA_CONFIG } from "@daric/shared";

const app = express();
app.use(express.json());
app.use(auth);

// cron: علامت‌گذاری اقساط معوق — روزانه ۶ صبح
// cron.schedule("0 6 * * *", markLateAll);

app.get("/healthz", (_q, r) => r.json({ ok: true, service: "loan" }));

// ── درخواست وام ──
app.post("/apply", requireKYC, require2FA, async (req, res) => {
  const parsed = LoanApplicationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.issues);

  const amountUSD = Number(parsed.data.amountUSD);
  if (amountUSD > BETA_CONFIG.limits.loan_max_usd)
    return r429(res, BETA_CONFIG.limits.loan_max_usd);

  // ارزش پورتفوی = USDT + ارزش DARIC به قیمت NAV
  const portfolio = await portfolioOf(req.user.id); // [{asset, amountUSD}]
  const total = portfolio.reduce((s, p) => s + Number(p.amountUSD), 0);

  let slices;
  try {
    slices = computeCollateralSlices(portfolio, String(amountUSD));
  } catch (e: any) {
    return res.status(400).json({ error: e.message, maxLTV: "80%" });
  }

  // قفل متناسب وثیقه در Vault
  for (const s of slices) await lockCollateral(req.user.id, s.asset, s.lockAmount);

  const schedule = buildSchedule(amountUSD, parsed.data.months, parsed.data.annualRatePct);
  const loan = await prisma.loan.create({
    data: {
      userId: req.user.id, principal: String(amountUSD), months: parsed.data.months,
      annualRate: parsed.data.annualRatePct ?? "18", status: "ACTIVE",
      schedule: schedule as any, collateral: slices as any,
    },
  });
  await publish("loan.disbursed", { loanId: loan.id, userId: req.user.id, principal: String(amountUSD) });
  res.status(201).json({ loan, slices, totalPortfolio: total });
});

// ── پرداخت قسط ──
app.post("/:id/installment/:no", require2FA, async (req, res) => {
  const loan = await prisma.loan.findUniqueOrThrow({ where: { id: req.params.id } });
  if (loan.userId !== req.user.id) return res.status(403).json({ error: "FORBIDDEN" });
  const rows = loan.schedule as any[];
  const { row, unlockPct, event } = payInstallment(rows, Number(req.params.no));
  await prisma.loan.update({ where: { id: loan.id }, data: { schedule: rows } });
  event.payload.loanId = loan.id;
  event.payload.userId = req.user.id;
  await publish(event.type, event.payload);
  // آزادسازی متناسب وثیقه قسط پرداخت‌شده
  await releaseCollateral(loan.id, unlockPct);
  res.json({ paid: row, collateralUnlockPct: unlockPct });
});

app.get("/my", async (req, res) =>
  res.json(await prisma.loan.findMany({ where: { userId: req.user.id } }))
);

// شبیه‌ساز نرخ برای فرم درخواست
app.get("/simulate", (req, res) => {
  const { principal, months, rate } = req.query as any;
  res.json(simulate(Number(principal ?? 1000), Number(months ?? 12), rate ?? "18"));
});

// ── فورکلوز (ادمین): وثیقه مصادره + رویداد loan.foreclosed ──
app.post("/:id/foreclose", require2FA, async (req, res) => {
  const loan = await prisma.loan.findUniqueOrThrow({ where: { id: req.params.id } });
  const result = await foreclose(loan);
  await publish("loan.foreclosed", { loanId: loan.id, userId: loan.userId, ...result });
  res.json(result);
});

function r429(res: any, cap: number) {
  return res.status(429).json({ error: "BETA_LOAN_CAP", cap });
}
async function portfolioOf(_userId: string) { return []; }
async function lockCollateral(_u: string, _a: string, _l: string) {}
async function releaseCollateral(_l: string, _p: number) {}

app.listen(process.env.PORT ?? 4040);
declare module "express-serve-static-core" { interface Request { user: { id: string } } }
