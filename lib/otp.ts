import { createHash, randomInt } from "crypto";

const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

export const OTP_TTL_MS = OTP_TTL_MINUTES * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = RESEND_COOLDOWN_SECONDS * 1000;
export const OTP_MAX_ATTEMPTS = MAX_ATTEMPTS;

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** sha256 is fine here - short-lived, rate-limited, attempt-capped 6-digit codes, not passwords. */
export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
