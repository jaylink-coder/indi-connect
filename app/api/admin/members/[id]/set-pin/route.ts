export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopedLocalChurchIds } from "@/lib/hierarchy";
import { hashPin, defaultPinFromPhone } from "@/lib/pin";
import { getCurrentMemberId } from "@/lib/session";

/**
 * Sets up (or resets) a member's login. There is no member self-signup -
 * this is the only way a Member row ever gets a working account.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const callerId = await getCurrentMemberId();
  if (!callerId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const access = await getMemberAccess(callerId);
  if (!access || !hasAccess(access.permissions, "admin.members", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scopedLocalChurchIds = await getScopedLocalChurchIds(callerId, "admin.members");
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member || !scopedLocalChurchIds.includes(member.localChurchId)) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const newPin = defaultPinFromPhone(member.phone);

  await prisma.member.update({
    where: { id: member.id },
    data: {
      pinHash: hashPin(newPin),
      pinSetAt: new Date(),
      pinMustChange: true,
      pinFailedAttempts: 0,
      pinLockedUntil: null,
    },
  });

  return NextResponse.json({ status: "ok" as const, pin: newPin });
}
