// packages/shared/src/kms.ts ★ جدید
import { KMSClient, EncryptCommand, DecryptCommand } from "@aws-sdk/client-kms";
const kms = new KMSClient({});
export const getKMSKey = () => ({
  encrypt: async (b: Buffer) =>
    (await kms.send(new EncryptCommand({ KeyId: process.env.KMS_KEY_ID!,
      Plaintext: b }))).CiphertextBlob!,
  decrypt: async (b: Buffer) =>
    (await kms.send(new DecryptCommand({ CiphertextBlob: b }))).Plaintext!,
});
// ✅ سرویس اگر KMS در دسترس نباشد، startup fail می‌کند — نه fallback ناامن
