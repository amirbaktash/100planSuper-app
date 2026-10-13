daric/
├── contracts/                    # موجود — بدون تغییر
│   ├── DaricToken_Military.sol
│   ├── DaricNAV_Oracle_Military.sol   (2-of-3 multisig + IPFS)
│   ├── DaricTimelock.sol              (48h)
│   └── DaricVault.sol
├── scripts/deploy/               # موجود — Amoy + Polygon
├── assets/daric-token-512.png    # موجود
├── services/
│   ├── nav-service/              # ★ PROMPT 5
│   ├── exchange-service/         # ★ PROMPT 6
│   ├── gold-silver-fund/         # ★ PROMPT 7
│   └── oracle-service/           # IPFS upload + امضا (مشترک)
└── dashboard/                    # Next.js — هر سه ماژول
