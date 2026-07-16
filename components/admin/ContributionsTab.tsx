"use client";

import { useEffect, useMemo, useState } from "react";
import { UnmatchedPaymentsPanel } from "./UnmatchedPaymentsPanel";

interface ContributionRow {
  id: string;
  amount: string;
  category: string;
  mpesaReceiptNo: string;
  dateTransacted: string;
  member: { name: string; membershipNo: string; localChurch: { name: string } };
  paidByMember?: { name: string } | null;
}

const CATEGORY_LABEL: Record<string, string> = {
  TITHE: "Tithe",
  CESS: "Cess",
  CALL_REGISTRY: "Call Registry",
  OPERATIONS: "Operations",
  PROJECT: "Projects",
  WELFARE: "Welfare",
  SADAKA: "Sadaka",
};

export function ContributionsTab() {
  const [rows, setRows] = useState<ContributionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/contributions")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || "Failed to load contributions");
        setRows(body);
      })
      .catch((err) => setError(err.message));
  }, []);

  const byCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const row of rows ?? []) {
      totals[row.category] = (totals[row.category] ?? 0) + Number(row.amount);
    }
    return totals;
  }, [rows]);

  const byChurch = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const row of rows ?? []) {
      const name = row.member.localChurch.name;
      totals[name] = (totals[name] ?? 0) + Number(row.amount);
    }
    return totals;
  }, [rows]);

  const grandTotal = useMemo(() => Object.values(byCategory).reduce((sum, v) => sum + v, 0), [byCategory]);
  const churchNames = Object.keys(byChurch);

  return (
    <div className="space-y-6">
      <UnmatchedPaymentsPanel />

      {rows && rows.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-bold text-[#024424]">Fund Summary</h3>
            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
              Total: KES {grandTotal.toLocaleString()}
            </span>
          </div>
          <p className="mb-4 text-xs text-gray-500">
            All of this money lands in the same bank account, but stays tracked separately by purpose - Tithe money
            is never mixed with Cess, Call Registry, Projects, or Welfare money.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Object.entries(byCategory).map(([category, total]) => (
              <div key={category} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-semibold text-gray-500">{CATEGORY_LABEL[category] ?? category}</p>
                <p className="mt-1 font-mono text-sm font-black text-[#024424]">KES {total.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {churchNames.length > 1 && (
            <>
              <p className="mb-2 mt-5 border-t pt-4 text-xs font-semibold text-gray-500">By Local Church</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {churchNames.map((name) => (
                  <div key={name} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-500">{name}</p>
                    <p className="mt-1 font-mono text-sm font-black text-[#024424]">
                      KES {byChurch[name].toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-[#024424]">Recent Contributions</h3>

        {error && <p className="text-sm text-[#B22222]">{error}</p>}
        {!error && !rows && <p className="py-6 text-center text-sm text-gray-400">Loading...</p>}
        {rows && rows.length === 0 && <p className="py-6 text-center text-sm text-gray-400">No contributions yet.</p>}

        {rows && rows.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Local Church</th>
                  <th className="px-4 py-3">Fund</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold">
                      {row.member.name}
                      {row.paidByMember && (
                        <span className="ml-1 text-xs font-normal text-gray-400">
                          (paid by {row.paidByMember.name})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{row.member.localChurch.name}</td>
                    <td className="px-4 py-3">{CATEGORY_LABEL[row.category] ?? row.category}</td>
                    <td className="px-4 py-3 font-mono font-bold">KES {Number(row.amount).toLocaleString()}</td>
                    <td className="px-4 py-3">{new Date(row.dateTransacted).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.mpesaReceiptNo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
