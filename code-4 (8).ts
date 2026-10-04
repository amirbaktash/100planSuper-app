import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { getKMSKey } from "./kms"; // AWS KMS / HashiCorp Vault / hardware HSM

/** Envelope encryption: DEK per-record رمز با KMS master key */
export async function encryptPII(plaintext: string) {
  const dek = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ct: ct.toString("base64"), iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    wrappedDEK: (await getKMSKey().encrypt(dek)).toString("base64") };
}

export async function decryptPII(rec: { ct: string; iv: string; tag: string; wrappedDEK: string }) {
  const dek = await getKMSKey().decrypt(Buffer.from(rec.wrappedDEK, "base64"));
  const d = createDecipheriv("aes-256-gcm", dek, Buffer.from(rec.iv, "base64"));
  d.setAuthTag(Buffer.from(rec.tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(rec.ct, "base64")), d.final()]).toString("utf8");
}

// اعمال:
//  • KycDoc.fileUrl → کل فایل S3 با SSE-KMS + نسخه‌بندی + Object Lock (WORM)
//  •_passengers passportNo / nationalId → encryptPII قبل از insert
//  • ChatMessage body → رمز در DB (selective)
//  • لاگ‌ها: redact PII — هیچ شماره ملی/پاسپورت در log نمی‌نشیند
