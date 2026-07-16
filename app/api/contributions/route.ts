export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopedLocalChurchIds } from "@/lib/hierarchy";
import type { Prisma } from "@prisma/client";

/** Backs the admin Contributions tab - the church ledger, gated on "admin.contributions" and scoped to the caller's own managed local churches. */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const caller = await prisma.member.findUnique({ where: { clerkUserId: userId }, select: { id: true } });
  if (!caller) {
    return NextResponse.json({ error: "No membership record is linked to this account" }, { status: 403 });
  }

  const access = await getMemberAccess(userId);
  if (!access || !hasAccess(access.permissions, "admin.contributions")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const localChurchIds = await getScopedLocalChurchIds(caller.id, "admin.contributions");
    if (localChurchIds.length === 0) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    const queryOptions: Prisma.ContributionFindManyArgs = {
      select: {
        id: true,
        amount: true,
        category: true,
        mpesaReceiptNo: true,
        dateTransacted: true,
        member: {
          select: {
            name: true,
            membershipNo: true,
            phone: true,
            localChurch: { select: { name: true, parish: { select: { name: true } } } },
          },
        },
        paidByMember: { select: { name: true } },
      },
      where: {
        member: { localChurchId: { in: localChurchIds } },
        ...(memberId ? { memberId } : {}),
      },
      orderBy: {
        dateTransacted: "desc",
      },
    };

    const records = await prisma.contribution.findMany(queryOptions);
    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load database ledger rows", details: String(error) },
      { status: 500 }
    );
  }
}
