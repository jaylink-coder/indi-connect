"use client";

import { useEffect, useMemo, useState } from "react";

interface MemberRow {
  id: string;
  membershipNo: string;
  name: string;
  clerkUserId: string | null;
  localChurch: { name: string; parish: { id: string; name: string } };
}

export function MembersTab() {
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/members")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || "Failed to load members");
        setMembers(body);
      })
      .catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    if (!members) return [];
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.membershipNo.toLowerCase().includes(q)
    );
  }, [members, search]);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-[#024424]">Member Management</h3>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or Church No..."
          className="w-64 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
        />
      </div>

      {error && <p className="text-sm text-[#B22222]">{error}</p>}
      {!error && !members && <p className="py-6 text-center text-sm text-gray-400">Loading...</p>}
      {members && filtered.length === 0 && <p className="py-6 text-center text-sm text-gray-400">No members found.</p>}

      {members && filtered.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Church No.</th>
                <th className="px-4 py-3">Local Church</th>
                <th className="px-4 py-3">Parish</th>
                <th className="px-4 py-3">Account</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold">{m.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{m.membershipNo}</td>
                  <td className="px-4 py-3">{m.localChurch.name}</td>
                  <td className="px-4 py-3">{m.localChurch.parish.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        m.clerkUserId ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {m.clerkUserId ? "Activated" : "Not activated"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
