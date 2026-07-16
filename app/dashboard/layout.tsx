import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentMemberId } from "@/lib/session";

/**
 * Catches anyone who reaches /dashboard directly (bookmark, back button)
 * while still on the default PIN a leader set up for them - the client-side
 * redirect after login covers the normal path, this is the server-side
 * backstop so it can't be skipped.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const memberId = await getCurrentMemberId();
  if (!memberId) redirect("/login");

  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { pinMustChange: true } });
  if (member?.pinMustChange) redirect("/set-pin");

  return <>{children}</>;
}
