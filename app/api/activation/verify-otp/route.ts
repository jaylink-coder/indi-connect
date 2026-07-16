export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { hashOtp, OTP_MAX_ATTEMPTS } from "@/lib/otp";

/**
 * Step 2 of activation. We generated and sent this code ourselves (see
 * lookup/route.ts), so a correct match is already full proof of identity -
 * no further Clerk-side verification is needed. We create the Clerk user
 * directly via the Backend API (phone numbers passed to createUser() are
 * auto-verified, bypassing Clerk's own SMS pipeline entirely) and hand back
 * a one-time sign-in token for the browser to redeem.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!identifier || !code || !password) {
    return NextResponse.json({ status: "invalid_code" as const }, { status: 400 });
  }

  const member = await prisma.member.findFirst({
    where: {
      OR: [
        { membershipNo: { equals: identifier, mode: "insensitive" } },
        { idNumber: { equals: identifier, mode: "insensitive" } },
      ],
    },
  });

  if (!member || member.clerkUserId) {
    return NextResponse.json({ status: "invalid_code" as const }, { status: 400 });
  }

  if (
    !member.activationCodeHash ||
    !member.activationCodeExpiresAt ||
    member.activationCodeExpiresAt.getTime() < Date.now()
  ) {
    return NextResponse.json({ status: "expired" as const }, { status: 400 });
  }

  if (member.activationAttempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json({ status: "too_many_attempts" as const }, { status: 429 });
  }

  if (hashOtp(code) !== member.activationCodeHash) {
    await prisma.member.update({
      where: { id: member.id },
      data: { activationAttempts: { increment: 1 } },
    });
    return NextResponse.json({ status: "invalid_code" as const }, { status: 400 });
  }

  const client = await clerkClient();
  const [firstName, ...rest] = member.name.trim().split(/\s+/);
  const lastName = rest.join(" ") || undefined;

  let user;
  try {
    user = await client.users.createUser({
      phoneNumber: [`+${member.phone}`],
      password,
      firstName,
      lastName,
      externalId: member.id,
    });
  } catch {
    return NextResponse.json({ status: "weak_password" as const }, { status: 400 });
  }

  const signInToken = await client.signInTokens.createSignInToken({
    userId: user.id,
    expiresInSeconds: 300,
  });

  await prisma.member.update({
    where: { id: member.id },
    data: {
      clerkUserId: user.id,
      activationCodeHash: null,
      activationCodeSentAt: null,
      activationCodeExpiresAt: null,
      activationAttempts: 0,
    },
  });

  return NextResponse.json({ status: "ok" as const, ticket: signInToken.token });
}
