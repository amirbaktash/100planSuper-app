// سرویس اوراکل — آپلود IPFS گزارش + امضای 2-of-3 و ارسال به قرارداد
import express from "express";
import { ethers } from "ethers";
import { prisma } from "@daric/shared/db";
import { createHash } from "crypto";

const app = express();
app.use(express.json());

const NAV_ORACLE_ABI = [
  "function propose(uint256 navPerToken, string ipfsHash, bytes32 reportHash) returns (bytes32)",
  "function currentNAV() view returns (uint256)",
];

app.get("/healthz", (_q, r) => r.json({ ok: true, service: "oracle" }));

/** آپلود گزارش روی IPFS (web3.storage / pinata) → CID */
async function uploadIPFS(payload: unknown): Promise<string> {
  // production: امضای JWS + آپلود با کلید سرویس؛ اینجا ساختار فراخوانی
  const body = new FormData();
  body.set("file", new Blob([JSON.stringify(payload)], { type: "application/json" }));
  const res = await fetch(process.env.IPFS_ENDPOINT!, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.IPFS_TOKEN}` },
    body,
  });
  const json = (await res.json()) as { cid: string };
  return json.cid;
}

/** امضادار کردن NAV جدید و propose روی قرارداد (هر signer جداگانه اجرا می‌کند) */
app.post("/sign/:reportId", async (q, r) => {
  const report = await prisma.nAVReport.findUniqueOrThrow({ where: { id: q.params.reportId } });
  const cid = report.ipfsCid ?? (await uploadIPFS(report.payload));
  await prisma.nAVReport.update({ where: { id: report.id }, data: { ipfsCid: cid } });

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.SIGNER_KEY!, provider);
  const oracle = new ethers.Contract(process.env.NAV_ORACLE!, NAV_ORACLE_ABI, wallet);

  const navWei = ethers.parseEther(report.navPerToken);
  const reportHash = "0x" + createHash("sha256").update(JSON.stringify(report.payload)).digest("hex");
  const tx = await oracle.propose(navWei, cid, reportHash);
  await tx.wait();
  r.json({ ok: true, tx: tx.hash, cid });
});

app.get("/price", async (_q, r) => {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const oracle = new ethers.Contract(process.env.NAV_ORACLE!, NAV_ORACLE_ABI, provider);
  r.json({ price: ethers.formatEther(await oracle.currentNAV()) });
});

app.listen(process.env.PORT ?? 4015);
