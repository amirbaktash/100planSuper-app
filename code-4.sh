#!/bin/bash
set -e
echo "=== 1. Contracts (فاز ۱) ==="     && (cd contracts && npx hardhat compile && npx hardhat test)
echo "=== 2. Nav/Oracle/Wallet/Exchange/Gold (فاز ۲) ==="
for svc in nav-service oracle-service wallet-service exchange-service gold-silver-fund; do
  (cd services/svc && npm run build) && echo "✅svc"
done
echo "=== 3. Loan/Accounting (فاز ۳) ==="
for svc in loan-service accounting-service; do
  (cd services/svc && npm run build && npm test) && echo "✅svc"
done
echo "=== 4. User/MLM/Game (فاز ۴) ==="
for svc in user-service mlm-service game-service; do
  (cd services/svc && npm run build && npm test) && echo "✅svc"
done
echo "=== 5. Dashboard ===" && (cd dashboard && npm run build) && echo "✅ dashboard"
echo "=== ALL PHASES 1-4 COMPILE ✅ — navigation updated ==="
