"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChurchLogo } from "../components/ChurchLogo";
import { AdminPadlock } from "@/components/AdminPadlock";
import { MakePaymentDialog } from "@/components/MakePaymentDialog";
import { AccountStatementModal } from "@/components/AccountStatementModal";
import { INDI_CONNECT_CONFIG } from "../config/indi-config";
import type { AccountSummary } from "@/lib/accounts";

type AccountCategory = "TITHE" | "SADAKA" | "CALL_REGISTRY" | "OPERATIONS";

// Cess Quota gets its own progress-bar treatment below (it's the one
// category with a real, admin-assigned monthly target) - these four are
// freewill/collective giving with no personal target to compare against,
// so they stay as simple totals, just with an honest description of what
// each one actually is.
const ACCOUNT_CATEGORIES: { category: AccountCategory; label: string; description: string }[] = [
  { category: "TITHE", label: "Tithe (Zaka)", description: "Your freewill giving, traditionally a tenth of income." },
  { category: "SADAKA", label: "Sadaka", description: "A voluntary offering, given as you're moved to." },
  { category: "CALL_REGISTRY", label: "Call Registry", description: "Weekly payment that doubles as your attendance record." },
  { category: "OPERATIONS", label: "Church Operations", description: "Shared fund for running the local church." },
];

// AIPCA's founding history, sourced from the church's own published "About"
// and "At a Glance" pages (crawled and reviewed - see crawler/README.md).
// Nothing here is invented: the church's own account ties its 1925 founding
// directly to the Gikuyu nationalist/independent-schools movement, and
// records its churches and schools being shut down under the 1952 State of
// Emergency for exactly that reason.
const HERITAGE = {
  founded: "1925",
  blurb:
    "A.I.P.C.A. wasn't founded as a neutral religious brand. It grew out of the 1920s Gikuyu nationalist movement, as the spiritual wing of the Kikuyu Independent Schools Association - Kenyans building their own churches and schools, free of colonial control. When the State of Emergency was declared in 1952, the Church was proscribed and its premises closed, seen by the colonial government as grounds for the freedom movement. Today's largest indigenous church in Africa was born out of that fight for African dignity and self-rule.",
};

// A first draft of milestone TYPES, not real per-member records - proposed
// for a real AIPCA member to confirm, correct, or reject before this ever
// tracks anyone's actual data. No dates/names/completion status are shown
// for anyone, since none of this has been confirmed as real yet.
//
// Grouped in three tiers borrowed structurally from the Catholic Church's
// three sacrament families (Initiation / Healing / Service of Communion) -
// become, grow, serve - without claiming A.I.P.C.A. follows Catholic
// doctrine. This is a shape borrowed from a well-documented model, not
// content borrowed from it. The "Serving" tier isn't hypothetical: it's the
// same MemberPosition system already powering the admin padlock (see
// lib/permissions.ts) - a leadership position IS a milestone, just one we
// already track for real.
const MILESTONE_TIERS = [
  {
    tier: "Becoming a Member",
    milestones: [
      { icon: "🙏", title: "Salvation (Wokovu)", note: "The turn every other milestone follows from", highlight: true },
      { icon: "💧", title: "Water Baptism", note: "Full immersion, per Pentecostal practice", highlight: true },
      { icon: "✝️", title: "Confirmation", note: "Unconfirmed whether A.I.P.C.A. observes this", highlight: false },
    ],
  },
  {
    tier: "Growing as a Member",
    milestones: [
      { icon: "📖", title: "Discipleship / Bible Study", note: "Unconfirmed - what does A.I.P.C.A. call this?", highlight: false },
      { icon: "🤝", title: "Joining a Fellowship", note: "e.g. Men's or Women's Fellowship", highlight: false },
    ],
  },
  {
    tier: "Serving as a Member",
    milestones: [
      { icon: "⛪", title: "Commissioned to a Ministry", note: "e.g. choir, ushering, Sunday school", highlight: false },
      { icon: "🗝️", title: "Holding a Leadership Position", note: "Already tracked for real - see admin panel", highlight: true },
    ],
  },
];

