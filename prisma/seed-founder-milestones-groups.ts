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

  const milestoneAchievements: Record<string, Date> = {
    salvation: new Date(2015, 2, 15),
    water_baptism: new Date(2015, 5, 21),
    confirmation: new Date(2015, 8, 6),
    discipleship: new Date(2016, 1, 14),
    fellowship: new Date(2016, 4, 1),
    ministry: new Date(2018, 10, 11),
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

  const existingMembership = await prisma.groupMembership.findUnique({
    where: { memberId_groupId: { memberId: founder.id, groupId: mensFellowship.id } },
  });
  if (existingMembership) {
    console.log("Founder already has a Men's Fellowship membership - skipping.");
  } else {
    const joinedGroupAt = new Date(2016, 4, 1);
    const probationEndsAt = new Date(2016, 7, 1);
    await prisma.groupMembership.create({
      data: {
        memberId: founder.id,
        groupId: mensFellowship.id,
        joinedGroupAt,
        probationEndsAt,
        status: "ACTIVE",
      },
    });
    console.log("Added founder to Men's Fellowship (ACTIVE, joined 2016-05-01).");
  }
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
