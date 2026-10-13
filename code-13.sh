#!/bin/bash
set -e
echo "=== 1. قراردادها ==="
cd contracts && npx hardhat compile && npx hardhat test && cd ..

echo "=== 2. سرویس‌ها ==="
for svc in nav-service exchange-service gold-silver-fund oracle-service; do
  (cd services/svc && npm run build) && echo "✅svc"
done

echo "=== 3. Dashboard ==="
(cd dashboard && npm run build && npx next lint) && echo "✅ dashboard"

echo "=== ALL MODULES COMPILE ✅ ==="
