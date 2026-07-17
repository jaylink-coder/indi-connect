export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScopesForPermission } from "@/lib/hierarchy";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";
import { postExpensePaidEntry } from "@/lib/accounting/postEntry";

/** APPROVED -> PAID. Posts Dr <expense account> / Cr Cash in the same transaction as the status update, so a crash between the two is impossible. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.accounting", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  const scopes = await getScopesForPermission(memberId, "admin.accounting", "EDIT");
  if (!scopes.some((s) => s.tier === expense.scopeTier && s.id === expense.scopeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.expense.findUniqueOrThrow({ where: { id } });
      if (current.status !== "APPROVED") {
        throw new Error(`STATUS_CONFLICT:${current.status}`);
      }

      await postExpensePaidEntry(tx, {
        expenseId: id,
        amount: Number(current.amount),
        expenseAccountId: current.expenseAccountId,
        scopeTier: current.scopeTier,
        scopeId: current.scopeId,
        description: current.description,
        postedByMemberId: memberId,
      });

      await tx.expense.update({
        where: { id },
        data: { status: "PAID", paidAt: new Date(), paidByMemberId: memberId },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("STATUS_CONFLICT:")) {
      const actualStatus = error.message.split(":")[1];
      return NextResponse.json({ error: `Cannot pay an expense that is ${actualStatus}` }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to record payment", details: String(error) }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" as const });
}
