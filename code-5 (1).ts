import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import cron from "node-cron";
import { AssetReportSchema } from "./types";
import { computeNAV } from "./nav-engine";
import { uploadToIPFS, pushToOracle, getOracleContract } from "./oracle-client";
import { verifyAdminSignature } from "./auth";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// ── POST /nav/submit — آپلود گزارش امضاشده توسط ادمین ──
app.post("/nav/submit", async (req, res) => {
  const parsed = AssetReportSchema.safeParse(req.body.report);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

  // امضای ادمین روی reportHash
  const { navPerToken, totalNAV, breakdown, reportHash } = computeNAV(parsed.data);
  const valid = await verifyAdminSignature(reportHash, req.body.signature, req.body.signer);
  if (!valid) return res.status(403).json({ error: "invalid admin signature" });

  const ipfsHash = await uploadToIPFS({ report: parsed.data, navPerToken, totalNAV, reportHash });
  await pushToOracle(ethers.parseUnits(navPerToken, 18), ipfsHash, reportHash);

  res.status(201).json({ navPerToken, totalNAV, ipfsHash, reportHash });
});

// ── GET /nav/current — قیمت فعلی (از روی-chain) ──
app.get("/nav/current", async (_req, res) => {
  const c = getOracleContract();
  const [navE18, historyLen] = await Promise.all([c.currentNAV(), c.historyLength()]);
  res.json({ navPerToken: ethers.formatEther(navE18), historyLength: historyLen.toString() });
});

// ── GET /nav/history — نمودار تاریخی ──
app.get("/nav/history", async (_req, res) => {
  const c = getOracleContract();
  const len = Number(await c.historyLength());
  const history = [];
  for (let i = Math.max(0, len - 365); i < len; i++) {
    const [navE18, ipfsHash, ts] = await c.navHistory(i);
    history.push({ nav: ethers.formatEther(navE18), ipfsHash, ts: Number(ts) });
  }
  res.json(history.reverse());
});

// ── GET /verify/:ipfsHash — صفحه تأیید عمومی ──
app.get("/verify/:hash", async (req, res) => {
  const { hash } = req.params;
  const report = await fetch(`process.env.IPFSGATEWAY/ipfs/{process.env.IPFS_GATEWAY}/ipfs/process.env.IPFSG​ATEWAY/ipfs/{hash}`).then(r => r.json());
  const recomputed = computeNAV(report.report);
  const onChainNav = ethers.formatEther(await getOracleContract().currentNAV());
  res.json({
    ipfsHash: hash,
    signatureValid: recomputed.navPerToken === report.navPerToken,
    recomputedNAV: recomputed.navPerToken,
    onChainNAV: onChainNav,
    match: recomputed.navPerToken === onChainNav,
    report,
  });
});

// ── زمان‌بندی خودکار روزانه/هفتگی/ماهانه ──
async function runScheduledReport(period: "daily" | "weekly" | "monthly") {
  // جمع‌آوری از دیتابیس‌های داخلی (سرمایه، املاک، پروژه‌ها، اپ، MLM)
  const report = await buildReportFromDB(period);
  const { navPerToken, totalNAV, reportHash } = computeNAV(report);
  const ipfsHash = await uploadToIPFS({ report, navPerToken, totalNAV, reportHash });
  await pushToOracle(BigInt(ethers.parseUnits(navPerToken, 18).toString()), ipfsHash, reportHash);
}
const buildReportFromDB = async (p: string) => (await import("./db")).aggregateReport(p);

cron.schedule("0 0 * * *", () => runScheduledReport("daily"));
cron.schedule("0 1 * * 0", () => runScheduledReport("weekly"));
cron.schedule("0 2 1 * *", () => runScheduledReport("monthly"));

app.listen(process.env.PORT ?? 4005);
