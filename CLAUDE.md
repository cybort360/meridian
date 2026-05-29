# MERIDIAN — CLAUDE.md
## The Master Blueprint for Building and Maintaining This Project

> **Single source of truth.** Every decision about this project — architecture, naming, API patterns, error handling, UI conventions — lives here. Before writing any code, read this file completely. Before adding any new feature, check this file. If something contradicts this file, this file wins.

---

## 0. PROJECT IDENTITY

**Name:** Meridian  
**Tagline:** The AI-native trade finance network giving UAE SMEs instant USDC-backed capital.  
**Hackathon:** Stablecoin Commerce Stack Challenge — Track 2: SME Trade Finance & Working Capital  
**Sponsors:** Ignyte / Circle / Arc  
**Deadline:** 45 days from project start  
**Builder:** Solo developer  

### What Meridian Does (Plain English)
A small business in UAE has an unpaid invoice worth $10,000 due in 60 days. They need cash now. Meridian lets them upload that invoice, an AI engine scores its risk in seconds, an investor funds it in USDC, and the SME gets capital instantly. When the buyer eventually pays, the repayment is automatically routed back to the investor plus yield — all on Arc, all in USDC, all verifiable on-chain.

Every transaction builds the SME's on-chain credit passport — a verifiable financial identity they've never had access to before.

### Why This Wins
1. UAE SMEs = 53% of GDP, receive <5% of bank credit. The problem is documented and massive.
2. Maximum Circle tool coverage: USDC + Wallets + Gateway + CCTP + USYC (requested).
3. No Solidity needed — Circle's APIs handle all programmable logic.
4. The demo is visceral: live USDC flows, AI scoring in real-time, settlement confirmations on Arc testnet.
5. Frontend-first project — beautiful UI is the weapon.

---

## 1. GOLDEN RULES (Read Before Every Session)

These rules are absolute. Never break them.

1. **TypeScript everywhere.** No `.js` files. No `any` types unless explicitly justified with a comment.
2. **Every Circle API call gets a try/catch.** Never let a Circle API failure crash the UI silently.
3. **Never hardcode secrets.** All API keys, secrets, and config values live in `.env.local`. If you see a hardcoded key, stop and move it immediately.
4. **One concern per file.** API route files only handle HTTP. Service files only handle business logic. Component files only handle UI.
5. **All amounts in USDC are stored and handled in base units (6 decimals).** Display formatting is done at the UI layer only. Never mix raw and formatted amounts in the same variable.
6. **Every user-facing error shows a human-readable message.** Never expose raw API errors, stack traces, or Circle error codes to the UI.
7. **Mobile-first responsive design.** Every component works on 375px width before it works on 1440px.
8. **No dead code.** If a function, import, or component isn't used, delete it.
9. **Commit after every completed phase.** Use the commit message format: `feat(phase-N): description`.
10. **Test every Circle API call on Arc testnet before building UI on top of it.** Never assume an API works.

---

## 2. TECH STACK

### Core
| Technology | Version | Why |
|---|---|---|
| Next.js | 14.x (App Router) | Full-stack React framework, API routes, SSR |
| TypeScript | 5.x | Type safety, required throughout |
| Tailwind CSS | 3.x | Utility-first, fast UI development |
| Shadcn/ui | latest | Accessible, composable component library |

### Database
| Technology | Version | Why |
|---|---|---|
| PostgreSQL | 15.x | Reliable relational DB for financial data |
| Prisma | 5.x | Type-safe ORM, easy migrations |

> **Local dev:** Use Supabase free tier (PostgreSQL hosted). **Production:** Same.

### Authentication
| Technology | Version | Why |
|---|---|---|
| NextAuth.js | 4.x | Battle-tested auth for Next.js |
| bcryptjs | latest | Password hashing |

### Blockchain / Payments
| Technology | Version | Why |
|---|---|---|
| Circle Node SDK | `@circle-fin/developer-controlled-wallets` | Wallet creation and management |
| Circle API (REST) | v1 | Payments, Gateway, CCTP |
| Arc Testnet | — | Chain for all testnet transactions |

### AI
| Technology | Version | Why |
|---|---|---|
| Anthropic SDK | `@anthropic-ai/sdk` | Claude for invoice risk scoring |

### UI / Visualization
| Technology | Version | Why |
|---|---|---|
| Recharts | latest | Live charts on dashboard |
| Framer Motion | latest | Smooth animations |
| Lucide React | latest | Icons |
| date-fns | latest | Date formatting |

