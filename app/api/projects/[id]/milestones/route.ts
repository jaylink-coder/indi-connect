export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScopesForPermission } from "@/lib/hierarchy";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";

/** Adds a new phase to a project's implementation plan - a leader picks the order; new ones append to the end unless a spot is given. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.projects", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, scopeTier: true, scopeId: true } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const scopes = await getScopesForPermission(memberId, "admin.projects", "EDIT");
  if (!scopes.some((s) => s.tier === project.scopeTier && s.id === project.scopeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Milestone title is required" }, { status: 400 });
  }
  const description = typeof body?.description === "string" && body.description.trim() ? body.description.trim() : undefined;
  const targetAmount = body?.targetAmount !== undefined && body.targetAmount !== null && body.targetAmount !== "" ? Number(body.targetAmount) : undefined;
  if (targetAmount !== undefined && (!Number.isFinite(targetAmount) || targetAmount <= 0)) {
    return NextResponse.json({ error: "Enter a valid target amount" }, { status: 400 });
  }
  const dueDate = typeof body?.dueDate === "string" && body.dueDate ? new Date(body.dueDate) : undefined;
  if (dueDate && Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: "Enter a valid due date" }, { status: 400 });
  }

  const count = await prisma.projectMilestone.count({ where: { projectId } });

  const milestone = await prisma.projectMilestone.create({
    data: { projectId, title, description, targetAmount, dueDate, order: count },
  });

  return NextResponse.json({ id: milestone.id }, { status: 201 });
}
