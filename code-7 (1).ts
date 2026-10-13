export const FIAT           = ["EUR", "USD", "GBP", "IRR"] as const;
export const DIGITAL_FIAT   = ["USDD", "EURD"] as const;      // دلار/یورو دیجیتال
export const STABLES        = ["USDT"] as const;
export const CHAIN_NATIVE   = ["POL"] as const;                // Polygon
export const TOP20          = ["BTC","ETH","USDT","BNB","SOL","XRP","USDC",
  "ADA","DOGE","AVAX","DOT","LINK","MATIC","TON","SHIB","LTC","BCH",
  "UNI","ATOM","XLM"] as const;
export const INTERNAL       = ["DARIC", "SHARE"] as const;     // P2P داخلی

export const ALL_ASSETS = [...FIAT, ...DIGITAL_FIAT, ...STABLES,
  ...CHAIN_NATIVE, ...TOP20, ...INTERNAL] as string[];

export function isAllowed(sym: string) {
  return ALL_ASSETS.includes(sym.toUpperCase());
}
// در هر endpoint: if (!isAllowed(req.body.symbol)) return res.status(400)...
