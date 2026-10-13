import { subscribe } from "@daric/eventbus";
import { unlockProportional } from "./collateral";

// loan.installment.paid → unlock → wallet update → audit log
export async function startLoanConsumers() {
  await subscribe("loan-service", "loan-worker-1", async (e) => {
    switch (e.type) {
      case "loan.installment.paid":
        await unlockProportional(e.payload.loanId, e.payload.installmentNo);
        break;
      case "loan.installment.late":
        await import("./notifications").then(m => m.notifyLate(e.payload));
        break;
    }
  });
}
