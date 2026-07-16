export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { maskPhone } from "@/lib/phone";
import { generateOtp, hashOtp, OTP_TTL_MS, OTP_RESEND_COOLDOWN_MS } from "@/lib/otp";
import { sendActivationCode } from "@/lib/twilio";

/**
 * Step 1 of activation: prove you're an existing counter-book member before
 * any Clerk account is created. Looks up by Church No. or National ID No.,
 * then sends a one-time code to the phone already on file (never a
 * client-typed phone) via Twilio - Clerk's own SMS delivery isn't used here
 * since it gates Kenya behind a support-only tier.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";

  if (!identifier) {
    return NextResponse.json({ status: "not_found" as const });
  }

  const member = await prisma.member.findFirst({
    where: {
      OR: [
        { membershipNo: { equals: identifier, mode: "insensitive" } },
        { idNumber: { equals: identifier, mode: "insensitive" } },
      ],
    },
  });

  if (!member) {
    return NextResponse.json({ status: "not_found" as const });
  }

  if (member.clerkUserId) {
    return NextResponse.json({ status: "already_activated" as const });
  }

  if (member.activationCodeSentAt && Date.now() - member.activationCodeSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    return NextResponse.json({ status: "cooldown" as const });
  }

  const code = generateOtp();
  const now = new Date();

  await prisma.member.update({
    where: { id: member.id },
    data: {
      activationCodeHash: hashOtp(code),
      activationCodeSentAt: now,
      activationCodeExpiresAt: new Date(now.getTime() + OTP_TTL_MS),
      activationAttempts: 0,
    },
  });

  const sent = await sendActivationCode(member.phone, code);
  if (!sent) {
    return NextResponse.json({ status: "send_failed" as const }, { status: 502 });
  }

  return NextResponse.json({ status: "ok" as const, maskedPhone: maskPhone(member.phone) });
}
