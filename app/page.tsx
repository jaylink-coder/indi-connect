"use client";

import { useRouter } from "next/navigation";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { HandCoins, CalendarCheck2, TrendingUp, Phone, Mail, MapPin, Globe, ArrowRight } from "lucide-react";
import { ChurchLogo } from "./components/ChurchLogo";
import { AIPCASeal } from "./components/AIPCASeal";
import { CrossGlyph } from "./components/CrossGlyph";
import { INDI_CONNECT_CONFIG } from "./config/indi-config";

function CrossBand({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const bg = tone === "dark" ? "bg-[#02331B]" : "bg-[#F4EFDE]";
  const mark = tone === "dark" ? "text-[#D4AF37]/70" : "text-[#024424]/40";
  return (
    <div className={`${bg} py-2.5`}>
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-8 px-4 sm:gap-14">
        {Array.from({ length: 9 }).map((_, i) => (
          <svg key={i} viewBox="0 0 24 24" className={`h-3 w-3 shrink-0 ${mark}`} fill="none" aria-hidden="true">
            <path d="M12 2V22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M6 8H18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ))}
      </div>
    </div>
  );
}

const features = [
  {
    icon: HandCoins,
    title: "Give from anywhere",
    desc: "Pay Tithe, Cess, Sadaka, and Call Registry straight from your phone via M-Pesa, and get an instant receipt by SMS.",
  },
  {
    icon: CalendarCheck2,
    title: "Your attendance, tracked",
    desc: "Your weekly Call Registry payment doubles as attendance proof, so your record stays accurate without extra paperwork.",
  },
  {
    icon: TrendingUp,
    title: "See where funds go",
    desc: "Follow church projects and welfare cases from your dashboard, and see exactly what you've contributed to each one.",
  },
];

export default function Home() {
  const m = INDI_CONNECT_CONFIG.modules;
  const router = useRouter();

  const handleLeaderLogin = () => {
    router.push("/admin");
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-gray-900 font-sans antialiased">
      <div className="flex items-center bg-[#02331B] px-4 py-2.5 text-xs font-bold tracking-wider text-[#D4AF37] border-b border-[#D4AF37]/20">
        <div className="flex-1" />
        <span className="flex-1 text-center">{INDI_CONNECT_CONFIG.denomination}</span>
        <div className="flex flex-1 items-center justify-end gap-2">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-full border border-[#D4AF37]/50 px-3 py-1 text-[10px] font-bold text-[#D4AF37] hover:bg-[#D4AF37]/10">
                Sign In
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>

      <header className="relative overflow-hidden bg-gradient-to-b from-[#02331B] via-[#024424] to-[#024424] px-6 py-20 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #D4AF37 0, transparent 45%), radial-gradient(circle at 80% 60%, #D4AF37 0, transparent 45%)",
          }}
        />
        <svg
          viewBox="0 0 100 150"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[22.7rem] -translate-x-1/2 -translate-y-1/2 opacity-[0.06]"
          aria-hidden="true"
        >
          <CrossGlyph fill="#D4AF37" />
        </svg>
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-6 flex justify-center">
            <div className="rounded-2xl bg-white/95 px-4 py-3 shadow-lg">
              <ChurchLogo />
            </div>
          </div>
          <h1 className="font-heading text-4xl font-black tracking-tight text-white sm:text-5xl">
            {INDI_CONNECT_CONFIG.name}
          </h1>

          <div className="mt-4 space-y-1.5">
            <p className="text-lg font-bold italic text-[#D4AF37]">
              &ldquo;{INDI_CONNECT_CONFIG.tagline}&rdquo;
            </p>
            <p className="text-sm font-semibold italic text-white/60">
              &ldquo;{INDI_CONNECT_CONFIG.vernacularTagline}&rdquo;
            </p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">
              {INDI_CONNECT_CONFIG.verse}
            </p>
          </div>

          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-white/80">
            {m.heroDesc}
          </p>

          <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:flex-row">
            <button
              onClick={() => router.push("/activate")}
              className="flex-1 rounded-lg bg-[#D4AF37] py-3 text-sm font-bold text-[#02331B] shadow-md transition-colors hover:bg-[#c4a02f]"
            >
              First Time? Activate My Account
            </button>
            <SignInButton mode="modal">
              <button className="flex-1 rounded-lg border-2 border-white/40 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10">
                Already Activated? Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </header>

      <CrossBand tone="dark" />

      <main>
        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
            What Indi Connect gives you
          </h2>
          <p className="font-heading mb-10 text-center text-2xl font-bold text-[#024424]">
            One place for your giving, attendance, and church life
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#024424]/10">
                  <f.icon className="h-5 w-5 text-[#024424]" />
                </div>
                <h3 className="mb-1.5 text-base font-bold text-[#024424]">{f.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white px-4 py-16">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#D4AF37]">A Liturgical Faith</h2>
              <p className="font-heading mb-4 text-2xl font-bold text-[#024424]">
                Rooted in 1925, still standing today
              </p>
              <p className="text-sm leading-relaxed text-gray-600">
                The African Independent Pentecostal Church of Africa (A.I.P.C.A.) traces its origins to the
                nationalist movements that flourished among the Gikuyu from 1921, as Kenyans sought to run their
                own schools and churches free of colonial control. What began as an independent church tied to the
                Kikuyu Independent Schools Association grew, from 1925, into the denomination that continues to
                serve congregations across Kenya today &mdash; a faith held together, first and foremost, by its
                liturgy: a settled, ordered form of worship handed down and kept alive in every parish.
              </p>
              <a
                href="https://aipca-church.or.ke/about/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#024424] hover:underline"
              >
                Read more at aipca-church.or.ke
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="flex justify-center">
              <AIPCASeal size={240} className="drop-shadow-md" />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
              <div>
                <h3 className="mb-1 text-lg font-bold text-[#024424]">{m.memberLogin}</h3>
                <p className="mb-5 text-xs text-gray-400">
                  See your giving, attendance history, and certificates.
                </p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => router.push("/activate")}
                  className="w-full rounded-lg bg-[#024424] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#01331a]"
                >
                  First Time? Activate My Account
                </button>
                <SignInButton mode="modal">
                  <button className="w-full rounded-lg border border-gray-200 py-2.5 text-sm font-bold text-[#024424] transition-colors hover:bg-gray-50">
                    Already Activated? Sign In
                  </button>
                </SignInButton>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
              <div>
                <h3 className="mb-1 text-lg font-bold text-gray-900">{m.adminLogin}</h3>
                <p className="mb-5 text-xs text-gray-400">
                  For pastors, secretaries, and treasurers to check church records and update member information.
                </p>
              </div>
              <button
                onClick={handleLeaderLogin}
                className="mt-4 w-full rounded-lg border-2 border-[#024424] py-2.5 text-sm font-bold text-[#024424] transition-colors hover:bg-[#024424]/5"
              >
                Leader Login
              </button>
            </div>
          </div>
        </section>
      </main>

      <CrossBand tone="dark" />

      <footer className="bg-[#02331B] px-4 py-12 text-white/80">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <ChurchLogo tone="dark" />
            <p className="mt-3 text-xs leading-relaxed text-white/50">
              {INDI_CONNECT_CONFIG.denomination}
            </p>
          </div>
          <div className="space-y-2 text-xs">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">National Office</p>
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
              <span>+254 (20) 530 376</span>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
              <span>info@aipca-church.or.ke</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
              <span>P.O. Box 12345-00200, Bahati Road, Bahati, Nairobi</span>
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Follow</p>
            <div className="flex gap-3">
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-[10px] font-bold hover:bg-white/10"
                aria-label="Facebook"
              >
                FB
              </a>
              <a
                href="https://aipca-church.or.ke/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 hover:bg-white/10"
                aria-label="Official website"
              >
                <Globe className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-5xl border-t border-white/10 pt-6 text-center text-[11px] text-white/40">
          Indi Connect &middot; A church stewardship and giving platform for AIPCA congregations
        </div>
      </footer>
    </div>
  );
}
