import { prisma } from "@/lib/db";
import type { HierarchyTier } from "@prisma/client";

export interface ScopeRef {
  tier: HierarchyTier;
  id: string;
}

/**
 * Walks a member's position in the AIPCA hierarchy from their local church
 * all the way up to national HQ. Projects/WelfareCases are scoped to any
 * tier (a local roofing fund vs. a national disaster fund), so this chain
 * is how we decide which of them a given member should even see.
 */
export async function getMemberScopeChain(memberId: string): Promise<ScopeRef[]> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      localChurchId: true,
      localChurch: {
        select: {
          parishId: true,
          parish: {
            select: {
              dioceseId: true,
              diocese: {
                select: {
                  archidId: true,
                  archdiocese: { select: { headquartersId: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!member) return [];

  return [
    { tier: "LOCAL_CHURCH", id: member.localChurchId },
    { tier: "PARISH", id: member.localChurch.parishId },
    { tier: "DIOCESE", id: member.localChurch.parish.dioceseId },
    { tier: "HEADQUARTERS", id: member.localChurch.parish.diocese.archdiocese.headquartersId },
  ];
}

/**
 * The inverse of getMemberScopeChain: given a position's scope (e.g. a
 * Parish Chairman's PARISH-level MemberPosition), resolves every
 * LocalChurch id underneath it. Used to decide which members a leader's
 * admin.attendance grant actually covers - a parish chairman marks
 * attendance for every local church in their parish, not just one.
 */
export async function getLocalChurchIdsInScope(tier: HierarchyTier, scopeId: string): Promise<string[]> {
  switch (tier) {
    case "LOCAL_CHURCH":
      return [scopeId];

    case "PARISH": {
      const churches = await prisma.localChurch.findMany({
        where: { parishId: scopeId },
        select: { id: true },
      });
      return churches.map((c) => c.id);
    }

    case "DIOCESE": {
      const churches = await prisma.localChurch.findMany({
        where: { parish: { dioceseId: scopeId } },
        select: { id: true },
      });
      return churches.map((c) => c.id);
    }

    case "HEADQUARTERS": {
      const churches = await prisma.localChurch.findMany({
        where: { parish: { diocese: { archdiocese: { headquartersId: scopeId } } } },
        select: { id: true },
      });
      return churches.map((c) => c.id);
    }

    default:
      return [];
  }
}

/**
 * Every LocalChurch id a member can act on for a given permission key,
 * unioned across all of their current MemberPositions that grant it - a
 * member holding both a LOCAL_CHURCH and a PARISH position with the same
 * permission sees the union, not just one.
 */
export async function getScopedLocalChurchIds(memberId: string, permissionKey: string): Promise<string[]> {
  const positions = await prisma.memberPosition.findMany({
    where: {
      memberId,
      endDate: null,
      role: { permissions: { some: { permission: { key: permissionKey } } } },
    },
    select: { scopeId: true, role: { select: { scope: true } } },
  });

  const idSets = await Promise.all(positions.map((p) => getLocalChurchIdsInScope(p.role.scope, p.scopeId)));
  return [...new Set(idSets.flat())];
}

/** The raw (tier, scopeId) pairs behind a member's current positions that grant a given permission - e.g. which Project/WelfareCase scopes they're allowed to create/manage under. */
export async function getScopesForPermission(memberId: string, permissionKey: string): Promise<ScopeRef[]> {
  const positions = await prisma.memberPosition.findMany({
    where: {
      memberId,
      endDate: null,
      role: { permissions: { some: { permission: { key: permissionKey } } } },
    },
    select: { scopeId: true, role: { select: { scope: true } } },
  });

  return positions.map((p) => ({ tier: p.role.scope, id: p.scopeId }));
}
