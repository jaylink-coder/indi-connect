"use server";

import { auth, reverificationError } from "@clerk/nextjs/server";
import { getMemberAccess } from "@/lib/permissions";

/**
 * Called from the header padlock via useReverification(). Clerk intercepts
 * the reverificationError() return value and shows its step-up
 * (re-enter credentials) modal, then automatically retries this action -
 * so a fresh "strict" reverification is what actually unlocks /admin.
 */
export async function unlockAdminPanel() {
  const { userId, has } = await auth.protect();

  const access = await getMemberAccess(userId);
  if (!access || !access.isLeader) {
    throw new Error("This account does not hold a leadership position.");
  }

  if (!has({ reverification: "strict" })) {
    return reverificationError("strict");
  }

  return { success: true as const };
}
