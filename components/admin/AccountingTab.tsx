"use client";

import { useEffect, useState } from "react";

type SubTab = "reports" | "ledger" | "expenses" | "journal";

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
}

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "reports", label: "Reports" },
  { id: "ledger", label: "Ledger" },
  { id: "expenses", label: "Expenses" },
];

/**
 * canEdit gates submitting expenses/journal entries; canJournal additionally
 * requires admin.members EDIT (see app/api/admin/accounting/journal) - a
 * fully data-driven proxy for "Chairman/Super-Admin level," since only
 * Chairman-tier roles and Super Admin hold that permission today. Both
 * flags come from the parent's already-loaded permission map, so this
 * component doesn't need its own /api/member/access fetch.
 */
export function AccountingTab({ canEdit, canJournal }: { canEdit: boolean; canJournal: boolean }) {
  const [subTab, setSubTab] = useState<SubTab>("reports");
  const tabs = canJournal ? [...SUB_TABS, { id: "journal" as const, label: "Journal" }] : SUB_TABS;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 border-b pb-3">
        <h3 className="text-lg font-bold text-[#024424]">Accounting</h3>
        <p className="mt-1 text-xs text-gray-500">
          Chart of Accounts, General Ledger, and Expenses - real double-entry bookkeeping behind the scenes,
          kept simple up front.
        </p>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-bold ${
              subTab === t.id ? "bg-white text-[#024424] shadow-sm" : "text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "reports" && <ReportsView />}
      {subTab === "ledger" && <LedgerView />}
      {subTab === "expenses" && <ExpensesView canEdit={canEdit} />}
      {subTab === "journal" && canJournal && <JournalView />}
    </div>
  );
}

function fmtKES(n: number): string {
  return `KES ${Math.round(n).toLocaleString()}`;
}

function todayISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface TrialBalanceRow {
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
}
interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
}
interface IncomeExpenditureResult {
  incomeByAccount: { code: string; name: string; total: number }[];
  totalIncome: number;
  expenseByAccount: { code: string; name: string; total: number }[];
  totalExpense: number;
  netSurplus: number;
}

