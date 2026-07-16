export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { recordDirectContribution } from "@/lib/payments";
import { getCurrentMemberId } from "@/lib/session";
import type { FundCategory } from "@prisma/client";

const CATEGORIES: FundCategory[] = ["TITHE", "CESS", "OPERATIONS", "PROJECT", "WELFARE", "CALL_REGISTRY", "SADAKA"];

/**
 * Resolves one UnmatchedPayment row by hand: either "match" it to a real
 * member + fund (creates the real Contribution, same balances/notifications
 * as any other payment), or "general" it as unattributed income with no
 * member match (only sensible for genuinely-anonymous Sadaka - Tithe/Cess/
 * Call Registry need a real member since they feed a personal balance).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.contributions", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const payment = await prisma.unmatchedPayment.findUnique({ where: { id } });
  if (!payment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (payment.resolvedAt) {
    return NextResponse.json({ error: "Already resolved" }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action === "match") {
    const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
    const category = typeof body?.category === "string" ? (body.category as FundCategory) : undefined;

    if (!identifier || !category || !CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "identifier and a valid category are required" }, { status: 400 });
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
      return NextResponse.json({ error: "We couldn't find that Church No. or National ID" }, { status: 404 });
    }

    const recorded = await recordDirectContribution({
      memberId: member.id,
      category,
      amount: Number(payment.amount),
      mpesaReceiptNo: payment.mpesaReceiptNo,
      dateTransacted: payment.transactionDate,
      payerPhone: payment.payerPhone,
      paybillNumber: payment.paybillNumber,
    });

    const contribution = await prisma.contribution.findUnique({
      where: { mpesaReceiptNo: payment.mpesaReceiptNo },
      select: { id: true },
    });

    await prisma.unmatchedPayment.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
        resolvedContributionId: contribution?.id,
        resolutionNote: `Matched to ${member.name} (${member.membershipNo}) as ${category}`,
      },
    });

    return NextResponse.json({ status: "matched", payee: recorded.payee });
  }

  if (action === "general") {
    const note = typeof body?.note === "string" ? body.note.trim() : "Confirmed as general/unattributed income";
    await prisma.unmatchedPayment.update({
      where: { id },
      data: { resolvedAt: new Date(), resolutionNote: note },
    });
    return NextResponse.json({ status: "general" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
