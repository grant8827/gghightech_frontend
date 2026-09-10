import { auth } from "@clerk/nextjs/server";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// Resource-based auth check (Clerk's recommended replacement for
// middleware + createRouteMatcher — see middleware.ts): this route
// protects itself rather than relying on a central path-matching list.
// Requiring sign-in here is a first gate; the real RBAC decision (which
// role can do what) is enforced server-side by FastAPI on every request
// — see backend-fastapi/app/services/auth.py.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (clerkEnabled) {
    await auth.protect();
  }
  return children;
}
