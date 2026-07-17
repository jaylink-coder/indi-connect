import { prisma } from "@/lib/db";
import type { PermissionMap } from "@/lib/permission-check";

export type { PermissionMap };
export { hasAccess } from "@/lib/permission-check";

export interface MemberAccess {
  memberId: string;
  name: string;
  isLeader: boolean;
  permissions: PermissionMap;
  roleNames: string[];
}

/**
 * Resolves a signed-in member's own id to the full VIEW/EDIT permission map
 * derived from every current (endDate: null) MemberPosition it holds. A key
 * missing from `permissions` means frozen - callers should never need a
 * per-role branch, just a map lookup via `hasAccess`.
 */
export async function getMemberAccess(memberId: string | null | undefined): Promise<MemberAccess | null> {
  if (!memberId) return null;

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      name: true,
      positions: {
        where: { endDate: null },
        select: {
          role: {
            select: {
              name: true,
              permissions: {
                select: {
                  access: true,
                  permission: { select: { key: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!member) return null;

  const permissions: PermissionMap = {};
  for (const position of member.positions) {
    for (const grant of position.role.permissions) {
      const key = grant.permission.key;
      const existing = permissions[key];
      if (!existing || (existing === "VIEW" && grant.access === "EDIT")) {
        permissions[key] = grant.access;
      }
    }
  }

  return {
    memberId: member.id,
    name: member.name,
    isLeader: member.positions.length > 0,
    permissions,
    roleNames: [...new Set(member.positions.map((p) => p.role.name))],
  };
}
