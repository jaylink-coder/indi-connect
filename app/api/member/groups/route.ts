export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMemberId } from "@/lib/session";

/** A member's own group/fellowship memberships - self-service, no admin permission needed since it's only ever the caller's own data. */
export async function GET() {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const memberships = await prisma.groupMembership.findMany({
    where: { memberId, endedAt: null },
    include: { group: { select: { name: true, category: true } } },
    orderBy: { joinedGroupAt: "asc" },
  });

  return NextResponse.json(
    memberships.map((m) => ({
      id: m.id,
      groupName: m.group.name,
      category: m.group.category,
      status: m.status,
      joinedGroupAt: m.joinedGroupAt,
    }))
  );
}
