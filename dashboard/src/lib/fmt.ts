// قالب‌بندی اعداد — مشترک بین همه صفحات
export const fmt = (n: number, d = 2) =>
  Number(n).toLocaleString("en-US", { maximumFractionDigits: d });
export const usd = (n: number) => "$" + fmt(n);
