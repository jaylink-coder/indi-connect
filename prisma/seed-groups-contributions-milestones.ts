import { PrismaClient, FundCategory, Gender, GroupCategory } from "@prisma/client";

const prisma = new PrismaClient();

// Every step in this script explicitly excludes the real signed-in member
// (AIPCA-GAT-0001) - fabricated contributions, group memberships, and
// milestones must never be attached to a real person's record.
const REAL_MEMBER_NO = "AIPCA-GAT-0001";

// Same first-name pools used in seed-full-network.ts / seed-demo-members.ts,
// merged, to backfill gender by name match and to name generated Dependents.
// Anyone whose first name isn't in either list (the real member's own name,
// e.g.) is left ungendered rather than guessed.
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
const SURNAMES = [
  "Kamau", "Mwangi", "Njoroge", "Kariuki", "Maina", "Waweru", "Karanja", "Gitau", "Kimani", "Ndungu",
  "Macharia", "Wachira", "Njuguna", "Muriithi", "Thuo", "Kagwe", "Kiragu", "Mburu", "Githinji", "Chege",
  "Karimi", "Ndegwa", "Kihara", "Kamande", "Mbugua", "Wanyama", "Gichuki", "Ngugi", "Wacera", "Nyaga",
];
const MALE_FIRST_SET = new Set(MALE_FIRST_NAMES);
const FEMALE_FIRST_SET = new Set(FEMALE_FIRST_NAMES);

// Milestone catalog - mirrors app/dashboard/page.tsx MILESTONE_TIERS.
// "Holding a Leadership Position" deliberately excluded - derived live from
// MemberPosition, not stored here (see schema comment on MilestoneType).
const MILESTONES = [
  { key: "salvation", tier: "Becoming a Member", title: "Salvation (Wokovu)", icon: "\u{1F64F}", note: "The turn every other milestone follows from", sortOrder: 1 },
  { key: "water_baptism", tier: "Becoming a Member", title: "Water Baptism", icon: "\u{1F4A7}", note: "Full immersion, per Pentecostal practice", sortOrder: 2 },
  { key: "confirmation", tier: "Becoming a Member", title: "Confirmation", icon: "\u{271D}️", note: "Unconfirmed whether A.I.P.C.A. observes this", sortOrder: 3 },
  { key: "discipleship", tier: "Growing as a Member", title: "Discipleship / Bible Study", icon: "\u{1F4D6}", note: "Unconfirmed - what does A.I.P.C.A. call this?", sortOrder: 4 },
  { key: "fellowship", tier: "Growing as a Member", title: "Joining a Fellowship", icon: "\u{1F91D}", note: "e.g. Men's or Women's Fellowship", sortOrder: 5 },
  { key: "ministry", tier: "Serving as a Member", title: "Commissioned to a Ministry", icon: "⛪", note: "e.g. choir, ushering, Sunday school", sortOrder: 6 },
];

// Age brackets - a single primary group per person, chosen by age first,
// gender only for the senior adult bracket. This is MY interpretation of
// the brief category list, not confirmed AIPCA practice - flagged as such
// in the wrap-up. Choir / The Anointed are separate, stack-on-top groups
// (per the explicit instruction that only those two allow multi-membership).
// Sunday School / Brigade / most of Youth are populated from Dependents
// (under-18, no Member No.) rather than Member rows - see the Dependent
// model. The existing adult Member batch spans ages 21-76, so 18-20 is a
// small underrepresented sliver for now - a known gap, not silently fixed.
interface AgeBracket {
  category: Exclude<GroupCategory, "CHOIR" | "THE_ANOINTED">;
  name: string;
  minAge: number;
  maxAge: number | null;
  genderSplit: boolean;
}
const AGE_BRACKETS: AgeBracket[] = [
  { category: "SUNDAY_SCHOOL", name: "Sunday School", minAge: 3, maxAge: 9, genderSplit: false },
  { category: "BRIGADE", name: "Brigade", minAge: 10, maxAge: 14, genderSplit: false },
  { category: "YOUTH", name: "Youth", minAge: 15, maxAge: 24, genderSplit: false },
  { category: "VICTORY", name: "Victory", minAge: 25, maxAge: 34, genderSplit: false },
  { category: "MEDIUM", name: "Medium", minAge: 35, maxAge: 49, genderSplit: false },
  { category: "MEN", name: "Men's Fellowship", minAge: 50, maxAge: null, genderSplit: true }, // MALE only, resolved at assignment time
  { category: "MOTHERS_COUNCIL", name: "Mothers' Council", minAge: 50, maxAge: null, genderSplit: true }, // FEMALE only
];

