export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLocalChurchIdsInScope, getScopesForPermission } from "@/lib/hierarchy";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";

const CHUNK_SIZE = 200;

/** Assigns the same pledge amount to every member within the project's own scope - a "harambee, equal share" reset. Overwrites any existing individual pledges for this project. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.projects", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, scopeTier: true, scopeId: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const scopes = await getScopesForPermission(memberId, "admin.projects", "EDIT");
  if (!scopes.some((s) => s.tier === project.scopeTier && s.id === project.scopeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid pledge amount" }, { status: 400 });
  }

  const localChurchIds = await getLocalChurchIdsInScope(project.scopeTier, project.scopeId);
  const members = await prisma.member.findMany({
    where: { localChurchId: { in: localChurchIds } },
    select: { id: true },
  });

  for (let i = 0; i < members.length; i += CHUNK_SIZE) {
    const chunk = members.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map((m) =>
        prisma.projectAssignment.upsert({
          where: { projectId_memberId: { projectId, memberId: m.id } },
          create: { projectId, memberId: m.id, assignedAmount: amount },
          update: { assignedAmount: amount },
        })
      )
    );
  }

  return NextResponse.json({ status: "ok" as const, assignedCount: members.length });
}
