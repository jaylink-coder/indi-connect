export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberScopeChain, getScopesForPermission } from "@/lib/hierarchy";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";
import type { HierarchyTier, ProjectStatus } from "@prisma/client";

const CREATABLE_STATUSES: ProjectStatus[] = ["PLANNED", "ACTIVE"];

/**
 * Lists projects a signed-in member can see. By default (the payment
 * picker's use case): ACTIVE only, every scope from their own local church
 * up to national HQ. With ?manage=1 and admin.projects VIEW: every status,
 * scoped instead to the leader's own managed scope(s) - the admin panel's
 * use case, where a chairman needs to see (and later close) their parish's
 * completed/cancelled projects too, not just active ones.
 */
export async function GET(request: Request) {
  const memberId = await getCurrentMemberId();
  const { searchParams } = new URL(request.url);
  const manage = searchParams.get("manage") === "1";

  let scopeFilter: { scopeTier: HierarchyTier; scopeId: string }[] | undefined;
  let statusFilter: { status: "ACTIVE" } | Record<string, never> = { status: "ACTIVE" };

  if (memberId) {
    const member = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true } });
    if (member) {
      if (manage) {
        const access = await getMemberAccess(memberId);
        if (access && hasAccess(access.permissions, "admin.projects")) {
          const scopes = await getScopesForPermission(member.id, "admin.projects");
          scopeFilter = scopes.map((ref) => ({ scopeTier: ref.tier, scopeId: ref.id }));
          statusFilter = {};
        }
      } else {
        const chain = await getMemberScopeChain(member.id);
        scopeFilter = chain.map((ref) => ({ scopeTier: ref.tier, scopeId: ref.id }));
      }
    }
  }

  if (!scopeFilter || scopeFilter.length === 0) {
    return NextResponse.json([]);
  }

  const projects = await prisma.project.findMany({
    where: {
      ...statusFilter,
      OR: scopeFilter,
    },
    include: {
      contributions: { select: { amount: true } },
      milestones: { orderBy: { order: "asc" } },
    },
    orderBy: { startDate: "desc" },
  });

  const formatted = projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    location: project.location,
    leadContact: project.leadContact,
    scopeTier: project.scopeTier,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    targetAmount: Number(project.targetAmount),
    raisedAmount: project.contributions.reduce((sum, c) => sum + Number(c.amount), 0),
    milestones: project.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      targetAmount: m.targetAmount !== null ? Number(m.targetAmount) : null,
      dueDate: m.dueDate,
      completed: m.completed,
      completedAt: m.completedAt,
      order: m.order,
    })),
  }));

  return NextResponse.json(formatted);
}

/** Creates a project under one of the caller's own admin.projects scopes - never an arbitrary scope they typed in. */
export async function POST(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true } });
  if (!member) {
    return NextResponse.json({ error: "No membership record is linked to this account" }, { status: 403 });
  }

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.projects", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scopes = await getScopesForPermission(member.id, "admin.projects");
  if (scopes.length === 0) {
    return NextResponse.json({ error: "You have no scope to create a project under" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : undefined;
  const location = typeof body?.location === "string" && body.location.trim() ? body.location.trim() : undefined;
  const leadContact = typeof body?.leadContact === "string" && body.leadContact.trim() ? body.leadContact.trim() : undefined;
  const targetAmount = Number(body?.targetAmount);
  const requestedScopeId = typeof body?.scopeId === "string" ? body.scopeId : scopes[0].id;
  const requestedStatus = typeof body?.status === "string" ? body.status : "ACTIVE";

  if (!name) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return NextResponse.json({ error: "Enter a valid target amount" }, { status: 400 });
  }
  if (!CREATABLE_STATUSES.includes(requestedStatus as ProjectStatus)) {
    return NextResponse.json({ error: "A new project must start Planned or Ongoing" }, { status: 400 });
  }

  const scope = scopes.find((s) => s.id === requestedScopeId);
  if (!scope) {
    return NextResponse.json({ error: "That scope isn't one you manage" }, { status: 403 });
  }

  const project = await prisma.project.create({
    data: {
      name,
      description,
      location,
      leadContact,
      targetAmount,
      status: requestedStatus as ProjectStatus,
      scopeTier: scope.tier,
      scopeId: scope.id,
    },
  });

  return NextResponse.json({ id: project.id }, { status: 201 });
}
