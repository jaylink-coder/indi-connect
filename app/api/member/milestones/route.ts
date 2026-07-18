export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMemberId } from "@/lib/session";

/**
 * A member's own real standing against the MilestoneType catalog - never
 * the illustrative static list. achievedAt is null unless a real
 * MemberMilestoneRecord exists for this exact member; "Holding a
 * Leadership Position" isn't in that catalog (it's tracked for real via
 * MemberPosition already, see the admin panel), so it's appended here from
 * that table instead of invented.
 */
export async function GET() {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const types = await prisma.milestoneType.findMany({ orderBy: { sortOrder: "asc" } });
  const records = await prisma.memberMilestoneRecord.findMany({
    where: { memberId },
    select: { milestoneTypeId: true, achievedAt: true },
  });
  const achievedByType = new Map(records.map((r) => [r.milestoneTypeId, r.achievedAt]));

  const leadershipPosition = await prisma.memberPosition.findFirst({
    where: { memberId, endDate: null },
    orderBy: { startDate: "asc" },
    select: { startDate: true },
  });

  const milestones = types.map((t) => ({
    key: t.key,
    tier: t.tier,
    title: t.title,
    icon: t.icon,
    note: t.note,
    achievedAt: achievedByType.get(t.id)?.toISOString() ?? null,
  }));

  milestones.push({
    key: "leadership_position",
    tier: "Serving as a Member",
    title: "Holding a Leadership Position",
    icon: "🗝️",
    note: "Tracked from your actual leadership position, if any",
    achievedAt: leadershipPosition ? leadershipPosition.startDate.toISOString() : null,
  });

  const achievedCount = milestones.filter((m) => m.achievedAt !== null).length;

  return NextResponse.json({ milestones, achievedCount, totalCount: milestones.length });
}
