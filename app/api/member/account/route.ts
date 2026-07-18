export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentMemberId } from "@/lib/session";
import type { FundCategory } from "@prisma/client";

const ACCOUNT_CATEGORIES: { category: FundCategory; label: string; description: string }[] = [
  { category: "TITHE", label: "Tithe (Zaka)", description: "Your freewill giving, traditionally a tenth of income." },
  { category: "SADAKA", label: "Sadaka", description: "A voluntary offering, given as you're moved to." },
  { category: "CALL_REGISTRY", label: "Call Registry", description: "Weekly payment that doubles as your attendance record." },
  { category: "OPERATIONS", label: "Church Operations", description: "Shared fund for running the local church." },
];

/**
 * A member's own single-category statement (their "account") - every
 * transaction they've ever made in that category, plus this-month/this-
 * year/all-time totals, computed live from Contribution rows the same way
 * lib/accounts.ts does for the whole-dashboard summary. Self-service only -
 * a member can only ever read their own account, never another member's.
 */
export async function GET(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get("category");
  const account = ACCOUNT_CATEGORIES.find((a) => a.category === categoryParam);
  if (!account) {
    return NextResponse.json({ error: "Unknown account category" }, { status: 400 });
  }

  const contributions = await prisma.contribution.findMany({
    where: { memberId, category: account.category },
    orderBy: { dateTransacted: "desc" },
    select: { id: true, amount: true, dateTransacted: true, mpesaReceiptNo: true },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  // Last 6 calendar months including the current one, oldest first - a
  // small enough window to read at a glance in a modal, not a full ledger.
  const TREND_MONTHS = 6;
  const trendBuckets = Array.from({ length: TREND_MONTHS }, (_, i) => {
    const bucketStart = new Date(now.getFullYear(), now.getMonth() - (TREND_MONTHS - 1 - i), 1);
    const bucketEnd = new Date(now.getFullYear(), now.getMonth() - (TREND_MONTHS - 1 - i) + 1, 1);
    return { start: bucketStart, end: bucketEnd, amount: 0 };
  });

  let totalAllTime = 0;
  let totalThisYear = 0;
  let totalThisMonth = 0;
  for (const c of contributions) {
    const amount = Number(c.amount);
    totalAllTime += amount;
    if (c.dateTransacted >= yearStart) totalThisYear += amount;
    if (c.dateTransacted >= monthStart) totalThisMonth += amount;
    const bucket = trendBuckets.find((b) => c.dateTransacted >= b.start && c.dateTransacted < b.end);
    if (bucket) bucket.amount += amount;
  }

  const monthlyTrend = trendBuckets.map((b) => ({
    month: b.start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    amount: b.amount,
  }));

  return NextResponse.json({
    category: account.category,
    label: account.label,
    description: account.description,
    totalAllTime,
    totalThisYear,
    totalThisMonth,
    monthlyTrend,
    transactions: contributions.map((c) => ({
      id: c.id,
      amount: Number(c.amount),
      date: c.dateTransacted.toISOString(),
      receipt: c.mpesaReceiptNo,
    })),
  });
}
