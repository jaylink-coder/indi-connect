"use client";

import { useEffect, useMemo, useState } from "react";
import { MemberDossierModal } from "./MemberDossierModal";

interface MemberRow {
  id: string;
  membershipNo: string;
  name: string;
  hasLogin: boolean;
  localChurch: { name: string; parish: { id: string; name: string } };
}

interface LocalChurchOption {
  id: string;
  name: string;
}

export function MembersTab() {
  const [view, setView] = useState<"members" | "children">("members");
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revealedPin, setRevealedPin] = useState<{ memberId: string; pin: string } | null>(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);

  const loadMembers = () => {
    fetch("/api/members")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || "Failed to load members");
        setMembers(body);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const filtered = useMemo(() => {
    if (!members) return [];
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.membershipNo.toLowerCase().includes(q)
    );
  }, [members, search]);

  const handleSetPin = async (member: MemberRow) => {
    const confirmMsg = member.hasLogin
      ? `Reset ${member.name}'s PIN? Their old PIN will stop working.`
      : `Set up a login for ${member.name}?`;
    if (!window.confirm(confirmMsg)) return;

    setBusyId(member.id);
    setRevealedPin(null);
    const response = await fetch(`/api/admin/members/${member.id}/set-pin`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    setBusyId(null);

    if (body.status !== "ok") {
      setError(body.error || "Couldn't set up this member's login.");
      return;
    }

    setRevealedPin({ memberId: member.id, pin: body.pin });
    setMembers((prev) => prev?.map((m) => (m.id === member.id ? { ...m, hasLogin: true } : m)) ?? prev);
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setView("members")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold ${view === "members" ? "bg-white text-[#024424] shadow-sm" : "text-gray-500"}`}
          >
            Members
          </button>
          <button
            type="button"
            onClick={() => setView("children")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold ${view === "children" ? "bg-white text-[#024424] shadow-sm" : "text-gray-500"}`}
          >
            Children
          </button>
        </div>
        {view === "members" && (
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or Church No..."
              className="w-64 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
            />
            <button
              type="button"
              onClick={() => setShowRegisterForm((v) => !v)}
              className="rounded-lg bg-[#024424] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#01331a]"
            >
              + Register New Member
            </button>
          </div>
        )}
      </div>

      {view === "children" && <ChildrenPanel />}

      {view === "members" && showRegisterForm && (
        <RegisterMemberForm
          onRegistered={() => {
            setShowRegisterForm(false);
            loadMembers();
          }}
          onCancel={() => setShowRegisterForm(false)}
        />
      )}

      {view === "members" && error && <p className="mb-3 text-sm text-[#B22222]">{error}</p>}
      {view === "members" && !error && !members && <p className="py-6 text-center text-sm text-gray-400">Loading...</p>}
      {view === "members" && members && filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">No members found.</p>
      )}

      {view === "members" && members && filtered.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Church No.</th>
                <th className="px-4 py-3">Local Church</th>
                <th className="px-4 py-3">Parish</th>
                <th className="px-4 py-3">Login</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold">
                    <button
                      type="button"
                      onClick={() => setViewingMemberId(m.id)}
                      className="text-left text-[#024424] underline decoration-dotted hover:text-[#01331a]"
                    >
                      {m.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{m.membershipNo}</td>
                  <td className="px-4 py-3">{m.localChurch.name}</td>
                  <td className="px-4 py-3">{m.localChurch.parish.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        m.hasLogin ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {m.hasLogin ? "Set up" : "No login yet"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {revealedPin?.memberId === m.id ? (
                      <span className="font-mono text-xs font-bold text-[#024424]">
                        Starting PIN: {revealedPin.pin}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetPin(m)}
                        disabled={busyId === m.id}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-[#024424] transition-colors hover:bg-gray-50 disabled:opacity-50"
                      >
                        {busyId === m.id ? "Working..." : m.hasLogin ? "Reset PIN" : "Set Up Login"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewingMemberId && <MemberDossierModal memberId={viewingMemberId} onClose={() => setViewingMemberId(null)} />}
    </div>
  );
}

/**
 * Captures the static facts about a new member (name, IDs, contact,
 * residence, home church). Roles, group/fellowship affiliation, and
 * welfare involvement are all separate relations added later - not part
 * of registration - see MemberPosition / Leadership & Structure tab.
 */
function RegisterMemberForm({ onRegistered, onCancel }: { onRegistered: () => void; onCancel: () => void }) {
  const [churches, setChurches] = useState<LocalChurchOption[] | null>(null);
  const [membershipNo, setMembershipNo] = useState("");
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [placeOfResidence, setPlaceOfResidence] = useState("");
  const [localChurchId, setLocalChurchId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toLocaleDateString("en-GB");

  useEffect(() => {
    fetch("/api/admin/local-churches")
      .then((res) => (res.ok ? res.json() : []))
      .then((body: LocalChurchOption[]) => {
        setChurches(body);
        if (body.length === 1) setLocalChurchId(body[0].id);
      })
      .catch(() => setChurches([]));
  }, []);

  const submit = async () => {
    if (!membershipNo.trim() || !name.trim() || !phone.trim() || !localChurchId) {
      setError("Member No., Full Name, Phone No., and Local Church are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        membershipNo: membershipNo.trim(),
        name: name.trim(),
        idNumber: idNumber.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth || null,
        placeOfResidence: placeOfResidence.trim(),
        localChurchId,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body?.error || "Failed to register member");
      return;
    }
    onRegistered();
  };

  return (
    <div className="mb-5 rounded-lg border border-gray-100 bg-gray-50 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Member Registration Details</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Member No. <span className="text-[#B22222]">*</span>
          </label>
          <input
            value={membershipNo}
            onChange={(e) => setMembershipNo(e.target.value)}
            placeholder="e.g. AIPCA-GAT-0052"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Member Full Name <span className="text-[#B22222]">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jane Wanjiru"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Id No.</label>
          <input
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="National ID (optional)"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Phone No. <span className="text-[#B22222]">*</span>
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712345678"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Date of Birth</label>
          <input
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            type="date"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Place of Residence</label>
          <input
            value={placeOfResidence}
            onChange={(e) => setPlaceOfResidence(e.target.value)}
            placeholder="e.g. Kenyatta Road"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Local Church <span className="text-[#B22222]">*</span>
          </label>
          {churches === null ? (
            <p className="text-xs text-gray-400">Loading churches...</p>
          ) : churches.length === 0 ? (
            <p className="text-xs text-[#B22222]">You don&apos;t manage any local church to register members into.</p>
          ) : (
            <select
              value={localChurchId}
              onChange={(e) => setLocalChurchId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
            >
              <option value="">Select a local church...</option>
              {churches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Date</label>
          <input
            value={today}
            readOnly
            className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-[#B22222]">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-[#024424] px-4 py-2 text-xs font-bold text-white hover:bg-[#01331a] disabled:opacity-50"
        >
          {busy ? "Registering..." : "Register Member"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs font-bold text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
    </div>
  );
}

interface DependentRow {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | null;
  guardian: { id: string; name: string; membershipNo: string } | null;
}

function ageFromDob(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** Children/minors - tracked separately from the membership roll since they have no Member No., phone, or login of their own. */
function ChildrenPanel() {
  const [churches, setChurches] = useState<LocalChurchOption[] | null>(null);
  const [churchId, setChurchId] = useState("");
  const [dependents, setDependents] = useState<DependentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch("/api/admin/local-churches")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body: LocalChurchOption[]) => {
        setChurches(body);
        if (body.length > 0) setChurchId(body[0].id);
      })
      .catch(() => setError("Couldn't load your local churches."));
  }, []);

  const loadDependents = (id: string) => {
    setDependents(null);
    fetch(`/api/admin/dependents?localChurchId=${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(setDependents)
      .catch(() => setError("Couldn't load children."));
  };

  useEffect(() => {
    if (churchId) loadDependents(churchId);
  }, [churchId]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {churches && churches.length > 1 ? (
          <select
            value={churchId}
            onChange={(e) => setChurchId(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
          >
            {churches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <span />
        )}
        {churchId && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-[#024424] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#01331a]"
          >
            + Register Child
          </button>
        )}
      </div>

      {showForm && churchId && (
        <RegisterDependentForm
          localChurchId={churchId}
          onRegistered={() => {
            setShowForm(false);
            loadDependents(churchId);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {error && <p className="text-sm text-[#B22222]">{error}</p>}
      {!error && churches && churches.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">You don&apos;t manage any local church yet.</p>
      )}
      {!error && (!churches || (churchId && !dependents)) && <p className="py-6 text-center text-sm text-gray-400">Loading...</p>}
      {dependents && dependents.length === 0 && <p className="py-6 text-center text-sm text-gray-400">No children registered yet.</p>}

      {dependents && dependents.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">Guardian</th>
              </tr>
            </thead>
            <tbody>
              {dependents.map((d) => (
                <tr key={d.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold">{d.name}</td>
                  <td className="px-4 py-3">{ageFromDob(d.dateOfBirth)}</td>
                  <td className="px-4 py-3">{d.gender ?? "-"}</td>
                  <td className="px-4 py-3">
                    {d.guardian ? `${d.guardian.name} (${d.guardian.membershipNo})` : <span className="text-gray-400">None on file</span>}
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

function RegisterDependentForm({
  localChurchId,
  onRegistered,
  onCancel,
}: {
  localChurchId: string;
  onRegistered: () => void;
  onCancel: () => void;
}) {
  const [guardians, setGuardians] = useState<MemberRow[] | null>(null);
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"" | "MALE" | "FEMALE">("");
  const [guardianId, setGuardianId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/members")
      .then((res) => (res.ok ? res.json() : []))
      .then((body: MemberRow[]) => setGuardians(body.filter((m) => m.localChurch)))
      .catch(() => setGuardians([]));
  }, []);

  const submit = async () => {
    if (!name.trim() || !dateOfBirth) {
      setError("Name and Date of Birth are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/dependents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        dateOfBirth,
        gender: gender || undefined,
        guardianId: guardianId || undefined,
        localChurchId,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body?.error || "Failed to register child");
      return;
    }
    onRegistered();
  };

  return (
    <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Register Child</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Full Name <span className="text-[#B22222]">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kevin Kamau"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Date of Birth <span className="text-[#B22222]">*</span>
          </label>
          <input
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            type="date"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as "" | "MALE" | "FEMALE")}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
          >
            <option value="">Not specified</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Guardian</label>
          {guardians === null ? (
            <p className="text-xs text-gray-400">Loading members...</p>
          ) : (
            <select
              value={guardianId}
              onChange={(e) => setGuardianId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
            >
              <option value="">None on file</option>
              {guardians.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.membershipNo})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-[#B22222]">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-[#024424] px-4 py-2 text-xs font-bold text-white hover:bg-[#01331a] disabled:opacity-50"
        >
          {busy ? "Registering..." : "Register Child"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs font-bold text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
    </div>
  );
}
