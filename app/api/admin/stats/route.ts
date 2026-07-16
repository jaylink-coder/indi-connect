export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopedLocalChurchIds } from "@/lib/hierarchy";

/**
 * Real counterparts to the admin panel's old hardcoded parishStats.
 * "Active" members are those who've activated a digital account
 * (clerkUserId set) - not an invented engagement metric. "Monthly Tithe"
 * is TITHE contributions dated within the current calendar month across
 * the caller's admin.members scope.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const member = await prisma.member.findUnique({ where: { clerkUserId: userId }, select: { id: true } });
  if (!member) {
    return NextResponse.json({ error: "No membership record is linked to this account" }, { status: 403 });
  }

  const access = await getMemberAccess(userId);
  if (!access || !hasAccess(access.permissions, "admin.members")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const localChurchIds = await getScopedLocalChurchIds(member.id, "admin.members");
  if (localChurchIds.length === 0) {
    return NextResponse.json({ totalMembers: 0, activeMembers: 0, monthlyTithe: 0, totalProjectFunds: 0 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalMembers, activeMembers, monthlyTitheAgg, projectFundsAgg] = await Promise.all([
    prisma.member.count({ where: { localChurchId: { in: localChurchIds } } }),
    prisma.member.count({ where: { localChurchId: { in: localChurchIds }, clerkUserId: { not: null } } }),
    prisma.contribution.aggregate({
      where: {
        category: "TITHE",
        dateTransacted: { gte: monthStart },
        member: { localChurchId: { in: localChurchIds } },
      },
      _sum: { amount: true },
    }),
    prisma.contribution.aggregate({
      where: {
        category: "PROJECT",
        member: { localChurchId: { in: localChurchIds } },
      },
      _sum: { amount: true },
    }),
  ]);

  return NextResponse.json({
    totalMembers,
    activeMembers,
    monthlyTithe: Number(monthlyTitheAgg._sum.amount ?? 0),
    totalProjectFunds: Number(projectFundsAgg._sum.amount ?? 0),
  });
}
