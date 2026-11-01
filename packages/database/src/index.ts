// پریسما — کلاینت مشترک همه سرویس‌ها (schema.prisma در packages/database)
export { PrismaClient, Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient({ log: ["warn", "error"] });
