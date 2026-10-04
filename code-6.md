# 🛡️ Bug Bounty Program — Daric Fund
## محدوده (Scope)
| هدف | نوع | جایزه بیشینه |
|---|---|---|
| contracts/DaricVault.sol | Critical | $25,000 |
| contracts/NavOracle.sol  | Critical | $15,000 |
| contracts/SalesVault.sol | Critical | $15,000 |
| api.daric.fund (همه سرویس‌ها) | Critical | $10,000 |
| app.daric.fund (XSS/IDOR) | High | $5,000 |
| mobile (bypass auth)      | High | $5,000 |

## سطوح
- Critical: سرقت دارایی، bypass برداشت، دستکاری NAV → 3K–3K–3K–25K
- High: دسترسی غیرمجاز، تقلب پورسانت → 1K–1K–1K–5K
- Medium: rate-limit bypass، اطلاعات حساس → 200–200–200–1K
- Low: 50–50–50–200

## قوانین
- بدون تست DoS/فیزیکی/اجتماعی؛ تست فقط روی staging (staging.daric.fund)
- گزارش: security@daric.fund (PGP key: published) یا Immunefi
- پاسخ اولیه: ۴۸ ساعت — پرداخت: ۱۴ روز پس از fix

## Immunefi
- بودجه اولیه pool: $50,000 در USDC
- ایمیل: bounty@daric.fund
