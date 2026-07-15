"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChurchLogo } from "./components/ChurchLogo";
import { INDI_CONNECT_CONFIG } from "./config/indi-config";

const impactStats = [
  { label: "Total Members", value: "1,200+", note: "(Washirika)" },
  { label: "Building Funds", value: "KES 4.2M", note: "(Mĩako)" },
  { label: "Prayer Groups", value: "15", note: "(Mahoya)" },
  { label: "New Prayer Needs", value: "0" },
];

export default function Home() {
  const m = INDI_CONNECT_CONFIG.modules;
  const router = useRouter();
  const [memberNumber, setMemberNumber] = useState("");

  const handleMemberLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (memberNumber.trim()) {
      router.push("/dashboard");
    }
  };

  const handleLeaderLogin = () => {
    router.push("/admin");
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-gray-900 font-sans antialiased">
      <div className="bg-[#02331B] px-4 py-2.5 text-center text-xs font-bold tracking-wider text-[#D4AF37] border-b border-[#D4AF37]/20">
        {INDI_CONNECT_CONFIG.denomination}
      </div>

      <header className="border-b border-gray-200/60 bg-white px-6 py-14 text-center shadow-sm">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex justify-center">
            <ChurchLogo />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#024424] sm:text-4xl">
            {INDI_CONNECT_CONFIG.name}
          </h1>

          <div className="mt-3 space-y-1">
            <p className="text-base font-bold italic text-[#D4AF37]">
              “{INDI_CONNECT_CONFIG.tagline}”
            </p>
            <p className="text-xs font-semibold italic text-gray-400">
              “{INDI_CONNECT_CONFIG.vernacularTagline}”
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {INDI_CONNECT_CONFIG.verse}
            </p>
          </div>

          <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-gray-600">
            {m.heroDesc}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-6 text-center text-xs font-bold uppercase tracking-widest text-[#024424]">
          {m.metricsTitle}
        </h2>

        <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {impactStats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-gray-100 bg-white p-5 text-center shadow-sm">
              <span className="text-2xl font-black text-[#024424]">{stat.value}</span>
              <span className="mt-1 block text-xs font-bold text-gray-500">{stat.label}</span>
              {stat.note ? <span className="mt-1 block text-[10px] italic text-gray-400">{stat.note}</span> : null}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <form onSubmit={handleMemberLogin} className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div>
              <h3 className="mb-1 text-lg font-bold text-[#024424]">{m.memberLogin}</h3>
              <p className="mb-4 text-xs text-gray-400">
                See your giving, attendance history, and certificates.
              </p>
              <input
                value={memberNumber}
                onChange={(event) => setMemberNumber(event.target.value)}
                type="text"
                placeholder={m.inputPlaceholder}
                className="mb-4 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#024424]"
              />
            </div>
            <button type="submit" className="w-full rounded-lg bg-[#024424] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#01331a]">
              Open My Account
            </button>
          </form>

          <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div>
              <h3 className="mb-1 text-lg font-bold text-gray-900">{m.adminLogin}</h3>
              <p className="mb-6 text-xs text-gray-400">
                For pastors, secretaries, and treasurers to check church records and update member information.
              </p>
            </div>
            <button onClick={handleLeaderLogin} className="mt-4 w-full rounded-lg border-2 border-[#024424] py-2.5 text-sm font-bold text-[#024424] transition-colors hover:bg-[#024424]/5">
              Leader Login
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
