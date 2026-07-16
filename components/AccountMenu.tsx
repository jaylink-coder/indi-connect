"use client";

import { useClerk } from "@clerk/nextjs";

/**
 * Replaces Clerk's <UserButton/> - that opens Clerk's own hosted "manage
 * account" page, the same kind of generic, un-branded Clerk surface the
 * rest of this login rework removes. signOut() itself is just an API call,
 * not a rendered Clerk screen, so this stays fully in our own UI.
 */
export function AccountMenu() {
  const { signOut } = useClerk();

  return (
    <button
      type="button"
      onClick={() => signOut({ redirectUrl: "/" })}
      className="rounded-full border border-[#D4AF37]/50 px-3 py-1 text-[10px] font-bold text-[#D4AF37] hover:bg-[#D4AF37]/10"
    >
      Sign Out
    </button>
  );
}
