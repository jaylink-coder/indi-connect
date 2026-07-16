import { prisma } from "@/lib/db";

/**
 * Resolves a Membership No. guess (already normalized to A-Z0-9 only, no
 * dashes - see lib/fundCategory.ts) against real Member rows, which are
 * stored WITH their formatting ("AIPCA-GAT-0422"). Tries an exact
 * case-insensitive match first (covers someone who typed the dashes
 * correctly), then falls back to comparing both sides with punctuation
 * stripped, since a member typing on a phone keypad is unlikely to get
 * "AIPCA-GAT-0422" exactly right every time.
 */
export async function resolveMemberByAccountNumberGuess(
  guess: string
): Promise<{ id: string; name: string; phone: string; localChurchId: string } | null> {
  const exact = await prisma.member.findFirst({
    where: { membershipNo: { equals: guess, mode: "insensitive" } },
    select: { id: true, name: true, phone: true, localChurchId: true },
  });
  if (exact) return exact;

  const fuzzyMatches = await prisma.$queryRaw<Array<{ id: string; name: string; phone: string; localChurchId: string }>>`
    SELECT "id", "name", "phone", "localChurchId"
    FROM "Member"
    WHERE UPPER(REGEXP_REPLACE("membershipNo", '[^A-Za-z0-9]', '', 'g')) = ${guess}
    LIMIT 2
  `;

  // If punctuation-stripping makes two different real numbers collide, that's
  // exactly the ambiguity the review queue exists for - don't guess.
  if (fuzzyMatches.length === 1) return fuzzyMatches[0];
  return null;
}
