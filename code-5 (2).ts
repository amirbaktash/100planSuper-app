import { ethers } from "ethers";
import { prisma } from "./db";
import { creditBalance } from "./balances";

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL!);
const CONFIRMATIONS = 12;

export async function listenDeposits() {
  const known = new Map<string, { userId: string }>();
  for (const a of await prisma.depositAddress.findMany()) known.set(a.address.toLowerCase(), { userId: a.userId });

  provider.on("block", async (blockNumber) => {
    const block = await provider.getBlockWithTransactions(blockNumber - CONFIRMATIONS + 1);
    if (!block) return;
    for (const tx of block.transactions) {
      const match = known.get(tx.to?.toLowerCase() ?? "");
      if (!match || tx.value === 0n) continue;
      // اتمیک: credit + ledger (idempotent با txHash)
      await creditBalance(match.userId, "POL",
        ethers.formatEther(tx.value), "DEPOSIT", tx.hash);
    }
  });
}
