export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScopesForPermission } from "@/lib/hierarchy";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";

/** Toggles a phase complete/incomplete, or edits its title/target/due date - scope-checked via its parent project. */
export async function PATCH(request: Request, { params }: { params: Promise<{ milestoneId: string }> }) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.projects", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { milestoneId } = await params;
  const milestone = await prisma.projectMilestone.findUnique({
    where: { id: milestoneId },
    select: { id: true, project: { select: { scopeTier: true, scopeId: true } } },
  });
  if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });

  const scopes = await getScopesForPermission(memberId, "admin.projects", "EDIT");
  if (!scopes.some((s) => s.tier === milestone.project.scopeTier && s.id === milestone.project.scopeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const data: {
    title?: string;
    description?: string | null;
    targetAmount?: number | null;
    dueDate?: Date | null;
    completed?: boolean;
    completedAt?: Date | null;
  } = {};

  if (body?.completed !== undefined) {
    data.completed = Boolean(body.completed);
    data.completedAt = data.completed ? new Date() : null;
  }
  if (typeof body?.title === "string" && body.title.trim()) {
    data.title = body.title.trim();
  }
  if (body?.description !== undefined) {
    data.description = typeof body.description === "string" && body.description.trim() ? body.description.trim() : null;
  }
  if (body?.targetAmount !== undefined) {
    if (body.targetAmount === null || body.targetAmount === "") {
      data.targetAmount = null;
    } else {
      const amount = Number(body.targetAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "Enter a valid target amount" }, { status: 400 });
      }
      data.targetAmount = amount;
    }
  }
  if (body?.dueDate !== undefined) {
    data.dueDate = typeof body.dueDate === "string" && body.dueDate ? new Date(body.dueDate) : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await prisma.projectMilestone.update({ where: { id: milestoneId }, data });
  return NextResponse.json({ status: "ok" as const });
}

/** Removes a phase that was added by mistake - scope-checked via its parent project. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ milestoneId: string }> }) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.projects", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { milestoneId } = await params;
  const milestone = await prisma.projectMilestone.findUnique({
    where: { id: milestoneId },
    select: { id: true, project: { select: { scopeTier: true, scopeId: true } } },
  });
  if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });

  const scopes = await getScopesForPermission(memberId, "admin.projects", "EDIT");
  if (!scopes.some((s) => s.tier === milestone.project.scopeTier && s.id === milestone.project.scopeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.projectMilestone.delete({ where: { id: milestoneId } });
  return NextResponse.json({ status: "ok" as const });
}
