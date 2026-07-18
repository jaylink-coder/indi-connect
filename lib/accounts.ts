import { prisma } from "@/lib/db";
import { estimateCompletion, type VelocityEstimate } from "@/lib/projectVelocity";

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
  cessTarget: number | null;
  cessThisMonth: number;
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
    /** This member's own pledge toward the project, if a leader has assigned one - "my standing" is assignedAmount vs myTotalInput. */
    assignedAmount: number | null;
    velocity: VelocityEstimate;
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

  // Cess is due monthly, not as a one-time lifetime target - a member who
  // paid up in January should not look "fully paid" forever in June.
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const cessThisMonth = contributions
    .filter((c) => c.category === "CESS" && c.dateTransacted >= monthStart)
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const recentContributions = contributions.slice(0, 10).map((c) => ({
    id: c.id,
    type: CATEGORY_LABEL[c.category] ?? c.category,
    amount: Number(c.amount),
    date: c.dateTransacted.toISOString(),
    receipt: c.mpesaReceiptNo,
  }));

  // A project shows up here if the member has either given to it already, or
  // been assigned a personal pledge for it (even before paying anything) -
  // "my standing" needs to be visible from the moment a pledge is set.
  const contributedProjectIds = [...new Set(contributions.flatMap((c) => (c.projectId ? [c.projectId] : [])))];
  const myAssignments = await prisma.projectAssignment.findMany({
    where: { memberId },
    select: { projectId: true, assignedAmount: true },
  });
  const assignedAmountByProject = new Map(myAssignments.map((a) => [a.projectId, Number(a.assignedAmount)]));
  const projectIds = [...new Set([...contributedProjectIds, ...myAssignments.map((a) => a.projectId)])];

  const projects = projectIds.length
    ? await prisma.project.findMany({
        where: { id: { in: projectIds } },
        include: { contributions: { select: { amount: true, dateTransacted: true } } },
      })
    : [];

  const projectSummaries = projects.map((project) => {
    const raised = project.contributions.reduce((sum, c) => sum + Number(c.amount), 0);
    const target = Number(project.targetAmount);
    return {
      id: project.id,
      name: project.name,
      status: project.status,
      target,
      raised,
      myTotalInput: contributions
        .filter((c) => c.projectId === project.id)
        .reduce((sum, c) => sum + Number(c.amount), 0),
      assignedAmount: assignedAmountByProject.get(project.id) ?? null,
      velocity: estimateCompletion(
        project.contributions.map((c) => ({ amount: Number(c.amount), date: c.dateTransacted })),
        target,
        raised
      ),
    };
  });

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
    cessTarget: member.localChurch.cessTargetAmount ? Number(member.localChurch.cessTargetAmount) : null,
    cessThisMonth,
    recentContributions,
    projects: projectSummaries,
  };
}
