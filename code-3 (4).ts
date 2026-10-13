import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function uploadToS3(file: { buffer: Buffer; originalname: string },
    prefix: string, _encrypted = true) {
  const key = `prefix{prefix}prefix{Date.now()}-${file.originalname}`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: file.buffer,
    ServerSideEncryption: "aws:kms",                    // ★ PII در rest
    SSEKMSKeyId: process.env.KMS_KEY_ID }));
  return `s3://process.env.S3BUCKET/{process.env.S3_BUCKET}/process.env.S3B​UCKET/{key}`;
}

export async function imageMeta(buf: Buffer) {
  const m = await sharp(buf).metadata();
  const webp = await sharp(buf).webp({ quality: 80 }).toBuffer();
  return { width: m.width, height: m.height, sizeKb: Math.round(buf.length / 1024),
    webpOptimized: webp.length < buf.length };
}
