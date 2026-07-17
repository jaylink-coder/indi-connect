export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopedLocalChurchIds } from "@/lib/hierarchy";
import { getCurrentMemberId } from "@/lib/session";

/** Children/minors (no login of their own) for one local church the caller manages. */
export async function GET(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.members")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const localChurchId = url.searchParams.get("localChurchId");
  if (!localChurchId) return NextResponse.json({ error: "localChurchId is required" }, { status: 400 });

  const scopedChurchIds = await getScopedLocalChurchIds(memberId, "admin.members");
  if (!scopedChurchIds.includes(localChurchId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dependents = await prisma.dependent.findMany({
    where: { localChurchId },
    select: {
      id: true,
      name: true,
      dateOfBirth: true,
      gender: true,
      guardian: { select: { id: true, name: true, membershipNo: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(dependents);
}

/** Registers a child - the counterpart to POST /api/members, but with no Member No./phone/login of their own. */
export async function POST(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.members", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const dateOfBirth = typeof body?.dateOfBirth === "string" && body.dateOfBirth ? new Date(body.dateOfBirth) : null;
  const gender = body?.gender === "MALE" || body?.gender === "FEMALE" ? body.gender : null;
  const guardianId = typeof body?.guardianId === "string" && body.guardianId ? body.guardianId : null;
  const localChurchId = typeof body?.localChurchId === "string" ? body.localChurchId : "";

  if (!name || !dateOfBirth || !localChurchId) {
    return NextResponse.json({ error: "Name, Date of Birth, and Local Church are required" }, { status: 400 });
  }
  if (Number.isNaN(dateOfBirth.getTime())) {
    return NextResponse.json({ error: "Enter a valid Date of Birth" }, { status: 400 });
  }
  const ageMs = Date.now() - dateOfBirth.getTime();
  if (ageMs < 0 || ageMs > 18 * 365.25 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Date of Birth must put them under 18 today" }, { status: 400 });
  }

  const scopedChurchIds = await getScopedLocalChurchIds(memberId, "admin.members");
  if (!scopedChurchIds.includes(localChurchId)) {
    return NextResponse.json({ error: "You don't manage that local church" }, { status: 403 });
  }

  if (guardianId) {
    const guardian = await prisma.member.findUnique({ where: { id: guardianId }, select: { localChurchId: true } });
    if (!guardian || guardian.localChurchId !== localChurchId) {
      return NextResponse.json({ error: "Guardian must be a member of the same local church" }, { status: 400 });
    }
  }

  const created = await prisma.dependent.create({
    data: { name, dateOfBirth, gender, guardianId, localChurchId },
    select: { id: true, name: true },
  });
  return NextResponse.json({ status: "ok" as const, dependent: created });
}
