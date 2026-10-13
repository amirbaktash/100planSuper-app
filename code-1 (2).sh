services/
├── exchange-service/
│   └── src/
│       ├── constants/pairs.ts          ✅ (قبلی)
│       ├── orderbook.ts                ✅ (قبلی — اینجا کامل‌تر)
│       ├── engine.ts                   ★ موتور تطبیق + توزیع رویداد
│       ├── candles.ts                  ★ OHLC و چارت
│       ├── ws.ts                       ★ WebSocket عمق/معاملات
│       ├── feeds/daric-feed.ts         ✅
│       ├── feeds/external.ts           ★ قیمت Top20
│       ├── p2p.ts                      ✅
│       ├── auth.ts                     ★
│       └── index.ts                    ✅ (endpoint‌ها کامل‌تر)
└── wallet-service/
    └── src/
        ├── hd-wallet.ts                ★ تولید آدرس سپرده
        ├── deposit-listener.ts         ★ شنود on-chain
        ├── withdrawals.ts              ★ صف برداشت + Timelock 48h
        ├── balances.ts                 ★ دفتر کل + تراکنش اتمیک
        └── index.ts                    ★
