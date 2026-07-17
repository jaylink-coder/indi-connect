"use client";

import { useEffect, useMemo, useState } from "react";

interface LocalChurchOption {
  id: string;
  name: string;
}

interface GroupRow {
  id: string;
  category: string;
  name: string;
  minAge: number | null;
  maxAge: number | null;
  genderRestriction: "MALE" | "FEMALE" | null;
  counts: { total: number; active: number; probation: number; suspended: number };
}

interface RosterRow {
  id: string;
  status: "PROBATION" | "ACTIVE" | "SUSPENDED";
  joinedGroupAt: string;
  probationEndsAt: string;
  person: { kind: "member" | "dependent"; id: string; name: string; membershipNo?: string };
}

interface MemberOption {
  id: string;
  name: string;
  membershipNo: string;
}

interface DependentOption {
  id: string;
  name: string;
}

const STATUS_STYLE: Record<RosterRow["status"], string> = {
  PROBATION: "bg-amber-50 text-amber-700",
  ACTIVE: "bg-green-50 text-[#024424]",
  SUSPENDED: "bg-red-50 text-[#B22222]",
};

function ageRangeLabel(g: GroupRow): string {
  if (g.minAge === null && g.maxAge === null) return g.genderRestriction ? g.genderRestriction : "Any age";
  if (g.maxAge === null) return `${g.minAge}+${g.genderRestriction ? ` · ${g.genderRestriction}` : ""}`;
  return `${g.minAge}-${g.maxAge}`;
}

