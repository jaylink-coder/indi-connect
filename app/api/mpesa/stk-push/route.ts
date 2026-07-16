export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { initiateSTKPush } from "@/lib/mpesa";
import { toMpesaPhone } from "@/lib/phone";
import { getCurrentMemberId } from "@/lib/session";
import type { FundCategory } from "@prisma/client";

const CATEGORIES: FundCategory[] = ["TITHE", "CESS", "OPERATIONS", "PROJECT", "WELFARE", "CALL_REGISTRY", "SADAKA"];

/**
 * Stages a PaymentIntent before the STK push fires, since Daraja's callback
 * only ever echoes back CheckoutRequestID/Amount - this row is how the
 * callback later learns what the payment was actually for. The signed-in
 * operator (from the session) doesn't have to be the account being
 * credited - the payee is resolved from a Church No./ID No. the operator
 * typed in, so one member can settle another's account (e.g. a daughter
 * paying her mother's cess from her own phone). Both identities are staged
 * here for the callback to notify correctly.
 */
export async function POST(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const operator = await prisma.member.findUnique({ where: { id: memberId } });
  if (!operator) {
    return NextResponse.json({ error: "No membership record is linked to this account" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);
  const category = typeof body?.category === "string" ? (body.category as FundCategory) : undefined;
  const projectId = typeof body?.projectId === "string" ? body.projectId : undefined;
  const welfareCaseId = typeof body?.welfareCaseId === "string" ? body.welfareCaseId : undefined;
  const payerPhone = typeof body?.phoneNumber === "string" ? body.phoneNumber.trim() : "";
  const payeeIdentifier = typeof body?.payeeIdentifier === "string" ? body.payeeIdentifier.trim() : "";

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  }
  if (!category || !CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid contribution category" }, { status: 400 });
  }
  if (category === "PROJECT" && !projectId) {
    return NextResponse.json({ error: "Select a project" }, { status: 400 });
  }
  if (category === "WELFARE" && !welfareCaseId) {
    return NextResponse.json({ error: "Select a welfare case" }, { status: 400 });
  }
  if (!payerPhone) {
    return NextResponse.json({ error: "Enter the phone number that will pay" }, { status: 400 });
  }

  const payee = payeeIdentifier
    ? await prisma.member.findFirst({
        where: {
          OR: [
            { membershipNo: { equals: payeeIdentifier, mode: "insensitive" } },
            { idNumber: { equals: payeeIdentifier, mode: "insensitive" } },
          ],
        },
      })
    : operator;

  if (!payee) {
    return NextResponse.json({ error: "We couldn't find that Church No. or National ID" }, { status: 404 });
  }

  const phoneNumber = toMpesaPhone(payerPhone);

  let stk;
  try {
    stk = await initiateSTKPush({
      phoneNumber,
      amount: Math.round(amount),
      accountReference: payee.membershipNo,
      transactionDesc: `${category} contribution`,
    });
  } catch {
    return NextResponse.json({ error: "Could not reach M-Pesa. Please try again." }, { status: 502 });
  }

  if (stk.ResponseCode !== "0" || !stk.CheckoutRequestID) {
    return NextResponse.json(
      { error: stk.ResponseDescription || stk.CustomerMessage || "M-Pesa rejected the payment request" },
      { status: 502 }
    );
  }

  await prisma.paymentIntent.create({
    data: {
      checkoutRequestId: stk.CheckoutRequestID,
      merchantRequestId: stk.MerchantRequestID,
      memberId: payee.id,
      paidByMemberId: operator.id,
      amount,
      category,
      projectId,
      welfareCaseId,
      phoneNumber,
    },
  });

  return NextResponse.json({
    checkoutRequestId: stk.CheckoutRequestID,
    customerMessage: stk.CustomerMessage,
  });
}
