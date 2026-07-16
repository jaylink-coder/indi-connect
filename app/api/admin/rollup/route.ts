export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopesForPermission } from "@/lib/hierarchy";
import { getFinancialRollup } from "@/lib/rollup";
import { getCurrentMemberId } from "@/lib/session";

/**
 * Consolidated financial view, rooted at whatever scope(s) the caller holds
 * admin.rollup for - a HEADQUARTERS grant sees the full org tree, a PARISH
 * or LOCAL_CHURCH grant sees only their own subtree. See lib/rollup.ts.
 */
export async function GET() {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.rollup")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scopes = await getScopesForPermission(memberId, "admin.rollup");
  const roots = await getFinancialRollup(scopes);
  return NextResponse.json({ roots });
}
