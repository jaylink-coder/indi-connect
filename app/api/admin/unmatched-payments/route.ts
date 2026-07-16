export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";

/**
 * The review queue for bare-Paybill payments we couldn't safely turn into a
 * Contribution automatically (see app/api/mpesa/c2b/confirmation). Not
 * scoped to a local church/parish - we don't know which one until it's
 * resolved, so anyone with admin.contributions can see and resolve any
 * pending row. Fine for a single-parish or small-national deployment;
 * revisit if the queue grows large enough to need per-diocese routing.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const access = await getMemberAccess(userId);
  if (!access || !hasAccess(access.permissions, "admin.contributions")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.unmatchedPayment.findMany({
    where: { resolvedAt: null },
    orderBy: { transactionDate: "desc" },
  });

  return NextResponse.json(rows);
}
