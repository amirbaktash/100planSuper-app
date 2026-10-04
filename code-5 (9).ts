import speakeasy from "speakeasy";
import QRCode from "qrcode";

export async function enable2FA(userId: string) {
  const secret = speakeasy.generateSecret({ name: "DaricFund" });
  await prisma.user.update({ where: { id: userId }, data: { twoFASecret: secret.base32 } });
  return { otpauthUrl: secret.otpauth_url, qrDataUrl: await QRCode.toDataURL(secret.otpauth_url) };
}

export const verify2FA = async (userId: string, token: string) => {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!u.twoFASecret) return true; // فعال نیست → pass
  return speakeasy.totp.verify({ secret: u.twoFASecret, encoding: "base32", token, window: 1 });
};

export async function updateSecurity(userId: string, settings: object) {
  return prisma.user.update({ where: { id: userId }, data: { security: settings } });
}
