"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

/**
 * Every signed-in member sees this. Members without a leadership
 * MemberPosition get a frozen (visible, disabled) padlock. Leaders get a
 * clickable one that opens an inline PIN re-entry panel - re-proving it's
 * really them before /admin opens - rather than a full-page redirect.
 * Members never see or use a real Clerk password (login is PIN-only, see
 * /api/auth/pin-login), so this step-up runs on our own PIN check instead
 * of Clerk's reverification.
 */
export function AdminPadlock({ isLeader }: { isLeader: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    // "click" (not "mousedown") - mousedown fires before touch/tap events finish
    // resolving on mobile, which could close the panel the instant it opens.
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  if (!isLeader) {
    return (
      <span
        aria-disabled="true"
        title="Admin access is reserved for church leadership"
        className="inline-flex cursor-not-allowed items-center rounded-full p-2 text-white/30"
      >
        <Lock size={18} />
      </span>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const response = await fetch("/api/auth/reverify-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);

    if (body.status !== "ok") {
      setError("That PIN is wrong.");
      setPin("");
      return;
    }

    setOpen(false);
    setPin("");
    router.push("/admin");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Open Admin Panel"
        aria-label="Open Admin Panel"
        className="inline-flex items-center rounded-full p-2 text-[#D4AF37] transition-colors hover:bg-white/10"
      >
        <Lock size={18} />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-gray-100 bg-white p-4 text-left shadow-xl"
        >
          <p className="mb-3 text-xs font-bold text-[#024424]">Confirm your PIN to open Admin</p>
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="PIN"
              className="mb-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center text-base font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#024424]"
            />
            {error && <p className="mb-2 text-xs text-[#B22222]">{error}</p>}
            <button
              type="submit"
              disabled={busy || pin.length !== 4}
              className="w-full rounded-lg bg-[#024424] py-2 text-xs font-bold text-white transition-colors hover:bg-[#01331a] disabled:opacity-50"
            >
              {busy ? "Checking..." : "Unlock"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
