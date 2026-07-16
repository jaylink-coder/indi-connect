"use client";

import { useEffect, useState } from "react";

interface UnmatchedPayment {
  id: string;
  mpesaReceiptNo: string;
  amount: string;
  payerPhone: string;
  rawAccountText: string;
  guessedCategory: string | null;
  paybillNumber: string;
  transactionDate: string;
}

const CATEGORY_OPTIONS = [
  { value: "TITHE", label: "Tithe" },
  { value: "CESS", label: "Cess" },
  { value: "CALL_REGISTRY", label: "Call Registry" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "SADAKA", label: "Sadaka" },
];

function ReviewRow({ payment, onResolved }: { payment: UnmatchedPayment; onResolved: () => void }) {
  const [identifier, setIdentifier] = useState("");
  const [category, setCategory] = useState(payment.guessedCategory ?? "TITHE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = async (action: "match" | "general") => {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/admin/unmatched-payments/${payment.id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "match" ? { action, identifier, category } : { action }),
    });
    setBusy(false);
    if (response.ok) {
      onResolved();
    } else {
      const body = await response.json().catch(() => null);
      setError(body?.error || "Couldn't resolve this payment.");
    }
  };

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span className="font-mono">Receipt: {payment.mpesaReceiptNo}</span>
        <span>{new Date(payment.transactionDate).toLocaleString()}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-lg font-black text-[#024424]">
          KES {Number(payment.amount).toLocaleString()}
        </span>
        <span className="text-xs text-gray-500">
          Typed Account No.: <span className="font-mono font-semibold">{payment.rawAccountText || "(blank)"}</span>
        </span>
        <span className="text-xs text-gray-500">
          Payer Phone: <span className="font-mono">{payment.payerPhone}</span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-gray-500">Church No. / National ID</label>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g. AIPCA-GAT-0422"
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-gray-500">Fund</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => resolve("match")}
          disabled={busy || !identifier.trim()}
          className="rounded-lg bg-[#024424] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#01331a] disabled:opacity-50"
        >
          Match to Member
        </button>
        <button
          type="button"
          onClick={() => resolve("general")}
          disabled={busy}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        >
          Confirm as General Giving
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-[#B22222]">{error}</p>}
    </div>
  );
}

export function UnmatchedPaymentsPanel() {
  const [payments, setPayments] = useState<UnmatchedPayment[] | null>(null);

  const load = () => {
    fetch("/api/admin/unmatched-payments")
      .then((res) => (res.ok ? res.json() : []))
      .then(setPayments)
      .catch(() => setPayments([]));
  };

  useEffect(() => {
    Promise.resolve().then(load);
  }, []);

  if (!payments || payments.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#D4AF37]/40 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#024424]">Needs Review</h3>
        <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-bold text-yellow-700">
          {payments.length} pending
        </span>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        Paid directly via the Paybill menu (not the app) - we couldn&apos;t confidently match these to a member and
        fund automatically. Match each to the right person, or confirm as general giving if it&apos;s a Sadaka with
        no member match.
      </p>
      <div className="space-y-3">
        {payments.map((payment) => (
          <ReviewRow key={payment.id} payment={payment} onResolved={load} />
        ))}
      </div>
    </div>
  );
}
