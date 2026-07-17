import { prisma } from "@/lib/db";
import type { ScopeRef } from "@/lib/hierarchy";
import { getLocalChurchesWithAncestorChain, type LocalChurchWithAncestorChain } from "@/lib/hierarchy";

export interface RollupNode {
  tier: "HEADQUARTERS" | "ARCHDIOCESE" | "DIOCESE" | "PARISH" | "LOCAL_CHURCH";
  id: string;
  name: string;
  memberCount: number;
  totalContributed: number;
  byCategory: Record<string, number>;
  /** Only meaningful at LOCAL_CHURCH - see LocalChurch.cessTargetAmount. */
  cessTarget: number | null;
  cessThisMonth: number;
  children: RollupNode[];
}

type LocalChurchWithChain = LocalChurchWithAncestorChain;

type Totals = { totalContributed: number; byCategory: Record<string, number> };

function emptyTotals(): Totals {
  return { totalContributed: 0, byCategory: {} };
}

function addTotals(target: Totals, amount: number, category: string) {
  target.totalContributed += amount;
  target.byCategory[category] = (target.byCategory[category] ?? 0) + amount;
}

function mergeTotals(target: Totals, source: Totals) {
  target.totalContributed += source.totalContributed;
  for (const [category, amount] of Object.entries(source.byCategory)) {
    target.byCategory[category] = (target.byCategory[category] ?? 0) + amount;
  }
}

function localChurchNode(
  church: LocalChurchWithChain,
  contribByChurch: Map<string, Totals>,
  cessThisMonthByChurch: Map<string, number>
): RollupNode {
  const totals = contribByChurch.get(church.id) ?? emptyTotals();
  return {
    tier: "LOCAL_CHURCH",
    id: church.id,
    name: church.name,
    memberCount: church._count.members,
    totalContributed: totals.totalContributed,
    byCategory: totals.byCategory,
    cessTarget: church.cessTargetAmount ? Number(church.cessTargetAmount) : null,
    cessThisMonth: cessThisMonthByChurch.get(church.id) ?? 0,
    children: [],
  };
}

function rollUp(tier: RollupNode["tier"], id: string, name: string, children: RollupNode[]): RollupNode {
  const totals = emptyTotals();
  let memberCount = 0;
  for (const child of children) {
    mergeTotals(totals, child);
    memberCount += child.memberCount;
  }
  return {
    tier,
    id,
    name,
    memberCount,
    totalContributed: totals.totalContributed,
    byCategory: totals.byCategory,
    cessTarget: null,
    cessThisMonth: 0,
    children,
  };
}

function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function buildParishNode(
  churches: LocalChurchWithChain[],
  contribByChurch: Map<string, Totals>,
  cessThisMonthByChurch: Map<string, number>
): RollupNode {
  return rollUp(
    "PARISH",
    churches[0].parish.id,
    churches[0].parish.name,
    churches.map((c) => localChurchNode(c, contribByChurch, cessThisMonthByChurch))
  );
}

function buildDioceseNode(
  churches: LocalChurchWithChain[],
  contribByChurch: Map<string, Totals>,
  cessThisMonthByChurch: Map<string, number>
): RollupNode {
  const parishGroups = groupBy(churches, (c) => c.parish.id);
  const parishNodes = [...parishGroups.values()].map((group) => buildParishNode(group, contribByChurch, cessThisMonthByChurch));
  return rollUp("DIOCESE", churches[0].parish.diocese.id, churches[0].parish.diocese.name, parishNodes);
}

function buildArchdioceseNode(
  churches: LocalChurchWithChain[],
  contribByChurch: Map<string, Totals>,
  cessThisMonthByChurch: Map<string, number>
): RollupNode {
  const dioceseGroups = groupBy(churches, (c) => c.parish.diocese.id);
  const dioceseNodes = [...dioceseGroups.values()].map((group) => buildDioceseNode(group, contribByChurch, cessThisMonthByChurch));
  return rollUp(
    "ARCHDIOCESE",
    churches[0].parish.diocese.archdiocese.id,
    churches[0].parish.diocese.archdiocese.name,
    dioceseNodes
  );
}

/**
 * Builds a financial rollup tree rooted at exactly the tier/scope a caller
 * holds - a HEADQUARTERS-scoped grant naturally gets the full org tree
 * (archdiocese -> diocese -> parish -> local church), a PARISH-scoped grant
 * gets just that parish's own local churches, with no visibility into
 * sibling parishes. Same idea as an investor's consolidated view scoped to
 * only the subsidiaries they actually hold shares in - the access
 * limitation isn't a separate pass, it falls out of which scope was asked
 * for.
 */
export async function getFinancialRollup(scopes: ScopeRef[]): Promise<RollupNode[]> {
  if (scopes.length === 0) return [];

  const allLocalChurches = await getLocalChurchesWithAncestorChain();

  const churchIds = allLocalChurches.map((c) => c.id);
  const contributions = await prisma.contribution.findMany({
    where: { member: { localChurchId: { in: churchIds } } },
    select: { amount: true, category: true, dateTransacted: true, member: { select: { localChurchId: true } } },
  });

  const contribByChurch = new Map<string, Totals>();
  const cessThisMonthByChurch = new Map<string, number>();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  for (const c of contributions) {
    const churchId = c.member.localChurchId;
    if (!contribByChurch.has(churchId)) contribByChurch.set(churchId, emptyTotals());
    addTotals(contribByChurch.get(churchId)!, Number(c.amount), c.category);

    if (c.category === "CESS" && c.dateTransacted >= monthStart) {
      cessThisMonthByChurch.set(churchId, (cessThisMonthByChurch.get(churchId) ?? 0) + Number(c.amount));
    }
  }

  const churchesByParish = groupBy(allLocalChurches, (c) => c.parish.id);
  const roots: RollupNode[] = [];

  for (const scope of scopes) {
    if (scope.tier === "LOCAL_CHURCH") {
      const church = allLocalChurches.find((c) => c.id === scope.id);
      if (church) roots.push(localChurchNode(church, contribByChurch, cessThisMonthByChurch));
      continue;
    }

    if (scope.tier === "PARISH") {
      const churches = churchesByParish.get(scope.id) ?? [];
      if (churches.length > 0) roots.push(buildParishNode(churches, contribByChurch, cessThisMonthByChurch));
      continue;
    }

    if (scope.tier === "DIOCESE") {
      const churches = allLocalChurches.filter((c) => c.parish.diocese.id === scope.id);
      if (churches.length > 0) roots.push(buildDioceseNode(churches, contribByChurch, cessThisMonthByChurch));
      continue;
    }

    if (scope.tier === "ARCHDIOCESE") {
      const churches = allLocalChurches.filter((c) => c.parish.diocese.archdiocese.id === scope.id);
      if (churches.length > 0) roots.push(buildArchdioceseNode(churches, contribByChurch, cessThisMonthByChurch));
      continue;
    }

    if (scope.tier === "HEADQUARTERS") {
      const churches = allLocalChurches.filter((c) => c.parish.diocese.archdiocese.headquarters.id === scope.id);
      if (churches.length === 0) continue;

      const archGroups = groupBy(churches, (c) => c.parish.diocese.archdiocese.id);
      const archNodes = [...archGroups.values()].map((group) => buildArchdioceseNode(group, contribByChurch, cessThisMonthByChurch));
      roots.push(rollUp("HEADQUARTERS", scope.id, churches[0].parish.diocese.archdiocese.headquarters.title, archNodes));
    }
  }

  return roots;
}
