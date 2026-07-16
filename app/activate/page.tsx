"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { ChurchLogo } from "../components/ChurchLogo";
import { INDI_CONNECT_CONFIG } from "../config/indi-config";

type Step = "identifier" | "otp" | "not_found" | "already_activated" | "cooldown" | "failed";

export default function ActivatePage() {
  const router = useRouter();
  const { signIn } = useSignIn();

  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setBusy(true);

    const response = await fetch("/api/activation/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    const body = await response.json();
    setBusy(false);

    if (body.status === "not_found") return setStep("not_found");
    if (body.status === "already_activated") return setStep("already_activated");
    if (body.status === "cooldown") return setStep("cooldown");
    if (body.status !== "ok") return setFormError("Something went wrong. Please try again.");

    setMaskedPhone(body.maskedPhone);
    setStep("otp");
  };

  const handleActivate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords don't match.");
      return;
    }

    setBusy(true);
    const response = await fetch("/api/activation/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, code, password }),
    });
    const body = await response.json();
    setBusy(false);

    if (body.status === "expired") {
      setFormError("That code has expired. Please request a new one.");
      return;
    }
    if (body.status === "too_many_attempts") {
      setFormError("Too many incorrect attempts. Please request a new code.");
      return;
    }
    if (body.status === "weak_password") {
      setFormError("That password isn't strong enough. Try a longer, less common one.");
      return;
    }
    if (body.status !== "ok") {
      setFormError("That code didn't work. Please try again.");
      return;
    }

    if (!signIn) {
      setStep("failed");
      return;
    }

    const { error } = await signIn.ticket({ ticket: body.ticket });
    if (error || signIn.status !== "complete") {
      setStep("failed");
      return;
    }

    await signIn.finalize({
      navigate: async ({ decorateUrl }) => {
        const url = decorateUrl("/dashboard");
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

      <div className="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        {step === "identifier" && (
          <form onSubmit={handleLookup}>
            <h1 className="mb-1 text-lg font-bold text-[#024424]">Activate My Account</h1>
            <p className="mb-4 text-xs text-gray-500">
              Enter your Church Number or National ID to access your existing membership record.
            </p>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              type="text"
              placeholder="e.g. AIPCA-GAT-0422"
              className="mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#024424]"
            />
            {formError && <p className="mb-3 text-xs text-[#B22222]">{formError}</p>}
            <button
              type="submit"
              disabled={busy || !identifier.trim()}
              className="w-full rounded-lg bg-[#024424] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#01331a] disabled:opacity-50"
            >
              Continue
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleActivate}>
            <h1 className="mb-1 text-lg font-bold text-[#024424]">Verify &amp; Set Up Login</h1>
            <p className="mb-4 text-xs text-gray-500">
              We sent a code to <span className="font-mono">{maskedPhone}</span>. Enter it below and choose a
              password you&apos;ll use to sign in from now on.
            </p>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              type="text"
              inputMode="numeric"
              placeholder="123456"
              className="mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#024424]"
            />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Create a password"
              className="mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
            />
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              placeholder="Confirm password"
              className="mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
            />
            {formError && <p className="mb-3 text-xs text-[#B22222]">{formError}</p>}
            <button
              type="submit"
              disabled={busy || !code.trim() || !password || !confirmPassword}
              className="w-full rounded-lg bg-[#024424] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#01331a] disabled:opacity-50"
            >
              Activate My Account
            </button>
            <button
              type="button"
              onClick={() => setStep("identifier")}
              className="mt-3 w-full text-center text-xs font-semibold text-gray-500 hover:underline"
            >
              Start over
            </button>
          </form>
        )}

        {step === "not_found" && (
          <Message
            title="We couldn't find that record"
            body="Please double-check your Church Number or National ID, or contact your parish office for help."
            onRetry={() => setStep("identifier")}
          />
        )}

        {step === "already_activated" && (
          <Message
            title="Already activated"
            body="This membership already has an account. Please sign in instead."
            actionLabel="Go to Home"
            onAction={() => router.push("/")}
          />
        )}

        {step === "cooldown" && (
          <Message
            title="Code already sent"
            body="Please wait a minute before requesting another code."
            onRetry={() => setStep("identifier")}
          />
        )}

        {step === "failed" && (
          <Message
            title="We couldn't finish activation"
            body="Your account was created, but we couldn't sign you in automatically. Please try signing in from the home page."
            actionLabel="Go to Home"
            onAction={() => router.push("/")}
          />
        )}
      </div>
    </div>
  );
}

function Message({
  title,
  body,
  actionLabel,
  onAction,
  onRetry,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  onRetry?: () => void;
}) {
  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-[#024424]">{title}</h1>
      <p className="mb-4 text-xs text-gray-500">{body}</p>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="mb-2 w-full rounded-lg bg-[#024424] py-2.5 text-sm font-bold text-white hover:bg-[#01331a]"
        >
          {actionLabel}
        </button>
      )}
      {onRetry && (
        <button onClick={onRetry} className="w-full text-center text-xs font-semibold text-gray-500 hover:underline">
          Try a different number
        </button>
      )}
    </div>
  );
}
