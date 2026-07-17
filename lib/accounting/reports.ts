import { prisma } from "@/lib/db";
import type { AccountType, GLTransactionType, HierarchyTier, Prisma } from "@prisma/client";
import { getLocalChurchesWithAncestorChain, type ScopeRef } from "@/lib/hierarchy";

interface ScopePair {
  scopeTier: HierarchyTier;
  scopeId: string;
}

/**
 * Expands a caller's granted scopes (e.g. a single DIOCESE) into every
 * (tier, id) pair a GLTransaction could legitimately carry within that
 * subtree - the scope itself, plus every LOCAL_CHURCH/PARISH/DIOCESE/
 * ARCHDIOCESE id strictly beneath it. Never adds anything ABOVE the given
 * scope tier - a PARISH-scoped caller must never see a DIOCESE-scoped
 * entry, even though that diocese contains their parish. Mirrors
 * lib/rollup.ts's tree descent (same shared query, see
 * getLocalChurchesWithAncestorChain), just collecting ids instead of
 * summing.
 */
async function expandToGLScopePairs(scopes: ScopeRef[]): Promise<ScopePair[]> {
  const pairs: ScopePair[] = [];
  const seen = new Set<string>();
  const add = (scopeTier: HierarchyTier, scopeId: string) => {
    const key = `${scopeTier}:${scopeId}`;
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push({ scopeTier, scopeId });
    }
  };

  const needsChurches = scopes.some((s) => s.tier !== "LOCAL_CHURCH");
  const churches = needsChurches ? await getLocalChurchesWithAncestorChain() : [];

  for (const scope of scopes) {
    add(scope.tier, scope.id);
    if (scope.tier === "LOCAL_CHURCH") continue;

    const relevant = churches.filter((c) => {
      if (scope.tier === "PARISH") return c.parish.id === scope.id;
      if (scope.tier === "DIOCESE") return c.parish.diocese.id === scope.id;
      if (scope.tier === "ARCHDIOCESE") return c.parish.diocese.archdiocese.id === scope.id;
      return c.parish.diocese.archdiocese.headquarters.id === scope.id; // HEADQUARTERS
    });

    for (const c of relevant) {
      add("LOCAL_CHURCH", c.id);
      if (scope.tier === "PARISH") continue;
      add("PARISH", c.parish.id);
      if (scope.tier === "DIOCESE") continue;
      add("DIOCESE", c.parish.diocese.id);
      if (scope.tier === "ARCHDIOCESE") continue;
      add("ARCHDIOCESE", c.parish.diocese.archdiocese.id);
    }
  }

  return pairs;
}

function scopePairsWhere(pairs: ScopePair[]): Prisma.GLTransactionWhereInput {
  return { OR: pairs.map((p) => ({ scopeTier: p.scopeTier, scopeId: p.scopeId })) };
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
}
export interface TrialBalanceResult {
  asOf: Date;
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
}

/** Every account's debit-leg sum and credit-leg sum within the caller's expanded scope, as of a date (defaults to now). Accounts with zero activity are omitted. */
export async function getTrialBalance(scopes: ScopeRef[], asOf?: Date): Promise<TrialBalanceResult> {
  const asOfDate = asOf ?? new Date();
  const pairs = await expandToGLScopePairs(scopes);
  if (pairs.length === 0) return { asOf: asOfDate, rows: [], totalDebits: 0, totalCredits: 0 };

  const where: Prisma.GLTransactionWhereInput = { AND: [scopePairsWhere(pairs), { date: { lte: asOfDate } }] };

  const [debitGroups, creditGroups, accounts] = await Promise.all([
    prisma.gLTransaction.groupBy({ by: ["debitAccountId"], where, _sum: { amount: true } }),
    prisma.gLTransaction.groupBy({ by: ["creditAccountId"], where, _sum: { amount: true } }),
    prisma.account.findMany({ orderBy: { code: "asc" } }),
  ]);

  const debitByAccount = new Map(debitGroups.map((g) => [g.debitAccountId, Number(g._sum.amount ?? 0)]));
  const creditByAccount = new Map(creditGroups.map((g) => [g.creditAccountId, Number(g._sum.amount ?? 0)]));

  const rows: TrialBalanceRow[] = accounts
    .map((a) => ({
      code: a.code,
      name: a.name,
      type: a.type,
      debit: debitByAccount.get(a.id) ?? 0,
      credit: creditByAccount.get(a.id) ?? 0,
    }))
    .filter((r) => r.debit !== 0 || r.credit !== 0);

  return {
    asOf: asOfDate,
    rows,
    totalDebits: rows.reduce((sum, r) => sum + r.debit, 0),
    totalCredits: rows.reduce((sum, r) => sum + r.credit, 0),
  };
}

