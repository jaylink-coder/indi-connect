export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getMemberScopeChain, getScopesForPermission } from "@/lib/hierarchy";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import type { HierarchyTier } from "@prisma/client";

/**
 * Lists welfare cases a signed-in member can see - OPEN-only across their
 * ancestor scope chain by default (payment picker), or every status across
 * their own managed scope(s) with ?manage=1 (admin panel). Gated on the
 * same "admin.projects" permission as /api/projects - the seeded role
 * labels that grant "Projects & Welfare" together.
 */
export async function GET(request: Request) {
  const { userId } = await auth();
  const { searchParams } = new URL(request.url);
  const manage = searchParams.get("manage") === "1";

  let scopeFilter: { scopeTier: HierarchyTier; scopeId: string }[] | undefined;
  let statusFilter: { status: "OPEN" } | Record<string, never> = { status: "OPEN" };

  if (userId) {
    const member = await prisma.member.findUnique({ where: { clerkUserId: userId }, select: { id: true } });
    if (member) {
      if (manage) {
        const access = await getMemberAccess(userId);
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

  const cases = await prisma.welfareCase.findMany({
    where: {
      ...statusFilter,
      OR: scopeFilter,
    },
    include: { contributions: { select: { amount: true } } },
    orderBy: { createdAt: "desc" },
  });

  const formatted = cases.map((welfareCase) => ({
    id: welfareCase.id,
    title: welfareCase.title,
    description: welfareCase.description,
    beneficiaryName: welfareCase.beneficiaryName,
    scopeTier: welfareCase.scopeTier,
    status: welfareCase.status,
    targetAmount: welfareCase.targetAmount ? Number(welfareCase.targetAmount) : null,
    raisedAmount: welfareCase.contributions.reduce((sum, c) => sum + Number(c.amount), 0),
  }));

  return NextResponse.json(formatted);
}

/** Creates a welfare case under one of the caller's own admin.projects scopes. */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const member = await prisma.member.findUnique({ where: { clerkUserId: userId }, select: { id: true } });
  if (!member) {
    return NextResponse.json({ error: "No membership record is linked to this account" }, { status: 403 });
  }

  const access = await getMemberAccess(userId);
  if (!access || !hasAccess(access.permissions, "admin.projects", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scopes = await getScopesForPermission(member.id, "admin.projects");
  if (scopes.length === 0) {
    return NextResponse.json({ error: "You have no scope to create a welfare case under" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : undefined;
  const beneficiaryName = typeof body?.beneficiaryName === "string" ? body.beneficiaryName.trim() : undefined;
  const targetAmount = body?.targetAmount != null ? Number(body.targetAmount) : undefined;
  const requestedScopeId = typeof body?.scopeId === "string" ? body.scopeId : scopes[0].id;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (targetAmount !== undefined && (!Number.isFinite(targetAmount) || targetAmount <= 0)) {
    return NextResponse.json({ error: "Enter a valid target amount" }, { status: 400 });
  }

  const scope = scopes.find((s) => s.id === requestedScopeId);
  if (!scope) {
    return NextResponse.json({ error: "That scope isn't one you manage" }, { status: 403 });
  }

  const welfareCase = await prisma.welfareCase.create({
    data: {
      title,
      description,
      beneficiaryName,
      targetAmount,
      scopeTier: scope.tier,
      scopeId: scope.id,
    },
  });

  return NextResponse.json({ id: welfareCase.id }, { status: 201 });
}
