import { prisma } from "@/lib/db";
import type { FundCategory, FundSourceChannel, HierarchyTier, PaymentIntentStatus, Prisma } from "@prisma/client";
import { postContributionEntry } from "@/lib/accounting/postEntry";

/**
 * The 50-bob-a-week "call registry" fee doubles as attendance proof - paying
 * it IS how a member marks themselves present. Must match the label used in
 * components/admin/AttendanceTab.tsx's SERVICE_TYPES so a leader's manual
 * roster and payment-driven attendance land in the same row (the
 * AttendanceRecord unique constraint is memberId+serviceDate+serviceType).
 */
const CALL_REGISTRY_SERVICE_TYPE = "Sunday Service";

/**
 * Finds every current position-holder whose Role grants
 * "notifications.finance" at the given scope, so payment notifications reach
 * whoever actually treasures that parish/diocese/etc - not a hardcoded role
 * check. Absence of a matching RolePermission row means nobody gets notified,
 * same "missing row = frozen" default the rest of the access model uses.
 */
async function findFinanceNotifiees(tx: Prisma.TransactionClient, scopeTier: HierarchyTier, scopeId: string) {
  const financeRoles = await tx.role.findMany({
    where: {
      scope: scopeTier,
      permissions: { some: { permission: { key: "notifications.finance" } } },
    },
    select: { id: true },
  });

  if (financeRoles.length === 0) return [];

  const holders = await tx.memberPosition.findMany({
    where: {
      roleId: { in: financeRoles.map((role) => role.id) },
      scopeId,
      endDate: null,
    },
    select: { memberId: true },
    distinct: ["memberId"],
  });

  return holders.map((holder) => holder.memberId);
}

interface FinalizeContributionInput {
  memberId: string;
  paidByMemberId?: string | null;
  amount: number;
  category: FundCategory;
  projectId?: string | null;
  welfareCaseId?: string | null;
  mpesaReceiptNo: string;
  dateTransacted: Date;
  sourceChannel: FundSourceChannel;
  paybillNumber?: string | null;
}

interface FinalizedContribution {
  contributionId: string;
  payee: { name: string; phone: string; categoryTotal: number; grandTotal: number };
}

/**
 * The common tail end of recording ANY successful contribution, whether it
 * arrived via the app's STK push (recordContributionForCheckout) or a bare
 * Paybill-menu payment (recordDirectContribution): creates the Contribution
 * row, marks Call Registry attendance, computes running balances, and
 * notifies the payee (full detail) and finance role-holders (bare receipt).
 * Must run inside the caller's transaction.
 */
