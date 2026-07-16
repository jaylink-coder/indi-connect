import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 10 * 60 * 1000;
export const ADMIN_STEP_UP_COOKIE = "admin_step_up";
export const ADMIN_STEP_UP_MAX_AGE_SECONDS = TTL_MS / 1000;

function secret(): string {
  return process.env.CLERK_SECRET_KEY || "";
}

/**
 * Replaces Clerk's own `reverification` step-up: members never see or use a
 * real Clerk password (see /api/auth/pin-login), so Clerk's own credential
 * re-entry modal has nothing valid to check. This is the same idea -
 * short-lived proof of a just-now credential re-check - built on our own
 * PIN instead. Signed rather than just a boolean cookie so it can't be
 * forged by setting the cookie directly.
 */
export function signAdminStepUp(userId: string): string {
  const expires = Date.now() + TTL_MS;
  const payload = `${userId}.${expires}`;
  const mac = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${expires}.${mac}`;
}

export function verifyAdminStepUp(userId: string, token: string | undefined): boolean {
  if (!token) return false;
  const [expiresStr, mac] = token.split(".");
  const expires = Number(expiresStr);
  if (!expires || !mac || Date.now() > expires) return false;

  const payload = `${userId}.${expires}`;
  const expectedMac = createHmac("sha256", secret()).update(payload).digest("hex");
  const provided = Buffer.from(mac, "hex");
  const expected = Buffer.from(expectedMac, "hex");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
