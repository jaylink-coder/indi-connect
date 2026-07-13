import { NextResponse } from "next/server";

const memberProfile = {
  name: "Samuel Mwangi",
  parish: "Gatundu Parish",
  aggregates: {
    totalContributed: 24500,
    attendanceRate: "88%",
  },
  milestones: [
    { type: "BAPTISM", date: "12th May 1994", clergy: "Rev. J. Kamau" },
    { type: "CONFIRMATION", date: "18th Aug 2010", clergy: "Bishop Njoroge" },
    { type: "GUILD_INDUCTION", date: "Active Member", clergy: "Parish Council" },
  ],
  projects: [
    {
      title: "Cathedral Perimeter Wall",
      myRole: "Financial Supporter",
      myDonation: 5000,
      projectProgress: {
        target: 500000,
        raised: 375000,
      },
    },
  ],
};

export async function GET() {
  return NextResponse.json(memberProfile);
}
