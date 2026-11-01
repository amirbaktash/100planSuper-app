// سرویس NAV — محاسبه NAV توکن داریک از گزارش دارایی (پورت 4005)
import express from "express";
import { reportToNAV, type AssetReport } from "@daric/shared";
import { prisma } from "@daric/shared/db";
import { publish } from "@daric/eventbus";

const app = express();
app.use(express.json());

app.get("/healthz", (_q, r) => r.json({ ok: true, service: "nav" }));

// ثبت گزارش دارایی توسط ادمین (Maker-Checker: بعداً توسط نگهبان دوم تأیید می‌شود)
app.post("/report", async (q, r) => {
  const parsed = q.body as AssetReport;
  const nav = await reportToNAV(parsed);
  const rec = await prisma.nAVReport.create({
    data: {
      reportDate: new Date(parsed.reportDate),
      period: parsed.period,
      totalNAV: nav.totalNAV,
      navPerToken: nav.navPerToken,
      reportHash: nav.reportHash,
      ipfsCid: null, // آپلود IPFS در oracle-service
      payload: parsed as any,
    },
  });
  await publish("nav.report.ready", { reportId: rec.id, hash: nav.reportHash });
  r.status(201).json({ id: rec.id, ...nav });
});

// قیمت فعلی — تغذیه صرافی و کیف پول‌ها
app.get("/current", async (_q, r) => {
  const last = await prisma.nAVReport.findFirst({ orderBy: { reportDate: "desc" } });
  if (!last) return r.status(404).json({ error: "NO_NAV" });
  r.json({ navPerToken: last.navPerToken, totalNAV: last.totalNAV, reportHash: last.reportHash, at: last.reportDate });
});

// تأیید گزارش با هش (صفحه /verify/[hash] داشبورد)
app.get("/verify/:hash", async (q, r) => {
  const rec = await prisma.nAVReport.findUnique({ where: { reportHash: q.params.hash } });
  if (!rec) return r.status(404).json({ valid: false });
  r.json({ valid: true, navPerToken: rec.navPerToken, totalNAV: rec.totalNAV, reportDate: rec.reportDate, ipfsCid: rec.ipfsCid });
});

app.listen(process.env.PORT ?? 4005);
