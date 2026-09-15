import { auth } from "@clerk/nextjs/server";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// Same resource-based auth pattern as app/admin/layout.tsx: requiring
// sign-in here is a first gate; RBAC + tenant scoping is enforced
// server-side by FastAPI on every request (see get_current_user_org_id in
// backend-fastapi/app/services/auth.py).
export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  if (clerkEnabled) {
    await auth.protect();
  }
  return children;
}
