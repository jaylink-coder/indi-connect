export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toMpesaPhone } from "@/lib/phone";
import { getCurrentMemberId } from "@/lib/session";

/**
 * Resolves a Church No./National ID, OR a phone number, to a display name -
 * so a member paying on someone else's behalf (e.g. a daughter settling her
 * mother's cess) can find and confirm the right account before sending
 * money, even if they only remember the phone number and not the exact
 * membership code. Returns only name + membership no - never phone/ID/
 * financial data.
 */
export async function GET(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get("identifier")?.trim();
  const phone = searchParams.get("phone")?.trim();

  if (!identifier && !phone) {
    return NextResponse.json({ error: "Missing identifier or phone" }, { status: 400 });
  }

  const member = phone
    ? await prisma.member.findFirst({
        where: { phone: toMpesaPhone(phone) },
        select: { id: true, name: true, membershipNo: true },
      })
    : await prisma.member.findFirst({
        where: {
          OR: [
            { membershipNo: { equals: identifier, mode: "insensitive" } },
            { idNumber: { equals: identifier, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, membershipNo: true },
      });

  if (!member) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(member);
}
