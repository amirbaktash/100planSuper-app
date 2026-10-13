import { z } from "zod";

export const AssetReportSchema = z.object({
  reportDate: z.string().datetime(),
  period: z.enum(["daily", "weekly", "monthly"]),
  capital: z.object({
    attracted: z.number().nonnegative(),        // سرمایه جذاب‌شده
    investorCount: z.number().int().nonnegative(),
  }),
  properties: z.object({
    immovable: z.number().nonnegative(),        // غیرمنقول
    movable: z.number().nonnegative(),          // منقول
  }),
  projects: z.object({
    livestock: z.number().nonnegative(),        // دام‌داری
    agriculture: z.number().nonnegative(),      // کشاورزی
    energy: z.number().nonnegative(),           // انرژی
    games: z.number().nonnegative(),            // بازی‌ها
  }),
  constructionUnits: z.number().nonnegative(),  // واحدهای در حال ساخت
  physicalAssets: z.number().nonnegative(),     // دارایی فیزیکی
  growth: z.object({
    appInstalls: z.number().int().nonnegative(),
    mlmClubSize: z.number().int().nonnegative(),
  }),
  currency: z.enum(["USD", "EUR", "IRR"]).default("USD"),
});

export type AssetReport = z.infer<typeof AssetReportSchema>;
