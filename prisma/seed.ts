import { PrismaClient, FundCategory } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("?? Starting church hierarchy database seeding...");

  // 1. Seed National Headquarters (The Root of AIPCA Hierarchy)
  const hq = await prisma.nationalHeadquarters.create({
    data: {
      title: "AIPCA Supreme Board - Bahati HQ",
      archbishopName: "Archbishop Samson Muthuri"
    }
  });

  // 2. Seed Archdiocese
  const archdiocese = await prisma.archdiocese.create({
    data: {
      name: "Central Western Archdiocese",
      headquartersId: hq.id
    }
  });

  // 3. Seed Diocese
  const diocese = await prisma.diocese.create({
    data: {
      name: "Gatundu Diocese",
      bishopName: "Bishop Njoroge",
      archidId: archdiocese.id
    }
  });

  // 4. Seed Local Parish Core
  const parish = await prisma.parish.create({
    data: {
      name: "Gatundu Central Parish",
      dioceseId: diocese.id,
      tithePaybill: "700000",
      cessPaybill: "700001",
      operationsPaybill: "700002",
      projectsPaybill: "700003"
    }
  });

  // 5. Seed Grassroots Outpost
  const outpost = await prisma.localChurch.create({
    data: {
      name: "Ngarariga Local Outpost",
      parishId: parish.id
    }
  });

  // 6. Seed Baseline Test Member
  await prisma.member.create({
    data: {
      membershipNo: "AIPCA-GAT-0422",
      name: "Samuel Mwangi",
      phone: "254700000000",
      localChurchId: outpost.id
    }
  });

  console.log("? AIPCA Database Hierarchy successfully seeded!");
}

main()
  .catch((e) => {
    console.error("? Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
