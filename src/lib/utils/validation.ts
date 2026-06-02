import { z } from "zod"

export const registerSchema = z.object({
  name: z.string().min(1, "Please enter your full name"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  companyName: z.string().min(1, "Please enter your company name"),
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

export const kycSubmissionSchema = z.object({
  legalBusinessName: z.string().min(1, "Legal business name is required"),
  tradeLicenseNumber: z.string().min(1, "Trade license number is required"),
  commercialRegNumber: z
    .string()
    .min(1, "Commercial registration number is required"),
  businessAddress: z.string().min(1, "Business address is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1).default("UAE"),
  industry: z.string().min(1, "Industry is required"),
  phoneNumber: z.string().min(1, "Business phone is required"),
  websiteUrl: z
    .string()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
  tradeLicenseDocUrl: z.string().min(1, "Trade license document is required"),
  ownerIdDocUrl: z.string().min(1, "Owner ID document is required"),
  proofOfAddressUrl: z.string().optional().or(z.literal("")),
})

export type KycSubmissionInput = z.infer<typeof kycSubmissionSchema>

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
