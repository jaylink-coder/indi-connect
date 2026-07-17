import { prisma } from "@/lib/db";
import type { FundCategory, HierarchyTier, Prisma } from "@prisma/client";

const CASH_ACCOUNT_CODE = "1001";

/** Fails loud rather than silently posting nowhere - a misconfigured Chart of Accounts is a setup bug, not a runtime edge case to swallow. */
async function resolveCashAccount(tx: Prisma.TransactionClient): Promise<{ id: string }> {
  const account = await tx.account.findUnique({ where: { code: CASH_ACCOUNT_CODE } });
  if (!account || !account.isActive) {
    throw new Error(`Chart of Accounts is missing an active cash account (code ${CASH_ACCOUNT_CODE})`);
  }
  return account;
}

async function resolveIncomeAccount(tx: Prisma.TransactionClient, category: FundCategory): Promise<{ id: string }> {
  const account = await tx.account.findUnique({ where: { fundCategory: category } });
  if (!account || !account.isActive) {
    throw new Error(`Chart of Accounts is missing an active income account for ${category}`);
  }
  return account;
}

/**
 * Posts Dr Cash / Cr <category income account> for a just-created
 * Contribution. Must run inside the caller's transaction (same contract as
 * finalizeContribution in lib/payments.ts, which is the only caller).
 * Scope is deliberately always LOCAL_CHURCH + the payee's own church -
 * matching how lib/rollup.ts already groups every contribution by
 * member.localChurchId (ignoring any linked Project/WelfareCase's own
 * scope) - so GL-based reports can be cross-checked against the
 * already-trusted rollup exactly, apples to apples. This is a deliberate
 * divergence from finalizeContribution's own PARISH-default scope
 * computation, which only drives finance-notification routing - a
 * different concern.
 */
export async function postContributionEntry(
  tx: Prisma.TransactionClient,
  input: { contributionId: string; memberId: string; amount: number; category: FundCategory; description: string }
): Promise<{ id: string }> {
  const member = await tx.member.findUniqueOrThrow({ where: { id: input.memberId }, select: { localChurchId: true } });
  const [cash, income] = await Promise.all([resolveCashAccount(tx), resolveIncomeAccount(tx, input.category)]);

  return tx.gLTransaction.create({
    data: {
      description: input.description,
      debitAccountId: cash.id,
      creditAccountId: income.id,
      amount: input.amount,
      txnType: "CONTRIBUTION",
      scopeTier: "LOCAL_CHURCH",
      scopeId: member.localChurchId,
      contributionId: input.contributionId,
    },
    select: { id: true },
  });
}

/**
 * Posts Dr <expense category account> / Cr Cash when an Expense moves to
 * PAID. Must run inside the caller's transaction, alongside the Expense
 * status update, so a crash between the two is impossible.
 */
export async function postExpensePaidEntry(
  tx: Prisma.TransactionClient,
  input: {
    expenseId: string;
    amount: number;
    expenseAccountId: string;
    scopeTier: HierarchyTier;
    scopeId: string;
    description: string;
    postedByMemberId: string;
  }
): Promise<{ id: string }> {
  const cash = await resolveCashAccount(tx);
  return tx.gLTransaction.create({
    data: {
      description: input.description,
      debitAccountId: input.expenseAccountId,
      creditAccountId: cash.id,
      amount: input.amount,
      txnType: "EXPENSE",
      scopeTier: input.scopeTier,
      scopeId: input.scopeId,
      expenseId: input.expenseId,
      postedByMemberId: input.postedByMemberId,
    },
    select: { id: true },
  });
}

/**
 * Raw manual journal entry - the only place raw debit/credit account
 * selection is exposed to a user (see app/api/admin/accounting/journal).
 * Opens its own transaction since it isn't called from inside an existing
 * one.
 */
export async function postManualJournalEntry(input: {
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  description: string;
  scopeTier: HierarchyTier;
  scopeId: string;
  postedByMemberId: string;
}): Promise<{ id: string }> {
  if (input.debitAccountId === input.creditAccountId) {
    throw new Error("Debit and credit accounts must be different");
  }
  if (input.amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  return prisma.$transaction(async (tx) => {
    const [debitAccount, creditAccount] = await Promise.all([
      tx.account.findUniqueOrThrow({ where: { id: input.debitAccountId } }),
      tx.account.findUniqueOrThrow({ where: { id: input.creditAccountId } }),
    ]);
    if (!debitAccount.isActive || !creditAccount.isActive) {
      throw new Error("Both accounts must be active");
    }

    return tx.gLTransaction.create({
      data: {
        description: input.description,
        debitAccountId: input.debitAccountId,
        creditAccountId: input.creditAccountId,
        amount: input.amount,
        txnType: "JOURNAL",
        scopeTier: input.scopeTier,
        scopeId: input.scopeId,
        postedByMemberId: input.postedByMemberId,
      },
      select: { id: true },
    });
  });
}

/**
 * Posts a new row with debit/credit swapped from the original, description
 * prefixed "REVERSAL:", txnType REVERSAL, reversalOfId set - never mutates
 * or deletes the original row, so the ledger stays immutable. Opens its own
 * transaction. The @unique on reversalOfId means a second reversal attempt
 * hits a normal DB conflict, not silent double-reversal.
 */
export async function reverseGLTransaction(input: {
  glTransactionId: string;
  postedByMemberId: string;
  reason?: string;
}): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const original = await tx.gLTransaction.findUniqueOrThrow({
      where: { id: input.glTransactionId },
      include: { reversedBy: { select: { id: true } } },
    });
    if (original.reversedBy) {
      throw new Error("This entry has already been reversed");
    }

    return tx.gLTransaction.create({
      data: {
        description: `REVERSAL: ${original.description}${input.reason ? ` - ${input.reason}` : ""}`,
        debitAccountId: original.creditAccountId,
        creditAccountId: original.debitAccountId,
        amount: original.amount,
        txnType: "REVERSAL",
        scopeTier: original.scopeTier,
        scopeId: original.scopeId,
        reversalOfId: original.id,
        postedByMemberId: input.postedByMemberId,
      },
      select: { id: true },
    });
  });
}
