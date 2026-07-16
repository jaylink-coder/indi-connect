export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopedLocalChurchIds, getScopesForPermission } from "@/lib/hierarchy";
import { getCurrentMemberId } from "@/lib/session";
import { isWithinManagedScope } from "@/lib/structure";
import type { HierarchyTier } from "@prisma/client";

/** Current leaders holding a position at one exact node - backs the "who holds this" list under a node in the Structure tab. */
export async function GET(request: Request) {
  const callerId = await getCurrentMemberId();
  if (!callerId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const access = await getMemberAccess(callerId);
  if (!access || !hasAccess(access.permissions, "admin.members", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const scopeTier = searchParams.get("scopeTier") as HierarchyTier | null;
  const scopeId = searchParams.get("scopeId");
  if (!scopeTier || !scopeId) {
    return NextResponse.json({ error: "Missing scopeTier/scopeId" }, { status: 400 });
  }

  const scopes = await getScopesForPermission(callerId, "admin.members", "EDIT");
  if (!(await isWithinManagedScope(scopes, scopeTier, scopeId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const positions = await prisma.memberPosition.findMany({
    where: { scopeId, endDate: null, role: { scope: scopeTier } },
    select: {
      id: true,
      startDate: true,
      member: { select: { id: true, name: true, membershipNo: true } },
      role: { select: { id: true, name: true } },
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(positions);
}

/**
 * Grants a member a Role at a scope the caller manages. Two independent
 * containment checks: the role's own scope must fall inside the caller's
 * managed branch, AND the target member must already belong to one of the
 * local churches the caller's admin.members grant covers - a leader can't
 * reach outside the churches they oversee to appoint someone, even into a
 * position they'd otherwise be allowed to grant.
 */
export async function POST(request: Request) {
  const callerId = await getCurrentMemberId();
  if (!callerId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const access = await getMemberAccess(callerId);
  if (!access || !hasAccess(access.permissions, "admin.members", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const memberId = typeof body?.memberId === "string" ? body.memberId : "";
  const roleId = typeof body?.roleId === "string" ? body.roleId : "";
  const scopeId = typeof body?.scopeId === "string" ? body.scopeId : "";

  if (!memberId || !roleId || !scopeId) {
    return NextResponse.json({ error: "Missing member, role, or scope" }, { status: 400 });
  }

  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true, scope: true } });
  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const scopes = await getScopesForPermission(callerId, "admin.members", "EDIT");
  if (!(await isWithinManagedScope(scopes, role.scope, scopeId))) {
    return NextResponse.json({ error: "You don't manage that part of the church structure" }, { status: 403 });
  }

  const targetMember = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true, localChurchId: true } });
  if (!targetMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const scopedLocalChurchIds = await getScopedLocalChurchIds(callerId, "admin.members");
  if (!scopedLocalChurchIds.includes(targetMember.localChurchId)) {
    return NextResponse.json({ error: "That member is outside the branches you manage" }, { status: 403 });
  }

  const existing = await prisma.memberPosition.findFirst({
    where: { memberId, roleId, scopeId, endDate: null },
  });
  if (existing) {
    return NextResponse.json({ error: "This member already holds that position here" }, { status: 409 });
  }

  const created = await prisma.memberPosition.create({
    data: { memberId, roleId, scopeId },
    select: {
      id: true,
      startDate: true,
      member: { select: { id: true, name: true, membershipNo: true } },
      role: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ status: "ok" as const, position: created });
}
