import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);
const STREAM = "daric:events";

export interface DaricEvent {
  id?: string;
  type: string;          // loan.installment.paid | exchange.trade.fill | wallet.deposit.confirmed | ...
  payload: Record<string, any>;
  ts: number;
}

/** انتشار — همه ماژول‌ها فقط از این راه با هم حرف می‌زنند */
export async function publish(type: string, payload: Record<string, any>) {
  await redis.xadd(STREAM, "*",
    "type", type,
    "payload", JSON.stringify(payload),
    "ts", Date.now().toString());
}

/** مصرف با Consumer Group — at-least-once + idempotency در consumer */
export async function subscribe(group: string, consumer: string,
    handler: (e: DaricEvent) => Promise<void>) {
  try { await redis.xgroup("CREATE", STREAM, group, "0", "MKSTREAM"); } catch {}
  let lastId = ">";
  setInterval(async () => {
    const msgs = await redis.xreadgroup("GROUP", group, consumer,
      "COUNT", 10, "BLOCK", 2000, "STREAMS", STREAM, lastId);
    if (!msgs) return;
    for (const [, entries] of msgs) {
      for (const [id, fields] of entries) {
        const e: DaricEvent = { id, type: fields[1], payload: JSON.parse(fields[3]), ts: +fields[5] };
        try {
          await handler(e);
          await redis.xack(STREAM, group, id);
        } catch (err) {
          console.error(`[eventbus] ${e.type} failed — will retry`, err); // Pending → retry
        }
      }
    }
  }, 100);
}
