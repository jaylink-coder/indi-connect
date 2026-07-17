export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getScopesForPermission } from "@/lib/hierarchy";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";
import { getTrialBalance } from "@/lib/accounting/reports";

/** Trial Balance as of a date (defaults to now), tree-walked across the caller's admin.accounting scope(s). */
export async function GET(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.accounting")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const asOfParam = url.searchParams.get("asOf");
  const asOf = asOfParam ? new Date(asOfParam) : undefined;
  if (asOfParam && Number.isNaN(asOf?.getTime())) {
    return NextResponse.json({ error: "Invalid asOf date" }, { status: 400 });
  }

  const scopes = await getScopesForPermission(memberId, "admin.accounting");
  const result = await getTrialBalance(scopes, asOf);
  return NextResponse.json(result);
}
