"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { ChurchLogo } from "../../components/ChurchLogo";
import { INDI_CONNECT_CONFIG } from "../../config/indi-config";

type Status = "idle" | "invalid" | "locked" | "error";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useSignIn();

  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("idle");
    setBusy(true);

    const response = await fetch("/api/auth/pin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, pin }),
    });
    const body = await response.json().catch(() => ({}));

    if (body.status === "locked") {
      setStatus("locked");
      setBusy(false);
      return;
    }
    if (body.status !== "ok" || !signIn) {
      setStatus("invalid");
      setBusy(false);
      return;
    }

    const { error } = await signIn.ticket({ ticket: body.ticket });
    if (error || signIn.status !== "complete") {
      setStatus("error");
      setBusy(false);
      return;
    }

    const destination = body.mustChangePin ? "/set-pin" : "/dashboard";
    await signIn.finalize({
      navigate: async ({ decorateUrl }) => {
        const url = decorateUrl(destination);
        if (url.startsWith("http")) {
          window.location.href = url;
        } else {
          router.push(url);
        }
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAF8] px-4 py-12">
      <div className="mb-6 flex flex-col items-center">
        <ChurchLogo />
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-gray-400">
          {INDI_CONNECT_CONFIG.denomination}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-bold text-[#024424]">Sign In</h1>
        <p className="mb-4 text-xs text-gray-500">
          Enter your Church Number, Phone Number, or National ID, and your PIN.
        </p>

        <input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          type="text"
          placeholder="e.g. AIPCA-GAT-0422"
          className="mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#024424]"
        />
        <input
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="4-digit PIN"
          className="mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#024424]"
        />

        {status === "invalid" && (
          <p className="mb-3 text-xs text-[#B22222]">
            That identifier and PIN don&apos;t match. Please try again, or ask your church leader for help.
          </p>
        )}
        {status === "locked" && (
          <p className="mb-3 text-xs text-[#B22222]">
            Too many wrong attempts. Please wait 15 minutes, or ask your leader to reset your PIN.
          </p>
        )}
        {status === "error" && (
          <p className="mb-3 text-xs text-[#B22222]">Something went wrong. Please try again.</p>
        )}

        <button
          type="submit"
          disabled={busy || !identifier.trim() || pin.length !== 4}
          className="w-full rounded-lg bg-[#024424] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#01331a] disabled:opacity-50"
        >
          Sign In
        </button>

        <p className="mt-4 text-center text-xs text-gray-400">
          Don&apos;t have a login yet? Ask your church leader or treasurer to set one up for you.
        </p>
      </form>
    </div>
  );
}
