export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLocalChurchIdsInScope, getScopesForPermission } from "@/lib/hierarchy";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";

interface ManagedProjectCheck {
  error?: ReturnType<typeof NextResponse.json>;
  project?: { id: string; scopeTier: import("@prisma/client").HierarchyTier; scopeId: string };
}

async function requireManagedProject(memberId: string, projectId: string): Promise<ManagedProjectCheck> {
  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.projects", "EDIT")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, scopeTier: true, scopeId: true },
  });
  if (!project) {
    return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  }
  const scopes = await getScopesForPermission(memberId, "admin.projects", "EDIT");
  if (!scopes.some((s) => s.tier === project.scopeTier && s.id === project.scopeId)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { project };
}

/** Every member assigned a personal pledge on this project, with what they've actually paid toward it so far. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id: projectId } = await params;
  const check = await requireManagedProject(memberId, projectId);
  if (check.error || !check.project) return check.error ?? NextResponse.json({ error: "Not found" }, { status: 404 });

  const assignments = await prisma.projectAssignment.findMany({
    where: { projectId },
    include: { member: { select: { id: true, name: true, membershipNo: true } } },
    orderBy: { createdAt: "asc" },
  });

  const contributions = await prisma.contribution.findMany({
    where: { projectId, memberId: { in: assignments.map((a) => a.memberId) } },
    select: { memberId: true, amount: true },
  });
  const paidByMember = new Map<string, number>();
  for (const c of contributions) {
    paidByMember.set(c.memberId, (paidByMember.get(c.memberId) ?? 0) + Number(c.amount));
  }

  return NextResponse.json(
    assignments.map((a) => ({
      id: a.id,
      memberId: a.memberId,
      memberName: a.member.name,
      membershipNo: a.member.membershipNo,
      assignedAmount: Number(a.assignedAmount),
      paidAmount: paidByMember.get(a.memberId) ?? 0,
    }))
  );
}

/** Assigns (or edits) one member's pledge amount - upsert so re-assigning the same member just updates it. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id: projectId } = await params;
  const check = await requireManagedProject(memberId, projectId);
  if (check.error || !check.project) return check.error ?? NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const targetMemberId = typeof body?.memberId === "string" ? body.memberId : "";
  const amount = Number(body?.amount);
  if (!targetMemberId) {
    return NextResponse.json({ error: "A member is required" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid pledge amount" }, { status: 400 });
  }

  const member = await prisma.member.findUnique({
    where: { id: targetMemberId },
    select: { id: true, localChurchId: true },
  });
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const inScopeChurchIds = await getLocalChurchIdsInScope(check.project.scopeTier, check.project.scopeId);
  if (!inScopeChurchIds.includes(member.localChurchId)) {
    return NextResponse.json({ error: "That member is outside this project's scope" }, { status: 403 });
  }

  await prisma.projectAssignment.upsert({
    where: { projectId_memberId: { projectId, memberId: targetMemberId } },
    create: { projectId, memberId: targetMemberId, assignedAmount: amount },
    update: { assignedAmount: amount },
  });

  return NextResponse.json({ status: "ok" as const });
}
