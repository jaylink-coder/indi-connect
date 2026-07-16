export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getMemberAccess } from "@/lib/permissions";

export async function GET() {
  const { userId } = await auth();
  const access = await getMemberAccess(userId);
  return NextResponse.json({ isLeader: access?.isLeader ?? false, permissions: access?.permissions ?? {} });
}
