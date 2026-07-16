export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseMpesaTimestamp } from "@/lib/mpesa";
import { parseAccountNumber } from "@/lib/fundCategory";
import { resolveMemberByAccountNumberGuess } from "@/lib/memberLookup";
import { recordDirectContribution } from "@/lib/payments";
import { sendPaymentConfirmation, sendPayerReceipt } from "@/lib/twilio";
import { toLocalPhone, toMpesaPhone } from "@/lib/phone";

const CATEGORY_LABEL: Record<string, string> = {
  TITHE: "tithe",
  CESS: "cess",
  OPERATIONS: "church operations",
  CALL_REGISTRY: "call registry",
  SADAKA: "sadaka",
};

/**
 * Daraja's C2B Confirmation callback - fires AFTER the money has already
 * moved, so we can only acknowledge, never reject. Identifies the payee by
 * the Membership No. typed into the Account Number field (never by phone -
 * that's what lets someone pay on another member's behalf even via the bare
 * Paybill menu, see lib/fundCategory.ts). Anything we can't confidently
 * resolve lands in UnmatchedPayment for a treasurer to sort out by hand,
 * rather than guessing and risking a misattributed balance or a false
 * attendance record.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Ignored malformed confirmation" });
  }

  const mpesaReceiptNo: string | undefined = body.TransID?.toString().trim();
  const paybillNumber: string = body.BusinessShortCode?.toString().trim() ?? "";
  const rawAccountText: string = body.BillRefNumber?.toString().trim() ?? "";
  const payerPhoneRaw: string = body.MSISDN?.toString().trim() ?? "";
  const amount = Number(body.TransAmount);
  const transTime = body.TransTime?.toString().trim();

  if (!mpesaReceiptNo || !Number.isFinite(amount) || amount <= 0 || !transTime) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Ignored confirmation missing required fields" });
  }

  // Idempotency: Safaricom can and does retry confirmation delivery.
  const [existingContribution, existingUnmatched] = await Promise.all([
    prisma.contribution.findUnique({ where: { mpesaReceiptNo }, select: { id: true } }),
    prisma.unmatchedPayment.findUnique({ where: { mpesaReceiptNo }, select: { id: true } }),
  ]);
  if (existingContribution || existingUnmatched) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Already recorded" });
  }

  const dateTransacted = parseMpesaTimestamp(transTime);
  const payerPhone = toMpesaPhone(payerPhoneRaw);
  const parsed = parseAccountNumber(rawAccountText);
  const member = parsed ? await resolveMemberByAccountNumberGuess(parsed.membershipNoGuess) : null;

  if (!parsed || !member) {
    await prisma.unmatchedPayment.create({
      data: {
        mpesaReceiptNo,
        amount,
        payerPhone,
        rawAccountText,
        guessedCategory: parsed?.category,
        paybillNumber,
        transactionDate: dateTransacted,
      },
    });
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Confirmation received - queued for review" });
  }

  const recorded = await recordDirectContribution({
    memberId: member.id,
    category: parsed.category,
    amount,
    mpesaReceiptNo,
    dateTransacted,
    payerPhone,
    paybillNumber,
  });

  try {
    await sendPaymentConfirmation(
      recorded.payee.phone,
      recorded.payee.name,
      recorded.amount,
      recorded.receipt,
      CATEGORY_LABEL[recorded.category] ?? recorded.category,
      { categoryTotal: recorded.payee.categoryTotal, grandTotal: recorded.payee.grandTotal }
    );
    if (toLocalPhone(recorded.payerPhone) !== toLocalPhone(recorded.payee.phone)) {
      await sendPayerReceipt(recorded.payerPhone, recorded.amount);
    }
  } catch {
    // SMS delivery is best-effort - never block the Daraja ack on it.
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Confirmation received successfully" });
}
