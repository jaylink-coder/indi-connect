"use client";

import { useState } from "react";
import { ChurchLogo } from "../components/ChurchLogo";
import { INDI_CONNECT_CONFIG } from "../config/indi-config";

const initialAttendance = [
  { name: "Samuel Mwangi", service: "Sunday Service", status: "Present" },
  { name: "Jane Wanjiru", service: "Sunday Service", status: "Present" },
  { name: "Peter Maina", service: "Midweek Prayer", status: "Absent" },
];

const recentContributions = [
  { member: "Samuel Mwangi", type: "Tithe", amount: 3500, date: "2026-07-05", receipt: "SGE48FJD92" },
  { member: "Jane Wanjiru", type: "Projects", amount: 5000, date: "2026-07-04", receipt: "SFI92KDH11" },
  { member: "Peter Maina", type: "Cess", amount: 1200, date: "2026-07-03", receipt: "SDB11JHD77" },
];

const parishStats = {
  totalMembers: 1247,
  activeMembers: 1089,
  monthlyTithe: 245000,
  buildingFund: 4200000,
  attendanceRate: 87,
};

export default function AdminPage() {
  const [records, setRecords] = useState(initialAttendance);
  const [activeTab, setActiveTab] = useState<"attendance" | "contributions" | "members" | "projects">("attendance");

  const updateStatus = (index: number) => {
    setRecords((current) =>
      current.map((record, recordIndex) =>
        recordIndex === index
          ? { ...record, status: record.status === "Present" ? "Absent" : "Present" }
          : record
      )
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-gray-900">
      {/* Header */}
      <div className="flex flex-col bg-[#024424] px-6 py-4 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ChurchLogo className="" showText={false} />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">{INDI_CONNECT_CONFIG.denomination}</span>
            <h2 className="text-xl font-black">Inner Circle - Admin Dashboard</h2>
          </div>
        </div>
        <div className="mt-2 text-left sm:mt-0 sm:text-right">
          <p className="text-sm font-bold">Gatundu Parish</p>
          <p className="text-xs text-gray-300">Diocese of Central Western</p>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Total Members</p>
            <p className="mt-2 text-2xl font-black text-[#024424]">{parishStats.totalMembers.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Active Members</p>
            <p className="mt-2 text-2xl font-black text-[#024424]">{parishStats.activeMembers.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Monthly Tithe</p>
            <p className="mt-2 text-2xl font-black text-[#024424]">KES {parishStats.monthlyTithe.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Building Fund</p>
            <p className="mt-2 text-2xl font-black text-[#D4AF37]">KES {parishStats.buildingFund.toLocaleString()}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          {[
            { id: "attendance", label: "Attendance Register" },
            { id: "contributions", label: "Contributions" },
            { id: "members", label: "Member Management" },
            { id: "projects", label: "Projects" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-[#024424] text-[#024424]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "attendance" && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-[#024424]">Attendance Register</h3>
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr key={record.name} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-semibold">{record.name}</td>
                      <td className="px-4 py-3">{record.service}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${record.status === "Present" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => updateStatus(index)} className="rounded-lg border border-[#024424] px-3 py-1 text-xs font-semibold text-[#024424] hover:bg-[#024424]/5">
                          Toggle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "contributions" && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-[#024424]">Recent Contributions</h3>
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {recentContributions.map((contribution, index) => (
                    <tr key={index} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-semibold">{contribution.member}</td>
                      <td className="px-4 py-3">{contribution.type}</td>
                      <td className="px-4 py-3 font-mono font-bold">KES {contribution.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">{contribution.date}</td>
                      <td className="px-4 py-3 font-mono text-xs">{contribution.receipt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-[#024424]">Member Management</h3>
            <p className="mb-4 text-sm text-gray-500">Manage member roles, contact information, and parish assignments.</p>
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm text-gray-500">Member management features coming soon</p>
              <p className="mt-2 text-xs text-gray-400">Add/edit members, manage roles, view member profiles</p>
            </div>
          </div>
        )}

        {activeTab === "projects" && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-[#024424]">Parish Projects</h3>
            <p className="mb-4 text-sm text-gray-500">Track building projects, fundraising progress, and volunteer assignments.</p>
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm text-gray-500">Project management features coming soon</p>
              <p className="mt-2 text-xs text-gray-400">Create projects, track progress, manage volunteers</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
