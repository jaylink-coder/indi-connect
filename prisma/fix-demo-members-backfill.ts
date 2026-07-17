import { PrismaClient, Gender, GroupCategory } from "@prisma/client";

const prisma = new PrismaClient();

// Backfills the original 50-member sample batch (AIPCA-GAT-0002..0051,
// created by seed-demo-members.ts before dateOfBirth/gender/joinedAt
// existed on the Member model) so it's consistent with every other sample
// member: has an ID number, date of birth, place of residence, join date,
// gender, and - as a result - group memberships and milestone records.
// Excludes the one real account (AIPCA-GAT-0001) exactly like every other
// seed script in this repo.
const REAL_MEMBER_NO = "AIPCA-GAT-0001";

const MALE_FIRST_NAMES = [
  "John", "Peter", "James", "Joseph", "Daniel", "Samuel", "David", "Paul", "Stephen", "Francis",
  "Charles", "Anthony", "Patrick", "Michael", "Simon", "Bernard", "Geoffrey", "Kennedy", "Dennis", "Vincent",
  "Martin", "Edward", "Julius", "Nicholas", "Moses", "Erastus", "Titus", "Joel", "Amos", "Elias",
  "Reuben", "Isaac", "Jackson", "Boniface", "Cyrus", "Duncan", "Felix", "Gideon", "Harrison", "Ibrahim",
];
const FEMALE_FIRST_NAMES = [
  "Mary", "Jane", "Grace", "Ruth", "Esther", "Margaret", "Elizabeth", "Agnes", "Lucy", "Catherine",
  "Alice", "Rose", "Beatrice", "Joyce", "Nancy", "Monica", "Rebecca", "Faith", "Winnie", "Purity",
  "Damaris", "Wangari", "Njeri", "Wanjiku", "Muthoni", "Consolata", "Everlyne", "Lydia", "Judith", "Priscilla",
  "Teresia", "Anne", "Josephine", "Salome", "Miriam", "Naomi", "Dorcas", "Zipporah", "Christine", "Veronica",
];
const MALE_FIRST_SET = new Set(MALE_FIRST_NAMES);
const FEMALE_FIRST_SET = new Set(FEMALE_FIRST_NAMES);

// Plausible residence areas around the real Kenyatta Road Church (Juja
// Parish, Thika Diocese) - not a claim about any specific real person.
const RESIDENCE_AREAS = ["Kenyatta Road", "Juja Town", "Witeithie", "Kalimoni", "Ndarugu", "Gatuanyaga"];

interface AgeBracket {
  category: Exclude<GroupCategory, "CHOIR" | "THE_ANOINTED">;
  minAge: number;
  maxAge: number | null;
  genderSplit: boolean;
}
const AGE_BRACKETS: AgeBracket[] = [
  { category: "SUNDAY_SCHOOL", minAge: 3, maxAge: 9, genderSplit: false },
  { category: "BRIGADE", minAge: 10, maxAge: 14, genderSplit: false },
  { category: "YOUTH", minAge: 15, maxAge: 24, genderSplit: false },
  { category: "VICTORY", minAge: 25, maxAge: 34, genderSplit: false },
  { category: "MEDIUM", minAge: 35, maxAge: 49, genderSplit: false },
  { category: "MEN", minAge: 50, maxAge: null, genderSplit: true },
  { category: "MOTHERS_COUNCIL", minAge: 50, maxAge: null, genderSplit: true },
];
const PROBATION_MONTHS = 3;

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomDate(startYear: number, endYear: number): Date {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start));
}
function randomDateBetween(start: Date, end: Date): Date {
  if (start.getTime() >= end.getTime()) return new Date(start);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function ageAsOf(dateOfBirth: Date, reference: Date): number {
  let age = reference.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = reference.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < dateOfBirth.getDate())) age--;
  return age;
}
function inferGender(name: string): Gender | null {
  const first = name.split(" ")[0];
  if (MALE_FIRST_SET.has(first)) return "MALE";
  if (FEMALE_FIRST_SET.has(first)) return "FEMALE";
  return null;
}

