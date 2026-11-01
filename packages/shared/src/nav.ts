// ═══════════════════════════════════════════════════════════════
// محاسبه NAV توکن داریک (DARIC) — قلب توکنومیک
// عرضه کل: ۱ میلیارد | قیمت هر توکن = کل NAV ÷ عرضه
// ضریب رشد لگاریتمی: جلوگیری از دستکاری با اعداد نجومی
// ═══════════════════════════════════════════════════════════════

import type { AssetReport, NAVResult } from "./types";

const TOTAL_SUPPLY = 1_000_000_000; // 1B DARIC
const GROWTH_WEIGHTS = { investors: 0.4, installs: 0.35, mlm: 0.25 };

/** ساده‌سازی عددی برای محیط مرورگر/سرور (معادل Decimal در production) */
const n = (x: number) => Number(x.toFixed(6));

export function computeNAV(r: AssetReport): NAVResult {
  const projects = Object.values(r.projects).reduce((s, v) => s + Number(v), 0);

  const assetTotal =
    Number(r.capital.attracted) +
    Number(r.properties.immovable) +
    Number(r.properties.movable) +
    projects +
    Number(r.constructionUnits) +
    Number(r.physicalAssets);

  // ضریب رشد لگاریتمی = 1 + (0.40·log10(1+سرمایه‌گذار) + 0.35·log10(1+نصب) + 0.25·log10(1+باشگاه)) / 10
  const growth =
    1 +
    (GROWTH_WEIGHTS.investors * Math.log10(1 + r.capital.investorCount) +
      GROWTH_WEIGHTS.installs * Math.log10(1 + r.growth.appInstalls) +
      GROWTH_WEIGHTS.mlm * Math.log10(1 + r.growth.mlmClubSize)) /
      10;

  const totalNAV = assetTotal * growth;
  const navPerToken = totalNAV / TOTAL_SUPPLY;

  const breakdown: Record<string, string> = {
    capital: n(r.capital.attracted).toFixed(2),
    immovable: n(r.properties.immovable).toFixed(2),
    movable: n(r.properties.movable).toFixed(2),
    projects: n(projects).toFixed(2),
    construction: n(r.constructionUnits).toFixed(2),
    physical: n(r.physicalAssets).toFixed(2),
    growthFactor: growth.toFixed(6),
  };

  return {
    navPerToken: navPerToken.toFixed(18),
    totalNAV: totalNAV.toFixed(2),
    breakdown,
    reportHash: "", // در hashReport() با SHA-256 پر می‌شود
  };
}

/** SHA-256 هر payload — هش روی-chain (در مرورگر: crypto.subtle) */
export async function hashPayload(payloadObj: unknown): Promise<string> {
  const payload = JSON.stringify(payloadObj);
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const buf = await subtle.digest("SHA-256", new TextEncoder().encode(payload));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // fallback (غیرکریپتوگرافیک) — فقط برای محیط‌های بدون WebCrypto
  let h1 = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h1 ^= payload.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193) >>> 0;
  }
  return "fnv1a_" + h1.toString(16).padStart(8, "0");
}

/** SHA-256 گزارش دارایی */
export async function hashReport(r: AssetReport): Promise<string> {
  return hashPayload(r);
}

/** محیطی: اجرای کامل گزارش → NAV + هش */
export async function reportToNAV(r: AssetReport): Promise<NAVResult> {
  const res = computeNAV(r);
  res.reportHash = await hashReport(r);
  return res;
}
