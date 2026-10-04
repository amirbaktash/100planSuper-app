#!/bin/bash
set -e
echo "═══ PRE-LAUNCH CHECKLIST ═══"
# ۱. Health همه سرویس‌ها
for s in user mlm game loan accounting nav oracle wallet exchange gold-silver tourism insurance admin; do
  curl -sf http://s-service:8080/healthz || { echo "❌s down"; exit 1; }
  echo "✅ $s"
done
# ۲. کانفیگ beta فعال
kubectl set env deployment/wallet-service BETA_MODE=true BETA_PAUSED=false
# ۳. Pause قراردادهای روی chain فقط اگر mainnet
# cast send VAULT"pause()"−−private−keyVAULT "pause()" --private-keyVAULT"pause()"−−private−keyPAUSER_KEY
# ۴. Seed invite codes
node scripts/seed-invites.js --count 200
# ۵. Smoke E2E
npx playwright test e2e/cross-module-flow.spec.ts
echo "🎉 BETA LAUNCH READY — از admin panel، inviteها را توزیع کنید"
echo "Rollback فوری: kubectl set env deployment/wallet-service BETA_PAUSED=true"
