/**
 * One-time: create the platform fee wallet (receives protocol fees at
 * settlement). Prints PLATFORM_WALLET_ID + PLATFORM_WALLET_ADDRESS to add to
 * .env.local. Requires CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET + CIRCLE_WALLET_SET_ID.
 *
 * Run:  npm run circle:platform-wallet
 */
import {
  initiateDeveloperControlledWalletsClient,
  type AccountType,
  type Blockchain,
} from "@circle-fin/developer-controlled-wallets"

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET
  const walletSetId = process.env.CIRCLE_WALLET_SET_ID
  const missing =
    !apiKey ||
    apiKey === "REPLACE_ME" ||
    !entitySecret ||
    entitySecret === "REPLACE_ME" ||
    !walletSetId ||
    walletSetId === "REPLACE_ME"
  if (missing) {
    console.error(
      "Run circle:bootstrap (or set CIRCLE_API_KEY/ENTITY_SECRET/WALLET_SET_ID) first."
    )
    process.exit(1)
  }

  const client = initiateDeveloperControlledWalletsClient({
    apiKey: apiKey!,
    entitySecret: entitySecret!,
  })

  const res = await client.createWallets({
    accountType: "EOA" as AccountType,
    blockchains: ["ARC-TESTNET"] as Blockchain[],
    count: 1,
    walletSetId: walletSetId!,
    metadata: [{ refId: "platform-fee-wallet" }],
  })

  const wallet = res.data?.wallets?.[0]
  if (!wallet) {
    console.error("Circle did not return a wallet.", res.data)
    process.exit(1)
  }

  console.log("\n✅ Platform fee wallet created. Add these to .env.local:\n")
  console.log(`PLATFORM_WALLET_ID="${wallet.id}"`)
  console.log(`PLATFORM_WALLET_ADDRESS="${wallet.address}"\n`)
}

main().catch((e) => {
  console.error("circle:platform-wallet failed:", e)
  process.exit(1)
})
