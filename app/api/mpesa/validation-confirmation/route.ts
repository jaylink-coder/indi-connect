import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const paybillNumber = body.BusinessShortCode?.toString().trim();
    const accountReference = body.BillRefNumber?.toString().trim().toUpperCase();
    const mpesaReceipt = body.TransID?.toString().trim();
    const transactionAmount = Number(body.TransAmount || 0);

    if (!accountReference || !paybillNumber) {
      return NextResponse.json(
        { ResultCode: "C2B00012", ResultDesc: "Rejected: Invalid Account or Shortcode Reference" },
        { status: 400 },
      );
    }

    const category =
      paybillNumber === "700000"
        ? "TITHE"
        : paybillNumber === "700001"
          ? "CESS"
          : paybillNumber === "700002"
            ? "OPERATIONS"
            : paybillNumber === "700003"
              ? "PROJECT"
              : null;

    if (!category) {
      return NextResponse.json(
        { ResultCode: "C2B00013", ResultDesc: "Rejected: Shortcode does not match Parish ledger mapping" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Accepted Contribution Successfully Processed",
      receipt: mpesaReceipt,
      category,
      amount: transactionAmount,
      memberNo: accountReference,
    });
  } catch (error) {
    return NextResponse.json(
      { ResultCode: "C2B00016", ResultDesc: `Internal Error: ${String(error)}` },
      { status: 500 },
    );
  }
}
