export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getScopesForPermission } from "@/lib/hierarchy";
import { getCurrentMemberId } from "@/lib/session";
import { childTierOf, isWithinManagedScope } from "@/lib/structure";
import type { HierarchyTier } from "@prisma/client";

/**
 * Adds one real branch (Archdiocese/Diocese/Parish/Local Church) under a
 * parent the caller actually manages - the "real map fills in as people are
 * registered" path instead of guessing a national directory that doesn't
 * exist publicly (see lib structure notes / crawler findings).
 */
export async function POST(request: Request) {
  const callerId = await getCurrentMemberId();
  if (!callerId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const access = await getMemberAccess(callerId);
  if (!access || !hasAccess(access.permissions, "admin.members", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parentTier = body?.parentTier as HierarchyTier | undefined;
  const parentId = typeof body?.parentId === "string" ? body.parentId : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const bishopName = typeof body?.bishopName === "string" ? body.bishopName.trim() : "";

  if (!parentTier || !parentId || !name) {
    return NextResponse.json({ error: "Missing parent or name" }, { status: 400 });
  }

  const childTier = childTierOf(parentTier);
  if (!childTier) {
    return NextResponse.json({ error: "A Local Church cannot have branches under it" }, { status: 400 });
  }
  if (childTier === "DIOCESE" && !bishopName) {
    return NextResponse.json({ error: "Enter the Bishop's name for this Diocese" }, { status: 400 });
  }

  const scopes = await getScopesForPermission(callerId, "admin.members", "EDIT");
  if (!(await isWithinManagedScope(scopes, parentTier, parentId))) {
    return NextResponse.json({ error: "You don't manage that part of the church structure" }, { status: 403 });
  }

  try {
    let created: { id: string; name: string } | null = null;
    switch (childTier) {
      case "ARCHDIOCESE":
        created = await prisma.archdiocese.create({ data: { name, headquartersId: parentId } });
        break;
      case "DIOCESE":
        created = await prisma.diocese.create({ data: { name, bishopName, archidId: parentId } });
        break;
      case "PARISH":
        created = await prisma.parish.create({ data: { name, dioceseId: parentId } });
        break;
      case "LOCAL_CHURCH":
        created = await prisma.localChurch.create({ data: { name, parishId: parentId } });
        break;
    }
    if (!created) {
      return NextResponse.json({ error: "Unsupported branch type" }, { status: 400 });
    }
    return NextResponse.json({ status: "ok" as const, id: created.id, tier: childTier, name: created.name });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: `A branch named "${name}" already exists here` }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create branch", details: String(error) }, { status: 500 });
  }
}
