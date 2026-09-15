import type { NextConfig } from "next";

// GGH-602 — baseline security headers. frame-src stays broad ("https:") on
// purpose — the staging-preview iframe (GGH-302) embeds an arbitrary
// per-project URL, so a fixed allowlist isn't possible.
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const apiWsUrl = apiUrl.replace(/^http/, "ws");
const isDev = process.env.NODE_ENV === "development";

const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' is required here: Next.js ships its RSC hydration
  // payload via inline <script>self.__next_f.push(...)</script> tags with
  // no nonce attached. Without it, the browser blocks those tags and every
  // client component silently never hydrates (found via /admin and /portal
  // rendering blank — both are pure client components with no fallback
  // markup for a hydration that never happens). A stricter nonce-based CSP
  // is possible but needs the header generated per-request in a
  // middleware/proxy file (so a fresh nonce can be threaded through), not
  // the static config here.
  // 'unsafe-eval' in dev only — React's dev-mode error reconstruction uses
  // eval() for better stack traces (Next.js's own CSP guide calls this out
  // explicitly); neither React nor Next.js use eval in production.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiUrl} ${apiWsUrl}`,
  "frame-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
