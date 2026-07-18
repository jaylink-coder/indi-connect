export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScopesForPermission } from "@/lib/hierarchy";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";

/** Removes one member's pledge - scope-checked via its parent project. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.projects", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { assignmentId } = await params;
  const assignment = await prisma.projectAssignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, project: { select: { scopeTier: true, scopeId: true } } },
  });
  if (!assignment) return NextResponse.json({ error: "Pledge not found" }, { status: 404 });

  const scopes = await getScopesForPermission(memberId, "admin.projects", "EDIT");
  if (!scopes.some((s) => s.tier === assignment.project.scopeTier && s.id === assignment.project.scopeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.projectAssignment.delete({ where: { id: assignmentId } });
  return NextResponse.json({ status: "ok" as const });
}
