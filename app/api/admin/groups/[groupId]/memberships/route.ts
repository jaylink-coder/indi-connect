export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopedLocalChurchIds } from "@/lib/hierarchy";
import { getCurrentMemberId } from "@/lib/session";

const PROBATION_MONTHS = 3;

async function assertGroupInScope(memberId: string, groupId: string, requireEdit: boolean) {
  const permissionKey = "admin.groups";
  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, permissionKey, requireEdit ? "EDIT" : undefined)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { id: true, localChurchId: true } });
  if (!group) return { error: NextResponse.json({ error: "Group not found" }, { status: 404 }) };

  const scopedChurchIds = await getScopedLocalChurchIds(memberId, permissionKey);
  if (!scopedChurchIds.includes(group.localChurchId)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { group };
}

/** Roster (still-active memberships) for one group, member or dependent, most recently joined first. */
export async function GET(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { groupId } = await params;
  const result = await assertGroupInScope(memberId, groupId, false);
  if ("error" in result) return result.error;

  const memberships = await prisma.groupMembership.findMany({
    where: { groupId, endedAt: null },
    select: {
      id: true,
      status: true,
      joinedGroupAt: true,
      probationEndsAt: true,
      member: { select: { id: true, name: true, membershipNo: true } },
      dependent: { select: { id: true, name: true, dateOfBirth: true } },
    },
    orderBy: { joinedGroupAt: "desc" },
  });

  return NextResponse.json(
    memberships.map((m) => ({
      id: m.id,
      status: m.status,
      joinedGroupAt: m.joinedGroupAt,
      probationEndsAt: m.probationEndsAt,
      person: m.member
        ? { kind: "member" as const, id: m.member.id, name: m.member.name, membershipNo: m.member.membershipNo }
        : { kind: "dependent" as const, id: m.dependent!.id, name: m.dependent!.name },
    }))
  );
}

/** Manually adds a member or dependent to a group (e.g. a transfer, or one the automatic assignment missed). Always starts on probation, same as everyone else. */
export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { groupId } = await params;
  const result = await assertGroupInScope(memberId, groupId, true);
  if ("error" in result) return result.error;
  const { group } = result;

  const body = await request.json().catch(() => null);
  const personKind = body?.kind === "dependent" ? "dependent" : body?.kind === "member" ? "member" : null;
  const personId = typeof body?.personId === "string" ? body.personId : "";
  if (!personKind || !personId) {
    return NextResponse.json({ error: "kind (member|dependent) and personId are required" }, { status: 400 });
  }

  const localChurchId =
    personKind === "member"
      ? (await prisma.member.findUnique({ where: { id: personId }, select: { localChurchId: true } }))?.localChurchId
      : (await prisma.dependent.findUnique({ where: { id: personId }, select: { localChurchId: true } }))?.localChurchId;

  if (!localChurchId || localChurchId !== group.localChurchId) {
    return NextResponse.json({ error: "That person doesn't belong to this group's local church" }, { status: 400 });
  }

  const joinedGroupAt = new Date();
  const probationEndsAt = new Date(joinedGroupAt);
  probationEndsAt.setMonth(probationEndsAt.getMonth() + PROBATION_MONTHS);

  try {
    const created = await prisma.groupMembership.create({
      data: {
        groupId,
        memberId: personKind === "member" ? personId : null,
        dependentId: personKind === "dependent" ? personId : null,
        joinedGroupAt,
        probationEndsAt,
        status: "PROBATION",
      },
      select: { id: true },
    });
    return NextResponse.json({ status: "ok" as const, id: created.id });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "That person is already in this group" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to add to group", details: String(error) }, { status: 500 });
  }
}
