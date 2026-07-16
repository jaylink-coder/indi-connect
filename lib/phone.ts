/** Normalizes a stored Kenyan number ("254712345678") to local display form ("0712345678"). */
export function toLocalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return "0" + digits.slice(3);
  return digits;
}

/** "0712345678" -> "0712•••678" - enough for a member to recognize their own number, not enough to leak it. */
export function maskPhone(phone: string): string {
  const local = toLocalPhone(phone);
  if (local.length < 7) return "•••••";
  return `${local.slice(0, 4)}•••${local.slice(-3)}`;
}

/** Normalizes any Kenyan number format ("0712...", "+254712...", "254712...") to Daraja's required "254712..." form. */
export function toMpesaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  return digits;
}
