export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const members = await prisma.member.findMany({
      include: {
        localChurch: {
          include: {
            parish: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(members);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load church member registry", details: String(error) },
      { status: 500 }
    );
  }
}
