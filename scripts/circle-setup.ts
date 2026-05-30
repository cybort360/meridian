/**
 * One-time Circle setup: creates a wallet set and prints its ID.
 *
 * Prerequisites (do these in the Circle console / their docs first):
 *   1. Create a Circle developer account: https://console.circle.com
 *   2. Generate an API key and an entity secret, then REGISTER the entity
 *      secret (you must store the recovery file securely yourself):
 *      https://developers.circle.com/wallets/dev-controlled/register-entity-secret
 *   3. Put CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET in .env.local
 *
 * Then run:  npm run circle:setup
 * Copy the printed CIRCLE_WALLET_SET_ID into .env.local.
 */
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets"

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET

  if (!apiKey || apiKey === "REPLACE_ME" || !entitySecret || entitySecret === "REPLACE_ME") {
    console.error(
      "Missing credentials. Set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET in .env.local first."
    )
    process.exit(1)
  }

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret })

  const res = await client.createWalletSet({ name: "Meridian WalletSet" })
  const id = res.data?.walletSet?.id

  if (!id) {
    console.error("Circle did not return a wallet set id.", res.data)
    process.exit(1)
  }

  console.log("\n✅ Wallet set created. Add this line to .env.local:\n")
  console.log(`CIRCLE_WALLET_SET_ID="${id}"\n`)
}

main().catch((e) => {
  console.error("circle:setup failed:", e)
  process.exit(1)
})
