#!/bin/bash
set -e
echo "=== 1. Contracts ===" && (cd contracts && npx hardhat compile && npx hardhat test)
echo "=== 2. Phase 2 services ==="
for svc in nav-service exchange-service wallet-service gold-silver-fund oracle-service; do
  (cd services/svc && npm run build) && echo "✅svc"
done
echo "=== 3. Phase 3 services ==="
(cd packages/eventbus && npm run build) && echo "✅ eventbus"
for svc in loan-service accounting-service; do
  (cd services/svc && npm run build && npm test) && echo "✅svc"
done
echo "=== 4. Dashboard ===" && (cd dashboard && npm run build) && echo "✅ dashboard"
echo "=== ALL MODULES COMPILE ✅ — navigation updated ==="
