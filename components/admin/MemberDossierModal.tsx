"use client";

import { useEffect, useState } from "react";

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
  positions: { roleName: string; scopeTier: string; scopeName: string; startDate: string }[];
  groups: { groupName: string; status: string; joinedGroupAt: string }[];
  totalContributed: number;
  contributionsByCategory: Record<string, number>;
  recentContributions: { id: string; category: string; amount: number; date: string; receipt: string }[];
}

export const CATEGORY_LABEL: Record<string, string> = {
  TITHE: "Tithe (Zaka)",
  SADAKA: "Sadaka",
  CALL_REGISTRY: "Call Registry",
  OPERATIONS: "Church Operations",
  CESS: "Cess",
  PROJECT: "Church Project",
  WELFARE: "Welfare",
};

/**
 * The per-individual "command centre" view - every allocation a member has
 * (roles, groups/fellowships, giving broken down by category) in one place,
 * instead of hunting for their name across separate whole-list tabs.
 */
export function MemberDossierModal({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const [dossier, setDossier] = useState<MemberDossier | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/members/${memberId}/dossier`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || "Failed to load member dossier");
        setDossier(body);
      })
      .catch((err) => setError(err.message));
  }, [memberId]);

  const categoryEntries = dossier ? Object.entries(dossier.contributionsByCategory) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-bold text-[#024424]">Member Dossier</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            Close
          </button>
        </div>

        {error && <p className="py-6 text-center text-sm text-[#B22222]">{error}</p>}
        {!error && !dossier && <p className="py-6 text-center text-sm text-gray-400">Loading...</p>}

        {dossier && (
          <div className="space-y-5">
            <div>
              <p className="text-lg font-bold text-gray-900">{dossier.name}</p>
              <p className="font-mono text-xs text-gray-400">{dossier.membershipNo}</p>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Registration Details</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-gray-50 p-3 text-xs">
                <span className="text-gray-500">Id No.</span>
                <span className="text-right font-mono text-gray-900">{dossier.idNumber ?? "Not recorded"}</span>
                <span className="text-gray-500">Phone No.</span>
                <span className="text-right font-mono text-gray-900">{dossier.phone}</span>
                <span className="text-gray-500">Date of Birth</span>
                <span className="text-right text-gray-900">
                  {dossier.dateOfBirth ? new Date(dossier.dateOfBirth).toLocaleDateString("en-GB") : "Not recorded"}
                </span>
                <span className="text-gray-500">Place of Residence</span>
                <span className="text-right text-gray-900">{dossier.placeOfResidence ?? "Not recorded"}</span>
                <span className="text-gray-500">Local Church</span>
                <span className="text-right font-bold text-gray-900">{dossier.localChurchName}</span>
                <span className="text-gray-500">Parish</span>
                <span className="text-right text-gray-900">{dossier.parishName}</span>
                <span className="text-gray-500">Diocese</span>
                <span className="text-right text-gray-900">{dossier.dioceseName}</span>
                <span className="text-gray-500">Archdiocese</span>
                <span className="text-right text-gray-900">{dossier.archdioceseName}</span>
                <span className="text-gray-500">Date Joined</span>
                <span className="text-right text-gray-900">
                  {dossier.joinedAt
                    ? new Date(dossier.joinedAt).toLocaleDateString("en-GB")
                    : new Date(dossier.registeredOn).toLocaleDateString("en-GB")}
                </span>
                <span className="text-gray-500">Login</span>
                <span className="text-right">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      dossier.hasLogin ? "bg-green-50 text-green-700" : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {dossier.hasLogin ? "Set up" : "No login yet"}
                  </span>
                </span>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Roles &amp; Positions</p>
              {dossier.positions.length === 0 ? (
                <p className="text-xs text-gray-400">Holds no leadership position.</p>
              ) : (
                <div className="space-y-1.5">
                  {dossier.positions.map((p, i) => (
                    <div key={i} className="rounded-lg bg-gray-50 px-3 py-2 text-xs">
                      <span className="font-bold text-[#024424]">{p.roleName}</span>
                      <span className="text-gray-500"> - {p.scopeName}</span>
                      <span className="ml-1 text-gray-400">
                        (since {new Date(p.startDate).toLocaleDateString("en-GB")})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Groups &amp; Movements</p>
              {dossier.groups.length === 0 ? (
                <p className="text-xs text-gray-400">Not in any group or fellowship yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {dossier.groups.map((g, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                      <span className="font-bold text-gray-800">{g.groupName}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          g.status === "ACTIVE"
                            ? "bg-green-50 text-[#024424]"
                            : g.status === "SUSPENDED"
                              ? "bg-red-50 text-[#B22222]"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {g.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Allocations by Category</p>
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
                  Total: KES {dossier.totalContributed.toLocaleString()}
                </span>
              </div>
              {categoryEntries.length === 0 ? (
                <p className="text-xs text-gray-400">No contributions recorded yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {categoryEntries.map(([category, amount]) => (
                    <div key={category} className="rounded-lg bg-gray-50 px-3 py-2 text-xs">
                      <p className="text-gray-500">{CATEGORY_LABEL[category] ?? category}</p>
                      <p className="font-mono font-bold text-gray-900">KES {amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Recent Contributions</p>
              {dossier.recentContributions.length === 0 ? (
                <p className="text-xs text-gray-400">No contributions recorded yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {dossier.recentContributions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                      <div>
                        <p className="font-semibold text-gray-800">{CATEGORY_LABEL[c.category] ?? c.category}</p>
                        <p className="font-mono text-[10px] text-gray-400">
                          {c.receipt} - {new Date(c.date).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-gray-900">KES {c.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
