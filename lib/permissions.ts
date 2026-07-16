import { prisma } from "@/lib/db";
import type { PermissionMap } from "@/lib/permission-check";

export type { PermissionMap };
export { hasAccess } from "@/lib/permission-check";

export interface MemberAccess {
  memberId: string;
  isLeader: boolean;
  permissions: PermissionMap;
}

/**
 * Resolves a signed-in Clerk identity to its church Member row and the full
 * VIEW/EDIT permission map derived from every current (endDate: null)
 * MemberPosition it holds. A key missing from `permissions` means frozen -
 * callers should never need a per-role branch, just a map lookup via
 * `hasAccess`.
 */
export async function getMemberAccess(clerkUserId: string | null | undefined): Promise<MemberAccess | null> {
  if (!clerkUserId) return null;

  const member = await prisma.member.findUnique({
    where: { clerkUserId },
    select: {
      id: true,
      positions: {
        where: { endDate: null },
        select: {
          role: {
            select: {
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
    isLeader: member.positions.length > 0,
    permissions,
  };
}
