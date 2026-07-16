import { prisma } from "@/lib/db";
import type { HierarchyTier } from "@prisma/client";

export interface MemberDossier {
  id: string;
  membershipNo: string;
  name: string;
  idNumber: string | null;
  phone: string;
  dateOfBirth: string | null;
  placeOfResidence: string | null;
  joinedAt: string | null;
  hasLogin: boolean;
  registeredOn: string;
  localChurchName: string;
  parishName: string;
  dioceseName: string;
  archdioceseName: string;
  positions: { roleName: string; scopeTier: HierarchyTier; scopeName: string; startDate: string }[];
  totalContributed: number;
  recentContributions: { id: string; category: string; amount: number; date: string; receipt: string }[];
}

async function resolveScopeName(tier: HierarchyTier, scopeId: string): Promise<string> {
  switch (tier) {
    case "LOCAL_CHURCH":
      return (await prisma.localChurch.findUnique({ where: { id: scopeId }, select: { name: true } }))?.name ?? "Unknown";
    case "PARISH":
      return (await prisma.parish.findUnique({ where: { id: scopeId }, select: { name: true } }))?.name ?? "Unknown";
    case "DIOCESE":
      return (await prisma.diocese.findUnique({ where: { id: scopeId }, select: { name: true } }))?.name ?? "Unknown";
    case "ARCHDIOCESE":
      return (await prisma.archdiocese.findUnique({ where: { id: scopeId }, select: { name: true } }))?.name ?? "Unknown";
    case "HEADQUARTERS":
      return (await prisma.nationalHeadquarters.findUnique({ where: { id: scopeId }, select: { title: true } }))?.title ?? "Unknown";
    default:
      return "Unknown";
  }
}

/**
 * The consolidated "member dossier" - registration facts plus everything
 * that accumulates around a member over time (roles held, giving history).
 * Group/Fellowship affiliation isn't included yet - that model doesn't
 * exist yet (see roadmap); when it's built it slots in here the same way
 * positions do, not as fields on Member itself.
 */
export async function getMemberDossier(memberId: string): Promise<MemberDossier | null> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      membershipNo: true,
      name: true,
      idNumber: true,
      phone: true,
      dateOfBirth: true,
      placeOfResidence: true,
      joinedAt: true,
      pinHash: true,
      createdAt: true,
      localChurch: {
        select: {
          name: true,
          parish: {
            select: {
              name: true,
              diocese: {
                select: {
                  name: true,
                  archdiocese: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      positions: {
        where: { endDate: null },
        select: { scopeId: true, startDate: true, role: { select: { name: true, scope: true } } },
      },
      contributions: {
        orderBy: { dateTransacted: "desc" },
        take: 10,
        select: { id: true, category: true, amount: true, dateTransacted: true, mpesaReceiptNo: true },
      },
    },
  });

  if (!member) return null;

  const allContributions = await prisma.contribution.findMany({
    where: { memberId },
    select: { amount: true },
  });
  const totalContributed = allContributions.reduce((sum, c) => sum + Number(c.amount), 0);

  const positions = await Promise.all(
    member.positions.map(async (p) => ({
      roleName: p.role.name,
      scopeTier: p.role.scope,
      scopeName: await resolveScopeName(p.role.scope, p.scopeId),
      startDate: p.startDate.toISOString(),
    }))
  );

  return {
    id: member.id,
    membershipNo: member.membershipNo,
    name: member.name,
    idNumber: member.idNumber,
    phone: member.phone,
    dateOfBirth: member.dateOfBirth ? member.dateOfBirth.toISOString() : null,
    placeOfResidence: member.placeOfResidence,
    joinedAt: member.joinedAt ? member.joinedAt.toISOString() : null,
    hasLogin: member.pinHash !== null,
    registeredOn: member.createdAt.toISOString(),
    localChurchName: member.localChurch.name,
    parishName: member.localChurch.parish.name,
    dioceseName: member.localChurch.parish.diocese.name,
    archdioceseName: member.localChurch.parish.diocese.archdiocese.name,
    positions,
    totalContributed,
    recentContributions: member.contributions.map((c) => ({
      id: c.id,
      category: c.category,
      amount: Number(c.amount),
      date: c.dateTransacted.toISOString(),
      receipt: c.mpesaReceiptNo,
    })),
  };
}
