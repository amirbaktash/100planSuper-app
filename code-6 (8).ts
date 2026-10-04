import { WebSocketServer, WebSocket } from "ws";
import { prisma } from "./db";

export function attachChatWS(server: any) {
  const wss = new WebSocketServer({ server, path: "/ws/chat" });
  const online = new Map<string, WebSocket>(); // userId → ws

  wss.on("connection", (ws, req) => {
    const userId = authenticateWS(req); // از token در query
    online.set(userId, ws);

    ws.on("message", async (raw) => {
      const { conversationId, body } = JSON.parse(raw.toString());
      const conv = await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } });
      // مجوز: فقط صاحب چت یا ادمین تخصیص‌یافته
      if (conv.userId !== userId && conv.adminId !== userId) return;

      const msg = await prisma.chatMessage.create({ data: {
        conversationId, senderId: userId,
        senderRole: conv.userId === userId ? "USER" : "ADMIN", body: body.slice(0, 2000) } });

      const recipient = conv.userId === userId ? conv.adminId : conv.userId;
      const target = recipient && online.get(recipient);
      if (target?.readyState === WebSocket.OPEN)
        target.send(JSON.stringify({ event: "message", conversationId, msg }));
    });
    ws.on("close", () => online.delete(userId));
  });
}

// API
// POST /chat/            → کاربر چت باز می‌کند (OPEN)
// GET  /chat/my          → چت من + پیام‌ها
// GET  /admin/chats      → لیست همه چت‌های باز (ادمین)
// POST /admin/chats/:id/assign → تخصیص ادمین
// POST /admin/chats/:id/close
