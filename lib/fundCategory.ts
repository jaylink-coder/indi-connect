import type { FundCategory } from "@prisma/client";

/**
 * Parses the bare Paybill menu's free-text Account Number field into
 * {membershipNoGuess, category}. The identifier is always the Membership
 * No. - same "true identifier" the app uses (see MakePaymentDialog's
 * Account No. field) - never the payer's phone, so a daughter typing her
 * mother's Membership No. from her own phone still credits her mother, not
 * herself.
 *
 * Format taught to members: "<Membership No.><fund letter>", e.g.
 * "AIPCA-GAT-0422T" for Tithe. A bare Membership No. with no letter (the
 * last character is a digit, since membership numbers always end in
 * digits) correctly defaults to SADAKA - giving with no stated purpose is
 * what Sadaka means, not a guess on our part. PROJECT and WELFARE have no
 * letter code: those need a specific project/case picked, which free text
 * on a phone keypad can't reliably express.
 */
const FUND_LETTERS: Record<string, FundCategory> = {
  T: "TITHE",
  C: "CESS",
  R: "CALL_REGISTRY",
  O: "OPERATIONS",
  S: "SADAKA",
};

export interface ParsedAccountNumber {
  membershipNoGuess: string;
  category: FundCategory;
}

function normalize(text: string): string {
  return text.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function parseAccountNumber(rawAccountText: string): ParsedAccountNumber | null {
  const normalized = normalize(rawAccountText);
  if (!normalized) return null;

  const lastChar = normalized.slice(-1);
  const fundLetter = FUND_LETTERS[lastChar];

  if (fundLetter && !/[0-9]/.test(lastChar)) {
    const membershipNoGuess = normalized.slice(0, -1);
    if (!membershipNoGuess) return null;
    return { membershipNoGuess, category: fundLetter };
  }

  // No recognized letter suffix (or it ends in a digit) - the whole thing is
  // the Membership No., and an undesignated gift is a Sadaka by definition.
  return { membershipNoGuess: normalized, category: "SADAKA" };
}