### Dev Tools
| Technology | Why |
|---|---|
| ESLint + Prettier | Code quality and formatting |
| Husky | Pre-commit hooks |
| dotenv | Env var management |

---

## 3. FOLDER STRUCTURE

```
meridian/
├── CLAUDE.md                          ← YOU ARE HERE
├── .env.local                         ← All secrets (never commit)
├── .env.example                       ← Template for env vars (commit this)
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── prisma/
│   ├── schema.prisma                  ← Database schema
│   └── migrations/                   ← Auto-generated, never edit manually
├── public/
│   ├── logo.svg
│   └── architecture-diagram.png      ← Required for submission
├── src/
│   ├── app/                           ← Next.js App Router
│   │   ├── layout.tsx                 ← Root layout, providers
│   │   ├── page.tsx                   ← Landing page
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx             ← Dashboard shell with sidebar
│   │   │   ├── dashboard/page.tsx     ← Main Bloomberg-style overview
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx           ← Invoice list + create
│   │   │   │   └── [id]/page.tsx      ← Single invoice detail
│   │   │   ├── marketplace/page.tsx   ← Investor view — browse invoices
│   │   │   ├── wallet/page.tsx        ← Wallet balances, transactions
│   │   │   ├── passport/page.tsx      ← Credit passport / on-chain history
│   │   │   └── settings/page.tsx      ← API keys, profile
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── wallets/
│   │       │   ├── create/route.ts
│   │       │   ├── balance/route.ts
│   │       │   └── transactions/route.ts
│   │       ├── invoices/
│   │       │   ├── route.ts           ← GET list, POST create
│   │       │   └── [id]/
│   │       │       ├── route.ts       ← GET, PATCH, DELETE
│   │       │       ├── fund/route.ts  ← POST — investor funds invoice
│   │       │       └── settle/route.ts ← POST — trigger repayment
│   │       ├── ai/
│   │       │   └── score/route.ts     ← POST — AI risk scoring
│   │       ├── payments/
│   │       │   ├── transfer/route.ts  ← POST — Circle transfer
│   │       │   └── cctp/route.ts      ← POST — cross-chain transfer
│   │       └── webhooks/
│   │           └── circle/route.ts   ← Circle webhook handler
│   ├── components/
│   │   ├── ui/                        ← Shadcn components (auto-generated)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── MobileNav.tsx
│   │   ├── dashboard/
│   │   │   ├── StatsGrid.tsx          ← Key metrics cards
│   │   │   ├── LiveFlowChart.tsx      ← Animated USDC flow chart
│   │   │   ├── RecentActivity.tsx     ← Transaction feed
│   │   │   └── CorridorMap.tsx        ← Cross-border payment corridors
│   │   ├── invoices/
│   │   │   ├── InvoiceCard.tsx
│   │   │   ├── InvoiceForm.tsx
│   │   │   ├── InvoiceStatusBadge.tsx
│   │   │   └── RiskScoreBadge.tsx
│   │   ├── marketplace/
│   │   │   ├── InvoiceListing.tsx
│   │   │   └── FundModal.tsx
│   │   ├── wallet/
│   │   │   ├── BalanceCard.tsx
│   │   │   └── TransactionRow.tsx
│   │   ├── passport/
│   │   │   ├── CreditScore.tsx
│   │   │   └── HistoryTimeline.tsx
│   │   └── shared/
│   │       ├── USDCAmount.tsx         ← Formats USDC amounts consistently
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorMessage.tsx
│   │       └── EmptyState.tsx
│   ├── lib/
│   │   ├── prisma.ts                  ← Prisma client singleton
│   │   ├── auth.ts                    ← NextAuth config
│   │   ├── circle/
│   │   │   ├── client.ts              ← Circle SDK initialization
│   │   │   ├── wallets.ts             ← Wallet service functions
│   │   │   ├── payments.ts            ← Payment/transfer functions
│   │   │   ├── gateway.ts             ← Circle Gateway functions
│   │   │   └── cctp.ts                ← Cross-chain transfer functions
│   │   ├── ai/
│   │   │   ├── client.ts              ← Anthropic SDK initialization
│   │   │   └── riskScoring.ts         ← Invoice risk scoring logic
│   │   ├── utils/
│   │   │   ├── usdc.ts                ← USDC unit conversion utilities
│   │   │   ├── formatting.ts          ← Date, currency, string formatters
│   │   │   └── validation.ts          ← Zod schemas for all forms
│   │   └── constants.ts               ← App-wide constants
│   ├── hooks/
│   │   ├── useWallet.ts
│   │   ├── useInvoices.ts
│   │   └── useRiskScore.ts
│   └── types/
│       ├── index.ts                   ← Re-exports all types
│       ├── invoice.ts
│       ├── wallet.ts
│       ├── user.ts
│       └── circle.ts                  ← Circle API response types
```