async function finalizeContribution(
  tx: Prisma.TransactionClient,
  input: FinalizeContributionInput
): Promise<FinalizedContribution> {
  const member = await tx.member.findUniqueOrThrow({
    where: { id: input.memberId },
    include: { localChurch: true },
  });

  let scopeTier: HierarchyTier;
  let scopeId: string;
  if (input.projectId) {
    const project = await tx.project.findUniqueOrThrow({ where: { id: input.projectId } });
    scopeTier = project.scopeTier;
    scopeId = project.scopeId;
  } else if (input.welfareCaseId) {
    const welfareCase = await tx.welfareCase.findUniqueOrThrow({ where: { id: input.welfareCaseId } });
    scopeTier = welfareCase.scopeTier;
    scopeId = welfareCase.scopeId;
  } else {
    scopeTier = "PARISH";
    scopeId = member.localChurch.parishId;
  }

  const contribution = await tx.contribution.create({
    data: {
      memberId: input.memberId,
      paidByMemberId: input.paidByMemberId,
      amount: input.amount,
      category: input.category,
      projectId: input.projectId,
      welfareCaseId: input.welfareCaseId,
      mpesaReceiptNo: input.mpesaReceiptNo,
      dateTransacted: input.dateTransacted,
      sourceChannel: input.sourceChannel,
      paybillNumber: input.paybillNumber,
    },
  });

  await postContributionEntry(tx, {
    contributionId: contribution.id,
    memberId: input.memberId,
    amount: input.amount,
    category: input.category,
    description: `${input.category} contribution - receipt ${input.mpesaReceiptNo}`,
  });

  if (input.category === "CALL_REGISTRY") {
    const serviceDate = new Date(
      input.dateTransacted.getFullYear(),
      input.dateTransacted.getMonth(),
      input.dateTransacted.getDate()
    );
    await tx.attendanceRecord.upsert({
      where: {
        memberId_serviceDate_serviceType: {
          memberId: input.memberId,
          serviceDate,
          serviceType: CALL_REGISTRY_SERVICE_TYPE,
        },
      },
      create: {
        memberId: input.memberId,
        localChurchId: member.localChurchId,
        serviceDate,
        serviceType: CALL_REGISTRY_SERVICE_TYPE,
        status: "PRESENT",
      },
      update: { status: "PRESENT" },
    });
  }

  const amountLabel = input.amount.toLocaleString();

  const [categoryAgg, grandAgg] = await Promise.all([
    tx.contribution.aggregate({
      where: { memberId: input.memberId, category: input.category },
      _sum: { amount: true },
    }),
    tx.contribution.aggregate({
      where: { memberId: input.memberId },
      _sum: { amount: true },
    }),
  ]);
  const categoryTotal = Number(categoryAgg._sum.amount ?? 0);
  const grandTotal = Number(grandAgg._sum.amount ?? 0);

  const paidByMember = input.paidByMemberId
    ? await tx.member.findUnique({ where: { id: input.paidByMemberId }, select: { name: true } })
    : null;
  const paidByNote =
    paidByMember && input.paidByMemberId !== input.memberId ? ` (paid by ${paidByMember.name})` : "";

  await tx.notification.create({
    data: {
      type: "CONTRIBUTION_RECEIVED",
      title: "Contribution received",
      body: `Your ${input.category.toLowerCase()} contribution of KES ${amountLabel} was received${paidByNote}. New ${input.category.toLowerCase()} total: KES ${categoryTotal.toLocaleString()}. Total giving: KES ${grandTotal.toLocaleString()}. Receipt ${input.mpesaReceiptNo}.`,
      memberId: input.memberId,
      relatedContributionId: contribution.id,
    },
  });

  const notifieeIds = (await findFinanceNotifiees(tx, scopeTier, scopeId)).filter(
    (memberId) => memberId !== input.memberId
  );

  if (notifieeIds.length > 0) {
    await tx.notification.createMany({
      data: notifieeIds.map((memberId) => ({
        type: "CONTRIBUTION_RECEIVED" as const,
        title: "New contribution recorded",
        body: `${member.name} received KES ${amountLabel} (${input.category.toLowerCase()})${paidByNote}. Receipt ${input.mpesaReceiptNo}.`,
        memberId,
        relatedContributionId: contribution.id,
      })),
    });
  }

  return {
    contributionId: contribution.id,
    payee: { name: member.name, phone: member.phone, categoryTotal, grandTotal },
  };
}

interface MpesaReceipt {
  mpesaReceiptNo: string;
  dateTransacted: Date;
}

export interface RecordedIntent {
  id: string;
  status: PaymentIntentStatus;
  contributionId: string | null;
  /** Present only when this call is what just completed the intent (not a duplicate callback replay). */
  freshlyCompleted?: {
    category: FundCategory;
    amount: number;
    receipt: string;
    payerPhone: string;
    payee: {
      name: string;
      phone: string;
      categoryTotal: number;
      grandTotal: number;
    };
  };
}

/**
 * Called from the STK callback once Daraja confirms a payment. Resolves the
 * staged PaymentIntent (created before the push fired - see stk-push route)
 * and finalizes it. The payer-only SMS (for when someone pays on another
 * member's behalf) is sent by the caller using `freshlyCompleted`, since SMS
 * delivery shouldn't happen inside this DB transaction. Idempotent: a
 * duplicate callback for an already-resolved intent is a no-op rather than a
 * double-counted gift.
 */
