          { account: "4101:INTEREST_INCOME", debit: "0", credit: e.payload.interestPart } ] });

    case "loan.foreclosed":
      return postJournal({ source: "loan", refId: `${e.payload.loanId}:fc`,
        narrative: `مصادره وام ${e.payload.loanId}`,
        lines: [
          { account: "5002:LOAN_LOSS", debit: e.payload.remainingDebt, credit: "0" },
          { account: "4001:LOAN_RECEIVABLE", debit: "0", credit: e.payload.remainingPrincipal },
          { account: "4101:INTEREST_INCOME", debit: "0", credit: e.payload.remainingInterest } ] });

    case "mlm.commission.paid":
      return postJournal({ source: "mlm", refId: e.payload.commissionId,
        narrative: `پورسانت MLM`,
        lines: [
          { account: "5003:MLM_COMMISSION", debit: e.payload.amount, credit: "0" },
          { account: "1002:USDT_USER", debit: "0", credit: e.payload.amount, userId: e.payload.userId } ] });

    case "loan.collateral.unlocked":
    case "loan.applied":
    case "loan.installment.late":
      return; // فقط audit log — قید مالی ندارند
  }
}
