export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPin, hashPin, isValidPinFormat } from "@/lib/pin";
import { getCurrentMemberId } from "@/lib/session";

/** Lets a signed-in member set their own PIN - required once (see pinMustChange), reusable any time after. */
export async function POST(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ status: "not_signed_in" as const }, { status: 401 });
  }

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member || !member.pinHash) {
    return NextResponse.json({ status: "not_signed_in" as const }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const currentPin = typeof body?.currentPin === "string" ? body.currentPin.trim() : "";
  const newPin = typeof body?.newPin === "string" ? body.newPin.trim() : "";

  if (!verifyPin(currentPin, member.pinHash)) {
    return NextResponse.json({ status: "wrong_current_pin" as const }, { status: 401 });
  }
  if (!isValidPinFormat(newPin)) {
    return NextResponse.json({ status: "invalid_new_pin" as const }, { status: 400 });
  }
  if (newPin === currentPin) {
    return NextResponse.json({ status: "same_as_current" as const }, { status: 400 });
  }

  await prisma.member.update({
    where: { id: member.id },
    data: { pinHash: hashPin(newPin), pinSetAt: new Date(), pinMustChange: false },
  });

  return NextResponse.json({ status: "ok" as const });
}
