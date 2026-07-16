export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { verifyPin } from "@/lib/pin";
import { signAdminStepUp, ADMIN_STEP_UP_COOKIE, ADMIN_STEP_UP_MAX_AGE_SECONDS } from "@/lib/adminStepUp";

/** The padlock's step-up check - re-enter your PIN to prove it's really you before /admin opens. */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ status: "not_signed_in" as const }, { status: 401 });
  }

  const member = await prisma.member.findUnique({ where: { clerkUserId: userId } });
  if (!member || !member.pinHash) {
    return NextResponse.json({ status: "invalid" as const }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";

  if (!verifyPin(pin, member.pinHash)) {
    return NextResponse.json({ status: "invalid" as const }, { status: 401 });
  }

  const response = NextResponse.json({ status: "ok" as const });
  response.cookies.set(ADMIN_STEP_UP_COOKIE, signAdminStepUp(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_STEP_UP_MAX_AGE_SECONDS,
  });
  return response;
}
