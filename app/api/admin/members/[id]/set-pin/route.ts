export const dynamic = "force-dynamic";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopedLocalChurchIds } from "@/lib/hierarchy";
import { hashPin, defaultPinFromPhone } from "@/lib/pin";

/**
 * Sets up (or resets) a member's login. There is no member self-signup -
 * this is the only way a Member row ever gets a working account. Creates
 * the underlying Clerk user on first use via a synthetic internal email
 * identifier (Clerk's phone-number signup is unavailable for Kenyan
 * numbers on this plan) with a random password the member never sees or
 * uses - sign-in always happens via the PIN + sign-in-token handoff in
 * /api/auth/pin-login, never Clerk's own password UI.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const caller = await prisma.member.findUnique({ where: { clerkUserId: userId }, select: { id: true } });
  if (!caller) {
    return NextResponse.json({ error: "No membership record is linked to this account" }, { status: 403 });
  }

  const access = await getMemberAccess(userId);
  if (!access || !hasAccess(access.permissions, "admin.members", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scopedLocalChurchIds = await getScopedLocalChurchIds(caller.id, "admin.members");
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member || !scopedLocalChurchIds.includes(member.localChurchId)) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const client = await clerkClient();
  let clerkUserId = member.clerkUserId;

  if (!clerkUserId) {
    const [firstName, ...rest] = member.name.trim().split(/\s+/);
    const lastName = rest.join(" ") || undefined;
    const syntheticEmail = `${member.membershipNo.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@members.indiconnect.app`;

    let user;
    try {
      user = await client.users.createUser({
        emailAddress: [syntheticEmail],
        password: randomBytes(24).toString("hex"),
        firstName,
        lastName,
        externalId: member.id,
      });
    } catch (err) {
      return NextResponse.json(
        { error: "Could not create a login for this member", details: err instanceof Error ? err.message : String(err) },
        { status: 502 }
      );
    }
    clerkUserId = user.id;
  }

  const newPin = defaultPinFromPhone(member.phone);

  await prisma.member.update({
    where: { id: member.id },
    data: {
      clerkUserId,
      pinHash: hashPin(newPin),
      pinSetAt: new Date(),
      pinMustChange: true,
      pinFailedAttempts: 0,
      pinLockedUntil: null,
    },
  });

  return NextResponse.json({ status: "ok" as const, pin: newPin });
}
