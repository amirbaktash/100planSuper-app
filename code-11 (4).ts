import { subscribe } from "@daric/eventbus";
import { processPurchase } from "./commissions";

const CATEGORY_MAP: Record<string, string> = {
  "tourism.booking.confirmed":   "TOURISM",
  "insurance.policy.purchased":  "INSURANCE",
  "investment.attracted":        "INVESTMENT",
  "gold.trade.executed":         "GOLDSILVER",
  "casino.wager.placed":         "CASINO",
};

export async function startMlmConsumer() {
  await subscribe("mlm-service", "mlm-worker-1", async (e) => {
    const category = CATEGORY_MAP[e.type];
    if (!category) return;
    await processPurchase({ userId: e.payload.userId,
      category, amountUSD: e.payload.amountUSD, refId: e.payload.refId ?? e.id! });
  });
}
