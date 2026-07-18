import "dotenv/config";
import { PrismaClient, type FundCategory } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * One-off: gives the real founder account (AIPCA-GAT-0001) sample giving
 * history to explore - so far pre-launch it was used only to log in and
 * test admin features, with zero Contribution rows of its own. Clearly-
 * labeled "DEMOFOUNDER" receipts, same convention as
 * seed-groups-contributions-milestones.ts's "SEED" receipts - sample data,
 * not a fabricated M-Pesa-looking receipt. Safe to re-run: skips if the
 * founder already has any contributions (never overwrites/duplicates).
 */
async function main() {
  const founder = await prisma.member.findUnique({
    where: { membershipNo: "AIPCA-GAT-0001" },
    select: { id: true, localChurchId: true },
  });
  if (!founder) throw new Error("Founder account AIPCA-GAT-0001 not found");

  const existing = await prisma.contribution.count({ where: { memberId: founder.id } });
  if (existing > 0) {
    console.log(`Founder already has ${existing} contributions - skipping to avoid duplicating history.`);
    return;
  }

  await prisma.localChurch.update({
    where: { id: founder.localChurchId },
    data: { cessTargetAmount: 300 },
  });
  console.log("Set Kenyatta Road Church Cess quota to KES 300/month.");

  const rows: { memberId: string; amount: number; category: FundCategory; mpesaReceiptNo: string; dateTransacted: Date }[] = [];
  let seq = 0;
  const receipt = () => `DEMOFOUNDER${String(++seq).padStart(4, "0")}`;

  // Tithe - monthly, Feb through Jul 2026.
  const titheAmounts = [3000, 3500, 3000, 4000, 3500, 2000];
  const titheMonths = [1, 2, 3, 4, 5, 6]; // Feb=1 ... Jul=6 (0-indexed month, year 2026)
  titheMonths.forEach((m, i) => {
    rows.push({ memberId: founder.id, amount: titheAmounts[i], category: "TITHE", mpesaReceiptNo: receipt(), dateTransacted: new Date(2026, m, 5) });
  });

  // Sadaka - occasional.
  [[1, 200], [3, 300], [5, 250]].forEach(([m, amt]) => {
    rows.push({ memberId: founder.id, amount: amt, category: "SADAKA", mpesaReceiptNo: receipt(), dateTransacted: new Date(2026, m, 12) });
  });

  // Call Registry - weekly (Sundays), KES 50 each, Feb 1 through Jul 12.
  for (let d = new Date(2026, 1, 1); d <= new Date(2026, 6, 12); d.setDate(d.getDate() + 7)) {
    rows.push({ memberId: founder.id, amount: 50, category: "CALL_REGISTRY", mpesaReceiptNo: receipt(), dateTransacted: new Date(d) });
  }

  // Church Operations - every other month.
  [[1, 500], [3, 600], [5, 500]].forEach(([m, amt]) => {
    rows.push({ memberId: founder.id, amount: amt, category: "OPERATIONS", mpesaReceiptNo: receipt(), dateTransacted: new Date(2026, m, 20) });
  });

  // Cess - monthly, against the new KES 300 quota.
  const cessAmounts = [300, 300, 200, 300, 300, 300];
  titheMonths.forEach((m, i) => {
    rows.push({ memberId: founder.id, amount: cessAmounts[i], category: "CESS", mpesaReceiptNo: receipt(), dateTransacted: new Date(2026, m, 10) });
  });

  await prisma.contribution.createMany({ data: rows });
  console.log(`Created ${rows.length} sample contributions for the founder account.`);
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
