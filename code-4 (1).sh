#!/bin/bash
set -e
echo "── 1. Compile ──" && npx hardhat compile
echo "── 2. Unit tests ──" && npx hardhat test
echo "── 3. Slither (static) ──"
pip install slither-analyzer -q
slither . --config-file audit/slither.config.json
echo "── 4. Mythril (symbolic) ──"
myth analyze contracts/DaricVault.sol --solc json --execution-timeout 120
echo "── 5. Coverage gate: ≥ 95% ──"
npx hardhat coverage
echo "── 6. Upgradeability check ──"
npx @openzeppelin/upgrades-core validate
echo "✅ internal audit passed"
echo "⚠️  REMAINING (manual/3rd-party):"
echo "  □ Contract: Trail of Bits / ConsenSys Diligence / Zellic — بودجه $30-80K، 3-5 هفته"
echo "  □ Practice: bug bounty فعال (بخش ۲) حداقل ۲ هفته قبل از mainnet"
echo "  □ Testnet: ۴ هفته اجرا در Sepolia با cap کامل"
