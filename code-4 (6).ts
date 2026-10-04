import { prisma } from "./db";
import { publish } from "@daric/eventbus";
import { compareFaces } from "./face-api";   // AWS Rekognition / FaceIO / self-hosted

/** سطح ۱: آپلود مدارک هویتی؛ سطح ۲: سلفی زنده + تطبیق با عکس مدارک */
export async function uploadDoc(userId: string, type: string, file: Express.Multer.File) {
  const url = await uploadToS3(file, `kyc/${userId}/`, /* encrypted: true */);
  return prisma.kycDoc.create({ data: { userId, type, fileUrl: url } });
}

export async function submitKycL1(userId: string) {
  const docs = await prisma.kycDoc.findMany({ where: { userId, type: { in: ["NATIONAL_ID", "SELFIE"] } } });
  if (docs.length < 2) throw new Error("MISSING_DOCS");
  await prisma.user.update({ where: { id: userId }, data: { kycStatus: "PENDING", kycLevel: 1 } });
  await publish("kyc.submitted", { userId, level: 1 });
}

/** تشخیص چهره: تطبیق SELFIE با عکس روی کارت ملی + Liveness */
export async function verifyFace(userId: string, selfieBuffer: Buffer, livenessVideo: Buffer) {
  const idDoc = await prisma.kycDoc.findFirstOrThrow({
    where: { userId, type: "NATIONAL_ID", status: "APPROVED" } });

  const livenessOk = await checkLiveness(livenessVideo);   // چشمک/چرخش سر
  if (!livenessOk) throw new Error("LIVENESS_FAILED");

  const score = await compareFaces(idDoc.fileUrl, selfieBuffer); // 0..1
  await prisma.kycDoc.create({ data: {
    userId, type: "LIVENESS_VIDEO",
    fileUrl: await uploadToS3(livenessVideo, `kyc/${userId}/`),
    faceScore: score } });

  if (score >= 0.90) {   // آستانه
    await prisma.user.update({ where: { id: userId }, data: { kycLevel: 2, kycStatus: "APPROVED" } });
    await publish("kyc.approved", { userId, level: 2, faceScore: score });
    return { approved: true, score };
  }
  return { approved: false, score, message: "امتیاز تطبیق چهره کافی نیست" };
}

// ادمین: تأیید/رد دستی
export async function reviewDoc(docId: string, adminId: string, approve: boolean, reason?: string) {
  const doc = await prisma.kycDoc.update({ where: { id: docId },
    data: { status: approve ? "APPROVED" : "REJECTED", reviewedBy: adminId } });
  if (!approve) await notify(doc.userId, `مدارک رد شد: ${reason}`);
}
