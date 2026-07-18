import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * One-off: real Sunday-service AttendanceRecord rows for the founder
 * (AIPCA-GAT-0001), same window and absence pattern used to shape the Call
 * Registry gaps in seed-founder-sample-history.ts (an illness stretch, a
 * travel stretch, and scattered single-week absences) - so "My Attendance
 * History" shows an actual member's record, not a perfect streak.
 * Re-runnable: upserts by [memberId, serviceDate, serviceType], never
 * duplicates.
 */

const HISTORY_START = new Date(2024, 0, 1);
const LAST_SUNDAY = new Date(2026, 6, 12);
const SERVICE_TYPE = "Sunday Service";

function sundaysBetween(start: Date, end: Date) {
  const d = new Date(start);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  const out: Date[] = [];
  while (d <= end) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

async function main() {
  const founder = await prisma.member.findUnique({
    where: { membershipNo: "AIPCA-GAT-0001" },
    select: { id: true, localChurchId: true },
  });
  if (!founder) throw new Error("Founder account AIPCA-GAT-0001 not found");

  const sundays = sundaysBetween(HISTORY_START, LAST_SUNDAY);
  const illnessStretch = (w: number) => w >= 30 && w <= 33;
  const travelStretch = (w: number) => w >= 100 && w <= 102;
  const scatteredAbsence = (w: number) => w % 9 === 4;
  const isAbsentWeek = (w: number) => illnessStretch(w) || travelStretch(w) || scatteredAbsence(w);

  const rows = sundays.map((sunday, w) => ({
    memberId: founder.id,
    localChurchId: founder.localChurchId,
    serviceDate: sunday,
    serviceType: SERVICE_TYPE,
    status: isAbsentWeek(w) ? ("ABSENT" as const) : ("PRESENT" as const),
  }));

  for (const batch of chunk(rows, 500)) {
    await prisma.$transaction(
      batch.map((r) =>
        prisma.attendanceRecord.upsert({
          where: { memberId_serviceDate_serviceType: { memberId: r.memberId, serviceDate: r.serviceDate, serviceType: r.serviceType } },
          create: r,
          update: { status: r.status },
        })
      )
    );
  }

  const present = rows.filter((r) => r.status === "PRESENT").length;
  console.log(`Upserted ${rows.length} attendance records for the founder (${present} present, ${rows.length - present} absent).`);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
