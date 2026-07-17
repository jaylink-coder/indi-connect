export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopedLocalChurchIds } from "@/lib/hierarchy";
import { getCurrentMemberId } from "@/lib/session";

const ALLOWED_PERMISSIONS = new Set(["admin.members", "admin.groups", "admin.attendance"]);

/** Local churches the caller can act on for a given admin section (default admin.members) - backs church pickers across the admin panel. */
export async function GET(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const url = new URL(request.url);
  const permissionKey = url.searchParams.get("permission") ?? "admin.members";
  if (!ALLOWED_PERMISSIONS.has(permissionKey)) {
    return NextResponse.json({ error: "Unknown permission" }, { status: 400 });
  }

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, permissionKey, "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const localChurchIds = await getScopedLocalChurchIds(memberId, permissionKey);
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
