export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
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
