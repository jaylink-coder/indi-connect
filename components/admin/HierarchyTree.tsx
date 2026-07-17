"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Building2 } from "lucide-react";

export interface RollupNode {
  tier: "HEADQUARTERS" | "ARCHDIOCESE" | "DIOCESE" | "PARISH" | "LOCAL_CHURCH";
  id: string;
  name: string;
  memberCount: number;
  totalContributed: number;
  byCategory: Record<string, number>;
  cessTarget: number | null;
  cessThisMonth: number;
  children: RollupNode[];
}

export const TIER_LABEL: Record<RollupNode["tier"], string> = {
  HEADQUARTERS: "National Headquarters",
  ARCHDIOCESE: "Archdiocese",
  DIOCESE: "Diocese",
  PARISH: "Parish",
  LOCAL_CHURCH: "Local Church",
};

/** Flattens a rollup tree down to just its Local Church leaves - used to decide whether a caller's scope is a single church (skip the tree, act directly) or spans several (must drill in first). */
export function collectLocalChurchLeaves(nodes: RollupNode[]): RollupNode[] {
  const out: RollupNode[] = [];
  function walk(n: RollupNode) {
    if (n.tier === "LOCAL_CHURCH") out.push(n);
    for (const c of n.children) walk(c);
  }
  for (const n of nodes) walk(n);
  return out;
}

interface HierarchyTreeNodeProps {
  node: RollupNode;
  depth: number;
  selectedId?: string | null;
  onSelectLocalChurch?: (node: RollupNode) => void;
}

/**
 * Shared by RollupTab (pure drill-down: Archdiocese -> Diocese -> Parish ->
 * Local Church) and CommandCentreTab (same drill-down, but a Local Church
 * leaf is clickable to scope the person search to that one church) - one
 * copy of the tree-rendering so the two never drift apart. Passing
 * onSelectLocalChurch turns leaves into a selection action instead of a
 * dead end; omitting it (RollupTab's case) keeps today's expand-only
 * behavior unchanged.
 */
export function HierarchyTreeNode({ node, depth, selectedId, onSelectLocalChurch }: HierarchyTreeNodeProps) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = node.children.length > 0;
  const isSelectable = node.tier === "LOCAL_CHURCH" && !!onSelectLocalChurch;
  const isSelected = isSelectable && selectedId === node.id;

  function handleClick() {
    if (isSelectable) {
      onSelectLocalChurch!(node);
      return;
    }
    if (hasChildren) setOpen((v) => !v);
  }

  return (
    <div className={depth > 0 ? "border-l border-gray-100 pl-4" : ""}>
      <button
        type="button"
        onClick={handleClick}
        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
          hasChildren || isSelectable ? "cursor-pointer hover:bg-gray-50" : "cursor-default"
        } ${isSelected ? "bg-green-50 ring-1 ring-inset ring-[#024424]" : ""}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {hasChildren ? (
            open ? (
              <ChevronDown size={14} className="shrink-0 text-gray-400" />
            ) : (
              <ChevronRight size={14} className="shrink-0 text-gray-400" />
            )
          ) : (
            <Building2 size={13} className={`shrink-0 ${isSelectable ? "text-[#024424]" : "text-gray-300"}`} />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900">{node.name}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {TIER_LABEL[node.tier]} • {node.memberCount.toLocaleString()} member{node.memberCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm font-black text-[#024424]">KES {node.totalContributed.toLocaleString()}</p>
          {node.tier === "LOCAL_CHURCH" && (
            <p className="text-[10px] text-gray-400">
              {node.cessTarget !== null
                ? `Cess this month: KES ${node.cessThisMonth.toLocaleString()} / ${node.cessTarget.toLocaleString()}`
                : "No Cess quota set"}
            </p>
          )}
        </div>
      </button>

      {open && hasChildren && (
        <div className="ml-3 space-y-0.5 border-l border-gray-100 pl-2">
          {node.children
            .slice()
            .sort((a, b) => b.totalContributed - a.totalContributed)
            .map((child) => (
              <HierarchyTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelectLocalChurch={onSelectLocalChurch}
              />
            ))}
        </div>
      )}
    </div>
  );
}