function CessQuotaCard({ data, onPaid }: { data: AccountSummary; onPaid: () => void }) {
  const { cessTarget, cessThisMonth } = data;
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long" });

  if (cessTarget === null) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-700">Cess Quota</p>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-500">No quota set</span>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Your local church hasn&apos;t had a Cess quota assigned yet - ask your leader to set one.
        </p>
      </div>
    );
  }

  const fillPercent = Math.min((cessThisMonth / cessTarget) * 100, 100);
  const remaining = Math.max(cessTarget - cessThisMonth, 0);
  const status =
    cessThisMonth === 0
      ? { label: "Not Started", classes: "bg-red-50 text-red-600" }
      : cessThisMonth < cessTarget
        ? { label: "In Progress", classes: "bg-amber-50 text-amber-700" }
        : { label: "Quota Met ✓", classes: "bg-green-50 text-green-700" };

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-700">Cess Quota - {monthLabel}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status.classes}`}>{status.label}</span>
      </div>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all ${cessThisMonth >= cessTarget ? "bg-green-600" : "bg-[#024424]"}`}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-xs">
        <span className="text-gray-500">
          Paid: <span className="font-bold text-[#024424]">KES {cessThisMonth.toLocaleString()}</span>
        </span>
        <span className="text-gray-500">
          Target: <span className="font-bold text-gray-700">KES {cessTarget.toLocaleString()}</span>
        </span>
        <span className="text-gray-500">
          Remaining: <span className="font-bold text-[#B22222]">KES {remaining.toLocaleString()}</span>
        </span>
      </div>
      <div className="mt-3">
        <MakePaymentDialog
          defaultPhone={data.member.phone}
          defaultIdentifier={data.member.membershipNo}
          initialCategory="CESS"
          lockCategory
          triggerLabel="Pay Cess"
          triggerClassName="w-full rounded-lg bg-[#024424] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#01331a]"
          onSuccess={onPaid}
        />
      </div>
    </div>
  );
}

export default function MemberDashboardPage() {
  const router = useRouter();
  const [isLeader, setIsLeader] = useState(false);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [openAccount, setOpenAccount] = useState<AccountCategory | null>(null);

  const loadSummary = useCallback(() => {
    fetch("/api/member/dashboard-summary")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((body) => setSummary(body))
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    fetch("/api/member/access")
      .then((res) => res.json())
      .then((body) => setIsLeader(Boolean(body.isLeader)))
      .catch(() => setIsLeader(false));
    loadSummary();
  }, [loadSummary]);

  if (!summary) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAF8] text-sm text-gray-500">
        {loadError ? "We couldn't load your account. Please refresh." : "Loading your account..."}
      </div>
    );
  }

  const data = summary;

  return (
    <div className="min-h-screen bg-[#F8FAF8] pb-12 text-gray-900">
      <div className="flex flex-col bg-[#024424] px-6 py-4 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ChurchLogo className="" showText={false} />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">{INDI_CONNECT_CONFIG.denomination}</span>
            <h2 className="text-xl font-black">{INDI_CONNECT_CONFIG.name} Member Portal</h2>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3 sm:mt-0">
          <div className="text-left sm:text-right">
            <p className="text-sm font-bold">{data.member.name}</p>
            <p className="font-mono text-xs text-gray-300">
              ID: {data.member.membershipNo} • {data.member.localChurchName}, {data.member.parishName}
            </p>
          </div>
          <AdminPadlock isLeader={isLeader} />
        </div>
      </div>

      <main className="mx-auto mt-8 grid max-w-6xl grid-cols-1 gap-6 px-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 border-b pb-3 text-base font-bold text-[#024424]">My Accounts</h3>

            <CessQuotaCard data={data} onPaid={loadSummary} />

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {ACCOUNT_CATEGORIES.map((account) => (
                <div
                  key={account.category}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenAccount(account.category)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpenAccount(account.category);
                    }
                  }}
                  className="cursor-pointer rounded-lg border border-gray-100 bg-gray-50 p-4 text-left transition-colors hover:border-[#024424]/30 hover:bg-white"
                >
                  <p className="text-xs font-semibold text-gray-500">{account.label}</p>
                  <p className="mt-1 font-mono text-lg font-black text-[#024424]">
                    KES {(data.byCategory[account.category] ?? 0).toLocaleString()}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-gray-400">{account.description}</p>
                  <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                    <MakePaymentDialog
                      defaultPhone={data.member.phone}
                      defaultIdentifier={data.member.membershipNo}
                      initialCategory={account.category}
                      lockCategory
                      triggerLabel="Make Payment"
                      triggerClassName="w-full rounded-lg bg-[#024424] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#01331a]"
                      onSuccess={loadSummary}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-[#024424]">My Recent Giving (Mĩhothi)</h3>
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
                Total Given: KES {data.totalContributed.toLocaleString()}
              </span>
            </div>
            <div className="space-y-3">
              {data.recentContributions.length === 0 && (
                <p className="py-4 text-center text-xs text-gray-400">No contributions recorded yet.</p>
              )}
              {data.recentContributions.map((offering) => (
                <div key={offering.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{offering.type}</p>
                    <p className="font-mono text-[10px] text-gray-400">
                      M-Pesa: {offering.receipt} • {new Date(offering.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-black text-gray-900">KES {offering.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 border-b pb-3 text-base font-bold text-[#024424]">My Attendance History (Mahudhurio)</h3>
            <p className="py-6 text-center text-xs text-gray-400">
              Attendance tracking isn&apos;t wired up yet - this will show your real Call Registry / Sunday
              attendance record once it&apos;s built.
            </p>
          </div>

          <div className="rounded-xl border border-[#D4AF37]/30 bg-[#F4EFDE] p-6 shadow-sm">
            <h3 className="mb-2 text-base font-bold text-[#024424]">Why We Are A.I.P.C.A.</h3>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#8a6d1a]">Founded {HERITAGE.founded}</p>
            <p className="text-sm leading-relaxed text-gray-700">{HERITAGE.blurb}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-base font-bold text-[#024424]">My Profile</h3>
            <div className="rounded-lg border border-gray-100 bg-[#F8FAF8] p-4">
              <p className="text-sm font-semibold text-gray-900">{data.member.name}</p>
              <p className="mt-1 text-xs text-gray-500">Member No: {data.member.membershipNo}</p>
              <p className="mt-1 text-xs text-gray-500">Diocese: {data.member.dioceseName}</p>
              <p className="mt-1 text-xs text-gray-500">Parish: {data.member.parishName}</p>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                <span className="text-gray-500">Local Church</span>
                <span className="font-bold text-[#024424]">{data.member.localChurchName}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 border-b pb-3 text-base font-bold text-[#024424]">Support a Project or Welfare Case</h3>
            <p className="mb-4 text-xs text-gray-500">
              Tithe, Sadaka, Call Registry, Operations, and Cess each have their own Make Payment button above -
              this one&apos;s for a specific Church Project or Welfare Case instead.
            </p>
            <MakePaymentDialog
              defaultPhone={data.member.phone}
              defaultIdentifier={data.member.membershipNo}
              initialCategory="PROJECT"
              categories={["PROJECT", "WELFARE"]}
              onSuccess={loadSummary}
            />
          </div>

          {isLeader && (
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 border-b pb-3 text-base font-bold text-[#024424]">Leader Tools</h3>
              <p className="mb-3 text-xs text-gray-500">A simple attendance check for Sunday worship and midweek prayer.</p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Mark the Sunday attendance list</li>
                <li>• Confirm special prayer meeting records</li>
                <li>• Share updates with the parish office</li>
              </ul>
              <button onClick={() => router.push("/admin")} className="mt-4 w-full rounded-lg bg-[#024424] px-4 py-2 text-sm font-bold text-white hover:bg-[#01331a]">
                Open Attendance Register
              </button>
            </div>
          )}

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 border-b pb-3 text-base font-bold text-[#024424]">Projects I&apos;ve Supported (Mĩako)</h3>
            {data.projects.length === 0 && (
              <p className="text-xs text-gray-400">You haven&apos;t contributed to a project yet.</p>
            )}
            <div className="space-y-5">
              {data.projects.map((proj) => {
                const progressPercentage = proj.target > 0 ? (proj.raised / proj.target) * 100 : 0;
                return (
                  <div key={proj.id} className="space-y-3">
                    <div>
                      <h4 className="text-sm font-bold leading-snug text-gray-900">{proj.name}</h4>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-[#024424]" style={{ width: `${Math.min(progressPercentage, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      <span>Raised: {progressPercentage.toFixed(0)}%</span>
                      <span>Target: KES {proj.target.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs">
                      <span className="font-medium text-gray-500">My Total Financial Input:</span>
                      <span className="font-black text-gray-900">KES {proj.myTotalInput.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-1 text-base font-bold text-[#024424]">Spiritual Milestones</h3>
            <p className="mb-4 border-b pb-3 text-[11px] italic text-gray-500">
              Every member&apos;s walk has a shape. Here&apos;s a first draft of what that journey might look
              like - help us get it right.
            </p>
            <div className="space-y-5">
              {MILESTONE_TIERS.map((group) => (
                <div key={group.tier}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#8a6d1a]">{group.tier}</p>
                  <div className="ml-2.5 space-y-4 border-l border-gray-200 pl-5">
                    {group.milestones.map((milestone) => (
                      <div key={milestone.title} className="relative text-xs">
                        <span
                          className={`absolute -left-[27px] top-0 flex h-4 w-4 items-center justify-center rounded-full border-2 text-[9px] leading-none ${
                            milestone.highlight ? "border-[#D4AF37] bg-[#D4AF37] text-white" : "border-gray-300 bg-white"
                          }`}
                        >
                          {milestone.highlight ? "★" : ""}
                        </span>
                        <p className={`text-sm font-bold ${milestone.highlight ? "text-[#024424]" : "text-gray-700"}`}>
                          <span className="mr-1">{milestone.icon}</span>
                          {milestone.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-400">{milestone.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {openAccount && (
        <AccountStatementModal
          category={openAccount}
          defaultPhone={data.member.phone}
          defaultIdentifier={data.member.membershipNo}
          onClose={() => setOpenAccount(null)}
        />
      )}
    </div>
  );
}
