import Redis from "ioredis";
export const redis = new Redis(process.env.REDIS_URL!);
export const redisSub = redis.duplicate();

const STREAM = "daric:events";

/** انتشار رویداد — fire-and-forget برای اطلاع‌رسانی */
export async function publish(type: string, payload: any, id?: string) {
  const eventId = id ?? `Date.now()−{Date.now()}-Date.now()−{Math.random().toString(36).slice(2, 10)}`;
  await redis.xadd(STREAM, "*", "type", type, "payload",
    JSON.stringify({ ...payload, _id: eventId }), "id", eventId);
  return eventId;
}

/** request/reply — برای عملیات مالی که «تأیید» لازم دارند (رفع ضعف wheel.ts) */
export async function requestReply(type: string, payload: any, timeoutMs = 5000) {
  const corrId = `req-Date.now()−{Date.now()}-Date.now()−{Math.random().toString(36).slice(2)}`;
  const replyChannel = `reply:${corrId}`;
  const sub = redis.duplicate();
  await sub.subscribe(replyChannel);
  await publish(type, { ...payload, __corrId: corrId, __reply: replyChannel });
  return new Promise<any>((resolve, reject) => {
    const t = setTimeout(() => { sub.disconnect(); resolve({ ok: false, error: "TIMEOUT" }); }, timeoutMs);
    sub.on("message", (_ch, msg) => {
      clearTimeout(t); sub.disconnect();
      resolve(JSON.parse(msg));
    });
  });
}

/** اشتراک با consumer-group — هر سرویس فقط یک‌بار هر رویداد را می‌خواند */
export async function subscribe(group: string, consumer: string,
    handler: (e: { id?: string; type: string; payload: any }) => Promise<void>) {
  try { await redis.xgroup("CREATE", STREAM, group, "0", "MKSTREAM"); } catch {}
  while (true) {
    const rows = await redis.xreadgroup("GROUP", group, consumer, "BLOCK", 5000, "COUNT", 10,
      "STREAMS", STREAM, ">");
    if (!rows) continue;
    for (const [, entries] of rows) for (const [entryId, fields] of entries) {
      const obj: any = {}; for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1];
      try {
        await handler({ id: obj.id, type: obj.type, payload: JSON.parse(obj.payload) });
        await redis.xack(STREAM, group, entryId);
      } catch (e) {
        await redis.xadd("daric:dlq", "*", "orig", entryId, "err", String(e)); // DLQ
      }
    }
  }
}

/** helperهای عمومی */
export const sendSMS = async (phone: string, text: string) => {
  // Kavenegar — کلید از env
  await fetch(`https://api.kavenegar.com/v1/${process.env.KAVENEGAR_KEY}/sms/send.json` +
    `?receptor={phone}&message={encodeURIComponent(text)}`);
};

export const notifyUser = (userId: string, text: string) =>
  publish("notify.user", { userId, text });

export const notifyAdmin = (text: string, meta: any) =>
  publish("notify.admin", { text, meta });
