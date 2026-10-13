import { prisma } from "./db";
import { events } from "./engine";

const INTERVALS = ["1m", "5m", "1h", "1d"] as const;
const MS = { "1m": 60_000, "5m": 300_000, "1h": 3_600_000, "1d": 86_400_000 };

export function startCandleAggregator() {
  events.on("candle", async ({ pair, price, qty }) => {
    for (const interval of INTERVALS) {
      const openTime = new Date(Math.floor(Date.now() / MS[interval]) * MS[interval]);
      await prisma.candle.upsert({
        where: { pair_interval_openTime: { pair, interval, openTime } },
        create: { pair, interval, openTime,
          open: String(price), high: String(price),
          low: String(price), close: String(price), volume: String(qty) },
        update: {
          high: { max: price }, low: { min: price },
          close: String(price), volume: { increment: qty } },
      });
    }
  });
}
