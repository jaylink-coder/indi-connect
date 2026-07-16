export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopedLocalChurchIds } from "@/lib/hierarchy";

/**
 * Backs the admin Member Management tab. Gated on "admin.members" and
 * scoped to the caller's own managed local churches (a group leader sees
 * their own church, a parish chairman sees the whole parish) - not every
 * member nationally. Explicitly selects only display-safe fields - phone,
 * National ID, and the activation-code hash/attempts should never leave
 * the server.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const caller = await prisma.member.findUnique({ where: { clerkUserId: userId }, select: { id: true } });
  if (!caller) {
    return NextResponse.json({ error: "No membership record is linked to this account" }, { status: 403 });
  }

  const access = await getMemberAccess(userId);
  if (!access || !hasAccess(access.permissions, "admin.members")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const localChurchIds = await getScopedLocalChurchIds(caller.id, "admin.members");
    if (localChurchIds.length === 0) {
      return NextResponse.json([]);
    }

    const members = await prisma.member.findMany({
      where: { localChurchId: { in: localChurchIds } },
      select: {
        id: true,
        membershipNo: true,
        name: true,
        clerkUserId: true,
        createdAt: true,
        localChurch: {
          select: {
            name: true,
            parish: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(members);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load church member registry", details: String(error) },
      { status: 500 }
    );
  }
}
