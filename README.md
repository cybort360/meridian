# Meridian

**The AI-native trade finance network giving UAE SMEs instant USDC-backed capital.**

Built for the Stablecoin Commerce Stack Challenge — **Track 2: SME Trade Finance &
Working Capital** (Ignyte / Circle / Arc).

---

## What it is

A small business in the UAE has an unpaid $10,000 invoice due in 60 days but needs
cash now. With Meridian they upload the invoice, an AI engine scores its risk in
seconds, an investor funds it in USDC, and the SME receives capital instantly. When
the buyer eventually pays, repayment is automatically routed back to the investor
plus yield — all in USDC, all on **Arc**, all verifiable on-chain. Every settled
invoice builds the SME's **on-chain credit passport**.

### Core flow

```
Create invoice → AI risk score → list on marketplace → investor funds (USDC)
→ capital disbursed to SME → buyer repays → settlement waterfall → credit passport
```

### Features

- 🔐 Email/password auth (NextAuth) with SME / Investor roles
- 👛 A Circle developer-controlled wallet provisioned per user on Arc testnet
- 🧠 Claude-powered invoice risk scoring (score, label, advance rate, flags)
- 🏦 Investor marketplace + escrow funding and an automated settlement waterfall
- 🪪 On-chain credit passport (300–850 score, history timeline)
- 🌉 Cross-border USDC demo via CCTP (Arc → Ethereum Sepolia)
- 📊 "Command Center" dashboard with live USDC flow, stats, and corridor map
- ✉️ Buyer verification (magic-link countersignature) to harden against fraud

**Demo URL:** _add your Vercel URL after deploying (`npx vercel --prod`)._

**Architecture diagram:** [`public/architecture-diagram.png`](public/architecture-diagram.png)
(source: `public/architecture-diagram.html`).

---

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind + shadcn/ui · Prisma + PostgreSQL ·
NextAuth · Circle Developer-Controlled Wallets + Bridge Kit (CCTP) · Anthropic
Claude · Recharts · Framer Motion. Arc testnet for all on-chain activity.

---

## Run it locally

### Prerequisites

- Node 18+
- Docker (for local Postgres) or any PostgreSQL 15 instance
- A [Circle](https://console.circle.com) developer account (sandbox)
- An [Anthropic](https://console.anthropic.com) API key (optional — scoring falls
  back to a neutral MEDIUM score if absent)

### 1. Install

```bash
git clone <your-repo-url> meridian && cd meridian
npm install
```

> Note: Circle's Bridge Kit currently needs `npm install --legacy-peer-deps` on a
> fresh Next.js 14 tree.

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`. At minimum: `DATABASE_URL`, `NEXTAUTH_SECRET`
(`openssl rand -base64 32`), and your Circle keys. See **Circle setup** below.

### 3. Database

```bash
# local Postgres via Docker (user/pass/db all "meridian")
docker run --name meridian-pg -e POSTGRES_USER=meridian \
  -e POSTGRES_PASSWORD=meridian -e POSTGRES_DB=meridian \
  -p 5432:5432 -d postgres:15
# → DATABASE_URL="postgresql://meridian:meridian@localhost:5432/meridian"

npm run db:migrate     # apply schema
npm run db:seed        # demo SME (Gulf Cargo LLC) + investor + 3 invoices
```

### 4. Run

```bash
npm run dev            # http://localhost:3000
```

### Demo accounts (from the seed)

| Role     | Email                    | Password      |
| -------- | ------------------------ | ------------- |
| SME      | `sme@meridian.test`      | `password123` |
| Investor | `investor@meridian.test` | `password123` |

---

## Circle setup

1. Create a sandbox **API key** at <https://console.circle.com> → `CIRCLE_API_KEY`.
2. Generate and **register an entity secret** (once per entity), then create a
   wallet set:

   ```bash
   npm run circle:setup    # registers entity secret + creates a wallet set
   ```

   This writes `CIRCLE_ENTITY_SECRET` and `CIRCLE_WALLET_SET_ID` for you. (If the
   entity secret is already registered, use `npm run circle:bootstrap`.)
3. Create the platform fee wallet (receives protocol fees at settlement):

   ```bash
   npm run circle:platform-wallet   # sets PLATFORM_WALLET_ID / _ADDRESS
   ```

### How Circle tools are integrated

| Product                              | Where                                  | Use                                                                  |
| ------------------------------------ | -------------------------------------- | -------------------------------------------------------------------- |
| **USDC**                             | everywhere; `src/lib/utils/usdc.ts`    | Unit of account; amounts stored as 6-decimal **base units** (BigInt) |
| **Developer-Controlled Wallets**     | `src/lib/circle/`                      | A wallet per user on Arc; balances, transactions, per-invoice escrow |
| **Gateway / Programmable Transfers** | `src/lib/settlement.ts`                | Funding + the settlement waterfall (investor / SME / platform fee)   |
| **CCTP (Bridge Kit)**                | `src/lib/circle/cctp.ts`               | Burn on Arc → mint on Ethereum Sepolia (with a labelled mock fallback) |
| **Webhooks**                         | `src/app/api/webhooks/circle/route.ts` | Reconcile `transfer.complete` / `transfer.failed` against the DB     |

Every Circle call is wrapped in `try/catch`; missing/placeholder keys raise a typed
config error and the route returns a friendly 503 instead of crashing.

---

## Arc testnet setup

- All wallets use blockchain **`ARC-TESTNET`**. On Arc, **USDC is the native gas
  token**, so a single faucet top-up funds both gas and balance.
- Fund a wallet from the **faucet**: <https://faucet.circle.com> (paste the address
  shown on the in-app Wallet page).
- Inspect transactions on the **explorer**: <https://testnet.arcscan.app>.
- USDC token (6 decimals): `0x3600000000000000000000000000000000000000`.

---

## Useful scripts

```bash
npm run dev          # start dev server
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
npm run db:migrate   # prisma migrate dev
npm run db:seed      # reseed demo data (idempotent)
npm run db:studio    # prisma studio
```

---

## Deploy (Vercel)

```bash
npx vercel --prod
```

Then add every variable from `.env.local` to the Vercel project's Environment
Variables, set `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` to the deployed URL, point
`DATABASE_URL` at a hosted Postgres (e.g. Supabase), and register the deployed
`/api/webhooks/circle` endpoint in the Circle console.

---

## Development Tools

This project was built using Claude Code (Anthropic) as an AI coding assistant,
under an active Anthropic subscription. All code, architecture decisions, and
product design are original work by the submitter.
