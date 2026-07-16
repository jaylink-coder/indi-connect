export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopesForPermission } from "@/lib/hierarchy";
import { getManagedStructureTree } from "@/lib/structure";
import { getCurrentMemberId } from "@/lib/session";

/**
 * The real church org chart, rooted at whatever the caller holds
 * admin.members EDIT for - a Parish Chairman sees their own parish (and can
 * add Local Churches under it), a national-level role sees the whole tree.
 * Empty branches still show up, unlike the financial rollup, since the
 * whole point here is having somewhere to build under.
 */
export async function GET() {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.members", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scopes = await getScopesForPermission(memberId, "admin.members", "EDIT");
  const roots = await getManagedStructureTree(scopes);
  return NextResponse.json({ roots });
}
