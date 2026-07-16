import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// All names below are synthetic sample data - NOT real AIPCA congregants,
// dioceses, parishes, or local churches (aside from the one real chain
// noted below, provided directly by a real member). Diocese/Parish/Local
// Church names are drawn from real Kiambu-area place names for plausibility
// (AIPCA's historical demographic), but the specific administrative
// assignment (which parish belongs to which diocese, etc.) is invented for
// realistic app demo data volume, not asserted as AIPCA's actual structure.
//
// The ONE real chain - Nairobi Archdiocese > Thika Diocese > Juja Parish >
// Kenyatta Road Church - was provided directly by the real signed-in member
// and is renamed in place, never recreated, to avoid duplicating it.
//
// Phone numbers are a synthetic sequential block (2547000 1____), not real
// subscriber numbers - do not use the Make Payment / STK push feature
// against any of these members with real money; there's no guarantee a
// randomly-chosen real phone number wouldn't belong to an actual person,
// but a clearly sequential block at least keeps this data visibly synthetic.

interface ChurchSpec {
  name: string;
  isReal?: boolean;
}
interface ParishSpec {
  name: string;
  isReal?: boolean;
  churches: ChurchSpec[];
}
interface DioceseSpec {
  name: string;
  isReal?: boolean;
  bishopName?: string;
  parishes: ParishSpec[];
}

const DIOCESES: DioceseSpec[] = [
  {
    name: "Thika",
    isReal: true,
    parishes: [
      {
        name: "Juja",
        isReal: true,
        churches: [
          { name: "Kenyatta Road Church", isReal: true },
          { name: "Kalimoni Church" },
          { name: "Witeithie Church" },
          { name: "Kiuu Church" },
          { name: "Ndarugu Church" },
        ],
      },
      {
        name: "Gatuanyaga",
        churches: [
          { name: "Gatuanyaga Central Church" },
          { name: "Landless Church" },
          { name: "Mataara Church" },
          { name: "Kimuchu Church" },
          { name: "Mvuti Church" },
        ],
      },
      {
        name: "Ngoliba",
        churches: [
          { name: "Ngoliba Church" },
          { name: "Kilimambogo Church" },
          { name: "Ndula Church" },
          { name: "Sagana Road Church" },
          { name: "Makuyu Church" },
        ],
      },
      {
        name: "Makongeni",
        churches: [
          { name: "Makongeni Church" },
          { name: "Uhuru Street Church" },
          { name: "Section 9 Church" },
          { name: "Biashara Street Church" },
          { name: "Madaraka Church" },
        ],
      },
      {
        name: "Thika Township",
        churches: [
          { name: "Township Church" },
          { name: "Hospital Hill Church" },
          { name: "Kiganjo Church" },
          { name: "Munyu Church" },
          { name: "Blue Post Church" },
        ],
      },
    ],
  },
  {
    name: "Ruiru",
    bishopName: "Bishop Charles Wanyoike",
    parishes: [
      {
        name: "Kimbo",
        churches: [
          { name: "Kimbo Church" },
          { name: "Committee Church" },
          { name: "Gitambaya Church" },
          { name: "Toll Church" },
          { name: "Kiungani Church" },
        ],
      },
      {
        name: "Biashara",
        churches: [
          { name: "Biashara Church" },
          { name: "Mwihoko Church" },
          { name: "Gatongora Church" },
          { name: "Githurai Church" },
          { name: "Kahawa Sukari Church" },
        ],
      },
      {
        name: "Murera",
        churches: [
          { name: "Murera Church" },
          { name: "Juja Farm Church" },
          { name: "Kahawa Wendani Church" },
          { name: "Mugutha Church" },
          { name: "Ruiru Town Church" },
        ],
      },
      {
        name: "Gitothua",
        churches: [
          { name: "Gitothua Church" },
          { name: "Membley Estate Church" },
          { name: "Kiuu Road Church" },
          { name: "Kimbo Estate Church" },
          { name: "Gatong'ora Church" },
        ],
      },
      {
        name: "Membley",
        churches: [
          { name: "Membley Church" },
          { name: "Kamakis Church" },
          { name: "Kiwanja Church" },
          { name: "Mwihoko Estate Church" },
          { name: "Membley Springs Church" },
        ],
      },
    ],
  },
  {
    name: "Kikuyu",
    bishopName: "Bishop Daniel Kamotho",
    parishes: [
      {
        name: "Karai",
        churches: [
          { name: "Karai Church" },
          { name: "Gikambura Church" },
          { name: "Kerwa Church" },
          { name: "Rungiri Church" },
          { name: "Kikuyu Town Church" },
        ],
      },
      {
        name: "Sigona",
        churches: [
          { name: "Sigona Church" },
          { name: "Ondiri Church" },
          { name: "Muguga Church" },
          { name: "Kabete Church" },
          { name: "Wangige Church" },
        ],
      },
      {
        name: "Nachu",
        churches: [
          { name: "Nachu Church" },
          { name: "Regen Church" },
          { name: "Riara Church" },
          { name: "Uthiru Church" },
          { name: "Kinoo Road Church" },
        ],
      },
      {
        name: "Kinoo",
        churches: [
          { name: "Kinoo Church" },
          { name: "Kingeero Church" },
          { name: "Kabuku Church" },
          { name: "Kanyariri Church" },
          { name: "Nyathuna Church" },
        ],
      },
      {
        name: "Thogoto",
        churches: [
          { name: "Thogoto Church" },
          { name: "Ngarariga Church" },
          { name: "Kikuyu Hospital Church" },
          { name: "Gichagi Church" },
          { name: "Kerarapon Church" },
        ],
      },
    ],
  },
  {
    name: "Limuru",
    bishopName: "Bishop Peter Kang'ethe",
    parishes: [
      {
        name: "Limuru Central",
        churches: [
          { name: "Limuru Central Church" },
          { name: "Escarpment Church" },
          { name: "Manguo Church" },
          { name: "Kamirithu Church" },
          { name: "Ngenda Road Church" },
        ],
      },
      {
        name: "Bibirioni",
        churches: [
          { name: "Bibirioni Church" },
          { name: "Gitwe Church" },
          { name: "Kamangu Church" },
          { name: "Ndeiya Church" },
          { name: "Kereita Church" },
        ],
      },
      {
        name: "Tigoni",
        churches: [
          { name: "Tigoni Church" },
          { name: "Kentmere Church" },
          { name: "Rironi Road Church" },
          { name: "Uplands Church" },
          { name: "Tigoni Estate Church" },
        ],
      },
      {
        name: "Ngecha",
        churches: [
          { name: "Ngecha Church" },
          { name: "Ngecha Road Church" },
          { name: "Kirenga Church" },
          { name: "Gathiru Church" },
          { name: "Karagita Church" },
        ],
      },
      {
        name: "Rironi",
        churches: [
          { name: "Rironi Church" },
          { name: "Kamirithu Road Church" },
          { name: "Ndeiya Road Church" },
          { name: "Githirioni Church" },
          { name: "Rironi Market Church" },
        ],
      },
    ],
  },
];

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
  "Ngari", "Muriuki", "Kabiru", "Wandera", "Njogu", "Kirui", "Mutua", "Njiru", "Wafula", "Onyango",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomName(): string {
  const first = Math.random() < 0.5 ? randomFrom(MALE_FIRST_NAMES) : randomFrom(FEMALE_FIRST_NAMES);
  return `${first} ${randomFrom(SURNAMES)}`;
}