---

## 4. ENVIRONMENT VARIABLES

Create `.env.local` with ALL of the following. Never commit this file.

```bash
# ─── DATABASE ───────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@host:5432/meridian"

# ─── NEXTAUTH ───────────────────────────────────────────────
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"

# ─── CIRCLE ─────────────────────────────────────────────────
# Get from: https://console.circle.com
CIRCLE_API_KEY="your-circle-api-key"
CIRCLE_ENTITY_SECRET="your-entity-secret"           # For developer-controlled wallets
CIRCLE_WALLET_SET_ID="your-wallet-set-id"           # Created once during setup
CIRCLE_ENVIRONMENT="sandbox"                         # "sandbox" | "production"

# ─── ARC TESTNET ────────────────────────────────────────────
ARC_RPC_URL="https://rpc.arc.network/testnet"       # Check Arc docs for current URL
ARC_CHAIN_ID="your-arc-testnet-chain-id"

# ─── ANTHROPIC ──────────────────────────────────────────────
ANTHROPIC_API_KEY="your-anthropic-api-key"

# ─── APP CONFIG ─────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Meridian"
NEXT_PUBLIC_CIRCLE_ENVIRONMENT="sandbox"

# ─── CIRCLE WEBHOOK ─────────────────────────────────────────
CIRCLE_WEBHOOK_SECRET="your-webhook-secret"          # Set in Circle console
```

Create `.env.example` with the same keys but empty values — this IS committed to git.

---

## 5. DATABASE SCHEMA (`prisma/schema.prisma`)

Build this schema exactly as written. Run `npx prisma migrate dev` after any change.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  passwordHash  String
  role          UserRole  @default(SME)
  companyName   String?
  country       String    @default("UAE")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  wallet        Wallet?
  invoices      Invoice[] @relation("SMEInvoices")
  funded        Invoice[] @relation("InvestorInvoices")
  sessions      Session[]
}

