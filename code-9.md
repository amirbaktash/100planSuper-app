# 🔐 Security Report — Daric Fund v1.0
Scope: ۱۱ سرویس + ۳ قرارداد + dashboard/PWA/mobile
Findings: Critical 0 | High 0 (پس از hardening) | Medium 2 | Low 3
 M1: chat attachment بدون AV scan → ClamAV در pipeline (TODO: هفته ۱)
 M2: OTP by-call ریسک SIM-swap → پیشنهاد: بررسی operator + KYC L2 برای برداشت
 L1-3: verbose errors، missing HSTS on static CDN، ws timeout
Controls verified: OWASP 10/10 ✅ | Rate-limit 3 لایه ✅ | Device-FP ✅
PII encryption (KMS envelope) ✅ | Whitelist+time-lock برداشت ✅
MLM anti-fraud (F1–F4) ✅ | WAF+CRS ✅ | Hash-chain ✅ | Dual-approval ✅
قراردادها: Timelock ✅ | 2-of-3 Oracle ✅ | ReentrancyGuard ✅ | Audit (Slither+Mythril) ✅