export function GroupsTab() {
  const [churches, setChurches] = useState<LocalChurchOption[] | null>(null);
  const [churchId, setChurchId] = useState<string>("");
  const [groups, setGroups] = useState<GroupRow[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/local-churches?permission=admin.groups")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body: LocalChurchOption[]) => {
        setChurches(body);
        if (body.length > 0) setChurchId(body[0].id);
      })
      .catch(() => setError("Couldn't load your local churches."));
  }, []);

  const loadGroups = (id: string) => {
    setGroups(null);
    fetch(`/api/admin/groups?localChurchId=${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(setGroups)
      .catch(() => setError("Couldn't load groups."));
  };

  useEffect(() => {
    if (churchId) loadGroups(churchId);
  }, [churchId]);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 border-b pb-3">
        <h3 className="text-lg font-bold text-[#024424]">Groups &amp; Fellowships</h3>
        <p className="mt-1 text-xs text-gray-500">
          Men&apos;s Fellowship, Mothers&apos; Council, Choir, Sunday School, and the rest - who&apos;s in each one,
          who&apos;s still on their 3-month probation, and who&apos;s been suspended.
        </p>
      </div>

      {error && <p className="py-4 text-center text-sm text-[#B22222]">{error}</p>}

      {!error && churches && churches.length > 1 && (
        <select
          value={churchId}
          onChange={(e) => {
            setChurchId(e.target.value);
            setExpandedId(null);
          }}
          className="mb-4 w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424] sm:w-auto"
        >
          {churches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {!error && churches && churches.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">You don&apos;t manage any local church&apos;s groups yet.</p>
      )}

      {!error && (!churches || (churchId && !groups)) && <p className="py-6 text-center text-sm text-gray-400">Loading...</p>}

      {!error && groups && (
        <div className="space-y-2">
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              churchId={churchId}
              expanded={expandedId === g.id}
              onToggle={() => setExpandedId((prev) => (prev === g.id ? null : g.id))}
              onChanged={() => loadGroups(churchId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupCard({
  group,
  churchId,
  expanded,
  onToggle,
  onChanged,
}: {
  group: GroupRow;
  churchId: string;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRoster = () => {
    setRoster(null);
    fetch(`/api/admin/groups/${group.id}/memberships`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(setRoster)
      .catch(() => setError("Couldn't load this group's roster."));
  };

  useEffect(() => {
    if (expanded) loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const act = async (membershipId: string, action: "activate" | "suspend" | "reinstate" | "remove") => {
    setBusyId(membershipId);
    const res = await fetch(`/api/admin/groups/memberships/${membershipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    if (res.ok) {
      loadRoster();
      onChanged();
    } else {
      setError("That action failed.");
    }
  };

  return (
    <div className="rounded-lg border border-gray-100">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-50"
      >
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">{group.name}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{ageRangeLabel(group)}</p>
        </div>
        <div className="flex shrink-0 gap-3 text-xs font-bold">
          <span className="text-[#024424]">{group.counts.active} active</span>
          {group.counts.probation > 0 && <span className="text-amber-600">{group.counts.probation} probation</span>}
          {group.counts.suspended > 0 && <span className="text-[#B22222]">{group.counts.suspended} suspended</span>}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          {error && <p className="mb-2 text-xs text-[#B22222]">{error}</p>}
          {roster === null && <p className="text-xs text-gray-400">Loading roster...</p>}
          {roster && roster.length === 0 && <p className="text-xs text-gray-400">No one is in this group yet.</p>}
          {roster && roster.length > 0 && (
            <div className="space-y-1.5">
              {roster.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-xs">
                  <span className="min-w-0 truncate">
                    <span className="font-bold text-gray-800">{r.person.name}</span>
                    {r.person.kind === "member" ? (
                      <span className="text-gray-400"> ({r.person.membershipNo})</span>
                    ) : (
                      <span className="text-gray-400"> (child)</span>
                    )}
                    <span className={`ml-2 rounded-full px-2 py-0.5 font-bold ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                  </span>
                  <span className="flex shrink-0 gap-2">
                    {r.status === "SUSPENDED" ? (
                      <button disabled={busyId === r.id} onClick={() => act(r.id, "reinstate")} className="font-bold text-[#024424] hover:underline disabled:opacity-50">
                        Reinstate
                      </button>
                    ) : (
                      <button disabled={busyId === r.id} onClick={() => act(r.id, "suspend")} className="font-bold text-amber-700 hover:underline disabled:opacity-50">
                        Suspend
                      </button>
                    )}
                    {r.status === "PROBATION" && (
                      <button disabled={busyId === r.id} onClick={() => act(r.id, "activate")} className="font-bold text-[#024424] hover:underline disabled:opacity-50">
                        Activate now
                      </button>
                    )}
                    <button
                      disabled={busyId === r.id}
                      onClick={() => {
                        if (window.confirm(`Remove ${r.person.name} from ${group.name}?`)) act(r.id, "remove");
                      }}
                      className="font-bold text-[#B22222] hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 border-t border-gray-100 pt-3">
            {!showAdd ? (
              <button onClick={() => setShowAdd(true)} className="text-xs font-bold text-[#024424] hover:underline">
                + Add someone to this group
              </button>
            ) : (
              <AddToGroupForm
                groupId={group.id}
                churchId={churchId}
                onAdded={() => {
                  setShowAdd(false);
                  loadRoster();
                  onChanged();
                }}
                onCancel={() => setShowAdd(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddToGroupForm({
  groupId,
  churchId,
  onAdded,
  onCancel,
}: {
  groupId: string;
  churchId: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<"member" | "dependent">("member");
  const [members, setMembers] = useState<MemberOption[] | null>(null);
  const [dependents, setDependents] = useState<DependentOption[] | null>(null);
  const [search, setSearch] = useState("");
  const [personId, setPersonId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/members")
      .then((res) => (res.ok ? res.json() : []))
      .then((body: Array<{ id: string; name: string; membershipNo: string; localChurch: { name: string } }>) =>
        setMembers(body.map((m) => ({ id: m.id, name: m.name, membershipNo: m.membershipNo })))
      )
      .catch(() => setMembers([]));
    fetch(`/api/admin/dependents?localChurchId=${churchId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((body: Array<{ id: string; name: string }>) => setDependents(body.map((d) => ({ id: d.id, name: d.name }))))
      .catch(() => setDependents([]));
  }, [churchId]);

  const options = kind === "member" ? members : dependents;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = options ?? [];
    if (!q) return list.slice(0, 20);
    return list
      .filter((o) => {
        const membershipNo = "membershipNo" in o ? (o as MemberOption).membershipNo : "";
        return o.name.toLowerCase().includes(q) || membershipNo.toLowerCase().includes(q);
      })
      .slice(0, 20);
  }, [options, search]);

  const submit = async () => {
    if (!personId) {
      setError("Pick a person first");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/groups/${groupId}/memberships`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, personId }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body?.error || "Failed to add");
      return;
    }
    onAdded();
  };

  return (
    <div className="space-y-2 rounded-lg bg-gray-50 p-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setKind("member");
            setPersonId("");
          }}
          className={`rounded-lg px-2.5 py-1 text-xs font-bold ${kind === "member" ? "bg-[#024424] text-white" : "border border-gray-200 text-gray-600"}`}
        >
          Member
        </button>
        <button
          type="button"
          onClick={() => {
            setKind("dependent");
            setPersonId("");
          }}
          className={`rounded-lg px-2.5 py-1 text-xs font-bold ${kind === "dependent" ? "bg-[#024424] text-white" : "border border-gray-200 text-gray-600"}`}
        >
          Child
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={kind === "member" ? "Search by name or Church No..." : "Search by name..."}
          className="w-56 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
        />
        <select
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
          className="w-56 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
        >
          <option value="">Select...</option>
          {filtered.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
              {"membershipNo" in o ? ` (${o.membershipNo})` : ""}
            </option>
          ))}
        </select>
        <button onClick={submit} disabled={busy} className="rounded-lg bg-[#D4AF37] px-3 py-1.5 text-xs font-bold text-[#024424] disabled:opacity-50">
          {busy ? "Adding..." : "Add"}
        </button>
        <button onClick={onCancel} className="text-xs font-bold text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-[#B22222]">{error}</p>}
    </div>
  );
}
