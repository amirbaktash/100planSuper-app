import express from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { startAccountingConsumers } from "./consumers";
import { trialBalance, generalLedger, periodReport } from "./reports";
import { auth } from "./auth";
import { prisma } from "./db";

const app = express();
app.use(express.json());
app.use(auth);
startAccountingConsumers();

const adminOnly = (req, res, next) => req.user.isAdmin ? next() : res.sendStatus(403);

app.get("/trial-balance", adminOnly, async (req, res) =>
  res.json(await trialBalance(req.query.date ? new Date(req.query.date as string) : undefined)));

app.get("/ledger/:account", adminOnly, async (req, res) =>
  res.json(await generalLedger(req.params.account,
    new Date(req.query.from as string), new Date(req.query.to as string))));

app.get("/reports/:kind", adminOnly, async (req, res) =>
  res.json(await periodReport(req.params.kind as any)));

// ── خروجی Excel ──
app.get("/export/excel/:kind", adminOnly, async (req, res) => {
  const report = await periodReport(req.params.kind as any);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("گزارش");
  ws.columns = [{ header: "حساب", key: "account", width: 25 },
                { header: "بدهکار", key: "debit", width: 18 },
                { header: "بستانکار", key: "credit", width: 18 }];
  report.trialBalance.rows.forEach(r => ws.addRow(r));
  res.setHeader("Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition",
    `attachment; filename=report-${req.params.kind}.xlsx`);
  await wb.xlsx.write(res); res.end();
});

// ── خروجی PDF ──
app.get("/export/pdf/:kind", adminOnly, async (req, res) => {
  const report = await periodReport(req.params.kind as any);
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  doc.pipe(res);
  doc.fontSize(16).text(`گزارش ${req.params.kind} — صندوق داریک`, { align: "center" });
  doc.moveDown();
  report.trialBalance.rows.forEach(r =>
    doc.fontSize(10).text(`r.account∣{r.account}  |r.account∣{r.name}  بدهکار: r.debitبستانکار:{r.debit}  بستانکار:r.debitبستانکار:{r.credit}`));
  doc.moveDown().fontSize(12)
    .text(`سود خالص دوره: ${report.incomeStatement.netProfit} USD`, { align: "center" });
  doc.end();
});

// ── پنل دوره مالی ادمین ──
app.post("/periods", adminOnly, async (req, res) =>
  res.status(201).json(await prisma.fiscalPeriod.create({ data: req.body })));
app.post("/periods/:id/close", adminOnly, async (req, res) => {
  try { await closeFiscalPeriod(req.params.id, req.user.id); res.json({ ok: true }); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.listen(process.env.PORT ?? 4040);
