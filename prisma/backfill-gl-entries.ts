import { PrismaClient, type FundCategory, type GLTransactionType, type HierarchyTier } from "@prisma/client";

const prisma = new PrismaClient();

// One-off backfill: posts a GLTransaction (Dr Cash / Cr <category income
// account>) for every existing Contribution that doesn't have one yet -
// necessary since the auto-posting hook in lib/payments.ts only applies to
// contributions recorded from now on. Safe to re-run: "already has a GL
// entry" is recomputed fresh every run (diffed against
// GLTransaction.contributionId), never assumed/cached. Batched createMany,
// never a sequential per-row loop - this repo hit the Neon P1017
// connection-drop bug three times before learning that lesson (see
// prisma/seed-groups-contributions-milestones.ts).

async function insertBatched<T>(label: string, rows: T[], insert: (batch: T[]) => Promise<unknown>, batchSize = 1000) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await insert(batch);
    console.log(`  ${label}: ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
  }
}

async function main() {
  const cashAccount = await prisma.account.findUniqueOrThrow({ where: { code: "1001" } });
  const incomeAccounts = await prisma.account.findMany({ where: { fundCategory: { not: null } } });
  const incomeAccountByCategory = new Map(incomeAccounts.map((a) => [a.fundCategory as FundCategory, a.id]));

  const existingGLContributionIds = new Set(
    (
      await prisma.gLTransaction.findMany({
        where: { contributionId: { not: null } },
        select: { contributionId: true },
      })
    ).map((r) => r.contributionId!)
  );

  const contributions = await prisma.contribution.findMany({
    select: {
      id: true,
      amount: true,
      category: true,
      mpesaReceiptNo: true,
      dateTransacted: true,
      member: { select: { localChurchId: true } },
    },
  });

  const missing = contributions.filter((c) => !existingGLContributionIds.has(c.id));
  console.log(`${contributions.length} total contributions, ${missing.length} missing a GL entry.`);

  if (missing.length === 0) {
    console.log("Nothing to backfill.");
    return;
  }

  const rows = missing.map((c) => {
    const incomeAccountId = incomeAccountByCategory.get(c.category);
    if (!incomeAccountId) {
      throw new Error(`No income account mapped for FundCategory ${c.category} - check the Chart of Accounts seed`);
    }
    return {
      date: c.dateTransacted,
      description: `${c.category} contribution - receipt ${c.mpesaReceiptNo}`,
      debitAccountId: cashAccount.id,
      creditAccountId: incomeAccountId,
      amount: c.amount,
      txnType: "CONTRIBUTION" as GLTransactionType,
      scopeTier: "LOCAL_CHURCH" as HierarchyTier,
      scopeId: c.member.localChurchId,
      contributionId: c.id,
    };
  });

  await insertBatched("GL entries", rows, (batch) => prisma.gLTransaction.createMany({ data: batch, skipDuplicates: true }));

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error("GL backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
