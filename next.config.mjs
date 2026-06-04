const isDev = process.env.NODE_ENV !== "production"

// Security headers applied to every response. The CSP is deliberately strict;
// connect-src also allows the HMR websocket in development so dev tooling works.
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      `connect-src 'self' https://api.circle.com https://api.anthropic.com${
        isDev ? " ws: wss:" : ""
      }`,
    ].join("; "),
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // pdf-parse / jsdom use Node APIs and dynamic requires that shouldn't be
    // bundled — let them load as native node modules.
    serverComponentsExternalPackages: ["pdf-parse", "jsdom"],
    // Enables src/instrumentation.ts (Sentry init) on Next 14.
    instrumentationHook: true,
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }]
  },
};

export default nextConfig;
