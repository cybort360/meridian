import { z } from "zod"

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  companyName: z.string().min(1, "Company name is required"),
  role: z.enum(["SME", "INVESTOR"], {
    message: "Select a valid account type",
  }),
})

export type RegisterInput = z.infer<typeof registerSchema>

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  companyName: z.string().min(1, "Company name is required").max(160),
  country: z.string().min(1, "Country is required").max(80),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

export type LoginInput = z.infer<typeof loginSchema>

export const transferSchema = z.object({
  toAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Enter a valid Arc wallet address (0x…)"),
  amount: z.number().positive("Amount must be greater than 0"),
  type: z
    .enum(["ADVANCE", "REPAYMENT", "SETTLEMENT", "FEE", "CROSS_CHAIN"])
    .optional(),
})

export type TransferInput = z.infer<typeof transferSchema>
