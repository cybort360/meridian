import { z } from "zod"

// Invoice form schemas live here (separate from auth/wallet validation.ts).
export const createInvoiceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  buyerName: z.string().min(1, "Buyer name is required"),
  buyerEmail: z.string().email("Enter a valid buyer email address"),
  amountUSDC: z.number().positive("Amount must be greater than 0"),
  dueDate: z
    .string()
    .min(1, "Due date is required")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid due date"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
})

export type CreateInvoiceFormInput = z.infer<typeof createInvoiceSchema>

export const scoreInvoiceSchema = z.object({
  invoiceId: z.string().min(1, "invoiceId is required"),
})
