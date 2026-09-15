import type { NextConfig } from "next";

// GGH-602 — baseline security headers. The CSP is the one piece that needs
// re-verification once real Clerk keys are configured (currently blank —
// see .env.local.example): Clerk's script/connect domains below are its
// documented ones, not yet checked against a live instance. frame-src stays
// broad ("https:") on purpose — the staging-preview iframe (GGH-302) embeds
// an arbitrary per-project URL, so a fixed allowlist isn't possible.
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const apiWsUrl = apiUrl.replace(/^http/, "ws");

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiUrl} ${apiWsUrl} https://*.clerk.accounts.dev`,
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
