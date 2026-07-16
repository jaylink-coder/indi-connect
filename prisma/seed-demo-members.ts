import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Synthetic sample members - NOT real AIPCA congregants. Names are common,
// generic Kikuyu/Kenyan given names and surnames (matching AIPCA's
// historical demographic), not copied from any real individual. Purpose is
// to give the app realistic data volume to build and demo against (member
// lists, attendance, contribution rollups) instead of empty states. Phone
// numbers are a synthetic block, not real subscriber numbers, following the
// same test-number convention already used in prisma/seed.ts.
const DEMO_NAMES = [
  "John Kamau", "Mary Wanjiru", "Peter Njoroge", "Grace Muthoni", "James Kariuki",
  "Ruth Nyambura", "Joseph Maina", "Esther Wambui", "Daniel Waweru", "Margaret Njeri",
  "Samuel Karanja", "Elizabeth Gathoni", "David Gitau", "Agnes Wanjiku", "Paul Kimani",
  "Lucy Muthoni", "Stephen Ndungu", "Catherine Njoki", "Francis Macharia", "Alice Wangari",
  "Charles Wachira", "Rose Nduta", "Anthony Njuguna", "Beatrice Wairimu", "Patrick Muriithi",
  "Joyce Njoki", "Michael Thuo", "Nancy Waithera", "Simon Kagwe", "Monica Nyokabi",
  "Bernard Kiragu", "Rebecca Wamboi", "Geoffrey Mburu", "Faith Njambi", "Kennedy Githinji",
  "Winnie Wangeci", "Dennis Chege", "Purity Muthoni", "Vincent Karimi", "Damaris Wairimu",
  "Martin Njoroge", "Wangari Ndegwa", "Edward Kihara", "Njeri Kamande", "Julius Kariuki",
  "Wanjiku Mbugua", "Nicholas Wanyama", "Muthoni Gichuki", "Moses Ngugi", "Consolata Wacera",
];

async function main() {
  const localChurch = await prisma.localChurch.findFirst({ where: { name: "Kenyatta Road" } });
  if (!localChurch) {
    throw new Error('Local Church "Kenyatta Road" not found - run this after the real hierarchy exists.');
  }

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < DEMO_NAMES.length; i++) {
    const seq = String(i + 2).padStart(4, "0"); // start at 0002 - 0001 is the real signed-in leader
    const membershipNo = `AIPCA-GAT-${seq}`;
    const phone = `25470000${String(2001 + i)}`;

    const existing = await prisma.member.findUnique({ where: { membershipNo } });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.member.create({
      data: {
        membershipNo,
        name: DEMO_NAMES[i],
        phone,
        localChurchId: localChurch.id,
      },
    });
    created++;
  }

  console.log(`Demo members: ${created} created, ${skipped} already existed.`);
}

main()
  .catch((e) => {
    console.error("Demo member seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
