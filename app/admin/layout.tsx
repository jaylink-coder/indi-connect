import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getMemberAccess } from "@/lib/permissions";

/**
 * The padlock (see components/AdminPadlock.tsx) is the sanctioned way in -
 * clicking it performs a fresh Clerk reverification before routing here.
 * This layout re-checks both the leadership permission and the
 * reverification freshness server-side, so a bookmarked /admin URL (or a
 * stale session past Clerk's 10-minute reverification window) bounces back
 * to the dashboard instead of silently rendering.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { userId, has } = await auth();
  if (!userId) redirect("/");

  const access = await getMemberAccess(userId);
  if (!access || !access.isLeader) redirect("/dashboard?adminDenied=1");

  if (!has({ reverification: "strict" })) {
    redirect("/dashboard?unlockAdmin=1");
  }

  return <>{children}</>;
}
