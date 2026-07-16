export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { processCallback, parseMpesaTimestamp } from "@/lib/mpesa";
import { recordContributionForCheckout, markIntentFailed } from "@/lib/payments";
import { sendPaymentConfirmation, sendPayerReceipt } from "@/lib/twilio";
import { toLocalPhone } from "@/lib/phone";

const CATEGORY_LABEL: Record<string, string> = {
  TITHE: "tithe",
  CESS: "cess",
  OPERATIONS: "church operations",
  PROJECT: "project",
  WELFARE: "welfare",
};

/**
 * Daraja's server-to-server callback. Always ack with ResultCode 0 once
 * we've handled (or safely ignored) the payload - a non-zero/error response
 * makes Safaricom retry the same callback repeatedly.
 */
export async function POST(request: Request) {
  const callback = await request.json().catch(() => null);
  if (!callback) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Ignored malformed callback" });
  }

  const checkoutRequestId: string | undefined = callback?.Body?.stkCallback?.CheckoutRequestID;
  if (!checkoutRequestId) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Ignored callback with no CheckoutRequestID" });
  }

  const result = processCallback(callback);

  if (!result.success) {
    await markIntentFailed(checkoutRequestId, result.resultDesc || "Payment was not completed");
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Failure recorded" });
  }

  const mpesaReceiptNo = result.metadata?.MpesaReceiptNumber;
  const transactionDate = result.metadata?.TransactionDate;

  if (!mpesaReceiptNo || !transactionDate) {
    await markIntentFailed(checkoutRequestId, "Callback was missing receipt details");
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Missing receipt details" });
  }

  const recorded = await recordContributionForCheckout(checkoutRequestId, {
    mpesaReceiptNo: String(mpesaReceiptNo),
    dateTransacted: parseMpesaTimestamp(transactionDate),
  });

  const fresh = recorded?.freshlyCompleted;
  if (fresh) {
    try {
      // Payee (account credited) always gets the full receipt with running balances.
      await sendPaymentConfirmation(
        fresh.payee.phone,
        fresh.payee.name,
        fresh.amount,
        fresh.receipt,
        CATEGORY_LABEL[fresh.category] ?? fresh.category,
        { categoryTotal: fresh.payee.categoryTotal, grandTotal: fresh.payee.grandTotal }
      );

      // If someone else's phone actually paid (e.g. paying on a relative's behalf),
      // they get a bare receipt only - no account/balance details that aren't theirs.
      if (toLocalPhone(fresh.payerPhone) !== toLocalPhone(fresh.payee.phone)) {
        await sendPayerReceipt(fresh.payerPhone, fresh.amount);
      }
    } catch {
      // SMS delivery is best-effort - never block the Daraja ack on it.
    }
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Payment processed successfully" });
}
