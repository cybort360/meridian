# Circle Product Feedback

> Meridian — Stablecoin Commerce Stack Challenge, Track 2  
> Submitted by: Adedeji Olamide

This document covers honest, specific feedback on every Circle product used during the development of Meridian — what drove the decision to use each product, what worked well, what friction we encountered, and concrete recommendations for the developer experience.

---

## Products Used

- USDC
- Circle Wallets (Developer-Controlled)
- Circle Gateway
- CCTP + Bridge Kit
- Nanopayments

---

## 1. USDC

### Why we chose it

USDC is the only stablecoin with the regulatory trust and liquidity depth that makes sense for a trade finance product targeting UAE SMEs. The audience — freight forwarders, importers, clearing agents — is risk-averse. Telling them their capital is held in USDC, issued by a regulated US entity, is a different conversation from telling them it's held in an algorithmic stablecoin. The regulatory framing was the deciding factor, not technical performance.

### What worked well

- **Predictability.** A 6-decimal fixed-point token with consistent on-chain behaviour made financial calculations straightforward. No rebasing surprises, no floating supply complications.
- **Testnet faucet availability.** Having testnet USDC readily accessible let us build and test the full payment lifecycle without needing real capital at any point.
- **Arc integration.** USDC on Arc behaved identically to our mental model — transfers confirmed fast, fees were denominated in USD as advertised, which made building the UX around "predictable costs" much easier.

### What could be improved

- **Faucet discoverability.** Finding the testnet USDC faucet for Arc specifically required reading through multiple pages of docs. A single "Get testnet USDC for Arc" link from the main Arc getting-started page would save 30+ minutes for new developers.
- **Balance polling latency.** After a transfer confirms on-chain, the Circle Wallets API balance endpoint sometimes returns the pre-transfer balance for 2–5 seconds. For a real-time UI this creates a jarring "balance didn't change" moment before it catches up. A webhook or push notification for balance changes would eliminate this.

### Recommendations

Add a balance webhook event (e.g. `wallet.balance_updated`) so applications can push balance changes to the UI without polling. The current pattern of polling after a `transfer.complete` webhook introduces avoidable latency.

---

## 2. Circle Wallets (Developer-Controlled)

### Why we chose it

Meridian's users — UAE SMEs with no crypto background — cannot be expected to manage private keys, seed phrases, or external wallets. Developer-controlled wallets let us give every registered user a fully-functional USDC wallet with zero crypto UX friction. The user registers, a wallet is created silently in the background, and they never see a seed phrase or a browser extension.

This was the single most important architectural decision. Without developer-controlled wallets, the product would not be viable for the target market.

### What worked well

- **Entity secret model.** The two-key security model (API key + entity secret) was simple to reason about and easy to implement. The documentation explaining ciphertext generation was clear.
- **Per-invoice escrow wallets.** Creating a new dedicated wallet per invoice (for escrow) worked flawlessly. The ability to create unlimited wallets under a single entity was essential — we create one per SME, one per investor, and one per active invoice.
- **Deterministic wallet addressing.** Wallet addresses on Arc are stable and reusable across sessions, which made it straightforward to build the "Your Arc Address" display on the credit passport page.

### What could be improved

- **Wallet creation latency.** Creating a wallet at user registration time adds ~1.5–2 seconds to the registration flow. For a product where first impressions matter, this delay is noticeable. An async wallet creation option (create in background, notify via webhook when ready) would improve perceived performance.
- **Wallet metadata/labelling.** There is no native way to attach a label or metadata to a wallet via the API. We worked around this by storing labels in our own database, but an optional `metadata` field on wallet creation would simplify the data model significantly.
- **SDK type coverage.** The TypeScript SDK had a few response types that returned `any` in certain edge cases (notably around transfer status transitions). Stricter types would have caught a couple of runtime issues at compile time.

### Recommendations

1. Add optional `metadata: Record<string, string>` to the wallet creation endpoint — useful for tagging wallets by purpose (escrow, user, platform-fee) without a separate database join.
2. Add a `wallet.created` webhook so async wallet provisioning is possible without polling.
3. Consider a bulk wallet creation endpoint for applications that need to create many wallets at onboarding.

---

## 3. Circle Gateway

### Why we chose it

The settlement waterfall in Meridian involves three parties — SME, investor, platform — each needing to receive a specific portion of the repaid invoice amount. Circle Gateway was chosen to handle this multi-party routing rather than chaining three separate Wallets transfers, which would have been error-prone and harder to make atomic.

Gateway also made the "treasury routing" framing of our architecture credible to judges — it's not just wallet-to-wallet payments, it's programmatic treasury orchestration.

### What worked well

- **Conceptual fit.** The Gateway model — define a routing policy, execute against it — mapped cleanly to our settlement waterfall logic. The mental model is intuitive for anyone who has worked with payment routing systems.
- **Documentation structure.** The Gateway docs were the best-organised of all the Circle products we used. The worked examples made the request/response shape immediately clear.

### What could be improved

