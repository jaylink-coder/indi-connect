import { prisma } from "@/lib/db";
import type { HierarchyTier } from "@prisma/client";
import type { ScopeRef } from "@/lib/hierarchy";

export interface StructureNode {
  tier: HierarchyTier;
  id: string;
  name: string;
  children: StructureNode[];
}

const CHILD_TIER: Partial<Record<HierarchyTier, HierarchyTier>> = {
  HEADQUARTERS: "ARCHDIOCESE",
  ARCHDIOCESE: "DIOCESE",
  DIOCESE: "PARISH",
  PARISH: "LOCAL_CHURCH",
};

export function childTierOf(tier: HierarchyTier): HierarchyTier | null {
  return CHILD_TIER[tier] ?? null;
}

function findNode(nodes: StructureNode[], tier: HierarchyTier, id: string): StructureNode | null {
  for (const node of nodes) {
    if (node.tier === tier && node.id === id) return node;
    const found = findNode(node.children, tier, id);
    if (found) return found;
  }
  return null;
}

/**
 * The full org chart, top-down, so branches with no leaves yet (a brand new
 * Diocese with no Parishes registered) still show up as somewhere to build
 * under - unlike the financial rollup (lib/rollup.ts), which is built
 * bottom-up from LocalChurch rows and so silently drops empty branches.
 */
async function getFullStructureTree(): Promise<StructureNode[]> {
  const headquarters = await prisma.nationalHeadquarters.findMany({
    include: {
      archdioceses: {
        include: {
          dioceses: {
            include: {
              parishes: {
                include: { outposts: { select: { id: true, name: true } } },
              },
            },
          },
        },
      },
    },
  });

  return headquarters.map((hq) => ({
    tier: "HEADQUARTERS" as const,
    id: hq.id,
    name: hq.title,
    children: hq.archdioceses.map((arch) => ({
      tier: "ARCHDIOCESE" as const,
      id: arch.id,
      name: arch.name,
      children: arch.dioceses.map((dio) => ({
        tier: "DIOCESE" as const,
        id: dio.id,
        name: dio.name,
        children: dio.parishes.map((par) => ({
          tier: "PARISH" as const,
          id: par.id,
          name: par.name,
          children: par.outposts.map((lc) => ({
            tier: "LOCAL_CHURCH" as const,
            id: lc.id,
            name: lc.name,
            children: [] as StructureNode[],
          })),
        })),
      })),
    })),
  }));
}

/**
 * Same "rooted at exactly the scope granted" idea as getFinancialRollup, but
 * top-down so empty branches remain visible as places to build under.
 */
export async function getManagedStructureTree(scopes: ScopeRef[]): Promise<StructureNode[]> {
  if (scopes.length === 0) return [];

  const fullTree = await getFullStructureTree();
  const roots: StructureNode[] = [];
  const seen = new Set<string>();

  for (const scope of scopes) {
    const node = findNode(fullTree, scope.tier, scope.id);
    if (node && !seen.has(node.id)) {
      seen.add(node.id);
      roots.push(node);
    }
  }
  return roots;
}

/** Whether (tier, id) is the caller's own granted scope or a descendant of it - the containment check every structure mutation relies on. */
export async function isWithinManagedScope(scopes: ScopeRef[], tier: HierarchyTier, id: string): Promise<boolean> {
  const tree = await getManagedStructureTree(scopes);
  return findNode(tree, tier, id) !== null;
}
