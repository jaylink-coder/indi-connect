export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";

/** The full Permission catalog - columns for the Roles & Permissions matrix editor. */
export async function GET() {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.roles")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const permissions = await prisma.permission.findMany({
    select: { id: true, key: true, label: true, section: true },
    orderBy: [{ section: "asc" }, { label: "asc" }],
  });
  return NextResponse.json(permissions);
}
