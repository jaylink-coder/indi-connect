export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";

/** Backs the (not yet built) admin structural view of the hierarchy - gated on "admin.members" like the member registry. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const access = await getMemberAccess(userId);
  if (!access || !hasAccess(access.permissions, "admin.members")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parishes = await prisma.parish.findMany({
      include: {
        outposts: {
          include: {
            _count: {
              select: {
                members: true
              }
            }
          }
        },
        _count: {
          select: {
            outposts: true
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    return NextResponse.json(parishes);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load parish administration list", details: String(error) },
      { status: 500 }
    );
  }
}
