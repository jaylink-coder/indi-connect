export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopedLocalChurchIds } from "@/lib/hierarchy";
import { getCurrentMemberId } from "@/lib/session";

/** Local churches the caller can register new members into - backs the church picker on the registration form. */
export async function GET() {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.members", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const localChurchIds = await getScopedLocalChurchIds(memberId, "admin.members");
  if (localChurchIds.length === 0) {
    return NextResponse.json([]);
  }

  const churches = await prisma.localChurch.findMany({
    where: { id: { in: localChurchIds } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(churches);
}
