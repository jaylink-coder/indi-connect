export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parishId = searchParams.get("parishId");

    const queryOptions: any = {
      select: {
        id: true,
        name: true,
        projectsPaybill: true,
        _count: {
          select: {
            outposts: true
          }
        }
      }
    };

    if (parishId) {
      queryOptions.where = { id: parishId };
    }

    const projectsData = await prisma.parish.findMany(queryOptions);
    
    const formattedProjects = projectsData.map(p => ({
      id: p.id,
      name: `${p.name} Infrastructure Development`,
      paybill: p.projectsPaybill,
      targetAmount: 5000000,
      raisedAmount: 1200000,
      status: "ACTIVE"
    }));

    return NextResponse.json(formattedProjects);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load parish structural projects ledger", details: String(error) },
      { status: 500 }
    );
  }
}
