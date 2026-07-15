"use client";

import { useRouter } from "next/navigation";
import { ChurchLogo } from "../components/ChurchLogo";
import { INDI_CONNECT_CONFIG } from "../config/indi-config";

const memberAccountData = {
  membershipNo: "AIPCA-GAT-0422",
  name: "Samuel Mwangi",
  parish: "Gatundu Parish",
  attendanceConsistency: "92%",
  recentOfferings: [
    { type: "Tithe (Zaka)", amount: 3500, date: "05/07/2026", code: "SGE48FJD92" },
    { type: "Church Projects (Mĩako)", amount: 5000, date: "28/06/2026", code: "SFI92KDH11" },
    { type: "Cess Quota", amount: 1200, date: "28/06/2026", code: "SDB11JHD77" },
  ],
  attendance: [
    { date: "Sunday, July 12, 2026", type: "Main Sunday Service", status: "Present" },
    { date: "Sunday, July 05, 2026", type: "Main Sunday Service", status: "Present" },
    { date: "Wednesday, July 01, 2026", type: "Midweek Prayer", status: "Present" },
    { date: "Sunday, June 28, 2026", type: "Main Sunday Service", status: "Absent" },
  ],
  myProjects: [
    {
      name: "Cathedral Perimeter Wall Construction",
      myRole: "Financial Supporter",
      myTotalInput: 15000,
      projectTarget: 600000,
      projectRaised: 420000,
      status: "Active",
    },
  ],
  milestones: [
    { title: "Holy Baptism (Ũbatĩthio)", date: "May 12, 1994", leader: "Rev. J. Kamau", completed: true },
    { title: "Confirmation (Kũmĩrĩrio)", date: "August 18, 2010", leader: "Bishop Njoroge", completed: true },
    { title: "Guild Induction (Mwanake)", date: "Pending Enrollment", leader: "Parish Council", completed: false },
  ],
};

export default function MemberDashboardPage() {
  const data = memberAccountData;
  const router = useRouter();
  const paybills = [
    { label: "Tithe", number: "700000" },
    { label: "Cess", number: "700001" },
    { label: "Church Projects", number: "700002" },
  ];

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
        <div className="mt-2 text-left sm:mt-0 sm:text-right">
          <p className="text-sm font-bold">{data.name}</p>
          <p className="font-mono text-xs text-gray-300">ID: {data.membershipNo} • {data.parish}</p>
        </div>
      </div>

      <main className="mx-auto mt-8 grid max-w-6xl grid-cols-1 gap-6 px-4 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-[#024424]">My Recent Giving (Mĩhothi)</h3>
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
                Attendance: {data.attendanceConsistency}
              </span>
            </div>
            <div className="space-y-3">
              {data.recentOfferings.map((offering, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{offering.type}</p>
                    <p className="font-mono text-[10px] text-gray-400">M-Pesa: {offering.code} • {offering.date}</p>
                  </div>
                  <span className="font-mono text-sm font-black text-gray-900">KES {offering.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 border-b pb-3 text-base font-bold text-[#024424]">My Attendance History (Mahudhurio)</h3>
            <div className="divide-y divide-gray-100">
              {data.attendance.map((record, idx) => (
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
              <p className="text-sm font-semibold text-gray-900">{data.name}</p>
              <p className="mt-1 text-xs text-gray-500">Member No: {data.membershipNo}</p>
              <p className="mt-1 text-xs text-gray-500">Parish: {data.parish}</p>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                <span className="text-gray-500">Attendance</span>
                <span className="font-bold text-[#024424]">{data.attendanceConsistency}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 border-b pb-3 text-base font-bold text-[#024424]">M-Pesa Payment Guide</h3>
            <p className="mb-4 text-xs text-gray-500">Use the paybill below for your giving or project support. Please use your church number as the reference.</p>
            <div className="space-y-2">
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
            <h3 className="mb-4 border-b pb-3 text-base font-bold text-[#024424]">Parish Projects (Mĩako)</h3>
            {data.myProjects.map((proj, idx) => {
              const progressPercentage = (proj.projectRaised / proj.projectTarget) * 100;
              return (
                <div key={idx} className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold leading-snug text-gray-900">{proj.name}</h4>
                    <p className="mt-0.5 text-xs text-gray-500">
                      My Role: <span className="font-semibold text-gray-700">{proj.myRole}</span>
                    </p>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-[#024424]" style={{ width: `${progressPercentage}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <span>Raised: {progressPercentage.toFixed(0)}%</span>
                    <span>Target: KES {proj.projectTarget.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs">
                    <span className="font-medium text-gray-500">My Total Financial Input:</span>
                    <span className="font-black text-gray-900">KES {proj.myTotalInput.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 border-b pb-3 text-base font-bold text-[#024424]">Spiritual Milestones</h3>
            <div className="ml-2.5 space-y-5 border-l border-gray-200 pl-5">
              {data.milestones.map((milestone, idx) => (
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
