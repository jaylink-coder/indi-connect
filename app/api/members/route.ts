export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopedLocalChurchIds } from "@/lib/hierarchy";
import { getCurrentMemberId } from "@/lib/session";

/**
 * Backs the admin Member Management tab. Gated on "admin.members" and
 * scoped to the caller's own managed local churches (a group leader sees
 * their own church, a parish chairman sees the whole parish) - not every
 * member nationally. Explicitly selects only display-safe fields - phone,
 * National ID, and the PIN hash should never leave the server.
 */
export async function GET() {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const caller = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true } });
  if (!caller) {
    return NextResponse.json({ error: "No membership record is linked to this account" }, { status: 403 });
  }

  const access = await getMemberAccess(memberId);
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
        pinHash: true,
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
    return NextResponse.json(
      members.map(({ pinHash, ...m }) => ({ ...m, hasLogin: pinHash !== null }))
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load church member registry", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Registers a new member. Static facts only (name, ID, phone, DOB,
 * residence, home church) - roles, group/fellowship affiliation, and
 * welfare involvement are all separate relations added later (see
 * MemberPosition / the Leadership & Structure admin tab), not part of
 * registration.
 */
export async function POST(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.members", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const membershipNo = typeof body?.membershipNo === "string" ? body.membershipNo.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const idNumber = typeof body?.idNumber === "string" && body.idNumber.trim() ? body.idNumber.trim() : null;
  const placeOfResidence =
    typeof body?.placeOfResidence === "string" && body.placeOfResidence.trim() ? body.placeOfResidence.trim() : null;
  const dateOfBirth = typeof body?.dateOfBirth === "string" && body.dateOfBirth ? new Date(body.dateOfBirth) : null;
  const localChurchId = typeof body?.localChurchId === "string" ? body.localChurchId : "";

  if (!membershipNo || !name || !phone || !localChurchId) {
    return NextResponse.json({ error: "Member No., Full Name, Phone No., and Local Church are required" }, { status: 400 });
  }
  if (dateOfBirth && Number.isNaN(dateOfBirth.getTime())) {
    return NextResponse.json({ error: "Enter a valid Date of Birth" }, { status: 400 });
  }

  const scopedLocalChurchIds = await getScopedLocalChurchIds(memberId, "admin.members");
  if (!scopedLocalChurchIds.includes(localChurchId)) {
    return NextResponse.json({ error: "You don't manage that local church" }, { status: 403 });
  }

  try {
    const created = await prisma.member.create({
      // joinedAt is always today for a real registration - never trust a
      // client-supplied value for it.
      data: { membershipNo, name, phone, idNumber, placeOfResidence, dateOfBirth, localChurchId, joinedAt: new Date() },
      select: { id: true, membershipNo: true, name: true, createdAt: true },
    });
    return NextResponse.json({ status: "ok" as const, member: created });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "A member with that Member No., Phone No., or ID No. already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to register member", details: String(error) }, { status: 500 });
  }
}