const PROBATION_MONTHS = 3;
const DEPENDENTS_PER_CHURCH_MIN = 15;
const DEPENDENTS_PER_CHURCH_MAX = 25;

function ageAsOf(dateOfBirth: Date, reference: Date): number {
  let age = reference.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = reference.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < dateOfBirth.getDate())) age--;
  return age;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function randomDateBetween(start: Date, end: Date): Date {
  if (start.getTime() >= end.getTime()) return new Date(start);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function inferGender(name: string): Gender | null {
  const first = name.split(" ")[0];
  if (MALE_FIRST_SET.has(first)) return "MALE";
  if (FEMALE_FIRST_SET.has(first)) return "FEMALE";
  return null;
}

async function insertBatched<T>(label: string, rows: T[], insert: (batch: T[]) => Promise<unknown>, batchSize = 1000) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await insert(batch);
    console.log(`  ${label}: ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
  }
}

// Unifies Member and Dependent for group/milestone assignment - the two
// entity types are tracked separately in the DB (see schema comments), but
// the eligibility logic (age bracket, probation) is identical.
interface Person {
  kind: "member" | "dependent";
  id: string;
  dateOfBirth: Date;
  gender: Gender | null;
  localChurchId: string;
  referenceJoinDate: Date; // church joinedAt for members; a plausible group-eligible date for dependents
}

async function main() {
  const now = new Date();

  // 1. Milestone catalog (idempotent).
  for (const m of MILESTONES) {
    await prisma.milestoneType.upsert({ where: { key: m.key }, update: m, create: m });
  }
  console.log("Milestone catalog ready.");

  // 2. One Group row per (category, local church) - 9 x 100 = 900. Batched -
  // 900 sequential upserts (one round-trip each) proved fragile on an
  // unstable connection and dropped partway through twice; build the full
  // desired list, diff against what already exists, and insert the gap in
  // one createMany call instead.
  const localChurches = await prisma.localChurch.findMany({ select: { id: true } });
  const groupIdByChurchAndCategory = new Map<string, string>();

  interface GroupSpec {
    category: GroupCategory;
    name: string;
    minAge: number | null;
    maxAge: number | null;
    genderRestriction: Gender | null;
  }
  const GROUP_SPECS: GroupSpec[] = [
    ...AGE_BRACKETS.filter((b) => !b.genderSplit).map((b) => ({ category: b.category, name: b.name, minAge: b.minAge, maxAge: b.maxAge, genderRestriction: null })),
    { category: "MEN", name: "Men's Fellowship", minAge: 50, maxAge: null, genderRestriction: "MALE" as Gender },
    { category: "MOTHERS_COUNCIL", name: "Mothers' Council", minAge: 50, maxAge: null, genderRestriction: "FEMALE" as Gender },
    { category: "CHOIR", name: "Choir", minAge: null, maxAge: null, genderRestriction: null },
    { category: "THE_ANOINTED", name: "The Anointed", minAge: null, maxAge: null, genderRestriction: null },
  ];

  const existingGroups = await prisma.group.findMany({ select: { id: true, category: true, localChurchId: true } });
  const existingGroupKeys = new Set(existingGroups.map((g) => `${g.localChurchId}:${g.category}`));
  for (const g of existingGroups) groupIdByChurchAndCategory.set(`${g.localChurchId}:${g.category}`, g.id);

  const newGroupRows: { category: GroupCategory; name: string; localChurchId: string; minAge: number | null; maxAge: number | null; genderRestriction: Gender | null }[] = [];
  for (const church of localChurches) {
    for (const spec of GROUP_SPECS) {
      const key = `${church.id}:${spec.category}`;
      if (existingGroupKeys.has(key)) continue;
      newGroupRows.push({ category: spec.category, name: spec.name, localChurchId: church.id, minAge: spec.minAge, maxAge: spec.maxAge, genderRestriction: spec.genderRestriction });
    }
  }
  await insertBatched("groups", newGroupRows, (batch) => prisma.group.createMany({ data: batch, skipDuplicates: true }));

  if (newGroupRows.length > 0) {
    const allGroups = await prisma.group.findMany({ select: { id: true, category: true, localChurchId: true } });
    for (const g of allGroups) groupIdByChurchAndCategory.set(`${g.localChurchId}:${g.category}`, g.id);
  }
  console.log(`${groupIdByChurchAndCategory.size} groups ready (${newGroupRows.length} newly created).`);

  // 3. Backfill gender for existing members.
  const members = await prisma.member.findMany({
    where: { membershipNo: { not: REAL_MEMBER_NO } },
    select: { id: true, name: true, dateOfBirth: true, joinedAt: true, gender: true, createdAt: true, localChurchId: true },
  });

  const maleIds: string[] = [];
  const femaleIds: string[] = [];
  for (const m of members) {
    if (m.gender) continue;
    const inferred = inferGender(m.name);
    if (inferred === "MALE") maleIds.push(m.id);
    else if (inferred === "FEMALE") femaleIds.push(m.id);
  }
  // Bucketed into exactly 2 bulk updates instead of one round-trip per
  // member - the original one-by-one loop dropped the connection partway
  // through ~5,000 sequential updates (Neon closed the idle/long-running
  // connection - P1017).
  if (maleIds.length > 0) await prisma.member.updateMany({ where: { id: { in: maleIds } }, data: { gender: "MALE" } });
  if (femaleIds.length > 0) await prisma.member.updateMany({ where: { id: { in: femaleIds } }, data: { gender: "FEMALE" } });
  console.log(`Backfilled gender for ${maleIds.length + femaleIds.length} members.`);

  const membersFull = await prisma.member.findMany({
    where: { membershipNo: { not: REAL_MEMBER_NO } },
    select: { id: true, dateOfBirth: true, joinedAt: true, createdAt: true, localChurchId: true, gender: true },
  });

  // 4. Generate Dependents (under 18, no Member No./login) - real children in
  // a congregation, tracked separately from the membership roll. Each is
  // linked to a random adult guardian at the same local church.
  const membersByChurch = new Map<string, typeof membersFull>();
  for (const m of membersFull) {
    const list = membersByChurch.get(m.localChurchId) ?? [];
    list.push(m);
    membersByChurch.set(m.localChurchId, list);
  }

  const dependentRows: { name: string; dateOfBirth: Date; gender: Gender; guardianId: string | null; localChurchId: string }[] = [];
  for (const church of localChurches) {
    const churchMembers = membersByChurch.get(church.id) ?? [];
    const count = DEPENDENTS_PER_CHURCH_MIN + Math.floor(Math.random() * (DEPENDENTS_PER_CHURCH_MAX - DEPENDENTS_PER_CHURCH_MIN + 1));
    for (let i = 0; i < count; i++) {
      const isMale = Math.random() < 0.5;
      const first = isMale ? randomFrom(MALE_FIRST_NAMES) : randomFrom(FEMALE_FIRST_NAMES);
      const dob = randomDateBetween(new Date(now.getFullYear() - 17, now.getMonth(), now.getDate()), now);
      dependentRows.push({
        name: `${first} ${randomFrom(SURNAMES)}`,
        dateOfBirth: dob,
        gender: isMale ? "MALE" : "FEMALE",
        guardianId: churchMembers.length > 0 ? randomFrom(churchMembers).id : null,
        localChurchId: church.id,
      });
    }
  }
  await insertBatched("dependents", dependentRows, (batch) => prisma.dependent.createMany({ data: batch }));

  const dependentsFull = await prisma.dependent.findMany({
    where: { localChurchId: { in: localChurches.map((c) => c.id) } },
    select: { id: true, dateOfBirth: true, gender: true, localChurchId: true, createdAt: true },
  });
  console.log(`${dependentsFull.length} dependents created.`);

  // 5. Unified person list for group/milestone assignment.
  const people: Person[] = [
    ...membersFull
      .filter((m) => m.dateOfBirth)
      .map((m) => ({
        kind: "member" as const,
        id: m.id,
        dateOfBirth: m.dateOfBirth!,
        gender: m.gender,
        localChurchId: m.localChurchId,
        referenceJoinDate: m.joinedAt ?? m.createdAt,
      })),
    ...dependentsFull.map((d) => ({
      kind: "dependent" as const,
      id: d.id,
      dateOfBirth: d.dateOfBirth,
      gender: d.gender,
      localChurchId: d.localChurchId,
      // A dependent "joins" their age-group roughly once they're old enough for the youngest bracket (age 3).
      referenceJoinDate: randomDateBetween(new Date(Math.max(d.dateOfBirth.getFullYear() + 3, d.createdAt.getFullYear() - 10), 0, 1), now),
    })),
  ];

  // 6. Group memberships.
  const groupMembershipRows: {
    memberId: string | null;
    dependentId: string | null;
    groupId: string;
    joinedGroupAt: Date;
    probationEndsAt: Date;
    status: "PROBATION" | "ACTIVE";
  }[] = [];

  for (const p of people) {
    const age = ageAsOf(p.dateOfBirth, now);
    const bracket = AGE_BRACKETS.find(
      (b) =>
        age >= b.minAge &&
        (b.maxAge === null || age <= b.maxAge) &&
        (!b.genderSplit || (b.category === "MEN" && p.gender === "MALE") || (b.category === "MOTHERS_COUNCIL" && p.gender === "FEMALE"))
    );

    const assign = (groupId: string, joinedGroupAt: Date) => {
      const probationEndsAt = addMonths(joinedGroupAt, PROBATION_MONTHS);
      groupMembershipRows.push({
        memberId: p.kind === "member" ? p.id : null,
        dependentId: p.kind === "dependent" ? p.id : null,
        groupId,
        joinedGroupAt,
        probationEndsAt,
        status: probationEndsAt.getTime() > now.getTime() ? "PROBATION" : "ACTIVE",
      });
    };

    if (bracket) {
      const groupId = groupIdByChurchAndCategory.get(`${p.localChurchId}:${bracket.category}`);
      if (groupId) assign(groupId, p.referenceJoinDate);
    }

    // Choir / The Anointed - age/gender independent, stack on top of whatever else the person is in.
    if (Math.random() < 0.15) {
      const choirId = groupIdByChurchAndCategory.get(`${p.localChurchId}:CHOIR`);
      if (choirId) assign(choirId, randomDateBetween(p.referenceJoinDate, now));
    }
    if (Math.random() < 0.05) {
      const anointedId = groupIdByChurchAndCategory.get(`${p.localChurchId}:THE_ANOINTED`);
      if (anointedId) assign(anointedId, randomDateBetween(p.referenceJoinDate, now));
    }
  }

  await insertBatched("group memberships", groupMembershipRows, (batch) =>
    prisma.groupMembership.createMany({ data: batch, skipDuplicates: true })
  );

  // 7. Contributions - Members only (Dependents don't pay/have phones of their own).
  const CATEGORY_WEIGHTS: [FundCategory, number, [number, number]][] = [
    ["TITHE", 0.4, [200, 5000]],
    ["SADAKA", 0.2, [50, 1000]],
    ["CALL_REGISTRY", 0.2, [50, 50]],
    ["OPERATIONS", 0.1, [100, 2000]],
    ["CESS", 0.1, [100, 1000]],
  ];
  function pickCategory(): [FundCategory, [number, number]] {
    const r = Math.random();
    let cumulative = 0;
    for (const [cat, weight, range] of CATEGORY_WEIGHTS) {
      cumulative += weight;
      if (r <= cumulative) return [cat, range];
    }
    return ["TITHE", [200, 5000]];
  }

  let receiptSeq = 0;
  const contributionRows: { memberId: string; amount: number; category: FundCategory; mpesaReceiptNo: string; dateTransacted: Date }[] = [];

  for (const m of membersFull) {
    const joined = m.joinedAt ?? m.createdAt;
    const count = 2 + Math.floor(Math.random() * 7); // 2-8 contributions
    for (let i = 0; i < count; i++) {
      receiptSeq++;
      const [category, [min, max]] = pickCategory();
      const amount = Math.round(min + Math.random() * (max - min));
      contributionRows.push({
        memberId: m.id,
        amount,
        category,
        mpesaReceiptNo: `SEED${String(receiptSeq).padStart(8, "0")}`,
        dateTransacted: randomDateBetween(joined, now),
      });
    }
  }

  await insertBatched("contributions", contributionRows, (batch) =>
    prisma.contribution.createMany({ data: batch, skipDuplicates: true })
  );

  // 8. Milestone records - derived from age and group membership where sensible.
  const milestoneTypes = await prisma.milestoneType.findMany();
  const milestoneIdByKey = new Map(milestoneTypes.map((mt) => [mt.key, mt.id]));
  const groupJoinByPersonKey = new Map<string, Date>();
  for (const gm of groupMembershipRows) {
    const key = gm.memberId ? `member:${gm.memberId}` : `dependent:${gm.dependentId}`;
    if (!groupJoinByPersonKey.has(key)) groupJoinByPersonKey.set(key, gm.joinedGroupAt);
  }

  const milestoneRows: { memberId: string | null; dependentId: string | null; milestoneTypeId: string; achievedAt: Date }[] = [];

  for (const p of people) {
    const age = ageAsOf(p.dateOfBirth, now);
    const idFields = p.kind === "member" ? { memberId: p.id, dependentId: null } : { memberId: null, dependentId: p.id };
    const key = p.kind === "member" ? `member:${p.id}` : `dependent:${p.id}`;

    let lastDate = p.referenceJoinDate;
    if (age >= 5 && Math.random() < (p.kind === "member" ? 0.9 : 0.4)) {
      const salvationDate = randomDateBetween(p.dateOfBirth, p.referenceJoinDate.getTime() > p.dateOfBirth.getTime() ? p.referenceJoinDate : now);
      milestoneRows.push({ ...idFields, milestoneTypeId: milestoneIdByKey.get("salvation")!, achievedAt: salvationDate });
      lastDate = salvationDate;

      if (p.kind === "member" && age >= 7 && Math.random() < 0.8) {
        const baptismDate = randomDateBetween(salvationDate, now);
        milestoneRows.push({ ...idFields, milestoneTypeId: milestoneIdByKey.get("water_baptism")!, achievedAt: baptismDate });
        lastDate = baptismDate;

        if (age >= 10 && Math.random() < 0.25) {
          milestoneRows.push({ ...idFields, milestoneTypeId: milestoneIdByKey.get("confirmation")!, achievedAt: randomDateBetween(baptismDate, now) });
        }
      }
    }

    if (p.kind === "member" && age >= 12 && Math.random() < 0.5) {
      milestoneRows.push({ ...idFields, milestoneTypeId: milestoneIdByKey.get("discipleship")!, achievedAt: randomDateBetween(lastDate, now) });
    }

    const groupJoinedAt = groupJoinByPersonKey.get(key);
    if (groupJoinedAt) {
      milestoneRows.push({ ...idFields, milestoneTypeId: milestoneIdByKey.get("fellowship")!, achievedAt: groupJoinedAt });
    }

    if (p.kind === "member" && age >= 18 && Math.random() < 0.15) {
      milestoneRows.push({ ...idFields, milestoneTypeId: milestoneIdByKey.get("ministry")!, achievedAt: randomDateBetween(p.referenceJoinDate, now) });
    }
  }

  await insertBatched("milestone records", milestoneRows, (batch) =>
    prisma.memberMilestoneRecord.createMany({ data: batch, skipDuplicates: true })
  );

  console.log("Done.");
  console.log(
    `Totals - dependents: ${dependentsFull.length}, group memberships: ${groupMembershipRows.length}, contributions: ${contributionRows.length}, milestone records: ${milestoneRows.length}`
  );
}

main()
  .catch((e) => {
    console.error("Groups/contributions/milestones seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
