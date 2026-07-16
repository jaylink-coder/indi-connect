import { prisma } from "@/lib/db";

const CATEGORY_LABEL: Record<string, string> = {
  TITHE: "Tithe (Zaka)",
  CESS: "Cess Quota",
  OPERATIONS: "Church Operations",
  PROJECT: "Church Projects (Mĩako)",
  WELFARE: "Welfare",
  CALL_REGISTRY: "Call Registry",
  SADAKA: "Sadaka",
};

export interface AccountSummary {
  member: {
    id: string;
    name: string;
    membershipNo: string;
    phone: string;
    localChurchName: string;
    parishName: string;
    dioceseName: string;
  };
  totalContributed: number;
  byCategory: Record<string, number>;
  recentContributions: Array<{
    id: string;
    type: string;
    amount: number;
    date: string;
    receipt: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    status: string;
    myTotalInput: number;
    target: number;
    raised: number;
  }>;
}

/**
 * Reads a member's giving picture straight from Contribution rows at
 * request time rather than keeping a persisted running balance - avoids the
 * dashboard, SMS receipt, and admin ledger ever drifting out of sync with
 * each other.
 */
export async function getMemberAccountSummary(memberId: string): Promise<AccountSummary | null> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { localChurch: { include: { parish: { include: { diocese: true } } } } },
  });
  if (!member) return null;

  const contributions = await prisma.contribution.findMany({
    where: { memberId },
    orderBy: { dateTransacted: "desc" },
  });

  const totalContributed = contributions.reduce((sum, c) => sum + Number(c.amount), 0);

  const byCategory: Record<string, number> = {};
  for (const c of contributions) {
    byCategory[c.category] = (byCategory[c.category] ?? 0) + Number(c.amount);
  }

  const recentContributions = contributions.slice(0, 10).map((c) => ({
    id: c.id,
    type: CATEGORY_LABEL[c.category] ?? c.category,
    amount: Number(c.amount),
    date: c.dateTransacted.toISOString(),
    receipt: c.mpesaReceiptNo,
  }));

  const projectIds = [...new Set(contributions.flatMap((c) => (c.projectId ? [c.projectId] : [])))];
  const projects = projectIds.length
    ? await prisma.project.findMany({
        where: { id: { in: projectIds } },
        include: { contributions: { select: { amount: true } } },
      })
    : [];

  const projectSummaries = projects.map((project) => ({
    id: project.id,
    name: project.name,
    status: project.status,
    target: Number(project.targetAmount),
    raised: project.contributions.reduce((sum, c) => sum + Number(c.amount), 0),
    myTotalInput: contributions
      .filter((c) => c.projectId === project.id)
      .reduce((sum, c) => sum + Number(c.amount), 0),
  }));

  return {
    member: {
      id: member.id,
      name: member.name,
      membershipNo: member.membershipNo,
      phone: member.phone,
      localChurchName: member.localChurch.name,
      parishName: member.localChurch.parish.name,
      dioceseName: member.localChurch.parish.diocese.name,
    },
    totalContributed,
    byCategory,
    recentContributions,
    projects: projectSummaries,
  };
}
