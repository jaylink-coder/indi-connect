export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getScopesForPermission } from "@/lib/hierarchy";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";
import { postManualJournalEntry } from "@/lib/accounting/postEntry";

/**
 * Manual journal entry - the only place raw debit/credit account selection
 * is exposed to a user. Gated on admin.accounting EDIT *and* admin.members
 * EDIT - a fully data-driven proxy for "Chairman/Super-Admin level," since
 * the seed only grants admin.members EDIT to Chairmen and Super Admin,
 * never to Treasurers.
 */
export async function POST(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (
    !access ||
    !hasAccess(access.permissions, "admin.accounting", "EDIT") ||
    !hasAccess(access.permissions, "admin.members", "EDIT")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scopes = await getScopesForPermission(memberId, "admin.accounting", "EDIT");
  if (scopes.length === 0) {
    return NextResponse.json({ error: "You have no scope to post a journal entry under" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const debitAccountId = typeof body?.debitAccountId === "string" ? body.debitAccountId : "";
  const creditAccountId = typeof body?.creditAccountId === "string" ? body.creditAccountId : "";
  const amount = Number(body?.amount);
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const requestedScopeId = typeof body?.scopeId === "string" ? body.scopeId : scopes[0].id;

  if (!debitAccountId || !creditAccountId || !description) {
    return NextResponse.json({ error: "Debit account, credit account, and a description are required" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  }

  const scope = scopes.find((s) => s.id === requestedScopeId);
  if (!scope) {
    return NextResponse.json({ error: "That scope isn't one you manage" }, { status: 403 });
  }

  try {
    const entry = await postManualJournalEntry({
      debitAccountId,
      creditAccountId,
      amount,
      description,
      scopeTier: scope.tier,
      scopeId: scope.id,
      postedByMemberId: memberId,
    });
    return NextResponse.json({ status: "ok" as const, entry }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to post journal entry" }, { status: 400 });
  }
}
