import "dotenv/config";
import { PrismaClient, type FundCategory } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * One-off: gives the real founder account (AIPCA-GAT-0001) a realistic
 * giving + attendance history to explore - a long-standing member (joinedAt
 * pushed well into the past, not "today"), not a perfect one: some months of
 * Tithe are skipped entirely, some are paid late in the month, Cess against
 * the local church's quota is under/over/missed some months, and Call
 * Registry has real absentee gaps rather than a clean unbroken streak.
 * Clearly-labeled "DEMOFOUNDER" receipts (same convention as
 * seed-groups-contributions-milestones.ts's "SEED" receipts) - sample data,
 * not a fabricated M-Pesa-looking receipt.
 *
 * Re-runnable: wipes this account's own GL entries + contributions first, so
 * re-running regenerates the full history from scratch instead of skipping
 * or duplicating it.
 */

const HISTORY_START = new Date(2024, 0, 1); // Jan 2024
const HISTORY_END_MONTH = new Date(2026, 6, 1); // Jul 2026 (inclusive)
const LAST_SUNDAY = new Date(2026, 6, 12); // matches "today" being 2026-07-18

function monthsBetween(start: Date, end: Date) {
  const out: Date[] = [];
  const d = new Date(start);
  while (d <= end) {
    out.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

function sundaysBetween(start: Date, end: Date) {
  const d = new Date(start);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); // first Sunday on/after start
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

  await prisma.member.update({
    where: { id: founder.id },
    data: { joinedAt: new Date(2011, 7, 14) }, // long-standing member, not a recent sign-up
  });
  console.log("Set founder joinedAt to 2011-08-14 (was showing as a brand-new member).");

  const existingIds = (
    await prisma.contribution.findMany({ where: { memberId: founder.id }, select: { id: true } })
  ).map((c) => c.id);
  if (existingIds.length > 0) {
    await prisma.gLTransaction.deleteMany({ where: { contributionId: { in: existingIds } } });
    await prisma.contribution.deleteMany({ where: { id: { in: existingIds } } });
    console.log(`Cleared ${existingIds.length} previous sample contributions (and their GL entries) to regenerate.`);
  }

  await prisma.localChurch.update({
    where: { id: founder.localChurchId },
    data: { cessTargetAmount: 300 },
  });

  const rows: { memberId: string; amount: number; category: FundCategory; mpesaReceiptNo: string; dateTransacted: Date }[] = [];
  let seq = 0;
  const receipt = () => `DEMOFOUNDER${String(++seq).padStart(4, "0")}`;
  const push = (amount: number, category: FundCategory, date: Date) =>
    rows.push({ memberId: founder.id, amount, category, mpesaReceiptNo: receipt(), dateTransacted: date });

  const months = monthsBetween(HISTORY_START, HISTORY_END_MONTH);

  // Tithe - monthly, but real life intervenes: 4 months skipped outright,
  // 5 more paid conspicuously late (and lighter, since it was a rushed catch-up).
  const titheSkip = new Set([5, 14, 22, 27]);
  const titheLate = new Set([2, 9, 16, 21, 26]);
  const titheBase = [2000, 2500, 3000, 1800, 3500, 4000, 2200];
  months.forEach((m, i) => {
    if (titheSkip.has(i)) return;
    const late = titheLate.has(i);
    const day = late ? 24 + (i % 5) : 3 + (i % 6);
    const amount = late ? Math.round(titheBase[i % titheBase.length] * 0.45) : titheBase[i % titheBase.length];
    push(amount, "TITHE", new Date(m.getFullYear(), m.getMonth(), day));
  });

  // Cess - against the KES 300/month quota: 4 months missed entirely
  // (delinquent), 6 underpaid, one over-paid as a late correction.
  const cessSkip = new Set([3, 11, 19, 24]);
  const cessUnderpay = new Set([1, 7, 13, 18, 25, 29]);
  const cessCorrection = new Set([20]);
  months.forEach((m, i) => {
    if (cessSkip.has(i)) return;
    const amount = cessUnderpay.has(i) ? 150 : cessCorrection.has(i) ? 350 : 300;
    push(amount, "CESS", new Date(m.getFullYear(), m.getMonth(), 10));
  });

  // Sadaka - occasional by nature, scattered unevenly across the period.
  [
    [0, 18, 200], [1, 22, 150], [3, 9, 300], [4, 27, 200], [6, 14, 400],
    [8, 5, 250], [10, 19, 200], [13, 8, 350], [16, 25, 150], [18, 12, 300],
    [21, 30, 200], [24, 16, 400], [27, 6, 250], [29, 21, 300],
  ].forEach(([monthIdx, day, amount]) => {
    const m = months[monthIdx];
    push(amount, "SADAKA", new Date(m.getFullYear(), m.getMonth(), day));
  });

  // Church Operations - roughly every third month.
  [1, 4, 7, 10, 13, 17, 20, 23, 26, 29].forEach((monthIdx, k) => {
    const m = months[monthIdx];
    push(400 + (k % 4) * 100, "OPERATIONS", new Date(m.getFullYear(), m.getMonth(), 20));
  });

  // Call Registry - weekly, doubling as a giving-side attendance signal.
  // Real absenteeism (see AttendanceRecord seeding) means real payment gaps
  // too, plus the odd mismatch: a catch-up double payment after a missed
  // week, and a couple of forgotten payments despite being in service.
  const sundays = sundaysBetween(HISTORY_START, LAST_SUNDAY);
  const illnessStretch = (w: number) => w >= 30 && w <= 33;
  const travelStretch = (w: number) => w >= 100 && w <= 102;
  const scatteredAbsence = (w: number) => w % 9 === 4;
  const isAbsentWeek = (w: number) => illnessStretch(w) || travelStretch(w) || scatteredAbsence(w);
  const forgotDespitePresent = (w: number) => w % 17 === 5;
  const paidDespiteAbsent = (w: number) => w % 23 === 7; // gave via someone else while away

  let previousWeekSkipped = false;
  sundays.forEach((sunday, w) => {
    const absent = isAbsentWeek(w);
    const skipPayment = (!absent && forgotDespitePresent(w)) || (absent && !paidDespiteAbsent(w));
    if (skipPayment) {
      previousWeekSkipped = true;
      return;
    }
    const amount = previousWeekSkipped ? 100 : 50; // catch-up top-up after a missed week
    previousWeekSkipped = false;
    push(amount, "CALL_REGISTRY", sunday);
  });

  await prisma.contribution.createMany({ data: rows });
  console.log(`Created ${rows.length} sample contributions for the founder account (Jan 2024 - Jul 2026, with realistic gaps).`);
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
