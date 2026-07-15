import { NextResponse } from "next/server";
import { processCallback } from "@/lib/mpesa";

export async function POST(request: Request) {
  try {
    const callback = await request.json();
    
    // Process the callback
    const result = processCallback(callback);
    
    if (result.success) {
      // Extract payment details from metadata
      const { metadata } = result;
      const mpesaReceipt = metadata?.MpesaReceiptNumber;
      const amount = metadata?.Amount;
      const phoneNumber = metadata?.PhoneNumber;
      const transactionDate = metadata?.TransactionDate;
      
      // Here you would:
      // 1. Find the user by account reference (from the original STK push request)
      // 2. Create a contribution record in the database
      // 3. Send SMS confirmation via Twilio
      // 4. Update any relevant statistics
      
      console.log("Payment successful:", {
        mpesaReceipt,
        amount,
        phoneNumber,
        transactionDate,
      });
      
      // For now, return success response
      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: "Payment processed successfully",
      });
    } else {
      // Payment failed or was cancelled
      console.error("Payment failed:", result.resultDesc);
      
      return NextResponse.json({
        ResultCode: result.resultCode,
        ResultDesc: result.resultDesc,
      });
    }
  } catch (error) {
    console.error("Callback processing error:", error);
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: "Error processing callback" },
      { status: 500 }
    );
  }
}
