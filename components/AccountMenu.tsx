"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AccountMenu() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleSignOut = async () => {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={busy}
      className="rounded-full border border-[#D4AF37]/50 px-3 py-1 text-[10px] font-bold text-[#D4AF37] hover:bg-[#D4AF37]/10 disabled:opacity-50"
    >
      Sign Out
    </button>
  );
}
