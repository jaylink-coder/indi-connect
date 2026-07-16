export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopedLocalChurchIds } from "@/lib/hierarchy";
import { getCurrentMemberId } from "@/lib/session";
import type { AttendanceStatus } from "@prisma/client";

async function resolveCaller() {
  const memberId = await getCurrentMemberId();
  if (!memberId) return null;

  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true } });
  if (!member) return null;

  const access = await getMemberAccess(memberId);
  return { memberId: member.id, access };
}

/** The attendance roster for a given service - every member in the caller's scope, with their status if already marked. */
export async function GET(request: Request) {
  const caller = await resolveCaller();
  if (!caller) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!caller.access || !hasAccess(caller.access.permissions, "admin.attendance")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const serviceDate = searchParams.get("serviceDate");
  const serviceType = searchParams.get("serviceType");
  if (!serviceDate || !serviceType) {
    return NextResponse.json({ error: "serviceDate and serviceType are required" }, { status: 400 });
  }

  const localChurchIds = await getScopedLocalChurchIds(caller.memberId, "admin.attendance");
  if (localChurchIds.length === 0) {
    return NextResponse.json({ roster: [] });
  }

  const members = await prisma.member.findMany({
    where: { localChurchId: { in: localChurchIds } },
    select: {
      id: true,
      name: true,
      membershipNo: true,
      localChurch: { select: { name: true } },
      attendanceRecords: {
        where: { serviceDate: new Date(serviceDate), serviceType },
        select: { status: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const roster = members.map((m) => ({
    memberId: m.id,
    name: m.name,
    membershipNo: m.membershipNo,
    localChurchName: m.localChurch.name,
    status: m.attendanceRecords[0]?.status ?? null,
  }));

  return NextResponse.json({ roster });
}

/** Marks/updates attendance for a batch of members on one service. */
export async function POST(request: Request) {
  const caller = await resolveCaller();
  if (!caller) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!caller.access || !hasAccess(caller.access.permissions, "admin.attendance", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const serviceDate = typeof body?.serviceDate === "string" ? body.serviceDate : "";
  const serviceType = typeof body?.serviceType === "string" ? body.serviceType.trim() : "";
  const records = Array.isArray(body?.records) ? body.records : [];

  if (!serviceDate || !serviceType || records.length === 0) {
    return NextResponse.json({ error: "serviceDate, serviceType, and records are required" }, { status: 400 });
  }

  const localChurchIds = new Set(await getScopedLocalChurchIds(caller.memberId, "admin.attendance"));
  if (localChurchIds.size === 0) {
    return NextResponse.json({ error: "No local churches in your scope" }, { status: 403 });
  }

  const memberIds = records
    .map((r: { memberId?: unknown }) => (typeof r.memberId === "string" ? r.memberId : null))
    .filter((id: string | null): id is string => id !== null);

  const eligibleMembers = await prisma.member.findMany({
    where: { id: { in: memberIds }, localChurchId: { in: [...localChurchIds] } },
    select: { id: true, localChurchId: true },
  });
  const eligibleById = new Map(eligibleMembers.map((m) => [m.id, m.localChurchId]));

  const date = new Date(serviceDate);
  const validStatuses: AttendanceStatus[] = ["PRESENT", "ABSENT"];

  const updates = records.filter(
    (r: { memberId?: unknown; status?: unknown }) =>
      typeof r.memberId === "string" &&
      eligibleById.has(r.memberId) &&
      validStatuses.includes(r.status as AttendanceStatus)
  );

  await prisma.$transaction(
    updates.map((r: { memberId: string; status: AttendanceStatus }) =>
      prisma.attendanceRecord.upsert({
        where: {
          memberId_serviceDate_serviceType: { memberId: r.memberId, serviceDate: date, serviceType },
        },
        create: {
          memberId: r.memberId,
          localChurchId: eligibleById.get(r.memberId)!,
          serviceDate: date,
          serviceType,
          status: r.status,
        },
        update: { status: r.status },
      })
    )
  );

  return NextResponse.json({ updated: updates.length, skipped: records.length - updates.length });
}
