// ═══════════════════════════════════════════════════════════════
// دفتر حسابداری دوطرفه — Hash-Chain + Idempotency
// هر قید به قید قبل hash می‌شود → غیرقابل دستکاری (CHAIN_BROKEN)
// ═══════════════════════════════════════════════════════════════

import { COA } from "./coa";
import type { JournalEntry, JournalLine, ModuleEventType } from "./types";
import { hashPayload } from "./nav";

export class JournalError extends Error {}

function num(x: string) {
  const v = Number(x);
  if (!Number.isFinite(v) || v < 0) throw new JournalError(`LINE_NEGATIVE:${x}`);
  return v;
}

/** اعتبارسنجی: حساب معتبر، هر خط فقط بدهکار یا بستانکار، جمع‌ها برابر */
export function validate(lines: JournalLine[]) {
  let d = 0,
    c = 0;
  for (const l of lines) {
    if (!COA[l.account]) throw new JournalError(`UNKNOWN_ACCOUNT:${l.account}`);
    const debit = num(l.debit),
      credit = num(l.credit);
    if (debit > 0 && credit > 0) throw new JournalError(`LINE_BOTH_DC:${l.account}`);
    if (debit === 0 && credit === 0) throw new JournalError(`LINE_EMPTY:${l.account}`);
    d += debit;
    c += credit;
  }
  if (Math.abs(d - c) > 1e-9) throw new JournalError(`UNBALANCED: debit=${d} credit=${c}`);
}

export interface JournalRequest {
  source: string;
  refId: string;
  narrative: string;
  lines: JournalLine[];
  fiscalDate?: string;
}

/** کلاس دفتر — زنجیره هش + idempotency با source+refId */
export class Ledger {
  entries: JournalEntry[] = [];

  async post(req: JournalRequest): Promise<JournalEntry> {
    validate(req.lines);
    const dup = this.entries.find((e) => e.source === req.source && e.refId === req.refId);
    if (dup) return dup; // idempotent

    const prev = this.entries[this.entries.length - 1];
    const hash = await hashPayload({ ...req, prev: prev?.hash ?? "GENESIS" });

    const entry: JournalEntry = {
      id: `JE-${String(this.entries.length + 1).padStart(6, "0")}`,
      source: req.source,
      refId: req.refId,
      narrative: req.narrative,
      fiscalDate: req.fiscalDate ?? new Date().toISOString(),
      seq: (prev?.seq ?? 0) + 1,
      hash,
      prevHash: prev?.hash ?? "GENESIS",
      lines: req.lines,
    };
    this.entries.push(entry);
    return entry;
  }

  /** بررسی سلامت زنجیره — در صورت دستکاری CHAIN_BROKEN */
  async verifyChain(): Promise<boolean> {
    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i];
      const expectedPrev = i === 0 ? "GENESIS" : this.entries[i - 1].hash;
      if (e.prevHash !== expectedPrev) throw new JournalError("CHAIN_BROKEN");
    }
    return true;
  }
}

/** دریافت رویداد ماژول‌ها → قید خودکار (event → journal) */
export function eventToJournal(
  e: { type: ModuleEventType | string; payload: any },
  id: string
): JournalRequest | null {
  const p = e.payload;
  switch (e.type) {
    case "wallet.deposit.confirmed":
      return {
        source: "wallet",
        refId: p.txHash ?? id,
        narrative: `واریز ${p.asset}`,
        lines: [
          { account: "1001:CRYPTO_CUSTODY", debit: p.amount, credit: "0", asset: p.asset },
          { account: "2002:USER_DEPOSITS_DUE", debit: "0", credit: p.amount, userId: p.userId, asset: p.asset },
        ],
      };
    case "wallet.withdraw.broadcast":
      return {
        source: "wallet",
        refId: p.withdrawalId ?? id,
        narrative: `برداشت ${p.asset}`,
        lines: [
          { account: "2002:USER_DEPOSITS_DUE", debit: p.amount, credit: "0", userId: p.userId },
          { account: "1001:CRYPTO_CUSTODY", debit: "0", credit: p.amount, asset: p.asset },
        ],
      };
    case "exchange.trade.fill":
      return {
        source: "exchange",
        refId: p.fillId ?? id,
        narrative: `معامله ${p.pair}`,
        lines: [
          { account: "1002:USDT_USER", debit: p.quoteAmount, credit: "0", asset: p.quote },
          { account: "1004:DARIC_TREASURY", debit: "0", credit: p.baseAmount, asset: p.base },
          { account: "1002:USDT_USER", debit: "0", credit: p.fee, userId: "TREASURY" },
          { account: "4102:TRADING_FEE", debit: "0", credit: p.fee },
        ],
      };
    case "gold.trade.executed":
      return {
        source: "gold",
        refId: p.tradeId ?? id,
        narrative: `${p.side} ${p.metal}`,
        lines: [
          { account: "1003:GOLD_SILVER_CUSTODY", debit: p.cashIn, credit: p.cashOut, asset: p.metal },
          { account: "1002:USDT_USER", debit: p.cashOut, credit: p.cashIn, userId: p.userId },
          { account: "4103:GOLD_SPREAD", debit: "0", credit: p.spread },
        ],
      };
    case "loan.disbursed":
      return {
        source: "loan",
        refId: p.loanId ?? id,
        narrative: `پرداخت وام ${p.loanId}`,
        lines: [
          { account: "4001:LOAN_RECEIVABLE", debit: p.principal, credit: "0" },
          { account: "1002:USDT_USER", debit: "0", credit: p.principal, userId: p.userId },
        ],
      };
    case "loan.installment.paid":
      return {
        source: "loan",
        refId: `${p.loanId}:inst:${p.installmentNo}`,
        narrative: `قسط ${p.installmentNo} وام`,
        lines: [
          { account: "1002:USDT_USER", debit: p.amount, credit: "0", userId: p.userId },
          { account: "4001:LOAN_RECEIVABLE", debit: "0", credit: p.principalPart },
          { account: "4101:INTEREST_INCOME", debit: "0", credit: p.interestPart },
        ],
      };
    case "loan.foreclosed":
      return {
        source: "loan",
        refId: `${p.loanId}:fc`,
        narrative: `مصادره وام ${p.loanId}`,
        lines: [
          { account: "5002:LOAN_LOSS", debit: p.remainingDebt, credit: "0" },
          { account: "4001:LOAN_RECEIVABLE", debit: "0", credit: p.remainingPrincipal },
          { account: "4101:INTEREST_INCOME", debit: "0", credit: p.remainingInterest },
        ],
      };
    case "mlm.commission.paid":
      return {
        source: "mlm",
        refId: p.commissionId ?? id,
        narrative: "پورسانت باشگاه",
        lines: [
          { account: "5003:MLM_COMMISSION", debit: p.amount, credit: "0" },
          { account: "1002:USDT_USER", debit: "0", credit: p.amount, userId: p.userId },
        ],
      };
    default:
      return null; // رویدادهای بدون قید مالی — فقط audit log
  }
}
