export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopedLocalChurchIds } from "@/lib/hierarchy";
import { getCurrentMemberId } from "@/lib/session";

/**
 * Sets (or clears) the Cess quota for an entire local church - quotas are
 * assigned per congregation, not negotiated per member, and can differ by
 * location. Nothing on the member dashboard invents a target or judges
 * "on track" until a real leader sets a real number here - see the
 * cessTargetAmount comment on the LocalChurch model.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const callerId = await getCurrentMemberId();
  if (!callerId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const access = await getMemberAccess(callerId);
  if (!access || !hasAccess(access.permissions, "admin.members", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scopedLocalChurchIds = await getScopedLocalChurchIds(callerId, "admin.members");
  if (!scopedLocalChurchIds.includes(id)) {
    return NextResponse.json({ error: "Local church not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const rawAmount = body?.cessTargetAmount;

  if (rawAmount === null) {
    await prisma.localChurch.update({ where: { id }, data: { cessTargetAmount: null } });
    return NextResponse.json({ status: "ok" as const, cessTargetAmount: null });
  }

  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid quota amount" }, { status: 400 });
  }

  await prisma.localChurch.update({ where: { id }, data: { cessTargetAmount: amount } });
  return NextResponse.json({ status: "ok" as const, cessTargetAmount: amount });
}