async function main() {
  const now = new Date();

  const toFix = await prisma.member.findMany({
    where: { membershipNo: { not: REAL_MEMBER_NO }, dateOfBirth: null },
    select: { id: true, membershipNo: true, name: true, localChurchId: true },
  });

  if (toFix.length === 0) {
    console.log("No members need backfilling. Nothing to do.");
    return;
  }
  console.log(`Backfilling ${toFix.length} sample members missing dateOfBirth...`);

  const updates = toFix.map((m, i) => {
    const gender = inferGender(m.name) ?? (Math.random() < 0.5 ? "MALE" : "FEMALE");
    return prisma.member.update({
      where: { id: m.id },
      data: {
        idNumber: `31${String(10001 + i).padStart(6, "0")}`,
        dateOfBirth: randomDate(1950, 2005),
        placeOfResidence: randomFrom(RESIDENCE_AREAS),
        joinedAt: randomDate(1995, 2026),
        gender,
      },
    });
  });
  await prisma.$transaction(updates);
  console.log("Backfill complete.");

  const fixed = await prisma.member.findMany({
    where: { id: { in: toFix.map((m) => m.id) } },
    select: { id: true, dateOfBirth: true, gender: true, localChurchId: true, joinedAt: true, createdAt: true },
  });

  const localChurchIds = [...new Set(fixed.map((m) => m.localChurchId))];
  const groups = await prisma.group.findMany({ where: { localChurchId: { in: localChurchIds } }, select: { id: true, category: true, localChurchId: true } });
  const groupIdByChurchAndCategory = new Map(groups.map((g) => [`${g.localChurchId}:${g.category}`, g.id]));

  const existingMemberships = await prisma.groupMembership.findMany({
    where: { memberId: { in: fixed.map((m) => m.id) } },
    select: { memberId: true },
  });
  const alreadyInGroups = new Set(existingMemberships.map((gm) => gm.memberId));

  const groupMembershipRows: { memberId: string; groupId: string; joinedGroupAt: Date; probationEndsAt: Date; status: "PROBATION" | "ACTIVE" }[] = [];
  for (const m of fixed) {
    if (alreadyInGroups.has(m.id) || !m.dateOfBirth) continue;
    const age = ageAsOf(m.dateOfBirth, now);
    const bracket = AGE_BRACKETS.find(
      (b) => age >= b.minAge && (b.maxAge === null || age <= b.maxAge) &&
        (!b.genderSplit || (b.category === "MEN" && m.gender === "MALE") || (b.category === "MOTHERS_COUNCIL" && m.gender === "FEMALE"))
    );
    const joined = m.joinedAt ?? m.createdAt;

    const assign = (groupId: string, joinedGroupAt: Date) => {
      const probationEndsAt = addMonths(joinedGroupAt, PROBATION_MONTHS);
      groupMembershipRows.push({
        memberId: m.id,
        groupId,
        joinedGroupAt,
        probationEndsAt,
        status: probationEndsAt.getTime() > now.getTime() ? "PROBATION" : "ACTIVE",
      });
    };

    if (bracket) {
      const groupId = groupIdByChurchAndCategory.get(`${m.localChurchId}:${bracket.category}`);
      if (groupId) assign(groupId, joined);
    }
    if (Math.random() < 0.15) {
      const choirId = groupIdByChurchAndCategory.get(`${m.localChurchId}:CHOIR`);
      if (choirId) assign(choirId, randomDateBetween(joined, now));
    }
    if (Math.random() < 0.05) {
      const anointedId = groupIdByChurchAndCategory.get(`${m.localChurchId}:THE_ANOINTED`);
      if (anointedId) assign(anointedId, randomDateBetween(joined, now));
    }
  }
  if (groupMembershipRows.length > 0) {
    await prisma.groupMembership.createMany({ data: groupMembershipRows, skipDuplicates: true });
  }
  console.log(`Group memberships created: ${groupMembershipRows.length}`);

  const milestoneTypes = await prisma.milestoneType.findMany();
  const milestoneIdByKey = new Map(milestoneTypes.map((mt) => [mt.key, mt.id]));
  const groupJoinByMemberId = new Map(groupMembershipRows.map((gm) => [gm.memberId, gm.joinedGroupAt]));

  const existingMilestones = await prisma.memberMilestoneRecord.findMany({
    where: { memberId: { in: fixed.map((m) => m.id) } },
    select: { memberId: true },
  });
  const alreadyHasMilestones = new Set(existingMilestones.map((r) => r.memberId));

  const milestoneRows: { memberId: string; milestoneTypeId: string; achievedAt: Date }[] = [];
  for (const m of fixed) {
    if (alreadyHasMilestones.has(m.id) || !m.dateOfBirth) continue;
    const age = ageAsOf(m.dateOfBirth, now);
    const joined = m.joinedAt ?? m.createdAt;
    let lastDate = joined;

    if (age >= 5 && Math.random() < 0.9) {
      const salvationDate = randomDateBetween(m.dateOfBirth, joined.getTime() > m.dateOfBirth.getTime() ? joined : now);
      milestoneRows.push({ memberId: m.id, milestoneTypeId: milestoneIdByKey.get("salvation")!, achievedAt: salvationDate });
      lastDate = salvationDate;

      if (age >= 7 && Math.random() < 0.8) {
        const baptismDate = randomDateBetween(salvationDate, now);
        milestoneRows.push({ memberId: m.id, milestoneTypeId: milestoneIdByKey.get("water_baptism")!, achievedAt: baptismDate });
        lastDate = baptismDate;

        if (age >= 10 && Math.random() < 0.25) {
          milestoneRows.push({ memberId: m.id, milestoneTypeId: milestoneIdByKey.get("confirmation")!, achievedAt: randomDateBetween(baptismDate, now) });
        }
      }
    }
    if (age >= 12 && Math.random() < 0.5) {
      milestoneRows.push({ memberId: m.id, milestoneTypeId: milestoneIdByKey.get("discipleship")!, achievedAt: randomDateBetween(lastDate, now) });
    }
    const groupJoinedAt = groupJoinByMemberId.get(m.id);
    if (groupJoinedAt) {
      milestoneRows.push({ memberId: m.id, milestoneTypeId: milestoneIdByKey.get("fellowship")!, achievedAt: groupJoinedAt });
    }
    if (age >= 18 && Math.random() < 0.15) {
      milestoneRows.push({ memberId: m.id, milestoneTypeId: milestoneIdByKey.get("ministry")!, achievedAt: randomDateBetween(joined, now) });
    }
  }
  if (milestoneRows.length > 0) {
    await prisma.memberMilestoneRecord.createMany({ data: milestoneRows, skipDuplicates: true });
  }
  console.log(`Milestone records created: ${milestoneRows.length}`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error("Demo member backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
