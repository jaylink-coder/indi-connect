export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getMemberAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";

export async function GET() {
  const memberId = await getCurrentMemberId();
  const access = await getMemberAccess(memberId);
  return NextResponse.json({ isLeader: access?.isLeader ?? false, permissions: access?.permissions ?? {} });
}
