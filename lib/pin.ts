import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "crypto";

const PIN_LENGTH = 4;
const LOCK_THRESHOLD = 5;
const LOCK_MINUTES = 15;

export const PIN_MAX_ATTEMPTS = LOCK_THRESHOLD;
export const PIN_LOCK_MS = LOCK_MINUTES * 60 * 1000;

/**
 * Every login a leader sets up starts on the last 4 digits of the member's
 * own phone number - bank-style default, but personal rather than a single
 * shared "0000" every account starts on. The member is still required to
 * replace it with their own choice on first sign-in (pinMustChange); this
 * just makes an un-changed default less guessable in the meantime.
 */
export function defaultPinFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-PIN_LENGTH).padStart(PIN_LENGTH, "0");
}

/** Used for a leader-triggered PIN reset when they'd rather not fall back to the phone-derived default. */
export function generatePin(): string {
  return String(randomInt(0, 10 ** PIN_LENGTH)).padStart(PIN_LENGTH, "0");
}

export function isValidPinFormat(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
