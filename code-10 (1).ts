import { ethers } from "ethers";
const ABI = ["function currentNAV() view returns (uint256)"];
export async function getDaricPrice(): Promise<number> {
  const c = new ethers.Contract(process.env.NAV_ORACLE!, ABI,
    new ethers.JsonRpcProvider(process.env.RPC_URL!));
  return Number(ethers.formatEther(await c.currentNAV()));
}
