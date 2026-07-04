import nodemailer from "nodemailer"

interface SendEmailInput {
  to: string
  subject: string
  text: string
}

const PLACEHOLDER = "REPLACE_ME"

function isSet(v: string | undefined): v is string {
  return !!v && v !== PLACEHOLDER
}

// Sends an email via Resend (if configured), else SMTP/nodemailer (if
// configured), else logs to the console. Never throws - email failures must
// not break invoice creation.
export async function sendEmail({ to, subject, text }: SendEmailInput): Promise<void> {
  // A custom From only counts if it's a real address (not the Resend demo one).
  const configuredFrom =
    isSet(process.env.EMAIL_FROM) &&
    !process.env.EMAIL_FROM!.includes("resend.dev")
      ? process.env.EMAIL_FROM!
      : null

  try {
    const resendKey = process.env.RESEND_API_KEY
    if (isSet(resendKey)) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: configuredFrom ?? "Meridian <onboarding@resend.dev>",
          to,
          subject,
          text,
        }),
      })
      if (!res.ok) {
        console.error("[email] Resend send failed:", await res.text())
      }
      return
    }

    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    if (isSet(smtpUser) && isSet(smtpPass)) {
      const port = Number(process.env.SMTP_PORT || 465)
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port,
        secure: port === 465,
        auth: { user: smtpUser, pass: smtpPass },
      })
      // Gmail/most SMTP servers require From to be the authenticated mailbox.
      const from = configuredFrom ?? `Meridian <${smtpUser}>`
      await transport.sendMail({ from, to, subject, text })
      return
    }

    // No provider configured - log so the flow is testable in dev.
    console.log(
      `\n[email:fallback] (no RESEND_API_KEY / SMTP creds)\n  To: ${to}\n  Subject: ${subject}\n\n${text}\n`
    )
  } catch (error) {
    console.error("[email] send error:", error)
  }
}