export interface IncomeExpenditureResult {
  periodStart: Date;
  periodEnd: Date;
  incomeByAccount: { code: string; name: string; total: number }[];
  totalIncome: number;
  expenseByAccount: { code: string; name: string; total: number }[];
  totalExpense: number;
  netSurplus: number;
}

/** Income = sum of amounts credited to INCOME-type accounts within the period; Expense = sum of amounts debited to EXPENSE-type accounts. "Income & Expenditure Statement" - the correct non-profit/church term, not "Income Statement/P&L". */
export async function getIncomeExpenditureStatement(
  scopes: ScopeRef[],
  periodStart: Date,
  periodEnd: Date
): Promise<IncomeExpenditureResult> {
  const empty: IncomeExpenditureResult = {
    periodStart,
    periodEnd,
    incomeByAccount: [],
    totalIncome: 0,
    expenseByAccount: [],
    totalExpense: 0,
    netSurplus: 0,
  };

  const pairs = await expandToGLScopePairs(scopes);
  if (pairs.length === 0) return empty;

  const where: Prisma.GLTransactionWhereInput = {
    AND: [scopePairsWhere(pairs), { date: { gte: periodStart, lte: periodEnd } }],
  };

  const [creditGroups, debitGroups, accounts] = await Promise.all([
    prisma.gLTransaction.groupBy({ by: ["creditAccountId"], where, _sum: { amount: true } }),
    prisma.gLTransaction.groupBy({ by: ["debitAccountId"], where, _sum: { amount: true } }),
    prisma.account.findMany(),
  ]);

  const accountById = new Map(accounts.map((a) => [a.id, a]));

  const incomeByAccount = creditGroups
    .filter((g) => accountById.get(g.creditAccountId)?.type === "INCOME")
    .map((g) => {
      const a = accountById.get(g.creditAccountId)!;
      return { code: a.code, name: a.name, total: Number(g._sum.amount ?? 0) };
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  const expenseByAccount = debitGroups
    .filter((g) => accountById.get(g.debitAccountId)?.type === "EXPENSE")
    .map((g) => {
      const a = accountById.get(g.debitAccountId)!;
      return { code: a.code, name: a.name, total: Number(g._sum.amount ?? 0) };
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  const totalIncome = incomeByAccount.reduce((sum, r) => sum + r.total, 0);
  const totalExpense = expenseByAccount.reduce((sum, r) => sum + r.total, 0);

  return { periodStart, periodEnd, incomeByAccount, totalIncome, expenseByAccount, totalExpense, netSurplus: totalIncome - totalExpense };
}

export interface GLLedgerFilters {
  txnType?: GLTransactionType;
  accountId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}
export interface GLLedgerRow {
  id: string;
  date: Date;
  description: string;
  amount: number;
  txnType: GLTransactionType;
  debitAccount: { code: string; name: string };
  creditAccount: { code: string; name: string };
}

/** Filterable, paginated General Ledger view within the caller's expanded scope. */
export async function listGLTransactions(
  scopes: ScopeRef[],
  filters: GLLedgerFilters,
  page: number,
  pageSize: number
): Promise<{ rows: GLLedgerRow[]; total: number }> {
  const pairs = await expandToGLScopePairs(scopes);
  if (pairs.length === 0) return { rows: [], total: 0 };

  const andClauses: Prisma.GLTransactionWhereInput[] = [scopePairsWhere(pairs)];
  if (filters.txnType) andClauses.push({ txnType: filters.txnType });
  if (filters.accountId) {
    andClauses.push({ OR: [{ debitAccountId: filters.accountId }, { creditAccountId: filters.accountId }] });
  }
  if (filters.dateFrom || filters.dateTo) {
    andClauses.push({ date: { gte: filters.dateFrom, lte: filters.dateTo } });
  }

  const where: Prisma.GLTransactionWhereInput = { AND: andClauses };

  const [rows, total] = await Promise.all([
    prisma.gLTransaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        date: true,
        description: true,
        amount: true,
        txnType: true,
        debitAccount: { select: { code: true, name: true } },
        creditAccount: { select: { code: true, name: true } },
      },
    }),
    prisma.gLTransaction.count({ where }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      date: r.date,
      description: r.description,
      amount: Number(r.amount),
      txnType: r.txnType,
      debitAccount: r.debitAccount,
      creditAccount: r.creditAccount,
    })),
    total,
  };
}
