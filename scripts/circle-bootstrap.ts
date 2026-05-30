/**
 * One-time Circle bootstrap for developer-controlled wallets (sandbox).
 *
 * Generates a valid 32-byte entity secret, registers it with Circle, creates a
 * wallet set, and writes CIRCLE_ENTITY_SECRET + CIRCLE_WALLET_SET_ID back into
 * .env.local. The recovery file is written OUTSIDE the repo (~/.circle/) — back
 * it up; it's required to recover wallet access.
 *
 * Run:  npm run circle:bootstrap   (then restart the dev server)
 */
import {
  initiateDeveloperControlledWalletsClient,
  registerEntitySecretCiphertext,
} from "@circle-fin/developer-controlled-wallets"
import crypto from "node:crypto"
import os from "node:os"
import path from "node:path"
import fs from "node:fs"

function upsertEnv(content: string, key: string, value: string): string {
  const line = `${key}="${value}"`
  const re = new RegExp(`^${key}=.*$`, "m")
  return re.test(content)
    ? content.replace(re, line)
    : `${content.trimEnd()}\n${line}\n`
}

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY
  if (!apiKey || apiKey === "REPLACE_ME") {
    console.error("Set a real CIRCLE_API_KEY in .env.local first.")
    process.exit(1)
  }

  // A Circle entity secret is a 32-byte hex string.
  const entitySecret = crypto.randomBytes(32).toString("hex")

  const recoveryDir = path.join(os.homedir(), ".circle")
  fs.mkdirSync(recoveryDir, { recursive: true })

  console.log("• Registering entity secret…")
  await registerEntitySecretCiphertext({
    apiKey,
    entitySecret,
    recoveryFileDownloadPath: recoveryDir,
  })

  console.log("• Creating wallet set…")
  const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  })
  const res = await client.createWalletSet({ name: "Meridian WalletSet" })
  const walletSetId = res.data?.walletSet?.id
  if (!walletSetId) throw new Error("No wallet set id returned by Circle.")

  console.log("• Updating .env.local…")
  const envPath = path.join(process.cwd(), ".env.local")
  let env = fs.readFileSync(envPath, "utf8")
  env = upsertEnv(env, "CIRCLE_ENTITY_SECRET", entitySecret)
  env = upsertEnv(env, "CIRCLE_WALLET_SET_ID", walletSetId)
  fs.writeFileSync(envPath, env)

  console.log("\n✅ Circle bootstrap complete.")
  console.log(`   Recovery file in: ${recoveryDir}  (BACK THIS UP)`)
  console.log(`   Wallet set id:    ${walletSetId}`)
  console.log("   Restart the dev server to pick up the new env.\n")
}

main().catch((e) => {
  console.error("circle:bootstrap failed:", e)
  process.exit(1)
})
