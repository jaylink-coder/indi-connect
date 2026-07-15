// M-Pesa Daraja API Integration
// This handles STK Push for initiating payments and callbacks for payment confirmation

const MPESA_ENVIRONMENT = process.env.MPESA_ENVIRONMENT || "sandbox";
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE;
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const MPESA_PASSKEY = process.env.MPESA_PASSKEY;

const MPESA_BASE_URL = MPESA_ENVIRONMENT === "live"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";

export interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string; // Member number
  transactionDesc: string;
}

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface MpesaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata: {
        Item: Array<{
          Key: string;
          Value: any;
        }>;
      };
    };
  };
}

// Generate OAuth token
async function getOAuthToken(): Promise<string> {
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");
  
  const response = await fetch(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  const data = await response.json();
  return data.access_token;
}

// Generate password for STK Push
function generatePassword(): string {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, -4);
  const passwordString = `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`;
  return Buffer.from(passwordString).toString("base64");
}

// Initiate STK Push
export async function initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
  try {
    const token = await getOAuthToken();
    const password = generatePassword();
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, -4);

    const payload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: request.amount,
      PartyA: request.phoneNumber,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: request.phoneNumber,
      CallBackURL: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/mpesa/stk-callback`,
      AccountReference: request.accountReference,
      TransactionDesc: request.transactionDesc,
    };

    const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("STK Push error:", error);
    throw new Error("Failed to initiate STK Push");
  }
}

// Process callback from M-Pesa
export function processCallback(callback: MpesaCallback): {
  success: boolean;
  resultCode: number;
  resultDesc: string;
  metadata?: any;
} {
  const { stkCallback } = callback.Body;
  
  if (stkCallback.ResultCode === 0) {
    // Success - extract metadata
    const metadata: Record<string, any> = {};
    if (stkCallback.CallbackMetadata?.Item) {
      stkCallback.CallbackMetadata.Item.forEach((item) => {
        metadata[item.Key] = item.Value;
      });
    }
    
    return {
      success: true,
      resultCode: stkCallback.ResultCode,
      resultDesc: stkCallback.ResultDesc,
      metadata,
    };
  }
  
  return {
    success: false,
    resultCode: stkCallback.ResultCode,
    resultDesc: stkCallback.ResultDesc,
  };
}
