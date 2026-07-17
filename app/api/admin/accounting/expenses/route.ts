export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScopesForPermission } from "@/lib/hierarchy";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";

/** Expenses raised at exactly the caller's own admin.accounting scope(s) - same exact-match pattern as /api/projects, not tree-consolidated. */
export async function GET() {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.accounting")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scopes = await getScopesForPermission(memberId, "admin.accounting");
  if (scopes.length === 0) return NextResponse.json([]);

  const expenses = await prisma.expense.findMany({
    where: { OR: scopes.map((s) => ({ scopeTier: s.tier, scopeId: s.id })) },
    select: {
      id: true,
      scopeTier: true,
      scopeId: true,
      description: true,
      amount: true,
      status: true,
      vendorName: true,
      rejectionReason: true,
      createdAt: true,
      approvedAt: true,
      paidAt: true,
      expenseAccount: { select: { code: true, name: true } },
      submittedByMember: { select: { name: true } },
      approvedByMember: { select: { name: true } },
      paidByMember: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    expenses.map((e) => ({
      id: e.id,
      scopeTier: e.scopeTier,
      scopeId: e.scopeId,
      description: e.description,
      amount: Number(e.amount),
      status: e.status,
      vendorName: e.vendorName,
      rejectionReason: e.rejectionReason,
      createdAt: e.createdAt,
      approvedAt: e.approvedAt,
      paidAt: e.paidAt,
      expenseAccount: e.expenseAccount,
      submittedBy: e.submittedByMember.name,
      approvedBy: e.approvedByMember?.name ?? null,
      paidBy: e.paidByMember?.name ?? null,
    }))
  );
}

/** Submits a new Expense (PENDING) under one of the caller's own admin.accounting scopes - never an arbitrary scope they typed in. Picks an expense-category account only; the cash side is resolved automatically at pay time. */
export async function POST(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.accounting", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scopes = await getScopesForPermission(memberId, "admin.accounting", "EDIT");
  if (scopes.length === 0) {
    return NextResponse.json({ error: "You have no scope to submit an expense under" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const amount = Number(body?.amount);
  const expenseAccountId = typeof body?.expenseAccountId === "string" ? body.expenseAccountId : "";
  const vendorName = typeof body?.vendorName === "string" && body.vendorName.trim() ? body.vendorName.trim() : null;
  const requestedScopeId = typeof body?.scopeId === "string" ? body.scopeId : scopes[0].id;

  if (!description || !expenseAccountId) {
    return NextResponse.json({ error: "A description and an expense category are required" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  }

  const scope = scopes.find((s) => s.id === requestedScopeId);
  if (!scope) {
    return NextResponse.json({ error: "That scope isn't one you manage" }, { status: 403 });
  }

  const expenseAccount = await prisma.account.findUnique({ where: { id: expenseAccountId } });
  if (!expenseAccount || expenseAccount.type !== "EXPENSE" || !expenseAccount.isActive) {
    return NextResponse.json({ error: "Invalid expense category" }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      scopeTier: scope.tier,
      scopeId: scope.id,
      description,
      amount,
      expenseAccountId,
      vendorName,
      submittedByMemberId: memberId,
    },
    select: { id: true },
  });

  return NextResponse.json({ status: "ok" as const, expense }, { status: 201 });
}
