"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChurchLogo } from "../components/ChurchLogo";
import { AdminPadlock } from "@/components/AdminPadlock";
import { MakePaymentDialog } from "@/components/MakePaymentDialog";
import { INDI_CONNECT_CONFIG } from "../config/indi-config";
import type { AccountSummary } from "@/lib/accounts";

const ACCOUNT_CATEGORIES: { category: "TITHE" | "CESS" | "SADAKA" | "CALL_REGISTRY" | "OPERATIONS"; label: string }[] = [
  { category: "TITHE", label: "Tithe (Zaka)" },
  { category: "CESS", label: "Cess Quota" },
  { category: "SADAKA", label: "Sadaka" },
  { category: "CALL_REGISTRY", label: "Call Registry" },
  { category: "OPERATIONS", label: "Church Operations" },
];

// Attendance and Spiritual Milestones are not yet backed by real data - both
// need the crawler/curation pass (Phase 5) or an attendance model (Phase 3)
// before they can be honestly wired up. Left as illustrative placeholders.
const placeholderData = {
  attendanceConsistency: "Pending attendance tracking",
  attendance: [
    { date: "Sunday, July 12, 2026", type: "Main Sunday Service", status: "Present" },
    { date: "Sunday, July 05, 2026", type: "Main Sunday Service", status: "Present" },
    { date: "Wednesday, July 01, 2026", type: "Midweek Prayer", status: "Present" },
    { date: "Sunday, June 28, 2026", type: "Main Sunday Service", status: "Absent" },
  ],
  milestones: [
    { title: "Holy Baptism (Ũbatĩthio)", date: "May 12, 1994", leader: "Rev. J. Kamau", completed: true },
    { title: "Confirmation (Kũmĩrĩrio)", date: "August 18, 2010", leader: "Bishop Njoroge", completed: true },
    { title: "Guild Induction (Mwanake)", date: "Pending Enrollment", leader: "Parish Council", completed: false },
  ],
};

export default function MemberDashboardPage() {
  const router = useRouter();
  const [isLeader, setIsLeader] = useState(false);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [loadError, setLoadError] = useState(false);

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

  const paybills = [
    { label: "Tithe", number: "700000" },
    { label: "Cess", number: "700001" },
    { label: "Church Projects", number: "700002" },
  ];

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
            <p className="font-mono text-xs text-gray-300">ID: {data.member.membershipNo} • {data.member.parishName}</p>
          </div>
          <AdminPadlock isLeader={isLeader} />
        </div>
      </div>

      <main className="mx-auto mt-8 grid max-w-6xl grid-cols-1 gap-6 px-4 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 border-b pb-3 text-base font-bold text-[#024424]">My Accounts</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {ACCOUNT_CATEGORIES.map((account) => (
                <div key={account.category} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-500">{account.label}</p>
                  <p className="mt-1 font-mono text-lg font-black text-[#024424]">
                    KES {(data.byCategory[account.category] ?? 0).toLocaleString()}
                  </p>
                  <div className="mt-3">
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
            <p className="mb-3 text-[10px] uppercase tracking-wide text-gray-400">Illustrative - attendance tracking is not yet wired up</p>
            <div className="divide-y divide-gray-100">
              {placeholderData.attendance.map((record, idx) => (
                <div key={idx} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{record.date}</p>
                    <p className="text-xs text-gray-400">{record.type}</p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${record.status === "Present" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-base font-bold text-[#024424]">My Profile</h3>
            <div className="rounded-lg border border-gray-100 bg-[#F8FAF8] p-4">
              <p className="text-sm font-semibold text-gray-900">{data.member.name}</p>
              <p className="mt-1 text-xs text-gray-500">Member No: {data.member.membershipNo}</p>
              <p className="mt-1 text-xs text-gray-500">Parish: {data.member.parishName}</p>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                <span className="text-gray-500">Local Church</span>
                <span className="font-bold text-[#024424]">{data.member.localChurchName}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 border-b pb-3 text-base font-bold text-[#024424]">Make a Payment</h3>
            <p className="mb-4 text-xs text-gray-500">
              Pay directly via M-Pesa STK push (incl. Projects and Welfare), or use one of the paybills below with
              your church number as reference.
            </p>
            <MakePaymentDialog
              defaultPhone={data.member.phone}
              defaultIdentifier={data.member.membershipNo}
              onSuccess={loadSummary}
            />
            <div className="mt-4 space-y-2">
              {paybills.map((paybill) => (
                <div key={paybill.label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-sm font-semibold text-gray-900">{paybill.label}</p>
                  <p className="font-mono text-sm font-bold text-[#024424]">{paybill.number}</p>
                </div>
              ))}
            </div>
          </div>

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
            <h3 className="mb-4 border-b pb-3 text-base font-bold text-[#024424]">Spiritual Milestones</h3>
            <p className="mb-3 text-[10px] uppercase tracking-wide text-gray-400">Illustrative - pending AIPCA milestone research</p>
            <div className="ml-2.5 space-y-5 border-l border-gray-200 pl-5">
              {placeholderData.milestones.map((milestone, idx) => (
                <div key={idx} className="relative text-xs">
                  <span className={`absolute -left-[26px] top-0.5 h-3 w-3 rounded-full border-2 ${milestone.completed ? "border-[#D4AF37] bg-[#D4AF37]" : "border-gray-300 bg-white"}`} />
                  <p className={`text-sm font-bold ${milestone.completed ? "text-gray-900" : "text-gray-400"}`}>{milestone.title}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{milestone.date}</p>
                  {milestone.completed ? <p className="text-[10px] italic text-gray-500">By: {milestone.leader}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