export async function recordContributionForCheckout(
  checkoutRequestId: string,
  receipt: MpesaReceipt
): Promise<RecordedIntent | null> {
  return prisma.$transaction(async (tx) => {
    const intent = await tx.paymentIntent.findUnique({ where: { checkoutRequestId } });

    if (!intent) return null;
    if (intent.status !== "PENDING") {
      return { id: intent.id, status: intent.status, contributionId: intent.contributionId };
    }

    const finalized = await finalizeContribution(tx, {
      memberId: intent.memberId,
      paidByMemberId: intent.paidByMemberId,
      amount: Number(intent.amount),
      category: intent.category,
      projectId: intent.projectId,
      welfareCaseId: intent.welfareCaseId,
      mpesaReceiptNo: receipt.mpesaReceiptNo,
      dateTransacted: receipt.dateTransacted,
      sourceChannel: "APP_STK",
      paybillNumber: process.env.MPESA_SHORTCODE,
    });

    await tx.paymentIntent.update({
      where: { id: intent.id },
      data: { status: "COMPLETED", contributionId: finalized.contributionId, resolvedAt: new Date() },
    });

    return {
      id: intent.id,
      status: "COMPLETED" as const,
      contributionId: finalized.contributionId,
      freshlyCompleted: {
        category: intent.category,
        amount: Number(intent.amount),
        receipt: receipt.mpesaReceiptNo,
        payerPhone: intent.phoneNumber,
        payee: finalized.payee,
      },
    };
  });
}

/** Called on a failed/cancelled STK callback. Idempotent, same as the success path. */
export async function markIntentFailed(checkoutRequestId: string, reason: string): Promise<void> {
  const intent = await prisma.paymentIntent.findUnique({ where: { checkoutRequestId } });
  if (!intent || intent.status !== "PENDING") return;

  const status: PaymentIntentStatus = /cancel/i.test(reason) ? "CANCELLED" : "FAILED";

  await prisma.$transaction([
    prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status, failureReason: reason, resolvedAt: new Date() },
    }),
    prisma.notification.create({
      data: {
        type: "PAYMENT_FAILED",
        title: status === "CANCELLED" ? "Payment cancelled" : "Payment failed",
        body: reason,
        memberId: intent.memberId,
      },
    }),
  ]);
}

export interface DirectContributionResult {
  category: FundCategory;
  amount: number;
  receipt: string;
  payerPhone: string;
  payee: { name: string; phone: string; categoryTotal: number; grandTotal: number };
}

/**
 * Records a bare Paybill-menu payment (no PaymentIntent - the member wasn't
 * signed into the app) once the C2B confirmation route has already resolved
 * the payee's memberId (via their typed Membership No.) and category (via
 * lib/fundCategory.ts). Only ever called for a payment confident enough to
 * NOT need the UnmatchedPayment review queue.
 */
export async function recordDirectContribution(input: {
  memberId: string;
  category: FundCategory;
  amount: number;
  mpesaReceiptNo: string;
  dateTransacted: Date;
  payerPhone: string;
  paybillNumber: string;
}): Promise<DirectContributionResult> {
  const finalized = await prisma.$transaction((tx) =>
    finalizeContribution(tx, {
      memberId: input.memberId,
      amount: input.amount,
      category: input.category,
      mpesaReceiptNo: input.mpesaReceiptNo,
      dateTransacted: input.dateTransacted,
      sourceChannel: "C2B_PAYBILL",
      paybillNumber: input.paybillNumber,
    })
  );

  return {
    category: input.category,
    amount: input.amount,
    receipt: input.mpesaReceiptNo,
    payerPhone: input.payerPhone,
    payee: finalized.payee,
  };
}
