import { NextResponse } from "next/server";
import { initiateSTKPush } from "@/lib/mpesa";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber, amount, accountReference, transactionDesc } = body;

    // Validate required fields
    if (!phoneNumber || !amount || !accountReference) {
      return NextResponse.json(
        { error: "Missing required fields: phoneNumber, amount, accountReference" },
        { status: 400 }
      );
    }

    // Validate phone number format (should start with 254 for Kenya)
    const formattedPhone = phoneNumber.startsWith("0") 
      ? `254${phoneNumber.slice(1)}` 
      : phoneNumber.startsWith("+254") 
        ? phoneNumber.slice(1) 
        : phoneNumber;

    const response = await initiateSTKPush({
      phoneNumber: formattedPhone,
      amount: Number(amount),
      accountReference: accountReference.toUpperCase(),
      transactionDesc: transactionDesc || "Church Contribution",
    });

    return NextResponse.json({
      success: true,
      merchantRequestID: response.MerchantRequestID,
      checkoutRequestID: response.CheckoutRequestID,
      responseDescription: response.ResponseDescription,
      customerMessage: response.CustomerMessage,
    });
  } catch (error) {
    console.error("STK Push API error:", error);
    return NextResponse.json(
      { error: "Failed to initiate STK Push", details: String(error) },
      { status: 500 }
    );
  }
}
