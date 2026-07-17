export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopedLocalChurchIds } from "@/lib/hierarchy";
import { getCurrentMemberId } from "@/lib/session";

/**
 * Real counterparts to the admin panel's old hardcoded parishStats.
 * "Active" members are those who've had a login set up (pinHash set) - not
 * an invented engagement metric. "Monthly Tithe" is TITHE contributions
 * dated within the current calendar month across the caller's
 * admin.members scope.
 */
export async function GET() {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true } });
  if (!member) {
    return NextResponse.json({ error: "No membership record is linked to this account" }, { status: 403 });
  }

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.members")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const localChurchIds = await getScopedLocalChurchIds(member.id, "admin.members");
  if (localChurchIds.length === 0) {
    return NextResponse.json({ totalMembers: 0, activeMembers: 0, totalDependents: 0, monthlyTithe: 0, totalProjectFunds: 0 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalMembers, activeMembers, totalDependents, monthlyTitheAgg, projectFundsAgg] = await Promise.all([
    prisma.member.count({ where: { localChurchId: { in: localChurchIds } } }),
    prisma.member.count({ where: { localChurchId: { in: localChurchIds }, pinHash: { not: null } } }),
    prisma.dependent.count({ where: { localChurchId: { in: localChurchIds } } }),
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
    totalDependents,
    monthlyTithe: Number(monthlyTitheAgg._sum.amount ?? 0),
    totalProjectFunds: Number(projectFundsAgg._sum.amount ?? 0),
  });
}
