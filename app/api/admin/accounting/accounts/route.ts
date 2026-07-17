export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberAccess, hasAccess } from "@/lib/permissions";
import { getCurrentMemberId } from "@/lib/session";
import type { AccountType } from "@prisma/client";

const VALID_TYPES = new Set<AccountType>(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]);

/** The Chart of Accounts - optionally filtered by type (e.g. ?type=EXPENSE backs the expense-category picker). */
export async function GET(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.accounting")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  if (type && !VALID_TYPES.has(type as AccountType)) {
    return NextResponse.json({ error: "Unknown account type" }, { status: 400 });
  }

  const accounts = await prisma.account.findMany({
    where: { isActive: true, ...(type ? { type: type as AccountType } : {}) },
    select: { id: true, code: true, name: true, type: true },
    orderBy: { code: "asc" },
  });
  return NextResponse.json(accounts);
}

/** Adds a new EXPENSE-type account only - income/asset/liability/equity accounts stay fixed and seed-managed, to protect the FundCategory 1:1 mapping and the single cash account's integrity. */
export async function POST(request: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const access = await getMemberAccess(memberId);
  if (!access || !hasAccess(access.permissions, "admin.accounting", "EDIT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!code || !name) {
    return NextResponse.json({ error: "A code and a name are required" }, { status: 400 });
  }

  try {
    const account = await prisma.account.create({
      data: { code, name, type: "EXPENSE" },
      select: { id: true, code: true, name: true, type: true },
    });
    return NextResponse.json({ status: "ok" as const, account });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "An account with that code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create account", details: String(error) }, { status: 500 });
  }
}
