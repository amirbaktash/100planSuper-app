export const COA = {
  // دارایی‌ها (۱۰۰۰)
  "1000:TREASURY_CUSTODY":   { name: "امانت صندوق کل", type: "ASSET", normal: "DEBIT" },
  "1001:CRYPTO_CUSTODY":     { name: "امانت کریپتو",   type: "ASSET", normal: "DEBIT" },
  "1002:USDT_USER":          { name: "موجودی USDT کاربران", type: "ASSET", normal: "DEBIT" },
  "1003:GOLD_SILVER_CUSTODY":{ name: "امانت طلا و نقره", type: "ASSET", normal: "DEBIT" },
  "1004:DARIC_TREASURY":     { name: "دارایی DARIC صرافی", type: "ASSET", normal: "DEBIT" },
  "1005:BANK_EUR":           { name: "حساب بانکی یورو", type: "ASSET", normal: "DEBIT" },
  "1006:BANK_IRR":           { name: "حساب بانکی ریال", type: "ASSET", normal: "DEBIT" },
  // بدهی‌ها (۲۰۰۰)
  "2001:LOAN_PAYABLE":       { name: "وام پرداختی به کاربران", type: "LIABILITY", normal: "CREDIT" },
  "2002:USER_DEPOSITS_DUE":  { name: "بدهی برداشت کاربران", type: "LIABILITY", normal: "CREDIT" },
  "2003:P2P_ESCROW":         { name: "اسکرو P2P", type: "LIABILITY", normal: "CREDIT" },
  // سرمایه (۳۰۰۰)
  "3001:EQUITY":             { name: "سرمایه", type: "EQUITY", normal: "CREDIT" },
  "3002:RETAINED":           { name: "سود انباشته", type: "EQUITY", normal: "CREDIT" },
  // درآمد (۴۰۰۰)
  "4001:LOAN_RECEIVABLE":    { name: "اطلبات وام", type: "ASSET", normal: "DEBIT" },
  "4101:INTEREST_INCOME":    { name: "درآمد سود وام", type: "INCOME", normal: "CREDIT" },
  "4102:TRADING_FEE":        { name: "کارمزد صرافی", type: "INCOME", normal: "CREDIT" },
  "4103:GOLD_SPREAD":        { name: "حاشیه طلا/نقره", type: "INCOME", normal: "CREDIT" },
  "4104:WITHDRAW_FEE":       { name: "کارمزد برداشت", type: "INCOME", normal: "CREDIT" },
  // هزینه (۵۰۰۰)
  "5001:CHAIN_GAS":          { name: "گاز بلاکچین", type: "EXPENSE", normal: "DEBIT" },
  "5002:LOAN_LOSS":          { name: "زیان وام (فورکلوز)", type: "EXPENSE", normal: "DEBIT" },
} as const;

export type AccountCode = keyof typeof COA;
