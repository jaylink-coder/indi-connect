export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScopesForPermission } from "@/lib/hierarchy";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";

/** PENDING -> APPROVED. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.accounting", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const expense = await prisma.expense.findUnique({ where: { id }, select: { id: true, status: true, scopeTier: true, scopeId: true } });
  if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  const scopes = await getScopesForPermission(memberId, "admin.accounting", "EDIT");
  if (!scopes.some((s) => s.tier === expense.scopeTier && s.id === expense.scopeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (expense.status !== "PENDING") {
    return NextResponse.json({ error: `Cannot approve an expense that is ${expense.status}` }, { status: 409 });
  }

  await prisma.expense.update({
    where: { id },
    data: { status: "APPROVED", approvedByMemberId: memberId, approvedAt: new Date() },
  });

  return NextResponse.json({ status: "ok" as const });
}
