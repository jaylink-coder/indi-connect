"use client";

import { useEffect, useMemo, useState } from "react";
import { MemberDossierModal, CATEGORY_LABEL } from "./MemberDossierModal";

interface ContributionRow {
  amount: string;
  category: string;
}

interface MemberSearchRow {
  id: string;
  membershipNo: string;
  name: string;
  localChurch: { name: string; parish: { name: string } };
}

/**
 * The single entry point for "find one person and see everything about
 * them" - categorized totals up top (so no one has to scroll a giant flat
 * list to understand where the money is), then a search that jumps
 * straight into that person's own categorized allocations (roles, groups,
 * giving) via the same dossier used elsewhere.
 */
export function CommandCentreTab() {
  const [contributions, setContributions] = useState<ContributionRow[] | null>(null);
  const [contributionsError, setContributionsError] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberSearchRow[] | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/contributions")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(setContributions)
      .catch((status) => setContributionsError(status === 403 ? "Requires Contributions access." : "Couldn't load the allocation summary."));
    fetch("/api/members")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(setMembers)
      .catch((status) => setMembersError(status === 403 ? "Requires Member Management access." : "Couldn't load members to search."));
  }, []);

  const byCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const row of contributions ?? []) {
      totals[row.category] = (totals[row.category] ?? 0) + Number(row.amount);
    }
    return totals;
  }, [contributions]);

  const grandTotal = useMemo(() => Object.values(byCategory).reduce((sum, v) => sum + v, 0), [byCategory]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !members) return [];
    return members
      .filter((m) => m.name.toLowerCase().includes(q) || m.membershipNo.toLowerCase().includes(q))
      .slice(0, 15);
  }, [members, search]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-lg font-bold text-[#024424]">Allocations by Category</h3>
            <p className="mt-1 text-xs text-gray-500">Everything given across your scope, categorized - not one long transaction list.</p>
          </div>
          {contributions && (
            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
              Total: KES {grandTotal.toLocaleString()}
            </span>
          )}
        </div>

        {contributionsError && <p className="text-sm text-gray-400">{contributionsError}</p>}
        {!contributionsError && !contributions && <p className="py-4 text-center text-sm text-gray-400">Loading...</p>}
        {contributions && Object.keys(byCategory).length === 0 && (
          <p className="py-4 text-center text-sm text-gray-400">No contributions recorded yet.</p>
        )}
        {contributions && Object.keys(byCategory).length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(byCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([category, total]) => (
                <div key={category} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-500">{CATEGORY_LABEL[category] ?? category}</p>
                  <p className="mt-1 font-mono text-sm font-black text-[#024424]">KES {total.toLocaleString()}</p>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 border-b pb-3">
          <h3 className="text-lg font-bold text-[#024424]">Find a Person</h3>
          <p className="mt-1 text-xs text-gray-500">
            Search any member to see their own roles, groups, and giving - categorized, in one place.
          </p>
        </div>

        {membersError && <p className="text-sm text-gray-400">{membersError}</p>}

        {!membersError && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or Church No..."
            className="w-full max-w-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
        )}

        {!membersError && search.trim() && (
          <div className="mt-4 space-y-1.5">
            {results.length === 0 && <p className="text-sm text-gray-400">No matching members.</p>}
            {results.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setViewingMemberId(m.id)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span>
                  <span className="font-bold text-gray-900">{m.name}</span>
                  <span className="ml-2 font-mono text-xs text-gray-400">{m.membershipNo}</span>
                </span>
                <span className="text-xs text-gray-500">
                  {m.localChurch.name} · {m.localChurch.parish.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {viewingMemberId && <MemberDossierModal memberId={viewingMemberId} onClose={() => setViewingMemberId(null)} />}
    </div>
  );
}
