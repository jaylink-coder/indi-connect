"use client";

import { useEffect, useState } from "react";
import { HierarchyTreeNode, type RollupNode } from "./HierarchyTree";

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
            <HierarchyTreeNode key={root.id} node={root} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}
