import { ethers } from "ethers";
import fetch from "node-fetch";

const GATEWAY = process.env.IPFS_GATEWAY!;

/** آپلود به IPFS — از oracle-service مشترک */
export async function uploadToIPFS(payload: object): Promise<string> {
  const res = await fetch(`${process.env.ORACLE_SERVICE_URL}/ipfs/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json",
               "X-Signer": process.env.ORACLE_SIGNER! },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`IPFS upload failed: ${res.status}`);
  const { hash } = await res.json();
  return hash; // مثلا bafybei...
}

const ABI = [
  "function submitNAV(uint256 navE18, string calldata ipfsHash, bytes32 reportHash)",
  "function confirmations(bytes32) view returns (uint8)",
  "function requiredSigs() view returns (uint8)",
  "function currentNAV() view returns (uint256)",
  "function navHistory(uint256) view returns (uint256 navE18, string ipfsHash, uint64 timestamp)",
  "function historyLength() view returns (uint256)",
];

export function getOracleContract(wallet?: ethers.Wallet) {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL!);
  const signer = wallet ?? new ethers.JsonRpcSigner(0, provider); // 2-of-3: هر امضاکننده
  return new ethers.Contract(process.env.NAV_ORACLE!, ABI, signer as any);
}

export async function pushToOracle(navE18: bigint, ipfsHash: string, reportHash: string) {
  const c = getOracleContract(new ethers.Wallet(process.env.ORACLE_KEY_1!));
  const tx = await c.submitNAV(navE18, ipfsHash, "0x" + reportHash);
  await tx.wait(); // امضاکننده دوم از UI ادمین تأیید می‌کند (2-of-3)
}
