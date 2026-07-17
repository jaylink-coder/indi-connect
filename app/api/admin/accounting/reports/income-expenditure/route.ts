export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getScopesForPermission } from "@/lib/hierarchy";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";
import { getIncomeExpenditureStatement } from "@/lib/accounting/reports";

/** Income & Expenditure Statement for a period (defaults to the current calendar month), tree-walked across the caller's admin.accounting scope(s). */
export async function GET(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.accounting")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const periodStart = fromParam ? new Date(fromParam) : defaultStart;
  const periodEnd = toParam ? new Date(toParam) : now;

  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    return NextResponse.json({ error: "Invalid from/to date" }, { status: 400 });
  }

  const scopes = await getScopesForPermission(memberId, "admin.accounting");
  const result = await getIncomeExpenditureStatement(scopes, periodStart, periodEnd);
  return NextResponse.json(result);
}
