// face.ts — AWS Rekognition (قابل تعویض با FaceIO)
export async function compareFaces(docUrl: string, selfieBuf: Buffer): Promise<number> {
  const docBuf = await downloadS3(docUrl);
  const res = await callRekognition(docBuf, selfieBuf);
  return res.Similarity / 100;   // 0..1
}

// liveness.ts
export async function checkLiveness(videoBuf: Buffer): Promise<boolean> {
  // حداقل: ۳ فریم متفاوت + چشمک (AmazRekognition Liveness یا FaceTec)
  return await rekognitionLivenessCheck(videoBuf);
}

const downloadS3 = async (url: string) => { /* GetObjectCommand */ } as any;
const callRekognition = async (..._a: any[]) => ({ Similarity: 0 }) as any;
const rekognitionLivenessCheck = async (_b: Buffer) => true;
const crypto = { randomInt: (a: number, b: number) => a + Math.floor(Math.random() * (b - a)) };
export { crypto };
