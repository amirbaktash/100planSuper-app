import { create } from "ipfs-http-client";
const ipfs = create({ url: process.env.IPFS_API! });
export async function pinJSON(payload: object) {
  const { cid } = await ipfs.add(JSON.stringify(payload), { pin: true });
  return cid.toString();
}
