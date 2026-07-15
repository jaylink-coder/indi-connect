export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    const queryOptions: any = {
      include: {
        member: {
          include: {
            localChurch: {
              include: {
                parish: true,
              },
            },
          },
        },
      },
      orderBy: {
        dateTransacted: "desc",
      },
    };

    if (memberId) {
      queryOptions.where = { memberId };
    }

    const records = await prisma.contribution.findMany(queryOptions);
    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load database ledger rows", details: String(error) },
      { status: 500 }
    );
  }
}
