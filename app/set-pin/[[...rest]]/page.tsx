"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChurchLogo } from "../../components/ChurchLogo";

function PinInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-semibold text-gray-500">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="0000"
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#024424]"
      />
    </div>
  );
}

export default function SetPinPage() {
  return (
    <Suspense fallback={null}>
      <SetPinForm />
    </Suspense>
  );
}

function SetPinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isVoluntary = searchParams.get("from") === "dashboard";

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (newPin.length !== 4) {
      setError("Your new PIN must be 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("Those two PINs don't match.");
      return;
    }

    setBusy(true);
    const response = await fetch("/api/auth/change-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPin, newPin }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);

    if (body.status === "wrong_current_pin") {
      setError(isVoluntary ? "Your current PIN is wrong." : "That's not the PIN your leader gave you.");
      return;
    }
    if (body.status === "same_as_current") {
      setError("Please choose a different PIN from your current one.");
      return;
    }
    if (body.status !== "ok") {
      setError("Something went wrong. Please try again.");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAF8] px-4 py-12">
      <div className="mb-6 flex flex-col items-center">
        <ChurchLogo />
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-bold text-[#024424]">
          {isVoluntary ? "Change My PIN" : "Set Your Own PIN"}
        </h1>
        <p className="mb-4 text-xs text-gray-500">
          {isVoluntary
            ? "Enter your current PIN and the new one you'd like to use."
            : "Your church leader gave you a starting PIN. For your security, please set one only you know before continuing."}
        </p>

        <PinInput label={isVoluntary ? "Current PIN" : "Starting PIN (from your leader)"} value={currentPin} onChange={setCurrentPin} />
        <PinInput label="New PIN" value={newPin} onChange={setNewPin} />
        <PinInput label="Confirm New PIN" value={confirmPin} onChange={setConfirmPin} />

        {error && <p className="mb-3 text-xs text-[#B22222]">{error}</p>}

        <button
          type="submit"
          disabled={busy || currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
          className="w-full rounded-lg bg-[#024424] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#01331a] disabled:opacity-50"
        >
          Save My PIN
        </button>
      </form>
    </div>
  );
}
