"use client";

import { useEffect, useState } from "react";

interface RosterRow {
  memberId: string;
  name: string;
  membershipNo: string;
  localChurchName: string;
  status: "PRESENT" | "ABSENT" | null;
}

const SERVICE_TYPES = ["Sunday Service", "Midweek Prayer", "Special Service"];

function todayLocalDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function AttendanceTab() {
  const [serviceDate, setServiceDate] = useState(todayLocalDate());
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [pending, setPending] = useState<Record<string, "PRESENT" | "ABSENT">>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadRoster = async () => {
    setLoading(true);
    setMessage(null);
    const response = await fetch(
      `/api/attendance?serviceDate=${encodeURIComponent(serviceDate)}&serviceType=${encodeURIComponent(serviceType)}`
    );
    const body = await response.json().catch(() => null);
    setLoading(false);
    if (response.ok) {
      setRoster(body.roster ?? []);
      setPending({});
    } else {
      setMessage(body?.error || "Couldn't load the roster.");
    }
  };

  useEffect(() => {
    // Deferred a microtask so loadRoster's setState calls happen outside the
    // effect's synchronous execution (avoids a cascading-render lint error).
    Promise.resolve().then(loadRoster);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceDate, serviceType]);

  const setStatus = (memberId: string, status: "PRESENT" | "ABSENT") => {
    setPending((current) => ({ ...current, [memberId]: status }));
  };

  const handleSave = async () => {
    const records = Object.entries(pending).map(([memberId, status]) => ({ memberId, status }));
    if (records.length === 0) {
      setMessage("No changes to save.");
      return;
    }
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceDate, serviceType, records }),
    });
    const body = await response.json().catch(() => null);
    setSaving(false);
    if (response.ok) {
      setMessage(`Saved ${body.updated} record(s).`);
      loadRoster();
    } else {
      setMessage(body?.error || "Couldn't save attendance.");
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-[#024424]">Attendance Register</h3>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Service Date</label>
          <input
            type="date"
            value={serviceDate}
            onChange={(event) => setServiceDate(event.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Service</label>
          <select
            value={serviceType}
            onChange={(event) => setServiceType(event.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
          >
            {SERVICE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || Object.keys(pending).length === 0}
          className="rounded-lg bg-[#024424] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#01331a] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Attendance"}
        </button>
        {message && <span className="text-xs font-semibold text-gray-500">{message}</span>}
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-gray-400">Loading roster...</p>
      ) : roster.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          No members in your scope, or you don&apos;t have attendance rights.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Local Church</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((row) => {
                const effective = pending[row.memberId] ?? row.status;
                return (
                  <tr key={row.memberId} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold">
                      {row.name} <span className="font-mono text-xs text-gray-400">({row.membershipNo})</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{row.localChurchName}</td>
                    <td className="px-4 py-3">
                      <div className="inline-flex overflow-hidden rounded-lg border border-gray-200">
                        <button
                          type="button"
                          onClick={() => setStatus(row.memberId, "PRESENT")}
                          className={`px-3 py-1 text-xs font-bold ${
                            effective === "PRESENT" ? "bg-green-600 text-white" : "bg-white text-gray-500"
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus(row.memberId, "ABSENT")}
                          className={`px-3 py-1 text-xs font-bold ${
                            effective === "ABSENT" ? "bg-red-600 text-white" : "bg-white text-gray-500"
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
