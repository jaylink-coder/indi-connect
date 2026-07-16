"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useReverification } from "@clerk/nextjs";
import { unlockAdminPanel } from "@/app/actions/admin-access";

/**
 * Every signed-in member sees this. Members without a leadership
 * MemberPosition get a frozen (visible, disabled) padlock. Leaders get a
 * clickable one that steps up via Clerk reverification (re-enter
 * credentials) before /admin opens - see app/actions/admin-access.ts.
 */
export function AdminPadlock({ isLeader }: { isLeader: boolean }) {
  const router = useRouter();
  const performUnlock = useReverification(unlockAdminPanel);
  const [busy, setBusy] = useState(false);

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

  const handleClick = async () => {
    setBusy(true);
    try {
      const result = await performUnlock();
      if (result?.success) router.push("/admin");
    } catch {
      // Reverification was cancelled or failed - stay on the current page.
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title="Open Admin Panel"
      aria-label="Open Admin Panel"
      className="inline-flex items-center rounded-full p-2 text-[#D4AF37] transition-colors hover:bg-white/10 disabled:opacity-50"
    >
      <Lock size={18} />
    </button>
  );
}
