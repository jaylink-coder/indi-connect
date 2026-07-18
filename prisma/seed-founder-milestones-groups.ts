import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * One-off, explicitly requested by the founder for his own real account
 * (AIPCA-GAT-0001): sample spiritual-milestone and group-membership history,
 * with placeholder dates - not verified real dates, just a plausible
 * timeline so the Milestones/Groups tabs have real rows to show. Safe to
 * re-run: upserts the milestone records, skips the group membership if one
 * already exists.
 */
async function main() {
  const founder = await prisma.member.findUnique({
    where: { membershipNo: "AIPCA-GAT-0001" },
    select: { id: true, localChurchId: true },
  });
  if (!founder) throw new Error("Founder account AIPCA-GAT-0001 not found");

  // Dates now line up with joinedAt (2011-08-14, set in
  // seed-founder-sample-history.ts) - a long-standing member's real
  // progression, not a same-year burst.
  const milestoneAchievements: Record<string, Date> = {
    salvation: new Date(2011, 8, 4),
    water_baptism: new Date(2011, 11, 11),
    confirmation: new Date(2012, 6, 15),
    discipleship: new Date(2013, 9, 20),
    fellowship: new Date(2014, 2, 2),
    ministry: new Date(2017, 5, 18),
  };

  const types = await prisma.milestoneType.findMany();
  for (const t of types) {
    const achievedAt = milestoneAchievements[t.key];
    if (!achievedAt) continue;
    await prisma.memberMilestoneRecord.upsert({
      where: { memberId_milestoneTypeId: { memberId: founder.id, milestoneTypeId: t.id } },
      create: { memberId: founder.id, milestoneTypeId: t.id, achievedAt },
      update: { achievedAt },
    });
  }
  console.log(`Upserted ${Object.keys(milestoneAchievements).length} milestone records for the founder.`);

  const mensFellowship = await prisma.group.findFirst({
    where: { localChurchId: founder.localChurchId, category: "MEN" },
  });
  if (!mensFellowship) throw new Error("Men's Fellowship group not found at founder's local church");

  const joinedGroupAt = new Date(2014, 3, 1);
  const probationEndsAt = new Date(2014, 6, 1);
  await prisma.groupMembership.upsert({
    where: { memberId_groupId: { memberId: founder.id, groupId: mensFellowship.id } },
    create: { memberId: founder.id, groupId: mensFellowship.id, joinedGroupAt, probationEndsAt, status: "ACTIVE" },
    update: { joinedGroupAt, probationEndsAt, status: "ACTIVE" },
  });
  console.log("Men's Fellowship membership set (ACTIVE, joined 2014-04-01).");
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
