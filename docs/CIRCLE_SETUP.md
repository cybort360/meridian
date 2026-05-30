# Circle Setup & Phase 2 Wallet Testing

Phase 2 (Circle wallet integration) is fully implemented but needs real Circle
credentials to run live. The app degrades gracefully without them: routes return
a friendly 503 and the Wallet page shows a "Create wallet" action.

## One-time setup

1. **Create a Circle developer account** → https://console.circle.com and create
   an **API key** (sandbox).

2. **Generate & register an entity secret** (developer-controlled wallets).
   Follow Circle's guide — you must generate, register, and **store the recovery
   file yourself** (never commit it; `*-recovery-file.json` is gitignored):
   https://developers.circle.com/wallets/dev-controlled/register-entity-secret

3. **Add credentials to `.env.local`:**
   ```bash
   CIRCLE_API_KEY="TEST_API_KEY:..."
   CIRCLE_ENTITY_SECRET="<32-byte hex>"
   ```

4. **Create a wallet set** (one-time) and copy the printed id into `.env.local`:
   ```bash
   npm run circle:setup
   # → CIRCLE_WALLET_SET_ID="..."
   ```

5. Restart the dev server: `npm run dev`.

## Live test (Phase 2 "Done When")

1. **Auto-provisioned wallet:** register a new user — the register route calls
   `createWallet()` and saves `circleWalletId` + `address`. (Existing/seeded users
   without a wallet can click **Create wallet** on `/wallet`.)
2. **Balance:** open `/wallet` — it shows the USDC balance from Circle. Fund the
   address at https://faucet.circle.com (Arc testnet). On Arc, USDC is the native
   gas token, so the faucet covers both gas and balance.
3. **Transfer:** register a second user (gets their own wallet). From user A's
   `/wallet`, use **Send USDC** with user B's address. The transfer is recorded as
   a `Payment` row, polled to a terminal state, and appears in both wallets'
   transaction history (with an Arc explorer link). Verify both balances update.

## Webhooks

Register `https://<your-public-url>/api/webhooks/circle` under Webhooks in the
Circle console. The handler verifies Circle's ECDSA signature
(`X-Circle-Signature` / `X-Circle-Key-Id`), returns 200 immediately, and updates
the matching `Payment` status. For local testing, expose the endpoint with a
tunnel (e.g. `ngrok http 3000`).

## Arc reference

| | |
|---|---|
| Blockchain id (SDK) | `ARC-TESTNET` |
| Chain id | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` |
| Faucet | `https://faucet.circle.com` |
| USDC (6 decimals) | `0x3600000000000000000000000000000000000000` |
| Account type | `EOA` (USDC is native gas on Arc) |
