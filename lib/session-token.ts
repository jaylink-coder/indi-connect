import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "indi_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

/**
 * Our own replacement for Clerk's session cookie, now that Clerk is gone
 * entirely (dev-tier rate limits, a forced "Organizations" task screen, and
 * rejecting Kenyan phone numbers made it more liability than help - see
 * /api/auth/pin-login). Not just the member id in a cookie: a random nonce
 * plus an HMAC signature, so a session can't be forged or guessed even
 * though member ids themselves aren't secret. Kept dependency-free (no
 * next/headers) so proxy.ts can import it without pulling in a Server
 * Component-only API.
 */
export function createSessionToken(memberId: string): string {
  const nonce = randomBytes(9).toString("hex");
  const expires = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${memberId}.${nonce}.${expires}`;
  const mac = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [memberId, nonce, expiresStr, mac] = parts;
  const expires = Number(expiresStr);
  if (!memberId || !nonce || !expires || Date.now() > expires) return null;

  const payload = `${memberId}.${nonce}.${expiresStr}`;
  const expectedMac = createHmac("sha256", secret()).update(payload).digest("hex");
  const provided = Buffer.from(mac, "hex");
  const expected = Buffer.from(expectedMac, "hex");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  return memberId;
}
