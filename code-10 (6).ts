import { test, expect } from "@playwright/test";

test("invest → MLM → loan → installment → unlock → gold → DARIC", async ({ api }) => {
  // ۱. علی ثبت‌نام + سرمایه‌گذاری 10,000 USDT در NAV fund
  const ali = await registerAndKyc(api, "ali");
  await invest(ali, "10000");
  await expectEvent("investment.attracted", { userId: ali.id });

  // ۲. رضا با کد معرف علی ثبت‌نام و طلا می‌خرد → پورسانت L1=25%
  const reza = await register(api, "reza", ali.referralCode);
  await buyGold(reza, "1000");                        // → gold.trade.executed
  let cs = await getCommissions(ali);
  expect(cs.find(c => c.level === 1)!.amount).toBe("250.00");

  // ۳. رضا وام 80% پرتفوی می‌گیرد → قفل متناسب وثیقه
  await deposit(reza, [{ asset: "USDT", amount: "5000" },
                       { asset: "DARIC", amount: "10000" }]);   // 10,000$ پرتفوی
  const loan = await applyLoan(reza, "4000", 12);               // دقیقاً 80%
  expect(loan.slices.usdt.lockAmount).toBe("5000.00000000");

  // ۴. پرداخت قسط اول → آزادسازی 1/12 متناسب
  await payInstallment(loan.id, 1, "355.67");
  expect(await collateralState(loan.id)).toMatchObject({ unlockedRatio: "0.0833333333" });

  // ۵. طلا آزادشده → تبدیل به DARIC از صرافی
  await sellGold(reza, "83.33");
  const trade = await convert(reza, "GOLD", "DARIC", "83.33");
  expect(trade.feeUSD).toBe("4.17");      // 0.5٪
  expect((await walletOf(reza)).DARIC).toBeGreaterThan("10000");

  // ۶. صحت حسابداری: تراز آزمایشی متوازن پس از همه این‌ها
  const tb = await adminGet("/trial-balance");
  expect(tb.totals.debit).toBe(tb.totals.credit);
});
