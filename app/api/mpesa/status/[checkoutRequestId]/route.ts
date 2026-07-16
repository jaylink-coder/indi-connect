export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ checkoutRequestId: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const member = await prisma.member.findUnique({ where: { clerkUserId: userId }, select: { id: true } });
  if (!member) {
    return NextResponse.json({ error: "No membership record is linked to this account" }, { status: 403 });
  }

  const { checkoutRequestId } = await params;
  const intent = await prisma.paymentIntent.findUnique({ where: { checkoutRequestId } });

  const isPayee = intent?.memberId === member.id;
  const isInitiator = intent?.paidByMemberId === member.id;
  if (!intent || (!isPayee && !isInitiator)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ status: intent.status, failureReason: intent.failureReason });
}
