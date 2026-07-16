export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { verifyPin, PIN_MAX_ATTEMPTS, PIN_LOCK_MS } from "@/lib/pin";
import { toMpesaPhone } from "@/lib/phone";

/**
 * The only way in: a leader sets up a member's login (see
 * /api/admin/members/[id]/set-pin) before this is ever reachable - there is
 * no self-service sign-up. Members never see or set a Clerk password; a
 * correct PIN mints a Clerk sign-in token for the account a leader already
 * created, exactly like the old activation flow's ticket handoff.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";

  if (!identifier || !pin) {
    return NextResponse.json({ status: "invalid" as const }, { status: 400 });
  }

  const phoneGuess = toMpesaPhone(identifier);

  const member = await prisma.member.findFirst({
    where: {
      OR: [
        { membershipNo: { equals: identifier, mode: "insensitive" } },
        { idNumber: { equals: identifier, mode: "insensitive" } },
        { phone: phoneGuess },
      ],
    },
  });

  // Same generic response whether the identifier doesn't exist, has no PIN
  // set up yet, or the PIN is wrong - never confirm which part was right.
  if (!member || !member.clerkUserId || !member.pinHash) {
    return NextResponse.json({ status: "invalid" as const }, { status: 401 });
  }

  if (member.pinLockedUntil && member.pinLockedUntil.getTime() > Date.now()) {
    return NextResponse.json({ status: "locked" as const }, { status: 423 });
  }

  if (!verifyPin(pin, member.pinHash)) {
    const attempts = member.pinFailedAttempts + 1;
    const lockedOut = attempts >= PIN_MAX_ATTEMPTS;
    await prisma.member.update({
      where: { id: member.id },
      data: {
        pinFailedAttempts: lockedOut ? 0 : attempts,
        pinLockedUntil: lockedOut ? new Date(Date.now() + PIN_LOCK_MS) : null,
      },
    });
    return NextResponse.json({ status: lockedOut ? ("locked" as const) : ("invalid" as const) }, { status: 401 });
  }

  await prisma.member.update({
    where: { id: member.id },
    data: { pinFailedAttempts: 0, pinLockedUntil: null },
  });

  const client = await clerkClient();
  const signInToken = await client.signInTokens.createSignInToken({
    userId: member.clerkUserId,
    expiresInSeconds: 120,
  });

  return NextResponse.json({ status: "ok" as const, ticket: signInToken.token, mustChangePin: member.pinMustChange });
}
