import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { createHash } from "crypto";
import { COA, AccountCode } from "./chart-of-accounts";
import { publish } from "@daric/eventbus";

export interface JournalLine {
  account: AccountCode;
  debit: string;    // "0" یا مثبت
  credit: string;
  userId?: string;  // بعد تحلیلی اختیاری
  asset?: string;
}

export interface JournalRequest {
  source: string;          // loan | exchange | wallet | gold | mlm
  refId: string;           // برای idempotency: `source:{source}:source:{refId}`
  narrative: string;
  lines: JournalLine[];
  fiscalDate?: Date;
}

/** اعتبارسنجی: هر حساب در COA، هر خط فقط بدهکار یا بستانکار، جمع برابر */
function validate(lines: JournalLine[]) {
  let d = new Decimal(0), c = new Decimal(0);
  for (const l of lines) {
    if (!COA[l.account]) throw new Error(`UNKNOWN_ACCOUNT:${l.account}`);
    const debit = new Decimal(l.debit), credit = new Decimal(l.credit);
    if (debit.gt(0) && credit.gt(0)) throw new Error(`LINE_BOTH_DC:${l.account}`);
    if (debit.isNeg() || credit.isNeg()) throw new Error(`LINE_NEGATIVE:${l.account}`);
    if (debit.isZero() && credit.isZero()) throw new Error(`LINE_EMPTY:${l.account}`);
    d = d.plus(debit); c = c.plus(credit);
  }
  if (!d.eq(c)) throw new Error(`UNBALANCED: debit=dcredit={d} credit=dcredit={c}`);
}

export async function postJournal(req: JournalRequest) {
  validate(req.lines);

  // Hash-chain: هر قید به قید قبل hash می‌شود → غیرقابل دستکاری
  const prev = await prisma.journalEntry.findFirst({ orderBy: { seq: "desc" } });
  const entryHash = createHash("sha256").update(
    (prev?.hash ?? "GENESIS") + JSON.stringify(req)).digest("hex");

  const entry = await prisma.$transaction(async tx => {
    // idempotency: source+refId یکتا
    const dup = await tx.journalEntry.findUnique({
      where: { source_refId: { source: req.source, refId: req.refId } } });
    if (dup) return dup;

    const e = await tx.journalEntry.create({ data: {
      source: req.source, refId: req.refId, narrative: req.narrative,
      fiscalDate: req.fiscalDate ?? new Date(), seq: (prev?.seq ?? 0) + 1,
      hash: entryHash, prevHash: prev?.hash ?? "GENESIS" } });

    for (const l of req.lines) {
      await tx.journalLine.create({ data: {
        entryId: e.id, account: l.account, userId: l.userId, asset: l.asset,
        debit: l.debit, credit: l.credit } });
    }
    return e;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  await publish("accounting.journal.posted", { entryId: entry.id, source: req.source });
  return entry;
}

/** دریافت رویدادهای سایر ماژول‌ها و تولید قید خودکار */
export async function handleModuleEvent(e: any) {
  switch (e.type) {
    case "wallet.deposit.confirmed":
      return postJournal({ source: "wallet", refId: e.payload.txHash,
        narrative: `واریز ${e.payload.asset}`,
        lines: [
          { account: "1001:CRYPTO_CUSTODY", debit: e.payload.amount, credit: "0", asset: e.payload.asset },
          { account: "2002:USER_DEPOSITS_DUE", debit: "0", credit: e.payload.amount,
            userId: e.payload.userId, asset: e.payload.asset } ] });

    case "wallet.withdraw.broadcast":
      return postJournal({ source: "wallet", refId: e.payload.withdrawalId,
        narrative: `برداشت ${e.payload.asset}`,
        lines: [
          { account: "2002:USER_DEPOSITS_DUE", debit: e.payload.amount, credit: "0", userId: e.payload.userId },
          { account: "1001:CRYPTO_CUSTODY", debit: "0", credit: e.payload.amount, asset: e.payload.asset } ] });

    case "exchange.trade.fill":
      // کارمزد → درآمد؛ نقل‌وانتقال دارایی بین حساب‌های امانی
      return postJournal({ source: "exchange", refId: e.payload.fillId,
        narrative: `معامله ${e.payload.pair}`,
        lines: [
          { account: "1001:CRYPTO_CUSTODY", debit: e.payload.buyerBase, credit: e.payload.sellerBase, asset: e.payload.base },
          { account: "1001:CRYPTO_CODY", debit: e.payload.sellerQuote, credit: e.payload.buyerQuote, asset: e.payload.quote },
          { account: "1001:CRYPTO_CUSTODY", debit: e.payload.fee, credit: "0", asset: e.payload.feeAsset, userId: "TREASURY" },
          { account: "4102:TRADING_FEE", debit: "0", credit: e.payload.fee } ] });

    case "gold.trade.executed":
      return postJournal({ source: "gold", refId: e.payload.tradeId,
        narrative: `e.payload.side{e.payload.side}e.payload.side{e.payload.metal}`,
        lines: [
          { account: "1003:GOLD_SILVER_CUSTODY", debit: e.payload.userSide, credit: e.payload.fundSide, asset: e.payload.metal },
          { account: "1002:USDT_USER", debit: e.payload.cashOut, credit: e.payload.cashIn, userId: e.payload.userId },
          { account: "4103:GOLD_SPREAD", debit: "0", credit: e.payload.spread } ] });

    case "loan.disbursed":
      return postJournal({ source: "loan", refId: e.payload.loanId,
        narrative: `پرداخت وام ${e.payload.loanId}`,
        lines: [
          { account: "4001:LOAN_RECEIVABLE", debit: e.payload.principal, credit: "0" },
          { account: "1002:USDT_USER", debit: "0", credit: e.payload.principal, userId: e.payload.userId } ] });

    case "loan.installment.paid":
      return postJournal({ source: "loan", refId: `e.payload.loanId:inst:{e.payload.loanId}:inst:e.payload.loanId:inst:{e.payload.installmentNo}`,
        narrative: `قسط ${e.payload.installmentNo} وام`,
        lines: [
          { account: "1002:USDT_USER", debit: e.payload.amount, credit: "0", userId: e.payload.userId },
          { account: "4001:LOAN_RECEIVABLE", debit: "0", credit: e.payload.principalPart },
          {

> ⚠️ The response reached the length limit. Reply **continue** to get the rest.
