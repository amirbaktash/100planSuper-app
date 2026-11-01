// @daric/eventbus — باس رویداد: Redis Streams (publish/subscribe) + request/reply
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 2,
});

const GROUP = "daric";
const STREAM = "daric:events";

/** انتشار رویداد — همه سرویس‌های مصرف‌کننده دریافت می‌کنند */
export async function publish(type: string, payload: Record<string, unknown>) {
  await redis.xadd(STREAM, "*", "type", type, "payload", JSON.stringify(payload), "id", `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
}

/**
 * request/reply نقطه‌ای — مثلاً wallet.debit:
 * اگر کیف پول کسر نکند، عملیات مالی اصلاً ثبت نمی‌شود (saga)
 */
const pending = new Map<string, (v: any) => void>();

export async function requestReply(type: string, payload: Record<string, unknown>, timeoutMs = 5000): Promise<any> {
  const corr = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const replyType = `${type}.reply`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(replyType + corr); reject(new Error("REQUEST_TIMEOUT:" + type)); }, timeoutMs);
    pending.set(replyType + corr, (v) => { clearTimeout(timer); resolve(v); });
    redis.xadd(STREAM, "*", "type", type, "payload", JSON.stringify({ ...payload, corr, replyType: replyType + corr }));
  });
}

export function reply(corr: string, result: any) {
  const cb = pending.get(corr);
  if (cb) { pending.delete(corr); cb(result); }
}

/** اشتراک گروهی — هر سرویس با consumer خاص خودش */
export async function subscribe(consumer: string, worker: string, handler: (e: any) => Promise<void>) {
  try { await redis.xgroup(STREAM, "CREATE", GROUP, "0", "MKSTREAM"); } catch { /* exists */ }
  while (true) {
    const res = await redis.xreadgroup("GROUP", GROUP, worker, "COUNT", 10, "BLOCK", 2000, "STREAMS", STREAM, ">");
    if (!res) continue;
    for (const [, messages] of res) {
      for (const [id, fields] of messages as any) {
        const map: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) map[fields[i]] = fields[i + 1];
        try {
          await handler({ id, type: map.type, payload: JSON.parse(map.payload ?? "{}") });
          await redis.xack(STREAM, GROUP, id);
        } catch (err) {
          console.error(`[eventbus] handler failed ${consumer}/${worker}:`, err);
          // Dead-letter: رویداد خراب برای بازبینی ادمین
          await redis.xadd("daric:deadletter", "*", "error", String(err), "event", JSON.stringify({ id, type: map.type }));
        }
      }
    }
  }
}
