import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { authLimiter } from "@/lib/rateLimit"

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Rate limit FIRST — this runs on every attempt, including wrong
        // passwords, so it actually bounds brute force. (The signIn callback
        // only fires after a correct password, far too late to help.) Keyed on
        // the lowercased submitted email, so it can't be bypassed by rotating a
        // spoofable source IP or by varying the email's casing. Fails open when
        // Upstash isn't configured or Redis is unreachable, so a limiter outage
        // never locks legitimate users out.
        if (authLimiter) {
          let allowed = true
          try {
            const email = (credentials?.email ?? "unknown").toLowerCase()
            const { success } = await authLimiter.limit(`login:${email}`)
            allowed = success
          } catch {
            allowed = true
          }
          if (!allowed) throw new Error("TooManyRequests")
        }

        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })
        if (!user) return null

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      // Reflect profile edits (e.g. name) into the JWT when the client calls
      // useSession().update(...), so the TopBar updates without a re-login.
      if (trigger === "update" && typeof session?.name === "string") {
        token.name = session.name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
