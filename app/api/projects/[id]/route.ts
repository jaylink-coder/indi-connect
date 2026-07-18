export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScopesForPermission } from "@/lib/hierarchy";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";
import type { ProjectStatus } from "@prisma/client";

const VALID_STATUSES: ProjectStatus[] = ["PLANNED", "ACTIVE", "STALLED", "COMPLETED", "CANCELLED"];

/**
 * Edits a project's own details - status (the Planned/Ongoing/Stalled/
 * Completed/Cancelled lifecycle), location, and the person responsible.
 * Never touches targetAmount/scope - those are fixed at creation.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.projects", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id }, select: { id: true, scopeTier: true, scopeId: true } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const scopes = await getScopesForPermission(memberId, "admin.projects", "EDIT");
  if (!scopes.some((s) => s.tier === project.scopeTier && s.id === project.scopeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const data: { status?: ProjectStatus; location?: string | null; leadContact?: string | null; description?: string | null } = {};

  if (body?.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
  }
  if (body?.location !== undefined) {
    data.location = typeof body.location === "string" && body.location.trim() ? body.location.trim() : null;
  }
  if (body?.leadContact !== undefined) {
    data.leadContact = typeof body.leadContact === "string" && body.leadContact.trim() ? body.leadContact.trim() : null;
  }
  if (body?.description !== undefined) {
    data.description = typeof body.description === "string" && body.description.trim() ? body.description.trim() : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await prisma.project.update({ where: { id }, data });
  return NextResponse.json({ status: "ok" as const });
}
