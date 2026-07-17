export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";
import { PermissionAccess } from "@prisma/client";

const VALID_ACCESS = new Set(Object.values(PermissionAccess));

/**
 * Replaces a role's permission grants wholesale from the matrix editor.
 * body: { grants: { [permissionKey]: "VIEW" | "EDIT" | null } } - null
 * removes the grant (back to the default frozen state, same as no row).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ roleId: string }> }) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.roles", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { roleId } = await params;
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true } });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const grants = body?.grants;
  if (!grants || typeof grants !== "object") {
    return NextResponse.json({ error: "grants object is required" }, { status: 400 });
  }

  const entries = Object.entries(grants as Record<string, string | null>);
  for (const [, value] of entries) {
    if (value !== null && !VALID_ACCESS.has(value as PermissionAccess)) {
      return NextResponse.json({ error: `Invalid access value: ${value}` }, { status: 400 });
    }
  }

  const permissions = await prisma.permission.findMany({ select: { id: true, key: true } });
  const permissionIdByKey = new Map(permissions.map((p) => [p.key, p.id]));

  await prisma.$transaction(
    entries
      .filter(([key]) => permissionIdByKey.has(key))
      .map(([key, value]) => {
        const permissionId = permissionIdByKey.get(key)!;
        if (value === null) {
          return prisma.rolePermission.deleteMany({ where: { roleId, permissionId } });
        }
        return prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId } },
          update: { access: value as PermissionAccess },
          create: { roleId, permissionId, access: value as PermissionAccess },
        });
      })
  );

  return NextResponse.json({ status: "ok" as const });
}
