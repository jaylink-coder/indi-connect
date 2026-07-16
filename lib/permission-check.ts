import type { PermissionAccess } from "@prisma/client";

export type PermissionMap = Record<string, PermissionAccess>;

/**
 * Split out from lib/permissions.ts (which imports Prisma/db) so client
 * components can gate UI on a permission map - fetched from the server via
 * /api/member/access - without pulling PrismaClient into the browser bundle.
 * VIEW is satisfied by either VIEW or EDIT; EDIT requires EDIT specifically.
 */
export function hasAccess(map: PermissionMap, key: string, required: PermissionAccess = "VIEW"): boolean {
  const level = map[key];
  if (!level) return false;
  if (required === "VIEW") return true;
  return level === "EDIT";
}
