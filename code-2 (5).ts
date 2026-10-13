import { subscribe } from "@daric/eventbus";
import { handleModuleEvent } from "./journal";
import { prisma } from "./db";

export async function startAccountingConsumers() {
  await subscribe("accounting-service", "acct-worker-1", async (e) => {
    try {
      await handleModuleEvent(e);
      // audit log برای همه رویدادها
      await prisma.auditLog.create({ data: {
        eventType: e.type, payload: e.payload as any, processedAt: new Date() } });
    } catch (err) {
      console.error(`[accounting] ${e.type} rejected — UNBALANCED or invalid`, err);
      // رویداد نامعتبر وارد Pending می‌ماند → هشدار ادمین
      await prisma.deadLetter.create({ data: { eventType: e.type, payload: e.payload as any,
        error: String(err) } });
    }
  });
}
