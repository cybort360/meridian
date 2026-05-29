import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: { signIn: "/login" },
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/invoices/:path*",
    "/marketplace/:path*",
    "/wallet/:path*",
    "/passport/:path*",
    "/settings/:path*",
  ],
}