enum UserRole {
  SME
  INVESTOR
  ADMIN
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Wallet {
  id              String          @id @default(cuid())
  userId          String          @unique
  circleWalletId  String          @unique   // Circle's wallet ID
  address         String          @unique   // Blockchain address on Arc
  blockchain      String          @default("ARC")
  createdAt       DateTime        @default(now())

  user            User            @relation(fields: [userId], references: [id])
  sentPayments    Payment[]       @relation("SenderWallet")
  receivedPayments Payment[]      @relation("ReceiverWallet")
}

model Invoice {
  id              String          @id @default(cuid())
  smeId           String
  investorId      String?
  
  // Invoice details
  title           String
  description     String?
  buyerName       String
  buyerEmail      String
  amountUSDC      BigInt          // In USDC base units (6 decimals). Example: $100 = 100_000_000
  dueDate         DateTime
  invoiceNumber   String
  
  // AI Risk Assessment
  riskScore       Int?            // 0-100, higher = riskier
  riskLabel       RiskLabel?      // LOW | MEDIUM | HIGH
  riskSummary     String?         // AI-generated explanation
  advanceRate     Int?            // % of invoice amount to advance (e.g., 80 = 80%)
  
  // Escrow / Funding
  status          InvoiceStatus   @default(PENDING)
  escrowWalletId  String?         // Circle wallet holding escrowed funds
  fundedAt        DateTime?
  settledAt       DateTime?
  
  // Fees
  feeRate         Int             @default(200)  // Basis points. 200 = 2%
  feeAmountUSDC   BigInt?
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  sme             User            @relation("SMEInvoices", fields: [smeId], references: [id])
  investor        User?           @relation("InvestorInvoices", fields: [investorId], references: [id])
  payments        Payment[]
}

enum InvoiceStatus {
  PENDING         // Just created, awaiting AI scoring
  SCORED          // AI scored, listed in marketplace
  FUNDED          // Investor committed capital
  ACTIVE          // Capital disbursed to SME
  REPAID          // Buyer paid back
  SETTLED         // Funds distributed to investor
  DEFAULTED       // Past due, not repaid
  CANCELLED       // Cancelled by SME
}

enum RiskLabel {
  LOW
  MEDIUM
  HIGH
}

model Payment {
  id                  String        @id @default(cuid())
  circlePaymentId     String?       @unique  // Circle's transfer ID
  
  senderWalletId      String
  receiverWalletId    String
  invoiceId           String?
  
  amountUSDC          BigInt
  type                PaymentType
  status              PaymentStatus @default(PENDING)
  
  txHash              String?       // On-chain transaction hash
  blockchain          String        @default("ARC")
  
  metadata            Json?         // Arbitrary metadata
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  senderWallet        Wallet        @relation("SenderWallet", fields: [senderWalletId], references: [id])
  receiverWallet      Wallet        @relation("ReceiverWallet", fields: [receiverWalletId], references: [id])
  invoice             Invoice?      @relation(fields: [invoiceId], references: [id])
}

enum PaymentType {
  ADVANCE             // Capital to SME when invoice funded
  REPAYMENT           // Buyer repays
  SETTLEMENT          // Investor receives principal + yield
  FEE                 // Platform fee
  CROSS_CHAIN         // CCTP cross-chain transfer
}

enum PaymentStatus {
  PENDING
  CONFIRMED
  FAILED
}

model CreditEvent {
  id          String    @id @default(cuid())
  userId      String
  type        String    // "INVOICE_FUNDED" | "INVOICE_REPAID" | "INVOICE_DEFAULTED" etc.
  invoiceId   String?
  scoreChange Int       // Positive or negative delta
  newScore    Int       // Score after this event
  createdAt   DateTime  @default(now())
}
```

---

## 6. CIRCLE API INTEGRATION GUIDE

### 6.1 Initialization (`src/lib/circle/client.ts`)

```typescript
import { initiateUserControlledWalletsClient } from '@circle-fin/user-controlled-wallets'
// OR for developer-controlled:
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets'

// USE DEVELOPER-CONTROLLED WALLETS for Meridian
// This means Circle manages keys on behalf of users — simplest for a hackathon
export const circleClient = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
})
```

### 6.2 Wallet Service (`src/lib/circle/wallets.ts`)

Functions to implement:
- `createWallet(userId: string): Promise<CircleWallet>` — creates a new wallet on Arc testnet
- `getWalletBalance(circleWalletId: string): Promise<WalletBalance>` — returns USDC balance
- `getWalletTransactions(circleWalletId: string): Promise<Transaction[]>` — returns history
- `createEscrowWallet(invoiceId: string): Promise<CircleWallet>` — creates dedicated escrow wallet per invoice

### 6.3 Payment Service (`src/lib/circle/payments.ts`)

Functions to implement:
- `transferUSDC(params: TransferParams): Promise<Payment>` — moves USDC between wallets
- `triggerSettlementWaterfall(invoiceId: string): Promise<void>` — repays investor + fee to platform

### 6.4 Circle Webhook Handler (`src/app/api/webhooks/circle/route.ts`)

Circle sends webhook events when transfers complete. This route MUST:
1. Verify the webhook signature using `CIRCLE_WEBHOOK_SECRET`
2. Handle `transfer.complete` event → update Payment status in DB
3. Handle `transfer.failed` event → mark payment as failed, notify user
4. Always return `200 OK` immediately (process async)

### 6.5 Blockchain / Arc Setup
- All wallets use blockchain: `"ARC"` in Circle API calls
- Testnet USDC faucet: Check Arc docs at https://docs.arc.network for testnet faucet
- Use Arc testnet for ALL development. Never use mainnet.

---

## 7. AI RISK SCORING (`src/lib/ai/riskScoring.ts`)

The AI engine scores invoices 0–100 (higher = riskier) and recommends an advance rate.

### Input to Claude
```typescript
interface RiskScoringInput {
  invoiceAmount: number        // In USD
  dueDate: Date
  buyerName: string
  buyerEmail: string
  smeCompanyName: string
  smeTransactionHistory: {
    totalInvoices: number
    settledOnTime: number
    defaulted: number
    avgDaysToSettle: number
  }
  description: string
}
```

### Prompt Template (in `riskScoring.ts`)
```
You are a trade finance risk analyst. Assess this invoice for financing risk.

Invoice Details:
- Amount: $${amount} USD
- Buyer: ${buyerName}
- Due in: ${daysUntilDue} days
- SME track record: ${settled} of ${total} invoices settled on time, ${defaulted} defaults

Return a JSON object with exactly these fields:
{
  "riskScore": <integer 0-100, higher is riskier>,
  "riskLabel": <"LOW" | "MEDIUM" | "HIGH">,
  "advanceRate": <integer 50-90, percentage to advance>,
  "summary": <2-3 sentence plain English explanation>,
  "flags": <array of strings, risk factors identified>
}

