import { prisma } from "./db";
import { publish } from "@daric/eventbus";
import { createHash, randomBytes } from "crypto";
import Decimal from "decimal.js";

const SPIN_COST = new Decimal("1"); // USDT — قابل تنظیم ادمین

/** انتخاب وزنی — احتمال هر خانه = weight/Σ */
export function pickSegment(segments: { index: number; weight: number; active: boolean }[]) {
  const active = segments.filter(s => s.active);
  const total = active.reduce((s, x) => s + x.weight, 0);
  let r = crypto.randomInt(0, total);
  for (const s of active) { r -= s.weight; if (r < 0) return s; }
  return active[active.length - 1];
}

export async function spin(userId: string) {
  const serverSeed = randomBytes(16).toString("hex");
  const clientSeed = randomBytes(8).toString("hex");
  const nonce = await prisma.wheelSpin.count({ where: { userId } }) + 1;
  const commitment = createHash("sha256").update(`serverSeed:{serverSeed}:serverSeed:{clientSeed}:${nonce}`).digest("hex");

  // ۱. کسر هزینه از کیف پول — از مسیر حسابداری
  await publish("accounting.journal.request", {
    source: "casino", refId: `spin-debit:userId:{userId}:userId:{nonce}`,
    narrative: "شرط گردونه شانس",
    lines: [
      { account: "1002:USDT_USER", debit: SPIN_COST, credit: "0", userId },
      { account: "4105:HOUSE_GAMING", debit: "0", credit: SPIN_COST } ] });
  // توجه: publish async است؛ در production با request/reply یا outbox pattern تأیید گرفته شود

  // ۲. چرخش
  const segments = await prisma.wheelSegment.findMany();
  const seg = pickSegment(segments.map(s => ({ index: s.index, weight: s.weight, active: s.active })));
  const segFull = segments.find(s => s.index === seg.index)!;

  // ۳. پرداخت جایزه
  let net = SPIN_COST.neg();
  if (segFull.prizeType === "CASH" || segFull.prizeType === "TOKEN_DARIC") {
    const prize = new Decimal(segFull.prizeValue);
    net = prize.minus(SPIN_COST);
    await publish("accounting.journal.request", {
      source: "casino", refId: `spin-prize:userId:{userId}:userId:{nonce}`,
      lines: [
        { account: "4105:HOUSE_GAMING", debit: prize, credit: "0" },
        { account: "1002:USDT_USER", debit: "0", credit: prize, userId } ] });
  }

  const spinRec = await prisma.wheelSpin.create({ data: {
    userId, cost: SPIN_COST, segmentId: segFull.index,
    prizeType: segFull.prizeType, prizeValue: segFull.prizeValue,
    netResult: net, serverSeed, clientSeed, nonce } });

  await publish("casino.wager.placed", { userId, refId: spinRec.id, amountUSD: SPIN_COST });
  // ← این رویداد پورسانت MLM (CASINO) را نیز فعال می‌کند

  return { spinId: spinRec.id, segment: segFull.index, label: segFull.label,
    prize: segFull.prizeValue, net: net, commitment,
    reveal: serverSeed };  // کاربر می‌تواند fairness را verify کند
}

 ادمین: تنظیم احتمال و جایزه هر خانه
app.put("/admin/segment/:index", auth, async (q, r) => {
  if (!q.user.isAdmin) return res.sendStatus(403);
  r.json(await prisma.wheelSegment.update({ where: { index: +q.params.index }, data: q.body }));
});
app.get("/admin/pl", auth, async (q, r) => {
  if (!q.user.isAdmin) return res.sendStatus(403);
  const agg = await prisma.wheelSpin.aggregate({
    _sum: { cost: true, netResult: true }, _count: true });
  r.json({ spins: agg._count, wagered: agg._sum.cost,
    housePL: agg._sum.netResult?.neg() ?? 0 }); // سود صندوق = مجموع زیان بازیکن‌ها
});
