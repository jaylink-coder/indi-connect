export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLocalChurchIdsInScope, getScopesForPermission } from "@/lib/hierarchy";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";

/**
 * Every member within a project's own scope, for the "assign a pledge to
 * this specific person" search. Deliberately independent of admin.members -
 * a Parish Treasurer holds admin.projects but not necessarily
 * admin.members, and still needs to assign pledges.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.projects", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { scopeTier: true, scopeId: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const scopes = await getScopesForPermission(memberId, "admin.projects", "EDIT");
  if (!scopes.some((s) => s.tier === project.scopeTier && s.id === project.scopeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const localChurchIds = await getLocalChurchIdsInScope(project.scopeTier, project.scopeId);
  const members = await prisma.member.findMany({
    where: { localChurchId: { in: localChurchIds } },
    select: { id: true, name: true, membershipNo: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(members);
}
