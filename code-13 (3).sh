#!/bin/bash
set -e
npx hardhat compile
slither . --fail-high
mythril a contracts/DaricVault.sol contracts/NavOracle.sol contracts/SalesVault.sol
npx hardhat test
echo "✅ static analysis passed — third-party audit still REQUIRED before mainnet"
