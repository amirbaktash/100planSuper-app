import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { prisma } from "@daric/shared";

export function attachChatWS(server: any) {
  const wss = new WebSocketServer({ server, path: "/ws/chat" });
  const online = new Map<string, WebSocket>();

  wss.on("connection", (ws, req) => {
    // ✅ رفع: JWT در handshake verify می‌شود — جعل senderId غیرممکن
    let userId: string;
    try {
      const token = new URL(req.url!, "http://x").searchParams.get("token")!;
      userId = (jwt.verify(token, process.env.JWT_SECRET!) as any).sub;
      if (!userId) throw new Error();
    } catch { ws.close(4001, "AUTH_FAILED"); return; }

    online.set(userId, ws);
    ws.on("message", async (raw) => {
      const { conversationId, body } = JSON.parse(raw.toString());
      const conv = await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } });
      // senderRole از هویت verified تعیین می‌شود، نه از پیام کلاینت ✅
      const senderRole = conv.userId === userId ? "USER" : "ADMIN";
      if (conv.userId !== userId && conv.adminId !== userId) return;
      const msg = await prisma.chatMessage.create({ data: {
        conversationId, senderId: userId, senderRole, body: body.slice(0, 2000) } });
      const recipient = conv.userId === userId ? conv.adminId : conv.userId;
      online.get(recipient!)?.send(JSON.stringify({ event: "message", conversationId, msg }));
    });
    ws.on("close", () => online.delete(userId));
  });
}
