import Link from "next/link";
import { INDI_CONNECT_CONFIG } from "./config/indi-config";
import { MemberDashboard } from "./components/MemberDashboard";
import { MpesaGuideCard } from "./components/MpesaGuideCard";

const impactStats = [
  { label: "Discipleship growth", value: "1,200+" },
  { label: "Community care reach", value: "KES 4.2M" },
  { label: "Active home cells", value: "15" },
  { label: "Prayer care follow-up", value: "0 unanswered" },
];

const pillars = [
  { title: "Discipleship", description: "Bible teaching, pastoral follow-up and spiritual growth" },
  { title: "Global Missions", description: "Mission support and kingdom outreach" },
  { title: "NextGen Youth", description: "Youth mentorship, choir and family ministry" },
  { title: "Community Outreach", description: "Welfare, food support and local service projects" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f7f8f2_0%,#ffffff_100%)] text-slate-900">
      <section className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-16 lg:px-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-emerald-100 bg-white/80 p-8 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: INDI_CONNECT_CONFIG.ui.primaryGreen }}>
                Church stewardship and ministry dashboard
              </p>
              <h1 className="mt-2 text-4xl font-black sm:text-5xl" style={{ color: INDI_CONNECT_CONFIG.ui.primaryGreen }}>
                {INDI_CONNECT_CONFIG.name}
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-slate-600">
                A faith-centered operating system for parishes and dioceses to monitor discipleship, service, giving, pastoral care and project progress with clarity.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">{INDI_CONNECT_CONFIG.tagline}</p>
              <p className="mt-1">{INDI_CONNECT_CONFIG.verse}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">Ministry snapshot</p>
                <h2 className="text-2xl font-semibold text-slate-900">Impact portal</h2>
              </div>
              <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">Serving with transparency</div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {impactStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {pillars.map((pillar) => (
                <div key={pillar.title} className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <p className="font-semibold text-emerald-900">{pillar.title}</p>
                  <p className="text-sm text-emerald-700">{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-slate-900 p-8 text-white shadow-sm">
            <h2 className="text-2xl font-semibold">Pastoral care gateway</h2>
            <p className="mt-3 text-sm text-slate-300">
              Prayer requests, counseling support, and stewardship updates flow through one trusted pastoral channel.
            </p>
            <div className="mt-8 space-y-3 text-sm">
              <div className="rounded-2xl bg-white/10 p-4">Anonymous help desk for grief, finances and marital guidance</div>
              <div className="rounded-2xl bg-white/10 p-4">Volunteer service ticketing for ushers, media and outreach teams</div>
              <div className="rounded-2xl bg-white/10 p-4">Automated Cess and project tracking for parish leadership</div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <MemberDashboard />
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">M-Pesa payment routing</h3>
              <p className="mt-2 text-sm text-slate-600">Members can pay into dedicated paybills for tithe, cess, operations and project funds.</p>
              <div className="mt-6">
                <MpesaGuideCard memberNo="AIPCA-GAT-0422" parishPaybills={{ tithe: "700000", cess: "700001", operations: "700002", projects: "700003" }} />
              </div>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">Leadership access</h3>
              <p className="mt-2 text-sm text-slate-600">The administration panel is designed for parish clerks, bishops and headquarters oversight.</p>
              <Link href="/api/member/dashboard-summary" className="mt-5 inline-flex rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
                View member summary API
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
