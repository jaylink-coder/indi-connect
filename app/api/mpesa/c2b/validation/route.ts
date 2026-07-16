export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

/**
 * Daraja's C2B Validation callback - only fires if "External Validation" is
 * enabled for the paybill (many aren't; Confirmation below always fires
 * regardless). Runs BEFORE the transaction completes, so it's the one place
 * we could reject a payment outright. We deliberately don't: rejecting a
 * real member's payment because we can't yet parse their Account Number
 * would bounce real money back with a confusing error on their phone.
 * Uncertain payments are accepted and sorted out afterwards via the
 * UnmatchedPayment review queue (see c2b/confirmation), not blocked here.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const billRefNumber = body?.BillRefNumber?.toString().trim();
  const transAmount = Number(body?.TransAmount);

  if (!billRefNumber || !Number.isFinite(transAmount) || transAmount <= 0) {
    return NextResponse.json({ ResultCode: "C2B00011", ResultDesc: "Rejected: Invalid Account or Amount" });
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
