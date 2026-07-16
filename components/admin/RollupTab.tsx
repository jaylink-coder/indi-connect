"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Building2 } from "lucide-react";

interface RollupNode {
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

const TIER_LABEL: Record<RollupNode["tier"], string> = {
  HEADQUARTERS: "National Headquarters",
  ARCHDIOCESE: "Archdiocese",
  DIOCESE: "Diocese",
  PARISH: "Parish",
  LOCAL_CHURCH: "Local Church",
};

/**
 * The "investor sees every subsidiary" view - a recursive, expandable tree.
 * Which node(s) a caller even receives is decided server-side by their
 * admin.rollup scope (see /api/admin/rollup); this component just renders
 * whatever tree it's handed, at any depth.
 */
function Node({ node, depth }: { node: RollupNode; depth: number }) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = node.children.length > 0;

  return (
    <div className={depth > 0 ? "border-l border-gray-100 pl-4" : ""}>
      <button
        type="button"
        onClick={() => hasChildren && setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
          hasChildren ? "cursor-pointer hover:bg-gray-50" : "cursor-default"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {hasChildren ? (
            open ? (
              <ChevronDown size={14} className="shrink-0 text-gray-400" />
            ) : (
              <ChevronRight size={14} className="shrink-0 text-gray-400" />
            )
          ) : (
            <Building2 size={13} className="shrink-0 text-gray-300" />
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
              <Node key={child.id} node={child} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}

export function RollupTab() {
  const [roots, setRoots] = useState<RollupNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/rollup")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || "Failed to load rollup");
        setRoots(body.roots);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 border-b pb-3">
        <h3 className="text-lg font-bold text-[#024424]">Financial Rollup</h3>
        <p className="mt-1 text-xs text-gray-500">
          Consolidated giving across the hierarchy you oversee, from the top level down to each local church.
          Tap a row to drill in.
        </p>
      </div>

      {error && <p className="py-6 text-center text-sm text-[#B22222]">{error}</p>}
      {!error && !roots && <p className="py-6 text-center text-sm text-gray-400">Loading...</p>}
      {roots && roots.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">No hierarchy in your scope yet.</p>
      )}
      {roots && roots.length > 0 && (
        <div className="space-y-1">
          {roots.map((root) => (
            <Node key={root.id} node={root} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}