Respond with ONLY the JSON object. No other text.
```

### Output
Parse the JSON response. If parsing fails, return a default score of 50 (MEDIUM) and log the error. Never crash on AI failure.

---

## 8. TYPE DEFINITIONS (`src/types/`)

### `invoice.ts`
```typescript
export type InvoiceStatus = 'PENDING' | 'SCORED' | 'FUNDED' | 'ACTIVE' | 'REPAID' | 'SETTLED' | 'DEFAULTED' | 'CANCELLED'
export type RiskLabel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface Invoice {
  id: string
  title: string
  description?: string
  buyerName: string
  buyerEmail: string
  amountUSDC: bigint        // Always bigint — never number for amounts
  dueDate: string           // ISO string
  invoiceNumber: string
  status: InvoiceStatus
  riskScore?: number
  riskLabel?: RiskLabel
  riskSummary?: string
  advanceRate?: number
  fundedAt?: string
  settledAt?: string
  sme: { id: string; name: string; companyName?: string }
  investor?: { id: string; name: string }
  createdAt: string
}

export interface CreateInvoiceInput {
  title: string
  description?: string
  buyerName: string
  buyerEmail: string
  amountUSDC: number        // Input as number (human-readable), converted to bigint before save
  dueDate: string
  invoiceNumber: string
}
```

### `wallet.ts`
```typescript
export interface WalletBalance {
  circleWalletId: string
  address: string
  usdcBalance: string       // Formatted for display: "1,234.56"
  usdcBalanceRaw: bigint    // In base units for calculations
  blockchain: string
}
```

---

## 9. USDC AMOUNT HANDLING (`src/lib/utils/usdc.ts`)

**This is critical. Get it wrong and users lose money in demos.**

```typescript
// USDC has 6 decimal places
// $1.00 = 1_000_000 base units
// $100.00 = 100_000_000 base units

export const USDC_DECIMALS = 6
export const USDC_MULTIPLIER = BigInt(10 ** USDC_DECIMALS)  // 1_000_000n

// Human-readable dollars → bigint base units
// Input: 100.50 → Output: 100_500_000n
export function toUSDCBaseUnits(dollars: number): bigint {
  return BigInt(Math.round(dollars * Number(USDC_MULTIPLIER)))
}

// bigint base units → formatted display string
// Input: 100_500_000n → Output: "100.50"
export function fromUSDCBaseUnits(baseUnits: bigint): string {
  const dollars = Number(baseUnits) / Number(USDC_MULTIPLIER)
  return dollars.toFixed(2)
}

