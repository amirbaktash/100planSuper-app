□ Auth: brute-force OTP، session fixation، JWT tampering، 2FA bypass
□ IDOR: دسترسی به booking/policy/chat/loan دیگران با تغییر id
□ Business Logic: overbooking تور، double-spend برداشت، ری‌پلی spin،
  پورسانت با تغییر amountUSD بین event و پرداخت، بای‌پس 80% وام
□ Injection: SQL/NoSQL در فیلترهای search، XSS در WYSIWYG، SSRF در supplier webhook
□ Race: هم‌زمانی برداشت/خرید گردونه/قسط — آزمون with autocannon parallel
□ Infra: Redis بدون auth، S3 public bucket، secret در env暴露، `/admin` بدون RBAC
□ Mobile/PWA: certificate pinning bypass، localStorage token، deep-link hijack
