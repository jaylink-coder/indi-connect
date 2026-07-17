export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopedLocalChurchIds } from "@/lib/hierarchy";
import { getCurrentMemberId } from "@/lib/session";

const ACTIONS = ["activate", "suspend", "reinstate", "remove"] as const;

/** Changes a group membership's status - the manual counterpart to the (not yet built) attendance-driven auto-suspension rule. */
export async function PATCH(request: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  const callerId = await getCurrentMemberId();
  if (!callerId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(callerId);
  if (!access || !hasAccess(access.permissions, "admin.groups", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { membershipId } = await params;
  const membership = await prisma.groupMembership.findUnique({
    where: { id: membershipId },
    select: { id: true, group: { select: { localChurchId: true } } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const scopedChurchIds = await getScopedLocalChurchIds(callerId, "admin.groups");
  if (!scopedChurchIds.includes(membership.group.localChurchId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: `action must be one of: ${ACTIONS.join(", ")}` }, { status: 400 });
  }

  const data =
    action === "activate" || action === "reinstate"
      ? { status: "ACTIVE" as const }
      : action === "suspend"
        ? { status: "SUSPENDED" as const }
        : { endedAt: new Date() };

  await prisma.groupMembership.update({ where: { id: membershipId }, data });
  return NextResponse.json({ status: "ok" as const });
}