function ReportsView() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [from, setFrom] = useState(todayISO(monthStart));
  const [to, setTo] = useState(todayISO(now));
  const [trialBalance, setTrialBalance] = useState<TrialBalanceResult | null>(null);
  const [incomeExpenditure, setIncomeExpenditure] = useState<IncomeExpenditureResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setTrialBalance(null);
    setIncomeExpenditure(null);
    Promise.all([
      fetch(`/api/admin/accounting/reports/trial-balance?asOf=${to}`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
      fetch(`/api/admin/accounting/reports/income-expenditure?from=${from}&to=${to}`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
    ])
      .then(([tb, ie]) => {
        setTrialBalance(tb);
        setIncomeExpenditure(ie);
      })
      .catch(() => setError("Couldn't load reports."));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm" />
        </div>
        <button onClick={load} className="rounded-lg bg-[#024424] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#01331a]">
          Run Reports
        </button>
      </div>

      {error && <p className="text-sm text-[#B22222]">{error}</p>}

      <div>
        <h4 className="mb-2 text-sm font-bold text-[#024424]">Income &amp; Expenditure Statement</h4>
        {!incomeExpenditure ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="min-w-full text-left text-sm">
              <tbody>
                <tr className="bg-gray-50">
                  <td className="px-4 py-2 font-bold text-gray-500" colSpan={2}>Income</td>
                </tr>
                {incomeExpenditure.incomeByAccount.map((a) => (
                  <tr key={a.code} className="border-t border-gray-100">
                    <td className="px-4 py-2">{a.name}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmtKES(a.total)}</td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200 font-bold">
                  <td className="px-4 py-2">Total Income</td>
                  <td className="px-4 py-2 text-right font-mono text-[#024424]">{fmtKES(incomeExpenditure.totalIncome)}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-2 font-bold text-gray-500" colSpan={2}>Expenditure</td>
                </tr>
                {incomeExpenditure.expenseByAccount.map((a) => (
                  <tr key={a.code} className="border-t border-gray-100">
                    <td className="px-4 py-2">{a.name}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmtKES(a.total)}</td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200 font-bold">
                  <td className="px-4 py-2">Total Expenditure</td>
                  <td className="px-4 py-2 text-right font-mono text-[#B22222]">{fmtKES(incomeExpenditure.totalExpense)}</td>
                </tr>
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td className="px-4 py-3">Net Surplus / (Deficit)</td>
                  <td className={`px-4 py-3 text-right font-mono ${incomeExpenditure.netSurplus >= 0 ? "text-[#024424]" : "text-[#B22222]"}`}>
                    {fmtKES(incomeExpenditure.netSurplus)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-bold text-[#024424]">Trial Balance</h4>
        {!trialBalance ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-2">Account</th>
                  <th className="px-4 py-2 text-right">Debit</th>
                  <th className="px-4 py-2 text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.rows.map((r) => (
                  <tr key={r.code} className="border-t border-gray-100">
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2 text-right font-mono">{r.debit ? fmtKES(r.debit) : ""}</td>
                    <td className="px-4 py-2 text-right font-mono">{r.credit ? fmtKES(r.credit) : ""}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td className="px-4 py-3">Totals</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtKES(trialBalance.totalDebits)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtKES(trialBalance.totalCredits)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

interface GLLedgerRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  txnType: string;
  debitAccount: { code: string; name: string };
  creditAccount: { code: string; name: string };
}

function LedgerView() {
  const [rows, setRows] = useState<GLLedgerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/accounting/ledger?pageSize=50")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body: { rows: GLLedgerRow[] }) => setRows(body.rows))
      .catch(() => setError("Couldn't load the ledger."));
  }, []);

  return (
    <div>
      {error && <p className="text-sm text-[#B22222]">{error}</p>}
      {!error && !rows && <p className="py-6 text-center text-sm text-gray-400">Loading...</p>}
      {rows && rows.length === 0 && <p className="py-6 text-center text-sm text-gray-400">No ledger entries yet.</p>}
      {rows && rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Debit</th>
                <th className="px-4 py-3">Credit</th>
                <th className="px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.date).toLocaleDateString("en-GB")}</td>
                  <td className="px-4 py-3">{r.description}</td>
                  <td className="px-4 py-3 text-xs">{r.debitAccount.name}</td>
                  <td className="px-4 py-3 text-xs">{r.creditAccount.name}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{fmtKES(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  vendorName: string | null;
  rejectionReason: string | null;
  createdAt: string;
  expenseAccount: { code: string; name: string };
  submittedBy: string;
  approvedBy: string | null;
  paidBy: string | null;
}

const STATUS_STYLE: Record<ExpenseRow["status"], string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-blue-50 text-blue-700",
  PAID: "bg-green-50 text-[#024424]",
  REJECTED: "bg-red-50 text-[#B22222]",
};

function ExpensesView({ canEdit }: { canEdit: boolean }) {
  const [expenses, setExpenses] = useState<ExpenseRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/accounting/expenses")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(setExpenses)
      .catch(() => setError("Couldn't load expenses."));
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id: string, action: "approve" | "reject" | "pay") => {
    setBusyId(id);
    const res = await fetch(`/api/admin/accounting/expenses/${id}/${action}`, { method: "POST" });
    setBusyId(null);
    if (res.ok) {
      load();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || "That action failed.");
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-gray-500">Money going out - salaries, utilities, maintenance, and the rest.</p>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-[#024424] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#01331a]"
          >
            + Submit Expense
          </button>
        )}
      </div>

      {showForm && (
        <SubmitExpenseForm
          onSubmitted={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {error && <p className="mb-3 text-sm text-[#B22222]">{error}</p>}
      {!error && !expenses && <p className="py-6 text-center text-sm text-gray-400">Loading...</p>}
      {expenses && expenses.length === 0 && <p className="py-6 text-center text-sm text-gray-400">No expenses recorded yet.</p>}

      {expenses && expenses.length > 0 && (
        <div className="space-y-2">
          {expenses.map((e) => (
            <div key={e.id} className="rounded-lg border border-gray-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-gray-900">{e.description}</p>
                  <p className="text-xs text-gray-500">
                    {e.expenseAccount.name}
                    {e.vendorName ? ` · ${e.vendorName}` : ""} · submitted by {e.submittedBy}
                  </p>
                  {e.status === "REJECTED" && e.rejectionReason && (
                    <p className="mt-1 text-xs text-[#B22222]">Rejected: {e.rejectionReason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-gray-900">{fmtKES(e.amount)}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLE[e.status]}`}>{e.status}</span>
                </div>
              </div>
              {canEdit && (
                <div className="mt-2 flex gap-3 text-xs font-bold">
                  {e.status === "PENDING" && (
                    <>
                      <button disabled={busyId === e.id} onClick={() => act(e.id, "approve")} className="text-[#024424] hover:underline disabled:opacity-50">
                        Approve
                      </button>
                      <button disabled={busyId === e.id} onClick={() => act(e.id, "reject")} className="text-[#B22222] hover:underline disabled:opacity-50">
                        Reject
                      </button>
                    </>
                  )}
                  {e.status === "APPROVED" && (
                    <>
                      <button disabled={busyId === e.id} onClick={() => act(e.id, "pay")} className="text-[#024424] hover:underline disabled:opacity-50">
                        Mark as Paid
                      </button>
                      <button disabled={busyId === e.id} onClick={() => act(e.id, "reject")} className="text-[#B22222] hover:underline disabled:opacity-50">
                        Reject
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmitExpenseForm({ onSubmitted, onCancel }: { onSubmitted: () => void; onCancel: () => void }) {
  const [categories, setCategories] = useState<AccountOption[] | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/accounting/accounts?type=EXPENSE")
      .then((res) => (res.ok ? res.json() : []))
      .then((body: AccountOption[]) => {
        setCategories(body);
        if (body.length > 0) setExpenseAccountId(body[0].id);
      })
      .catch(() => setCategories([]));
  }, []);

  const submit = async () => {
    if (!description.trim() || !expenseAccountId || !amount) {
      setError("Description, category, and amount are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/accounting/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: description.trim(),
        amount: Number(amount),
        expenseAccountId,
        vendorName: vendorName.trim() || undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body?.error || "Failed to submit expense");
      return;
    }
    onSubmitted();
  };

  return (
    <div className="mb-4 space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was this for? e.g. Diesel for generator"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm sm:col-span-2"
        />
        {categories === null ? (
          <p className="text-xs text-gray-400">Loading categories...</p>
        ) : (
          <select
            value={expenseAccountId}
            onChange={(e) => setExpenseAccountId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          min="1"
          placeholder="Amount (KES)"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono"
        />
        <input
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
          placeholder="Paid to (optional)"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm sm:col-span-2"
        />
      </div>
      {error && <p className="text-xs text-[#B22222]">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="rounded-lg bg-[#024424] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          {busy ? "Submitting..." : "Submit Expense"}
        </button>
        <button onClick={onCancel} className="text-xs font-bold text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
    </div>
  );
}

function JournalView() {
  const [accounts, setAccounts] = useState<AccountOption[] | null>(null);
  const [entries, setEntries] = useState<GLLedgerRow[] | null>(null);
  const [debitAccountId, setDebitAccountId] = useState("");
  const [creditAccountId, setCreditAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = () => {
    Promise.all([
      fetch("/api/admin/accounting/ledger?txnType=JOURNAL&pageSize=25").then((r) => (r.ok ? r.json() : { rows: [] })),
      fetch("/api/admin/accounting/ledger?txnType=REVERSAL&pageSize=25").then((r) => (r.ok ? r.json() : { rows: [] })),
    ]).then(([journal, reversal]) => {
      const merged = [...journal.rows, ...reversal.rows].sort(
        (a: GLLedgerRow, b: GLLedgerRow) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setEntries(merged);
    });
  };

  useEffect(() => {
    fetch("/api/admin/accounting/accounts")
      .then((res) => (res.ok ? res.json() : []))
      .then(setAccounts)
      .catch(() => setAccounts([]));
    loadEntries();
  }, []);

  const submit = async () => {
    if (!debitAccountId || !creditAccountId || !amount || !description.trim()) {
      setError("All fields are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/accounting/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ debitAccountId, creditAccountId, amount: Number(amount), description: description.trim() }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body?.error || "Failed to post entry");
      return;
    }
    setAmount("");
    setDescription("");
    loadEntries();
  };

  const reverse = async (id: string) => {
    if (!window.confirm("Reverse this entry? This posts an equal-and-opposite entry rather than deleting it.")) return;
    const res = await fetch(`/api/admin/accounting/journal/${id}/reverse`, { method: "POST" });
    if (res.ok) loadEntries();
    else setError("Failed to reverse that entry.");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Manual Journal Entry</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select value={debitAccountId} onChange={(e) => setDebitAccountId(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
            <option value="">Debit account...</option>
            {accounts?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {a.name}
              </option>
            ))}
          </select>
          <select value={creditAccountId} onChange={(e) => setCreditAccountId(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
            <option value="">Credit account...</option>
            {accounts?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} - {a.name}
              </option>
            ))}
          </select>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="1" placeholder="Amount (KES)" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
        </div>
        {error && <p className="mt-2 text-xs text-[#B22222]">{error}</p>}
        <button onClick={submit} disabled={busy} className="mt-3 rounded-lg bg-[#D4AF37] px-4 py-2 text-xs font-bold text-[#024424] disabled:opacity-50">
          {busy ? "Posting..." : "Post Entry"}
        </button>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Recent Journal &amp; Reversal Entries</p>
        {!entries && <p className="text-sm text-gray-400">Loading...</p>}
        {entries && entries.length === 0 && <p className="text-sm text-gray-400">No manual entries yet.</p>}
        {entries && entries.length > 0 && (
          <div className="space-y-1.5">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                <span>
                  <span className="font-bold text-gray-800">{e.description}</span>
                  <span className="ml-2 text-gray-400">
                    Dr {e.debitAccount.name} / Cr {e.creditAccount.name}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-mono font-bold">{fmtKES(e.amount)}</span>
                  {e.txnType === "JOURNAL" && (
                    <button onClick={() => reverse(e.id)} className="font-bold text-[#B22222] hover:underline">
                      Reverse
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
