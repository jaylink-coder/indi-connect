export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";
import { HierarchyTier } from "@prisma/client";

/**
 * The full Role catalog. When called with no params, returns the light
 * shape used by the "Assign Leader" picker (every role, not just ones the
 * caller can grant - POST /api/admin/positions is what actually enforces
 * scope). With ?withGrants=1 (admin.roles only), also returns each role's
 * current permission grants, for the Roles & Permissions matrix editor.
 */
export async function GET(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const url = new URL(request.url);
  const withGrants = url.searchParams.get("withGrants") === "1";

  if (withGrants) {
    const access = await getMemberAccess(memberId);
    if (!access || !hasAccess(access.permissions, "admin.roles")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        scope: true,
        description: true,
        permissions: { select: { access: true, permission: { select: { key: true } } } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(
      roles.map((r) => ({
        id: r.id,
        name: r.name,
        scope: r.scope,
        description: r.description,
        grants: Object.fromEntries(r.permissions.map((p) => [p.permission.key, p.access])),
      }))
    );
  }

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.members", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const roles = await prisma.role.findMany({
    select: { id: true, name: true, scope: true, description: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(roles);
}

const VALID_TIERS = new Set(Object.values(HierarchyTier));

/** Creates a new role, with no permission grants yet - grant access afterward from the matrix editor. */
export async function POST(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.roles", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const scope = typeof body?.scope === "string" ? body.scope : "";
  const description = typeof body?.description === "string" && body.description.trim() ? body.description.trim() : null;

  if (!name || !VALID_TIERS.has(scope as HierarchyTier)) {
    return NextResponse.json({ error: "A name and a valid scope tier are required" }, { status: 400 });
  }

  try {
    const role = await prisma.role.create({
      data: { name, scope: scope as HierarchyTier, description },
      select: { id: true, name: true, scope: true, description: true },
    });
    return NextResponse.json({ status: "ok" as const, role });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "A role with that name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create role", details: String(error) }, { status: 500 });
  }
}