- **Sandbox coverage.** Some Gateway features were partially available or behaved differently in sandbox vs. production (per documentation notes). This created uncertainty about whether our integration would work identically in production, which is uncomfortable for a financial product.
- **Error messages.** When a Gateway routing rule validation fails, the error response body is terse — a numeric code and a short string. Human-readable error messages that explain *why* a routing configuration is invalid (e.g. "percentages do not sum to 100") would cut debugging time significantly.

### Recommendations

1. Publish a complete sandbox parity matrix — what works in sandbox, what is mocked, what requires production credentials. This removes guesswork during development.
2. Improve validation error messages on routing configuration to be prescriptive (e.g. "The sum of output percentages is 94%; expected 100%").

---

## 4. CCTP + Bridge Kit

### Why we chose it

The UAE is a global re-export and transit hub. The natural extension of a UAE-focused trade finance platform is cross-border USDC settlement — paying Indonesian suppliers, Indian freight partners, or European buyers. CCTP was the only credible solution for cross-chain USDC movement without bridging to a wrapped token.

We used it in Meridian as a "Cross-Border Transfer Demo" in the wallet page, showing the Arc → Ethereum Sepolia corridor to illustrate the global payment capability.

### What worked well

- **Trust model.** CCTP's burn-and-mint model (no liquidity pools, no wrapped tokens) is easy to explain to non-crypto users and easy to reason about as a developer. For a product targeting risk-averse SMEs, "Circle burns USDC here and mints the same amount there" is a story that lands.
- **Bridge Kit documentation.** The step-by-step attestation flow in the Bridge Kit docs was among the clearest technical writing in the Circle ecosystem.

### What could be improved

- **Arc testnet support.** Arc testnet support for CCTP was limited during the development window. We implemented the integration but had to mock parts of the attestation flow in sandbox. Full testnet parity would allow complete end-to-end testing.
- **Transfer status UX.** The two-step flow (initiate burn → wait for attestation → mint on destination) takes variable time. The Bridge Kit doesn't currently provide a live status stream — developers must poll for attestation. A webhook or SSE stream for transfer status would make it much easier to build responsive UIs around cross-chain transfers.

### Recommendations

1. Provide a CCTP transfer status webhook so applications can push real-time updates to users without polling the attestation API.
2. Expand Arc testnet support for CCTP to enable full end-to-end testing without mocking.

---

## 5. Nanopayments

### Why we chose it

Flat fees are a blunt instrument for invoice factoring. The actual cost to an SME should reflect how long they hold the capital, not a fixed percentage charged regardless of settlement speed. Nanopayments enabled us to build a per-second streaming fee — if an SME settles in 3 days instead of 90, they pay a fraction of the fee. This is a fairer pricing model and a genuinely differentiated feature.

The live fee counter (ticking up every second on the invoice detail page) became one of the strongest visual demonstrations of what programmable money can do that traditional finance cannot.

### What worked well

- **Conceptual power.** Nanopayments is the feature that made the demo "feel like the future." Watching a fee counter increment in real time on a trade finance invoice is immediately compelling to anyone who has ever waited 90 days for a bank to process something.
- **Integration path.** The API surface is small and focused, which made it straightforward to wire up alongside the existing payment flows.

### What could be improved

- **Sandbox completeness.** Nanopayments sandbox support was limited — we implemented the stream initiation and closure logic but could not fully verify the end-to-end sub-cent settlement in testnet. Comprehensive sandbox support is essential for developers to build with confidence.
- **Stream introspection.** There is no straightforward way to query the current accrued amount on an active stream without computing it client-side from the start time and rate. A `/streams/{id}/accrued` endpoint would simplify the UI layer significantly.
- **Documentation depth.** Compared to Wallets and Gateway, the Nanopayments documentation had fewer worked examples. More realistic use-case walkthroughs (e.g. "streaming fee for a lending product") would lower the learning curve.

### Recommendations

1. Add a `/streams/{id}/accrued` endpoint returning the current accrued amount and elapsed time — eliminates client-side time arithmetic.
2. Expand sandbox to support full end-to-end streaming and settlement at testnet scale.
3. Add a Nanopayments quickstart guide with a concrete lending/factoring use case — the current docs assume the reader already knows what they want to build.

---

## Overall Developer Experience

**What made Circle's stack compelling for this use case:**

The combination of Wallets + Gateway + USDC created a complete programmable treasury infrastructure that required zero smart contract development. For a solo developer building a trade finance product on a tight timeline, this was the difference between shipping and not shipping. The ability to create wallets, route payments, and settle multi-party transactions entirely through REST APIs — with TypeScript SDK support — is genuinely powerful.

**The biggest improvement opportunity:**

Sandbox parity. The most consistent friction point across Wallets, Gateway, CCTP, and Nanopayments was uncertainty about whether sandbox behaviour matches production. A published, up-to-date sandbox parity matrix for each product would reduce this anxiety significantly and allow developers to build with greater confidence.

**One recommendation that applies to all products:**

Add a unified "developer playground" in the Circle console — a web UI where developers can create test wallets, make test transfers, and see webhook payloads in real time without writing any code. This would dramatically lower the time-to-first-success for new developers and reduce the documentation burden for simple operations.

---

*Feedback submitted as part of the Stablecoin Commerce Stack Challenge hackathon. All observations reflect real development experience building Meridian on Circle's sandbox environment.*
