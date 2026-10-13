import Decimal from "decimal.js";
import type { AssetReport } from "./types";
import { createHash } from "crypto";

const TOTAL_SUPPLY = new Decimal("1000000000"); // 1B DARIC — از قرارداد بخوانید در production
const GROWTH_WEIGHTS = { investors: 0.40, installs: 0.35, mlm: 0.25 };

export interface NAVResult {
  navPerToken: string;          // Decimal string، 18 اعشار
  totalNAV: string;
  breakdown: object;
  reportHash: string;           // keccak-like hash برای روی-chain
}

export function computeNAV(r: AssetReport): NAVResult {
  const d = (n: number) => new Decimal(n);

  const projects = Object.values(r.projects)
    .reduce((s, v) => s.plus(d(v)), new Decimal(0));

  const assetTotal =
    d(r.capital.attracted)
      .plus(r.properties.immovable)
      .plus(r.properties.movable)
      .plus(projects)
      .plus(r.constructionUnits)
      .plus(r.physicalAssets);

  // ضریب رشد لگاریتمی — جلوگیری از دستکاری با اعداد نجومی
  const growth = new Decimal(1).plus(
    GROWTH_WEIGHTS.investors * Math.log10(1 + r.capital.investorCount) +
    GROWTH_WEIGHTS.installs  * Math.log10(1 + r.growth.appInstalls) +
    GROWTH_WEIGHTS.mlm       * Math.log10(1 + r.growth.mlmClubSize)
  ).div(10);

  const totalNAV = assetTotal.times(growth);
  const navPerToken = totalNAV.div(TOTAL_SUPPLY).toFixed(18);

  const reportHash = createHash("sha256")
    .update(JSON.stringify({ ...r, totalNAV: totalNAV.toString() }))
    .digest("hex");

  return {
    navPerToken,
    totalNAV: totalNAV.toString(),
    breakdown: { ...r, projectsTotal: projects.toString(),
                 assetTotal: assetTotal.toString(), growthFactor: growth.toString() },
    reportHash,
  };
}