function randomDate(startYear: number, endYear: number): Date {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start));
}

const MEMBERS_PER_CHURCH = 50;

async function main() {
  const archdiocese = await prisma.archdiocese.findFirst({ where: { name: "Nairobi Archdiocese" } });
  if (!archdiocese) {
    throw new Error('Archdiocese "Nairobi Archdiocese" not found - run this after the real chain exists.');
  }

  let churchSeq = 0; // global counter across all churches, drives the member number blocks
  const memberRows: {
    membershipNo: string;
    name: string;
    idNumber: string;
    phone: string;
    dateOfBirth: Date;
    placeOfResidence: string;
    joinedAt: Date;
    localChurchId: string;
  }[] = [];

  for (const dioceseSpec of DIOCESES) {
    const diocese = dioceseSpec.isReal
      ? await prisma.diocese.findFirstOrThrow({ where: { name: dioceseSpec.name, archidId: archdiocese.id } })
      : await prisma.diocese.upsert({
          where: { name_archidId: { name: dioceseSpec.name, archidId: archdiocese.id } },
          update: {},
          create: { name: dioceseSpec.name, bishopName: dioceseSpec.bishopName ?? "Not yet confirmed", archidId: archdiocese.id },
        });

    for (const parishSpec of dioceseSpec.parishes) {
      const parish = parishSpec.isReal
        ? await prisma.parish.findFirstOrThrow({ where: { name: parishSpec.name, dioceseId: diocese.id } })
        : await prisma.parish.upsert({
            where: { name_dioceseId: { name: parishSpec.name, dioceseId: diocese.id } },
            update: {},
            create: { name: parishSpec.name, dioceseId: diocese.id },
          });

      for (const churchSpec of parishSpec.churches) {
        const localChurch = churchSpec.isReal
          ? await prisma.localChurch.findFirstOrThrow({ where: { name: churchSpec.name, parishId: parish.id } })
          : await prisma.localChurch.upsert({
              where: { name_parishId: { name: churchSpec.name, parishId: parish.id } },
              update: {},
              create: { name: churchSpec.name, parishId: parish.id },
            });

        churchSeq++;
        if (churchSpec.isReal) continue; // Kenyatta Road Church already has 50+ real/demo members

        const existingCount = await prisma.member.count({ where: { localChurchId: localChurch.id } });
        const needed = Math.max(MEMBERS_PER_CHURCH - existingCount, 0);
        const residence = churchSpec.name.replace(/ Church$/, "");

        for (let i = 0; i < needed; i++) {
          const seq = (churchSeq - 1) * MEMBERS_PER_CHURCH + i + 1; // unique across the whole run
          memberRows.push({
            membershipNo: `AIPCA-MEM-${String(seq).padStart(5, "0")}`,
            name: randomName(),
            idNumber: `30${String(10001 + seq).padStart(6, "0")}`,
            phone: `254700${String(10001 + seq).padStart(6, "0")}`,
            dateOfBirth: randomDate(1950, 2005),
            placeOfResidence: residence,
            joinedAt: randomDate(1995, 2026),
            localChurchId: localChurch.id,
          });
        }
      }
    }
  }

  console.log(`Prepared ${memberRows.length} member rows across ${churchSeq} local churches. Inserting in batches...`);

  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < memberRows.length; i += BATCH_SIZE) {
    const batch = memberRows.slice(i, i + BATCH_SIZE);
    await prisma.member.createMany({ data: batch, skipDuplicates: true });
    inserted += batch.length;
    console.log(`  ${inserted}/${memberRows.length} inserted...`);
  }

  const totalMembers = await prisma.member.count();
  const totalChurches = await prisma.localChurch.count();
  const totalParishes = await prisma.parish.count();
  const totalDioceses = await prisma.diocese.count();
  console.log(`Done. Totals - dioceses: ${totalDioceses}, parishes: ${totalParishes}, local churches: ${totalChurches}, members: ${totalMembers}`);
}

main()
  .catch((e) => {
    console.error("Full network seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
