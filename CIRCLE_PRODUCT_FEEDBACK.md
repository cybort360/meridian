# Circle Product Feedback — Meridian

Feedback gathered while building **Meridian**, an AI-native trade-finance app that
gives UAE SMEs instant USDC-backed working capital on **Arc**. We used **USDC**,
**Developer-Controlled Wallets**, **Gateway / Programmable Transfers**, and
**CCTP (via Bridge Kit)**.

---

## 1. Why we chose these products

- **USDC** — Trade finance is denominated in dollars. USDC let us settle invoices
  in a stable unit of account with on-chain finality, which is exactly what an SME
  and an investor both need: no FX surprises between funding and repayment. Storing
  every amount in 6-decimal base units kept our accounting exact end to end.
- **Developer-Controlled Wallets** — As a solo build we could not ask SMEs to manage
  seed phrases or sign every transfer. Developer-controlled wallets let Meridian
  provision a wallet for each user at registration and orchestrate the funding →
  escrow → settlement waterfall server-side, with no client-side key handling.
- **Gateway / Programmable Transfers** — The whole product is a sequence of
  conditional USDC movements (investor → escrow → SME, then buyer → escrow →
  investor + platform fee). Being able to express those transfers as plain API
  calls — with no Solidity — is what made a 45-day build realistic.
- **CCTP (Bridge Kit)** — UAE SMEs trade across borders, so the demo needed a
  credible cross-chain story: burn USDC on Arc, mint on Ethereum Sepolia, without a
  wrapped asset or a custodial bridge.

## 2. What worked well

- **Arc testnet speed.** Transactions confirmed in seconds, and USDC being the
  native gas token removed an entire class of setup pain — we never had to fund a
  separate gas asset before a transfer. Faucet → balance → transfer was a tight loop.
- **SDK ergonomics for wallets.** `@circle-fin/developer-controlled-wallets` gave us
  `createWallets`, `getWalletTokenBalance`, `createTransaction`, and
  `listTransactions` with clean typed responses. Creating a wallet on Arc and seeing
  a real address on the explorer "just worked" once auth was set up.
- **Bridge Kit abstraction.** Once configured, `kit.bridge({ from, to, amount })`
  with `useForwarder: true` handled the burn/attestation/mint sequence and returned
  per-step results we could surface in the UI. A real Arc→Sepolia transfer completed
  end to end in ~19s in sandbox.
- **Explorer + webhook model.** Pairing on-chain tx hashes with `transfer.complete`
  webhooks let us reconcile DB state against the chain rather than polling.

## 3. What could improve (friction we actually hit)

- **Entity-secret registration is the steepest cliff in onboarding.** We burned
  meaningful time cycling through `156016` (parameter invalid), `156013` (entity
  secret invalid/format), and `156015` (already set). The key insight — that the
  entity secret is registered **once per entity**, not per API key — was not obvious
  from the error text, and several errors were indistinguishable from "wrong value."
- **`registerEntitySecretCiphertext` recovery path.** The
  `recoveryFileDownloadPath` expects a **directory**, but passing a file path
  returns an opaque "Invalid Directory" error. A one-line doc note would save hours.
- **`createTransaction` field shape.** The amount field is `amount: string[]`
  (not `amounts`), and it took trial and error to confirm. Likewise `listTransactions`
  takes `walletIds: string[]`. The types are correct but the singular/plural and
  array-vs-scalar conventions are easy to get wrong from memory.
- **Bridge Kit peer dependencies.** `@circle-fin/bridge-kit` +
  `@circle-fin/adapter-circle-wallets` would not install cleanly alongside our
  Next.js 14 tree; we needed `--legacy-peer-deps`. On a fresh machine this is a
  silent blocker.
- **CCTP availability varies by sandbox/route.** We had to build a clearly-labelled
  mock fallback so the demo never dead-ends when a route isn't enabled — useful for
  us, but it means behavior isn't fully predictable across sandboxes.

## 4. Recommendations (one concrete suggestion per product)

- **USDC:** Publish a tiny, language-specific "base units" helper (or document the
  6-decimal contract address per testnet prominently) so teams don't hand-roll
  conversion and risk off-by-10⁶ bugs in financial flows.
- **Developer-Controlled Wallets:** Ship a guided `circle entity-secret register`
  CLI that detects the three common failure states and tells you which one you're in
  — and accepts/creates the recovery **directory** for you. This single step is the
  biggest first-run drop-off.
- **Gateway / Programmable Transfers:** Provide a typed "transfer intent" example
  showing `amount: string[]` and an idempotency key, so the array shape and
  safe-retry pattern are copy-pasteable from the first call.
- **CCTP / Bridge Kit:** Document the exact supported source/destination testnet
  pairs per environment, and relax the peer-dependency ranges (or publish a
  Next.js 14 example) so installation doesn't require `--legacy-peer-deps`.