// Format with commas for display
// Input: 1234567.89 → Output: "1,234,567.89"
export function formatUSDC(dollars: number | string): string {
  const num = typeof dollars === 'string' ? parseFloat(dollars) : dollars
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}
```

---

## 10. API ROUTE PATTERNS

Every API route follows this exact pattern. No exceptions.

```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Define input schema at top of file
const InputSchema = z.object({
  field: z.string().min(1),
  amount: z.number().positive(),
})

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check — always first
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate body
    const body = await req.json()
    const parsed = InputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // 3. Business logic
    const result = await doSomething(parsed.data, session.user.id)

    // 4. Return success
    return NextResponse.json({ data: result }, { status: 200 })

  } catch (error) {
    // 5. Catch-all — log internally, return generic message
    console.error('[API /example POST]', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
```

---

## 11. UI CONVENTIONS

### Colors (use these Tailwind classes consistently)
- **USDC Green:** `text-emerald-400`, `bg-emerald-400/10`, `border-emerald-400/20`
- **Risk LOW:** `text-emerald-400`
- **Risk MEDIUM:** `text-amber-400`
- **Risk HIGH:** `text-red-400`
- **Background:** `bg-slate-950` (page), `bg-slate-900` (cards), `bg-slate-800` (inputs)
- **Border:** `border-slate-700` (normal), `border-slate-600` (hover)
- **Text:** `text-slate-100` (primary), `text-slate-400` (secondary), `text-slate-600` (muted)

### The `USDCAmount` Component
Always use this component to display any USDC amount. Never format amounts inline.

```tsx
// src/components/shared/USDCAmount.tsx
interface Props {
  baseUnits: bigint
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showSymbol?: boolean
}

export function USDCAmount({ baseUnits, size = 'md', showSymbol = true }: Props) {
  const formatted = formatUSDC(fromUSDCBaseUnits(baseUnits))
  const sizeClass = { sm: 'text-sm', md: 'text-base', lg: 'text-xl', xl: 'text-3xl' }[size]
  return (
    <span className={`font-mono font-semibold text-emerald-400 ${sizeClass}`}>
      {showSymbol && <span className="text-slate-500 mr-1 text-sm">USDC</span>}
      {formatted}
    </span>
  )
}
```

### Status Badges
```tsx
// src/components/invoices/InvoiceStatusBadge.tsx
const STATUS_STYLES: Record<InvoiceStatus, string> = {
  PENDING:   'bg-slate-700 text-slate-300',
  SCORED:    'bg-blue-900/50 text-blue-300',
  FUNDED:    'bg-purple-900/50 text-purple-300',
  ACTIVE:    'bg-emerald-900/50 text-emerald-300',
  REPAID:    'bg-cyan-900/50 text-cyan-300',
  SETTLED:   'bg-emerald-900/50 text-emerald-400',
  DEFAULTED: 'bg-red-900/50 text-red-400',
  CANCELLED: 'bg-slate-800 text-slate-500',
}
```

---

## 12. 45-DAY BUILD PLAN

> Treat each phase as a sprint. Complete and test fully before moving on.

---

### PHASE 1 — FOUNDATION (Days 1–7)
**Goal:** Running app, auth working, database connected, Circle account set up.

#### Tasks:
- [ ] `npx create-next-app@latest meridian --typescript --tailwind --app --src-dir`
- [ ] Install all dependencies (see package list below)
- [ ] Set up Shadcn/ui: `npx shadcn-ui@latest init`
- [ ] Set up Prisma: `npx prisma init` → paste schema from Section 5 → `npx prisma migrate dev`
- [ ] Set up NextAuth with credentials provider
- [ ] Build Register page (`/register`) — collect name, email, password, company, role (SME/Investor)
- [ ] Build Login page (`/login`)
- [ ] Build protected route middleware (`src/middleware.ts`)
- [ ] Create Circle developer account at https://console.circle.com
- [ ] Generate Circle API key and Entity Secret — add to `.env.local`
- [ ] Test Circle API connection with a simple ping (create a test wallet, log the response)
- [ ] Build app shell: Sidebar, TopBar, dashboard layout
- [ ] Landing page (`/`) — project pitch, "Get Started" CTA

#### Phase 1 Done When:
- User can register as SME or Investor
- User can log in and see the dashboard shell
- Circle API call succeeds in a test script
- Database has User table with seeded test users

---

### PHASE 2 — CIRCLE WALLET INTEGRATION (Days 8–18)
**Goal:** Every registered user has a Circle wallet. Balances visible. Test transfers working.

#### Tasks:
- [ ] On user registration success, call `createWallet()` and save `circleWalletId` and `address` to DB
- [ ] Build `GET /api/wallets/balance` — returns USDC balance from Circle API
- [ ] Build `GET /api/wallets/transactions` — returns transaction history
- [ ] Build Wallet page (`/wallet`) with `BalanceCard` and `TransactionRow` components
- [ ] Add USDC testnet faucet link/instructions to wallet page (for hackathon demo)
- [ ] Build `POST /api/payments/transfer` — transfers USDC between two Circle wallets
- [ ] Set up Circle webhook endpoint (`POST /api/webhooks/circle`) and register in Circle console
- [ ] Test: create two users, fund wallet A from faucet, transfer to wallet B, verify both balances update

#### Phase 2 Done When:
- Every new user gets a wallet automatically
- Wallet page shows real USDC balance from Circle sandbox
- A testnet transfer between two accounts completes and DB updates

---

### PHASE 3 — INVOICE SYSTEM + AI SCORING (Days 19–26)
**Goal:** SMEs can create invoices. AI scores them automatically. Scored invoices appear in marketplace.

#### Tasks:
- [ ] Build `POST /api/invoices` — creates invoice, immediately triggers AI scoring async
- [ ] Build `GET /api/invoices` — returns invoices for current user
- [ ] Build `GET /api/invoices/[id]` — returns single invoice with full details
- [ ] Build `POST /api/ai/score` — calls Claude API with invoice data, returns risk assessment
- [ ] Update invoice record with AI score after scoring completes
- [ ] Build Invoice List page (`/invoices`) with filtering by status
- [ ] Build Invoice Create form (`InvoiceForm.tsx`) with Zod validation
- [ ] Build Invoice Detail page (`/invoices/[id]`) showing AI score, risk flags, advance rate
- [ ] Build `RiskScoreBadge` component (color-coded: green/amber/red)
- [ ] Build Marketplace page (`/marketplace`) — shows all SCORED invoices to investors

#### Phase 3 Done When:
- SME creates an invoice → AI score appears within 5 seconds
- Invoice shows in marketplace with risk label and advance rate
- Investor can browse all scored invoices

---

### PHASE 4 — ESCROW + SETTLEMENT (Days 27–35)
**Goal:** Investor funds an invoice. SME receives capital. Settlement waterfall works.

#### Tasks:
- [ ] Build `POST /api/invoices/[id]/fund` — investor funds invoice:
  1. Create dedicated escrow wallet for this invoice
  2. Transfer `advanceRate% × invoiceAmount` from investor wallet to escrow wallet
  3. Transfer same amount from escrow wallet to SME wallet
  4. Update invoice status to `ACTIVE`
  5. Record both Payment records in DB
- [ ] Build `FundModal` component on marketplace page
- [ ] Build `POST /api/invoices/[id]/settle` — simulate repayment:
  1. Transfer full invoice amount from SME wallet to escrow wallet (simulates buyer paying)
  2. Calculate: investor principal + fee back to investor
  3. Transfer from escrow to investor wallet
  4. Update invoice status to `SETTLED`
  5. Create `CreditEvent` record for SME
- [ ] Build "Mark as Repaid" button on invoice detail page (for demo purposes)
- [ ] Verify complete flow end-to-end with testnet USDC

#### Phase 4 Done When:
- Full lifecycle works: Create → Score → Fund → Active → Repaid → Settled
- All wallet balances reflect correctly after each step
- Credit events recorded in DB

---

### PHASE 5 — CREDIT PASSPORT + CCTP (Days 36–39)
**Goal:** SME credit passport page live. Cross-border (CCTP) demo working.

#### Tasks:
- [ ] Build Credit Passport page (`/passport`):
  - Credit score (calculated from CreditEvents)
  - Invoice history timeline
  - On-time payment rate
  - Total volume financed
- [ ] Build `CreditScore` component — circular progress indicator
- [ ] Build `HistoryTimeline` component
- [ ] Build `POST /api/payments/cctp` — initiates a CCTP cross-chain USDC transfer (demo)
  - Use Circle CCTP API docs: https://developers.circle.com/cctp
  - Demo route: Arc testnet → another supported testnet chain
- [ ] Add "Cross-Border Demo" section to wallet page showing CCTP transfer

#### Phase 5 Done When:
- Passport page shows calculated credit score and history
- CCTP transfer initiates successfully in sandbox (even if it just returns a transaction ID)

---

### PHASE 6 — DASHBOARD + POLISH (Days 40–43)
**Goal:** The showstopper demo dashboard. Everything polished and animated.

#### Tasks:
- [ ] Build main Dashboard page (`/dashboard`):
  - `StatsGrid`: Total volume financed, active invoices, average risk score, on-time rate
  - `LiveFlowChart`: Recharts line chart showing USDC flow over time (from Payment history)
  - `RecentActivity`: Last 10 transactions feed with real-time feel
  - `CorridorMap`: Static SVG world map highlighting UAE → Global corridors (visual only)
- [ ] Add Framer Motion animations to: cards on load, status badge transitions, balance updates
- [ ] Make all pages fully responsive (test at 375px)
- [ ] Add loading skeletons to every data-fetching component
- [ ] Add empty states to every list component
- [ ] Error boundary on dashboard to prevent full-page crashes
- [ ] Create architecture diagram (draw.io or Figma → export as PNG → save to `public/`)

#### Phase 6 Done When:
- Dashboard looks like a professional financial product
- All animations are smooth (no jank)
- App works on mobile

---

### PHASE 7 — SUBMISSION (Days 44–45)
**Goal:** Submitted. Done.

#### Tasks:
- [ ] Record 3–5 minute demo video:
  1. Show the problem (30 sec)
  2. Register as SME + Investor (30 sec)
  3. Create invoice → watch AI score it (45 sec)
  4. Investor funds from marketplace (45 sec)
  5. Settlement waterfall executes (45 sec)
  6. Show dashboard + credit passport (30 sec)
  7. Show CCTP cross-border transfer (30 sec)
  8. Close with architecture diagram (30 sec)
- [ ] Clean up GitHub repo:
  - Detailed `README.md` with setup instructions
  - `.env.example` committed
  - `CIRCLE_PRODUCT_FEEDBACK.md` — required section (see below)
  - Architecture diagram in `/public`
- [ ] Deploy to Vercel (free tier): `npx vercel --prod`
- [ ] Fill submission form with all required fields
- [ ] Submit before deadline

#### Circle Product Feedback File (`CIRCLE_PRODUCT_FEEDBACK.md`):
Cover all four required points:
1. Why you chose these products for your use case
2. What worked well during development
3. What could be improved
4. Recommendations to make DX more seamless/scalable

---

## 13. PACKAGE INSTALLATION COMMANDS

Run these after `create-next-app`:

```bash
# Core
npm install @prisma/client prisma next-auth bcryptjs zod

# Circle
npm install @circle-fin/developer-controlled-wallets

# AI
npm install @anthropic-ai/sdk

# UI
npm install framer-motion recharts lucide-react date-fns
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-toast

# Shadcn (interactive — follow prompts)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card badge input label select dialog toast skeleton

# Types
npm install -D @types/bcryptjs

# Prisma setup
npx prisma init
# (paste schema, then:)
npx prisma migrate dev --name init
npx prisma generate
```

---

## 14. COMMON ERRORS AND FIXES

| Error | Cause | Fix |
|---|---|---|
| `PrismaClientKnownRequestError: P2002` | Duplicate unique field | Check if wallet/user already exists before creating |
| `Circle API 401` | Wrong API key or entity secret | Verify `.env.local` values match Circle console |
| `BigInt serialization error` | JSON.stringify can't handle BigInt | Use `JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v)` |
| `NEXT_AUTH session undefined` | Missing NEXTAUTH_SECRET | Add to `.env.local` |
| `Hydration mismatch` | Server/client rendering different content | Wrap dynamic content in `useEffect` or `<ClientOnly>` |
| `Circle webhook 400` | Signature mismatch | Verify CIRCLE_WEBHOOK_SECRET matches console setting |

---

## 15. TESTING CHECKLIST (Run After Each Phase)

### Auth
- [ ] Register with email that already exists → shows error
- [ ] Login with wrong password → shows error
- [ ] Access `/dashboard` without login → redirects to `/login`

### Wallets
- [ ] New user registration creates a Circle wallet
- [ ] Wallet balance displays correctly
- [ ] Faucet-funded USDC appears in balance

### Invoices
- [ ] Create invoice with missing fields → shows validation error
- [ ] Create invoice → AI score appears within 10 seconds
- [ ] Invoice appears in marketplace after scoring

### Payments
- [ ] Fund invoice → investor balance decreases, SME balance increases
- [ ] Settle invoice → funds return to investor correctly
- [ ] Payment records appear in transaction history

### UI
- [ ] All pages load on mobile (375px)
- [ ] All loading states show skeletons
- [ ] All empty states show helpful message
- [ ] No console errors in browser

---

## 16. ARCHITECTURE DIAGRAM SPEC

Create this diagram for the submission (use draw.io, Figma, or Excalidraw):

```
[SME Browser] ──POST /invoices──► [Next.js API]
                                       │
                              ┌────────┴────────┐
                              │                 │
                        [Prisma/DB]      [Claude AI API]
                              │            (risk score)
                              │
                    ┌─────────┴──────────┐
                    │                    │
             [Circle Wallets]    [Circle Gateway]
                    │                    │
                    └──────────┬─────────┘
                               │
                        [Arc Testnet]
                        (USDC on-chain)
                               │
                        [CCTP Bridge]
                        (cross-chain)
```

Show data flows with arrows. Label each connection with what's being sent (USDC transfer, API call, webhook, etc.).

---

## 17. SUBMISSION CHECKLIST

Use this before hitting submit.

- [ ] App is deployed and accessible at a public URL
- [ ] GitHub repo is public
- [ ] `README.md` explains: what it is, how to set it up, how Circle tools are used
- [ ] `.env.example` is in repo
- [ ] Architecture diagram is in repo (`public/architecture-diagram.png`)
- [ ] `CIRCLE_PRODUCT_FEEDBACK.md` is in repo
- [ ] Demo video is 3–5 minutes, covers full user journey
- [ ] Video link is shareable (YouTube unlisted or Loom)
- [ ] Circle Developer Account email is ready for submission form
- [ ] All Circle products used are checked in the submission form: USDC, Wallets, Gateway, CCTP/Bridge Kit, USYC (if access granted)
- [ ] Track selected: Track 2 — SME Trade Finance

---

*Last updated: Day 0 of build. Update the date when making significant changes to this document.*
