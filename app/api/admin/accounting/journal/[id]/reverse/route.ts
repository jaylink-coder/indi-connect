export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScopesForPermission } from "@/lib/hierarchy";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";
import { reverseGLTransaction } from "@/lib/accounting/postEntry";

/** Reverses any GL entry within the caller's scope - same composite gate as posting a manual journal entry. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  const original = await prisma.gLTransaction.findUnique({ where: { id }, select: { scopeTier: true, scopeId: true } });
  if (!original) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  const scopes = await getScopesForPermission(memberId, "admin.accounting", "EDIT");
  if (!scopes.some((s) => s.tier === original.scopeTier && s.id === original.scopeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim() : undefined;

  try {
    const entry = await reverseGLTransaction({ glTransactionId: id, postedByMemberId: memberId, reason });
    return NextResponse.json({ status: "ok" as const, entry });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to reverse entry" }, { status: 400 });
  }
}
