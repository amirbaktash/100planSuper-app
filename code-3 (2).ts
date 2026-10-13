import { z } from "zod";

export const LoanApplicationSchema = z.object({
  amountUSD: z.number().positive(),
  termMonths: z.union([z.literal(6), z.literal(12), z.literal(24), z.literal(36)]),
  installments: z.number().int().positive(),
  purpose: z.string().max(500),
});

export type LoanApplication = z.infer<typeof LoanApplicationSchema>;

export const COLLATERAL_RATIO = 1.25;  // وثیقه = ۱۰۰٪ → وام = ۸۰٪ ⇒ وثیقه = وام × ۱.۲۵
export const LOAN_TO_VALUE = 0.80;
