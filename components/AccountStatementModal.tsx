"use client";

import { useEffect, useState } from "react";
import { MakePaymentDialog } from "./MakePaymentDialog";

interface AccountStatement {
  category: "TITHE" | "SADAKA" | "CALL_REGISTRY" | "OPERATIONS";
  label: string;
  description: string;
  totalAllTime: number;
  totalThisYear: number;
  totalThisMonth: number;
  monthlyTrend: { month: string; amount: number }[];
  transactions: { id: string; amount: number; date: string; receipt: string }[];
}

/** Single-series bar chart (this account's giving, last 6 months) - one hue, direct value on hover, month labels below. No legend needed: the section title above already names the one series. */
function MonthlyTrendChart({ data }: { data: { month: string; amount: number }[] }) {
  const max = Math.max(...data.map((d) => d.amount), 1);

  return (
    <div>
      <div className="flex items-end justify-between gap-2 rounded-lg bg-gray-50 p-3" style={{ height: 96 }}>
        {data.map((d) => (
          <div key={d.month} className="group relative flex h-full flex-1 flex-col items-center justify-end">
            {d.amount > 0 && (
              <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                KES {d.amount.toLocaleString()}
              </div>
            )}
            <div
              className="w-full max-w-[28px] rounded-t bg-[#024424] transition-opacity group-hover:opacity-80"
              style={{ height: `${Math.max((d.amount / max) * 100, d.amount > 0 ? 6 : 0)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between gap-2">
        {data.map((d) => (
          <span key={d.month} className="flex-1 text-center text-[10px] font-semibold text-gray-400">
            {d.month}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The "click Tithe and it opens like a real bank account" view - a full
 * statement (this month/this year/all-time totals, a 6-month trend chart,
 * every transaction with its receipt in a table) for one giving category,
 * instead of just a running total on a small card. Self-service - a
 * member only ever opens their own.
 */
export function AccountStatementModal({
  category,
  defaultPhone,
  defaultIdentifier,
  onClose,
}: {
  category: "TITHE" | "SADAKA" | "CALL_REGISTRY" | "OPERATIONS";
  defaultPhone: string;
  defaultIdentifier: string;
  onClose: () => void;
}) {
  const [statement, setStatement] = useState<AccountStatement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetch(`/api/member/account?category=${category}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || "Failed to load this account");
        setStatement(body);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-bold text-[#024424]">{statement?.label ?? "Account"}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            Close
          </button>
        </div>

        {error && <p className="py-6 text-center text-sm text-[#B22222]">{error}</p>}
        {!error && !statement && <p className="py-6 text-center text-sm text-gray-400">Loading...</p>}

        {statement && (
          <div className="space-y-5">
            <p className="text-xs text-gray-500">{statement.description}</p>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">This Month</p>
                <p className="mt-1 font-mono text-sm font-black text-[#024424]">
                  KES {statement.totalThisMonth.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">This Year</p>
                <p className="mt-1 font-mono text-sm font-black text-[#024424]">
                  KES {statement.totalThisYear.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-green-700">All-Time</p>
                <p className="mt-1 font-mono text-sm font-black text-green-700">
                  KES {statement.totalAllTime.toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">6-Month Trend</p>
              <MonthlyTrendChart data={statement.monthlyTrend} />
            </div>

            <MakePaymentDialog
              defaultPhone={defaultPhone}
              defaultIdentifier={defaultIdentifier}
              initialCategory={statement.category}
              lockCategory
              triggerLabel="Make Payment"
              triggerClassName="w-full rounded-lg bg-[#024424] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#01331a]"
              onSuccess={load}
            />

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Transaction History</p>
              {statement.transactions.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400">No transactions recorded yet.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-100">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-gray-50 uppercase tracking-wider text-gray-400">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Receipt</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.transactions.map((t) => (
                        <tr key={t.id} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-gray-500">{new Date(t.date).toLocaleDateString("en-GB")}</td>
                          <td className="px-3 py-2 font-mono text-[10px] text-gray-400">{t.receipt}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-gray-900">
                            {t.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
