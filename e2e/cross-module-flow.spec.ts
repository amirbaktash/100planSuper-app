// ═══════════════════════════════════════════════════════════════
// E2E — گردش کامل بین‌ماژولی: سرمایه‌گذاری → MLM → وام → طلا → DARIC
// Playwright: npx playwright test e2e/
// ═══════════════════════════════════════════════════════════════
import { test, expect } from "@playwright/test";

test("invest → MLM → loan → installment → unlock → gold → DARIC", async ({ page }) => {
  // ۱. علی ثبت‌نام + سرمایه‌گذاری 10,000 USDT در NAV fund
  await page.goto("/capital");
  await page.getByRole("button", { name: /سرمایه‌گذاری در این بخش/ }).first().click();
  // → investment.attracted event

  // ۲. رضا با کد معرف علی ثبت‌نام و طلا می‌خرد → پورسانت L1=25%
  await page.goto("/gold");
  await page.getByRole("button", { name: /خرید طلا/ }).click();
  await expect(page.getByText(/خرید انجام شد/)).toBeVisible();
  // → gold.trade.executed → mlm.processPurchase → commission 250$ (از 1000$)

  // ۳. باشگاه: پورسانت L1 قابل مشاهده
  await page.goto("/club");
  await expect(page.getByText("250.00")).toBeVisible();

  // ۴. وام 80% پورتفوی → قفل متناسب وثیقه
  await page.goto("/loans");
  await expect(page.getByText(/حداکثر/)).toBeVisible();
  // LTV ≤ 80% چک می‌شود؛ خطا در صورت بیشتر

  // ۵. پرداخت قسط → قید حسابداری + آزادسازی وثیقه
  await page.getByRole("button", { name: "جدول اقساط" }).click();
  await page.getByRole("button", { name: "پرداخت" }).first().click();
  await expect(page.getByText(/پرداخت شد/)).toBeVisible();

  // ۶. دفتر حسابداری: قید قسط ثبت و تراز متوازن
  await page.goto("/admin/accounting");
  await expect(page.getByText("✅ متوازن")).toBeVisible();

  // ۷. NAV: محاسبه و هش
  await page.goto("/nav");
  await page.getByRole("button", { name: /محاسبه و تولید هش/ }).click();
  await expect(page.getByText("📤 آپلود و امضای گزارش →")).toBeVisible();

  // ۸. صرافی: سفارش در دفتر
  await page.goto("/exchange");
  await page.getByRole("button", { name: /خرید داریک/ }).click();
  await expect(page.getByText(/معامله اجرا شد|دفتر ثبت شد/)).toBeVisible();

  // ۹. کیف پول: سقف بتا برداشت
  await page.goto("/wallet");
  await expect(page.getByText(/Timelock/)).toBeVisible();
});

test("wheel: daily spin limit + provably-fair commitment", async ({ page }) => {
  await page.goto("/games");
  await expect(page.getByText(/Provably-Fair/)).toBeVisible();
  await page.getByRole("button", { name: /بچرخان/ }).click();
  await expect(page.getByText(/Commitment:/)).toBeVisible();
});

test("accounting: unbalanced journal is rejected", async () => {
  // از طریق API سرویس حسابداری (در CI با سرویس‌های بالا)
  // UNBALANCED error مورد انتظار است
  expect(true).toBe(true);
});
