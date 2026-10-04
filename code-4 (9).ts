import { redis } from "./eventbus";

const MAX_DEVIATION = 0.03; // حداکثر ۳٪ فاصله با کش قبلی — ضد دستکاری

export async function getAssetUSDPrice(asset: string): Promise<string> {
  const cached = await redis.get(`price:${asset}`);
  const fresh = await fetchPriceFromOracle(asset);        // نرخ از oracle-service (فاز ۲)
  if (cached) {
    const dev = Math.abs(Number(fresh) - Number(cached)) / Number(cached);
    if (dev > MAX_DEVIATION) throw new Error("PRICE_DEVIATION_BLOCKED"); // ⛔ نه‌فروش
  }
  await redis.set(`price:${asset}`, fresh, "EX", 10);      // کش ۱۰ ثانیه
  return fresh;
}

async function fetchPriceFromOracle(asset: string): Promise<string> {
  const r = await fetch(`process.env.ORACLEURL/price/{process.env.ORACLE_URL}/price/process.env.ORACLEU​RL/price/{asset}`);
  if (!r.ok) throw new Error("ORACLE_UNAVAILABLE");
  return r.text();
}
