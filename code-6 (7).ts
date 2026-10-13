// ❌ قبل:  const D = Decimal;  بعد از import ناقص + بسته شدن با };
// ✅ بعد:
import Decimal from "decimal.js";
const D = Decimal;                       // ★ اینجا، بلافاصله بعد از import

export function investmentPL(input: { /* ... */ }) {
  // ... (بدون تغییر)
}   // ← ✅ فقط `}` — نه `};`
