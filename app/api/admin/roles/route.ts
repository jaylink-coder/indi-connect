export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";

/**
 * The full Role catalog, for the "Assign Leader" picker. Returning every
 * role (not just ones the caller can grant) is fine - POST
 * /api/admin/positions is what actually enforces that a caller can only
 * assign a role whose scope falls inside the org branch they manage.
 */
export async function GET() {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.members", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const roles = await prisma.role.findMany({
    select: { id: true, name: true, scope: true, description: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(roles);
}
