import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// This middleware only populates the Clerk auth context for the request —
// it does NOT decide what's protected. Per Clerk's own guidance (the
// createRouteMatcher pattern is deprecated), actual protection is
// "resource-based": each protected route calls auth.protect() itself, e.g.
// app/admin/layout.tsx. That keeps the protection co-located with the
// route it protects instead of a separate, driftable path-matching list.
export default clerkEnabled ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
