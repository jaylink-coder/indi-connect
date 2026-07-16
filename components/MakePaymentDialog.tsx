"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type Category = "TITHE" | "CESS" | "OPERATIONS" | "PROJECT" | "WELFARE" | "CALL_REGISTRY" | "SADAKA";

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "TITHE", label: "Tithe (Zaka)" },
  { value: "CESS", label: "Cess Quota" },
  { value: "SADAKA", label: "Sadaka (General Offering)" },
  { value: "CALL_REGISTRY", label: "Call Registry (Sunday attendance fee)" },
  { value: "OPERATIONS", label: "Church Operations" },
  { value: "PROJECT", label: "Church Project" },
  { value: "WELFARE", label: "Welfare" },
];

/** Paying this marks you present for the day - see lib/payments.ts. */
const CALL_REGISTRY_SUGGESTED_AMOUNT = "50";

interface Project {
  id: string;
  name: string;
}

interface WelfareCase {
  id: string;
  title: string;
}

type Phase = "form" | "awaiting_phone" | "success" | "failed";
type LookupState = "idle" | "checking" | "found" | "not_found";
interface LookupResult {
  identifier: string;
  status: "found" | "not_found";
  name: string;
}

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20; // ~1 minute
const LOOKUP_DEBOUNCE_MS = 400;

interface MakePaymentDialogProps {
  /** The signed-in operator's own phone on file - pre-fills the "paying phone" field. */
  defaultPhone: string;
  /** The signed-in operator's own Church No. - pre-fills the payee field (paying into their own account by default). */
  defaultIdentifier: string;
  /** Pre-selects a category (e.g. opening "Make Payment" from the Cess account card). */
  initialCategory?: Category;
  /** Hides the category selector when opened from a specific account card. */
  lockCategory?: boolean;
  triggerLabel?: string;
  triggerClassName?: string;
  onSuccess?: () => void;
}

