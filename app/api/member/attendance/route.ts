export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMemberId } from "@/lib/session";

/** A member's own real Sunday-service attendance record - self-service, only ever the caller's own data. */
export async function GET() {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const records = await prisma.attendanceRecord.findMany({
    where: { memberId },
    orderBy: { serviceDate: "desc" },
    select: { serviceDate: true, serviceType: true, status: true },
  });

  const presentCount = records.filter((r) => r.status === "PRESENT").length;
  const attendanceRate = records.length > 0 ? Math.round((presentCount / records.length) * 100) : null;

  return NextResponse.json({
    totalServices: records.length,
    presentCount,
    absentCount: records.length - presentCount,
    attendanceRate,
    recent: records.slice(0, 12).map((r) => ({
      serviceDate: r.serviceDate.toISOString(),
      serviceType: r.serviceType,
      status: r.status,
    })),
  });
}
