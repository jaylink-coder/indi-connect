export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopedLocalChurchIds } from "@/lib/hierarchy";
import { getCurrentMemberId } from "@/lib/session";

const CATEGORY_ORDER = [
  "SUNDAY_SCHOOL",
  "BRIGADE",
  "YOUTH",
  "VICTORY",
  "MEDIUM",
  "MEN",
  "MOTHERS_COUNCIL",
  "CHOIR",
  "THE_ANOINTED",
];

/** Groups (with roster counts) for one local church the caller manages. */
export async function GET(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.groups")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const localChurchId = url.searchParams.get("localChurchId");
  if (!localChurchId) {
    return NextResponse.json({ error: "localChurchId is required" }, { status: 400 });
  }

  const scopedChurchIds = await getScopedLocalChurchIds(memberId, "admin.groups");
  if (!scopedChurchIds.includes(localChurchId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const groups = await prisma.group.findMany({
    where: { localChurchId },
    select: {
      id: true,
      category: true,
      name: true,
      minAge: true,
      maxAge: true,
      genderRestriction: true,
      memberships: {
        where: { endedAt: null },
        select: { status: true },
      },
    },
  });

  const shaped = groups
    .map((g) => ({
      id: g.id,
      category: g.category,
      name: g.name,
      minAge: g.minAge,
      maxAge: g.maxAge,
      genderRestriction: g.genderRestriction,
      counts: {
        total: g.memberships.length,
        active: g.memberships.filter((m) => m.status === "ACTIVE").length,
        probation: g.memberships.filter((m) => m.status === "PROBATION").length,
        suspended: g.memberships.filter((m) => m.status === "SUSPENDED").length,
      },
    }))
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));

  return NextResponse.json(shaped);
}
