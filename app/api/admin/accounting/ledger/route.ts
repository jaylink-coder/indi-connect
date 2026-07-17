export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getScopesForPermission } from "@/lib/hierarchy";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";
import { listGLTransactions, type GLLedgerFilters } from "@/lib/accounting/reports";
import type { GLTransactionType } from "@prisma/client";

const VALID_TXN_TYPES = new Set<GLTransactionType>(["CONTRIBUTION", "EXPENSE", "JOURNAL", "REVERSAL"]);

/** Filterable, paginated General Ledger, tree-walked across the caller's admin.accounting scope(s) - same tree-descent as the Financial Rollup, not exact-match. */
export async function GET(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.accounting")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const txnTypeParam = url.searchParams.get("txnType");
  if (txnTypeParam && !VALID_TXN_TYPES.has(txnTypeParam as GLTransactionType)) {
    return NextResponse.json({ error: "Unknown txnType" }, { status: 400 });
  }
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 25));

  const filters: GLLedgerFilters = {
    txnType: (txnTypeParam as GLTransactionType) || undefined,
    accountId: url.searchParams.get("accountId") || undefined,
    dateFrom: url.searchParams.get("dateFrom") ? new Date(url.searchParams.get("dateFrom")!) : undefined,
    dateTo: url.searchParams.get("dateTo") ? new Date(url.searchParams.get("dateTo")!) : undefined,
  };

  const scopes = await getScopesForPermission(memberId, "admin.accounting");
  const result = await listGLTransactions(scopes, filters, page, pageSize);
  return NextResponse.json(result);
}
