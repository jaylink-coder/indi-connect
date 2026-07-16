import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentMemberId } from "@/lib/session";
import { getMemberAccess } from "@/lib/permissions";
import { verifyAdminStepUp, ADMIN_STEP_UP_COOKIE } from "@/lib/adminStepUp";

/**
 * The padlock (see components/AdminPadlock.tsx) is the sanctioned way in -
 * clicking it re-checks the leader's PIN before routing here. This layout
 * re-checks both the leadership permission and the step-up cookie
 * server-side, so a bookmarked /admin URL (or a stale step-up past its
 * 10-minute window) bounces back to the dashboard instead of silently
 * rendering.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const memberId = await getCurrentMemberId();
  if (!memberId) redirect("/login");

  const access = await getMemberAccess(memberId);
  if (!access || !access.isLeader) redirect("/dashboard?adminDenied=1");

  const cookieStore = await cookies();
  const stepUpToken = cookieStore.get(ADMIN_STEP_UP_COOKIE)?.value;
  if (!verifyAdminStepUp(memberId, stepUpToken)) {
    redirect("/dashboard?unlockAdmin=1");
  }

  return <>{children}</>;
}
