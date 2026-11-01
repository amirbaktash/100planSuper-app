// سرویس حسابداری — دفتر دوطرفه با Hash-Chain و Idempotency
import express from "express";
import { Ledger, eventToJournal, trialBalance } from "@daric/shared";
import { auth, requirePermission } from "./rbac";

const app = express();
app.use(express.json());
app.use(auth);

export const ledger = new Ledger(); // production: state در Postgres + hash-chain

app.get("/healthz", (_q, r) => r.json({ ok: true, service: "accounting" }));

// قید دستی (ادمین مالی)
app.post("/journal", requirePermission("accounting", "EDIT"), async (req, res) => {
  try {
    const entry = await ledger.post(req.body);
    res.status(201).json(entry);
  } catch (e: any) {
    const unbalanced = /UNBALANCED/.test(e.message);
    res.status(unbalanced ? 400 : 422).json({ error: e.message });
  }
});

// تراز آزمایشی
app.get("/trial-balance", requirePermission("accounting", "VIEW"), (_q, res) => {
  const all = ledger.entries.flatMap((e) => e.lines);
  res.json(trialBalance(all as any));
});

// سلامت زنجیره هش — هشدار Prometheus: AccountingDrift
app.get("/verify-chain", async (_q, res) => {
  try {
    const ok = await ledger.verifyChain();
    res.json({ ok, entries: ledger.entries.length });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message }); // 🚨 توقف فوری برداشت!
  }
});

// consumer: دریافت رویداد سایر ماژول‌ها → قید خودکار
export async function handleModuleEvent(e: { id: string; type: string; payload: any }) {
  const req = eventToJournal(e, e.id);
  if (req) await ledger.post(req); // فقط audit log برای رویدادهای بدون قید مالی
}

app.get("/entries", requirePermission("accounting", "VIEW"), (_q, res) => res.json(ledger.entries));

app.listen(process.env.PORT ?? 4050);
declare module "express-serve-static-core" { interface Request { user: { id: string; isAdmin?: boolean } } }