export function MakePaymentDialog({
  defaultPhone,
  defaultIdentifier,
  initialCategory = "TITHE",
  lockCategory = false,
  triggerLabel = "Make a Payment",
  triggerClassName,
  onSuccess,
}: MakePaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [category, setCategory] = useState<Category>(initialCategory);
  const [amount, setAmount] = useState(initialCategory === "CALL_REGISTRY" ? CALL_REGISTRY_SUGGESTED_AMOUNT : "");
  const [payerPhone, setPayerPhone] = useState(defaultPhone);
  const [payeeIdentifier, setPayeeIdentifier] = useState(defaultIdentifier);
  const [debouncedIdentifier, setDebouncedIdentifier] = useState(defaultIdentifier);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [findByPhone, setFindByPhone] = useState("");
  const [findingByPhone, setFindingByPhone] = useState(false);
  const [findByPhoneError, setFindByPhoneError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("");
  const [welfareCaseId, setWelfareCaseId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [welfareCases, setWelfareCases] = useState<WelfareCase[]>([]);
  const [customerMessage, setCustomerMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]));
    fetch("/api/welfare-cases")
      .then((res) => res.json())
      .then((data) => setWelfareCases(Array.isArray(data) ? data : []))
      .catch(() => setWelfareCases([]));
  }, [open]);

  // Debounce the typed identifier before looking it up.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedIdentifier(payeeIdentifier), LOOKUP_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [payeeIdentifier]);

  // Live-resolve the Church No. once it settles, so whoever's paying can
  // confirm whose account they're about to credit before an M-Pesa prompt
  // goes out. "checking"/"idle" are derived at render time below rather than
  // stored here, so this effect only ever sets state from the fetch result.
  useEffect(() => {
    const trimmed = debouncedIdentifier.trim();
    if (!open || !trimmed) return;

    let cancelled = false;
    fetch(`/api/member/lookup?identifier=${encodeURIComponent(trimmed)}`).then(async (response) => {
      if (cancelled) return;
      if (response.ok) {
        const body = await response.json();
        setLookupResult({ identifier: trimmed, status: "found", name: body.name });
      } else {
        setLookupResult({ identifier: trimmed, status: "not_found", name: "" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedIdentifier, open]);

  const trimmedIdentifier = payeeIdentifier.trim();
  const isLookupPending = trimmedIdentifier !== debouncedIdentifier.trim();
  const resultMatchesCurrent = lookupResult?.identifier === trimmedIdentifier;
  const lookupState: LookupState = !trimmedIdentifier
    ? "idle"
    : isLookupPending || !resultMatchesCurrent
      ? "checking"
      : lookupResult!.status;
  const payeeName = resultMatchesCurrent ? lookupResult!.name : "";

  const reset = () => {
    setPhase("form");
    setAmount(initialCategory === "CALL_REGISTRY" ? CALL_REGISTRY_SUGGESTED_AMOUNT : "");
    setPayerPhone(defaultPhone);
    setPayeeIdentifier(defaultIdentifier);
    setDebouncedIdentifier(defaultIdentifier);
    setProjectId("");
    setWelfareCaseId("");
    setError(null);
    setCustomerMessage("");
    setFindByPhone("");
    setFindByPhoneError(null);
  };

  // Lets someone who doesn't remember a Church Membership No. by heart find
  // it from a phone number instead - the resolved name then doubles as a
  // check that they typed the right phone before any money moves.
  const handleFindByPhone = async () => {
    if (!findByPhone.trim()) return;
    setFindingByPhone(true);
    setFindByPhoneError(null);
    const response = await fetch(`/api/member/lookup?phone=${encodeURIComponent(findByPhone.trim())}`);
    setFindingByPhone(false);

    if (!response.ok) {
      setFindByPhoneError("No account found with that phone number.");
      return;
    }

    const body = await response.json();
    setPayeeIdentifier(body.membershipNo);
    setFindByPhone("");
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const pollStatus = async (checkoutRequestId: string, attempt = 0) => {
    if (attempt >= POLL_MAX_ATTEMPTS) {
      setPhase("failed");
      setError("We didn't hear back from M-Pesa in time. If you completed the payment, it will still be recorded.");
      return;
    }

    const response = await fetch(`/api/mpesa/status/${checkoutRequestId}`);
    const body = await response.json().catch(() => null);

    if (body?.status === "COMPLETED") {
      setPhase("success");
      onSuccess?.();
      return;
    }
    if (body?.status === "FAILED" || body?.status === "CANCELLED") {
      setPhase("failed");
      setError(body.failureReason || "The payment was not completed.");
      return;
    }

    setTimeout(() => pollStatus(checkoutRequestId, attempt + 1), POLL_INTERVAL_MS);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!payerPhone.trim()) {
      setError("Enter the phone number that will pay.");
      return;
    }
    if (!payeeIdentifier.trim()) {
      setError("Enter the Church Membership No. to pay into.");
      return;
    }
    if (lookupState === "not_found") {
      setError("We couldn't find that Church Membership No. Please check and try again.");
      return;
    }
    if (category === "PROJECT" && !projectId) {
      setError("Select a project.");
      return;
    }
    if (category === "WELFARE" && !welfareCaseId) {
      setError("Select a welfare case.");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/mpesa/stk-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: numericAmount,
        category,
        projectId: category === "PROJECT" ? projectId : undefined,
        welfareCaseId: category === "WELFARE" ? welfareCaseId : undefined,
        phoneNumber: payerPhone.trim(),
        payeeIdentifier: payeeIdentifier.trim(),
      }),
    });
    const body = await response.json().catch(() => null);
    setSubmitting(false);

    if (!response.ok || !body?.checkoutRequestId) {
      setError(body?.error || "Something went wrong. Please try again.");
      return;
    }

    setCustomerMessage(body.customerMessage || "Check your phone to complete the payment.");
    setPhase("awaiting_phone");
    pollStatus(body.checkoutRequestId);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ||
          "w-full rounded-lg bg-[#024424] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#01331a]"
        }
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#024424]">Make a Payment</h3>
          <button type="button" onClick={close} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {phase === "form" && (
          <form onSubmit={handleSubmit} className="space-y-3">
            {!lockCategory && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Category</label>
                <select
                  value={category}
                  onChange={(event) => {
                    const next = event.target.value as Category;
                    setCategory(next);
                    if (next === "CALL_REGISTRY" && !amount) setAmount(CALL_REGISTRY_SUGGESTED_AMOUNT);
                  }}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {category === "PROJECT" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Project</label>
                <select
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {category === "WELFARE" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Welfare Case</label>
                <select
                  value={welfareCaseId}
                  onChange={(event) => setWelfareCaseId(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
                >
                  <option value="">Select a welfare case</option>
                  {welfareCases.map((welfareCase) => (
                    <option key={welfareCase.id} value={welfareCase.id}>
                      {welfareCase.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Account No. <span className="font-normal text-gray-400">(your Church Membership No.)</span>
              </label>
              <input
                value={payeeIdentifier}
                onChange={(event) => setPayeeIdentifier(event.target.value)}
                onFocus={(event) => event.target.select()}
                type="text"
                placeholder="e.g. AIPCA-GAT-0422"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#024424]"
              />

              <div className="mt-2 flex gap-2">
                <input
                  value={findByPhone}
                  onChange={(event) => setFindByPhone(event.target.value)}
                  type="text"
                  placeholder="Don't know it? Enter their phone..."
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#024424]"
                />
                <button
                  type="button"
                  onClick={handleFindByPhone}
                  disabled={findingByPhone || !findByPhone.trim()}
                  className="shrink-0 rounded-lg border border-[#024424] px-3 py-1.5 text-xs font-bold text-[#024424] hover:bg-[#024424] hover:text-white disabled:opacity-50"
                >
                  {findingByPhone ? "..." : "Get Account No."}
                </button>
              </div>
              {findByPhoneError && <p className="mt-1 text-[11px] font-semibold text-[#B22222]">{findByPhoneError}</p>}

              <div className="mt-2 rounded-lg border border-gray-100 bg-[#F8FAF8] px-3 py-2">
                <p className="text-[11px] font-semibold text-gray-500">Account Holder Name</p>
                <p
                  className={`text-sm font-bold ${
                    lookupState === "not_found" ? "text-[#B22222]" : "text-gray-900"
                  }`}
                >
                  {lookupState === "checking" && "Checking..."}
                  {lookupState === "found" && payeeName}
                  {lookupState === "not_found" && "Not found - check the Account No."}
                  {lookupState === "idle" && "—"}
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Amount (KES)</label>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                type="number"
                min="1"
                placeholder="1000"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#024424]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">
                Paying Phone No. <span className="font-normal text-gray-400">(the M-Pesa prompt goes here)</span>
              </label>
              <input
                value={payerPhone}
                onChange={(event) => setPayerPhone(event.target.value)}
                onFocus={(event) => event.target.select()}
                type="text"
                placeholder="0712345678"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#024424]"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Paying for someone else? Replace this with their phone - the payment will still credit the account above.
              </p>
            </div>

            {error && <p className="text-xs text-[#B22222]">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#024424] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#01331a] disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send STK Push"}
            </button>
          </form>
        )}

        {phase === "awaiting_phone" && (
          <div className="py-4 text-center">
            <p className="text-sm font-semibold text-gray-800">{customerMessage}</p>
            <p className="mt-2 text-xs text-gray-500">Waiting for confirmation...</p>
          </div>
        )}

        {phase === "success" && (
          <div className="py-4 text-center">
            <p className="text-sm font-bold text-[#024424]">Payment received. Thank you!</p>
            <button
              type="button"
              onClick={close}
              className="mt-4 w-full rounded-lg bg-[#024424] py-2.5 text-sm font-bold text-white hover:bg-[#01331a]"
            >
              Done
            </button>
          </div>
        )}

        {phase === "failed" && (
          <div className="py-4 text-center">
            <p className="text-sm font-bold text-[#B22222]">Payment not completed</p>
            <p className="mt-1 text-xs text-gray-500">{error}</p>
            <button
              type="button"
              onClick={reset}
              className="mt-4 w-full rounded-lg bg-[#024424] py-2.5 text-sm font-bold text-white hover:bg-[#01331a]"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
