import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

/**
 * Catches anyone who reaches /dashboard directly (bookmark, back button)
 * while still on the default PIN a leader set up for them - the client-side
 * redirect after login covers the normal path, this is the server-side
 * backstop so it can't be skipped.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const member = await prisma.member.findUnique({ where: { clerkUserId: userId }, select: { pinMustChange: true } });
  if (member?.pinMustChange) redirect("/set-pin");

  return <>{children}</>;
}
