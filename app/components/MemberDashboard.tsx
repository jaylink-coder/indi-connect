"use client";

import { useEffect, useState } from "react";
import { INDI_CONNECT_CONFIG } from "../config/indi-config";

type Project = {
  title: string;
  myRole: string;
  myDonation: number;
  projectProgress: {
    target: number;
    raised: number;
  };
};

type Milestone = {
  type: string;
  date: string;
  clergy: string;
};

type MemberSummary = {
  name: string;
  parish: string;
  aggregates: {
    totalContributed: number;
    attendanceRate: string;
  };
  milestones: Milestone[];
  projects: Project[];
};

const trendBars = [
  { month: "Jan", amount: 3200 },
  { month: "Feb", amount: 4600 },
  { month: "Mar", amount: 3900 },
  { month: "Apr", amount: 5800 },
  { month: "May", amount: 6400 },
  { month: "Jun", amount: 7200 },
];

export function MemberDashboard() {
  const [summary, setSummary] = useState<MemberSummary | null>(null);

  useEffect(() => {
    fetch("/api/member/dashboard-summary")
      .then((res) => res.json())
      .then((data) => setSummary(data));
  }, []);

  if (!summary) {
    return <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">Loading member dashboard…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-slate-900">
      <header className="mb-8 flex flex-col gap-4 border-b border-gray-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: INDI_CONNECT_CONFIG.ui.primaryGreen }}>
            {INDI_CONNECT_CONFIG.name}
          </h1>
          <p className="text-sm italic text-gray-600">
            “{INDI_CONNECT_CONFIG.tagline}” — {INDI_CONNECT_CONFIG.verse}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-800">{summary.name}</p>
          <p className="text-xs text-gray-500">{summary.parish}</p>
        </div>
      </header>

      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase text-gray-500">My Year Contributions</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">KES {summary.aggregates.totalContributed.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase text-gray-500">Attendance Consistency</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.aggregates.attendanceRate}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm" style={{ borderTop: `4px solid ${INDI_CONNECT_CONFIG.ui.sacredGold}` }}>
          <p className="text-sm font-medium uppercase text-gray-500">Current Spiritual Rank</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">Guild Member</p>
        </div>
      </div>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">Stewardship report</p>
            <h2 className="text-xl font-bold text-gray-800">Financial Statement Summary</h2>
          </div>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">Monthly overview</div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-700">Total Receipts</p>
            <p className="mt-2 text-2xl font-bold text-emerald-900">KES 84,200</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-700">Operational Expenses</p>
            <p className="mt-2 text-2xl font-bold text-amber-900">KES 31,450</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">Closing Balance</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">KES 52,750</p>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Contribution Trend</h2>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Financial statement</span>
          </div>
          <div className="flex h-48 items-end gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            {trendBars.map((bar) => {
              const height = Math.max((bar.amount / 7600) * 100, 12);
              return (
                <div key={bar.month} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-md"
                      style={{ height: `${height}%`, backgroundColor: INDI_CONNECT_CONFIG.ui.primaryGreen }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-600">{bar.month}</p>
                    <p className="text-[11px] text-gray-400">KES {bar.amount.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-800">My Church Projects</h2>
          {summary.projects.map((project, index) => {
            const percentage = (project.projectProgress.raised / project.projectProgress.target) * 100;
            return (
              <div key={`${project.title}-${index}`} className="rounded-lg border border-gray-100 p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.title}</h3>
                    <p className="text-xs text-gray-500">My Assignment: <span className="font-medium text-gray-700">{project.myRole}</span></p>
                  </div>
                  <span className="rounded bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">Active</span>
                </div>
                <div className="my-3 h-2 w-full rounded-full bg-gray-200">
                  <div className="h-2 rounded-full" style={{ width: `${percentage}%`, backgroundColor: INDI_CONNECT_CONFIG.ui.primaryGreen }} />
                </div>
                <div className="mb-4 flex justify-between text-xs text-gray-500">
                  <span>Raised: KES {project.projectProgress.raised.toLocaleString()}</span>
                  <span>Target: KES {project.projectProgress.target.toLocaleString()} ({percentage.toFixed(0)}%)</span>
                </div>
                <div className="flex justify-between rounded bg-gray-50 p-3 text-sm">
                  <span className="text-gray-600">My Financial Input:</span>
                  <span className="font-bold text-gray-900">KES {project.myDonation.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-800">Spiritual Milestones Timeline</h2>
          <div className="ml-4 space-y-6 border-l-2 border-gray-200">
            {summary.milestones.map((milestone, index) => (
              <div key={`${milestone.type}-${index}`} className="relative mb-4 ml-6">
                <span className="absolute -left-[33px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white" style={{ borderColor: INDI_CONNECT_CONFIG.ui.sacredGold }} />
                <h3 className="text-sm font-semibold tracking-wide text-gray-950">{milestone.type.replace("_", " ")}</h3>
                <p className="text-xs text-gray-400">{milestone.date}</p>
                <p className="mt-1 text-xs text-gray-500">Officiated By: {milestone.clergy}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
