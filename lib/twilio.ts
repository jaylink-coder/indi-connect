// Twilio SMS Integration
// This handles sending SMS notifications for payment confirmations, reminders, etc.

import twilio from "twilio";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const client = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN 
  ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : null;

export interface SMSMessage {
  to: string;
  body: string;
}

export async function sendSMS(message: SMSMessage): Promise<boolean> {
  if (!client) {
    console.error("Twilio client not initialized. Check environment variables.");
    return false;
  }

  try {
    // Format phone number to ensure it has the country code
    const formattedPhone = message.to.startsWith("+") 
      ? message.to 
      : `+254${message.to.startsWith("0") ? message.to.slice(1) : message.to}`;

    const response = await client.messages.create({
      body: message.body,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    console.log("SMS sent successfully:", response.sid);
    return true;
  } catch (error) {
    console.error("Failed to send SMS:", error);
    return false;
  }
}

// Send payment confirmation SMS
export async function sendPaymentConfirmation(
  phoneNumber: string,
  memberName: string,
  amount: number,
  receipt: string,
  contributionType: string
): Promise<boolean> {
  const message = `
Thank you ${memberName}! 
Your ${contributionType} of KES ${amount.toLocaleString()} has been received.
Receipt: ${receipt}
God bless you - ${process.env.CHURCH_NAME || "Indi Connect"}
  `.trim();

  return sendSMS({ to: phoneNumber, body: message });
}

// Send attendance reminder SMS
export async function sendAttendanceReminder(
  phoneNumber: string,
  memberName: string,
  serviceDate: string,
  serviceType: string
): Promise<boolean> {
  const message = `
Dear ${memberName},
This is a reminder for ${serviceType} on ${serviceDate}.
We look forward to seeing you!
${process.env.CHURCH_NAME || "Indi Connect"}
  `.trim();

  return sendSMS({ to: phoneNumber, body: message });
}

// Send prayer request notification
export async function sendPrayerRequestNotification(
  phoneNumber: string,
  memberName: string,
  prayerRequest: string
): Promise<boolean> {
  const message = `
Prayer Request from ${memberName}:
"${prayerRequest}"
Please keep them in your prayers.
${process.env.CHURCH_NAME || "Indi Connect"}
  `.trim();

  return sendSMS({ to: phoneNumber, body: message });
}
