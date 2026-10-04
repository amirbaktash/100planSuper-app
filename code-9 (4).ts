import { prisma } from "./db";
import { publish } from "@daric/eventbus";

export const requirePermission = (resource: string, action: "VIEW" | "EDIT" | "APPROVE") =>
  async (req, res, next) => {
    const roles = await prisma.role.findMany({
      where: { permissions: { some: { resource, action } } },
      include: { permissions: true } });
    const admin = await prisma.admin.findUniqueOrThrow({
      where: { id: req.user.id }, include: { roles: true } });
    const has = admin.roles.some(r =>
      roles.some(x => x.id === r.id));
    if (!has) return res.status(403).json({ error: `NEED_{action}_{resource}` });
    req.adminPerms = { resource, action };
    next();
  };

/** Audit Log — دکوراتور روی همه اکشن‌های ادمین */
export function audited(action: string, resource: string) {
  return function (target: any, key: string, desc: PropertyDescriptor) {
    const orig = desc.value;
    desc.value = async function (req, ...args) {
      const before = await snapshot(resource, req.params.id);
      const result = await orig.apply(this, [req, ...args]);
      await prisma.adminAuditLog.create({ data: {
        adminId: req.user.id, action, resource, resourceId: req.params.id,
        before, after: await snapshot(resource, req.params.id),
        ip: req.ip } });
      await publish("admin.audit", { adminId: req.user.id, action, resource });
      return result;
    };
  };
}
