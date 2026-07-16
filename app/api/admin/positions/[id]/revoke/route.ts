export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopesForPermission } from "@/lib/hierarchy";
import { getCurrentMemberId } from "@/lib/session";
import { isWithinManagedScope } from "@/lib/structure";

/** Ends a MemberPosition (endDate = now) - a leader can only revoke positions inside the branch they manage. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const callerId = await getCurrentMemberId();
  if (!callerId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const access = await getMemberAccess(callerId);
  if (!access || !hasAccess(access.permissions, "admin.members", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const position = await prisma.memberPosition.findUnique({
    where: { id },
    select: { id: true, endDate: true, scopeId: true, role: { select: { scope: true } } },
  });
  if (!position || position.endDate) {
    return NextResponse.json({ error: "Position not found" }, { status: 404 });
  }

  const scopes = await getScopesForPermission(callerId, "admin.members", "EDIT");
  if (!(await isWithinManagedScope(scopes, position.role.scope, position.scopeId))) {
    return NextResponse.json({ error: "You don't manage that part of the church structure" }, { status: 403 });
  }

  await prisma.memberPosition.update({ where: { id }, data: { endDate: new Date() } });
  return NextResponse.json({ status: "ok" as const });
}
