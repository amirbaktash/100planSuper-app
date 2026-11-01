# 🛡️ Bug Bounty Program — Daric Fund

## محدوده (Scope)

| هدف | نوع | جایزه بیشینه |
|---|---|---|
| contracts/DaricVault.sol | Critical | $25,000 |
| contracts/DaricNAV_Oracle_Military.sol | Critical | $15,000 |
| contracts/DaricToken_Military.sol | Critical | $15,000 |
| api.daric.fund (همه سرویس‌ها) | Critical | $10,000 |
| app.daric.fund (XSS/IDOR) | High | $5,000 |
| mobile (bypass auth) | High | $5,000 |

## سطوح جوایز
- **Critical**: سرقت دارایی، bypass برداشت، دستکاری NAV → $3,000–$25,000
- **High**: دسترسی غیرمجاز، تقلب پورسانت → $1,000–$5,000
- **Medium**: rate-limit bypass، اطلاعات حساس → $200–$1,000
- **Low**: $50–$200

## قوانین
- بدون تست DoS/فیزیکی/اجتماعی؛ تست فقط روی staging (staging.daric.fund)
- گزارش: security@daric.fund (PGP key: published) یا Immunefi
- پاسخ اولیه: ۴۸ ساعت — پرداخت: ۱۴ روز پس از fix
- بدون حمله به mainnet؛ بدون دسترسی به داده کاربران واقعی

## Immunefi
- بودجه اولیه pool: $50,000 در USDC
- ایمیل: bounty@daric.fund
- تعریف برنامه: immunefi.json
