import nodemailer from "nodemailer"

async function main() {
  const user = process.env.SMTP_USER!
  const pass = process.env.SMTP_PASS!
  const port = Number(process.env.SMTP_PORT || 465)
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  console.log("Verifying SMTP auth...")
  await transport.verify()
  console.log("✓ SMTP auth OK")

  const info = await transport.sendMail({
    from: `Meridian <${user}>`,
    to: user, // send to yourself so you can confirm receipt
    subject: "Meridian — SMTP test ✅",
    text: "If you're reading this in your inbox, Meridian email delivery via Gmail SMTP works.",
  })
  console.log("✓ sent, messageId:", info.messageId)
  console.log("  accepted:", info.accepted, "rejected:", info.rejected)
}

main().catch((e) => {
  console.error("EMAIL TEST FAILED:", e?.message ?? e)
  process.exit(1)
})
