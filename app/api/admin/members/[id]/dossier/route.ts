export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopedLocalChurchIds } from "@/lib/hierarchy";
import { getMemberDossier } from "@/lib/memberDossier";
import { getCurrentMemberId } from "@/lib/session";
import { prisma } from "@/lib/db";

/** The consolidated member dossier - registration facts, roles held, and giving history - for a member the caller manages. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const callerId = await getCurrentMemberId();
  if (!callerId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const access = await getMemberAccess(callerId);
  if (!access || !hasAccess(access.permissions, "admin.members")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await prisma.member.findUnique({ where: { id }, select: { localChurchId: true } });
  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const scopedLocalChurchIds = await getScopedLocalChurchIds(callerId, "admin.members");
  if (!scopedLocalChurchIds.includes(target.localChurchId)) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const dossier = await getMemberDossier(id);
  return NextResponse.json(dossier);
}
