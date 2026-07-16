"use client";

import { useEffect, useMemo, useState } from "react";

type Tier = "HEADQUARTERS" | "ARCHDIOCESE" | "DIOCESE" | "PARISH" | "LOCAL_CHURCH";

interface StructureNode {
  tier: Tier;
  id: string;
  name: string;
  children: StructureNode[];
}

interface RoleOption {
  id: string;
  name: string;
  scope: Tier;
  description: string | null;
}

interface MemberOption {
  id: string;
  name: string;
  membershipNo: string;
}

interface PositionRow {
  id: string;
  startDate: string;
  member: { id: string; name: string; membershipNo: string };
  role: { id: string; name: string };
}

const TIER_LABEL: Record<Tier, string> = {
  HEADQUARTERS: "National Headquarters",
  ARCHDIOCESE: "Archdiocese",
  DIOCESE: "Diocese",
  PARISH: "Parish",
  LOCAL_CHURCH: "Local Church",
};

const CHILD_LABEL: Partial<Record<Tier, string>> = {
  HEADQUARTERS: "Archdiocese",
  ARCHDIOCESE: "Diocese",
  DIOCESE: "Parish",
  PARISH: "Local Church",
};

function updateTree(nodes: StructureNode[], targetId: string, updater: (node: StructureNode) => StructureNode): StructureNode[] {
  return nodes.map((node) => {
    if (node.id === targetId) return updater(node);
    if (node.children.length > 0) return { ...node, children: updateTree(node.children, targetId, updater) };
    return node;
  });
}

export function StructureTab() {
  const [roots, setRoots] = useState<StructureNode[] | null>(null);
  const [roles, setRoles] = useState<RoleOption[] | null>(null);
  const [members, setMembers] = useState<MemberOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/structure")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || "Failed to load church structure");
        setRoots(body.roots);
      })
      .catch((err) => setError(err.message));

    fetch("/api/admin/roles")
      .then((res) => (res.ok ? res.json() : []))
      .then(setRoles)
      .catch(() => setRoles([]));

    fetch("/api/members")
      .then((res) => (res.ok ? res.json() : []))
      .then((body: Array<{ id: string; name: string; membershipNo: string }>) =>
        setMembers(body.map((m) => ({ id: m.id, name: m.name, membershipNo: m.membershipNo })))
      )
      .catch(() => setMembers([]));
  }, []);

  const handleAddChild = (parentId: string, child: StructureNode) => {
    setRoots((prev) => (prev ? updateTree(prev, parentId, (n) => ({ ...n, children: [...n.children, child] })) : prev));
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 border-b pb-3">
        <h3 className="text-lg font-bold text-[#024424]">Leadership &amp; Church Structure</h3>
        <p className="mt-1 text-xs text-gray-500">
          Build the real map of AIPCA branches as they&apos;re registered - add Dioceses, Parishes, and Local
          Churches under whatever you oversee, and assign members to lead them. Nothing here is guessed; it
          only grows as real people and real branches are added.
        </p>
      </div>

      {error && <p className="py-6 text-center text-sm text-[#B22222]">{error}</p>}
      {!error && (!roots || !roles || !members) && <p className="py-6 text-center text-sm text-gray-400">Loading...</p>}
      {roots && roots.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">You don&apos;t oversee any part of the church structure yet.</p>
      )}
      {roots && roots.length > 0 && roles && members && (
        <div className="space-y-1">
          {roots.map((root) => (
            <Node key={root.id} node={root} depth={0} roles={roles} members={members} onAddChild={handleAddChild} />
          ))}
        </div>
      )}
    </div>
  );
}

function Node({
  node,
  depth,
  roles,
  members,
  onAddChild,
}: {
  node: StructureNode;
  depth: number;
  roles: RoleOption[];
  members: MemberOption[];
  onAddChild: (parentId: string, child: StructureNode) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [positions, setPositions] = useState<PositionRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const hasChildren = node.children.length > 0;
  const childLabel = CHILD_LABEL[node.tier];

  const loadPositions = () => {
    setPositions(null);
    fetch(`/api/admin/positions?scopeTier=${node.tier}&scopeId=${node.id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setPositions)
      .catch(() => setPositions([]));
  };

  useEffect(() => {
    if (open) loadPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className={depth > 0 ? "border-l border-gray-100 pl-4" : ""}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2.5 hover:bg-gray-50">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-w-0 items-center gap-2 text-left">
          <span className="shrink-0 text-gray-400">{open ? "▾" : "▸"}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900">{node.name}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{TIER_LABEL[node.tier]}</p>
          </div>
        </button>
        <div className="flex shrink-0 gap-2">
          {childLabel && (
            <button
              type="button"
              onClick={() => {
                setShowAddForm((v) => !v);
                setShowAssignForm(false);
              }}
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-bold text-[#024424] hover:bg-gray-50"
            >
              + {childLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setShowAssignForm((v) => !v);
              setShowAddForm(false);
            }}
            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-bold text-[#D4AF37] hover:bg-gray-50"
          >
            Assign Leader
          </button>
        </div>
      </div>

      {showAddForm && childLabel && (
        <AddChildForm
          parentTier={node.tier}
          parentId={node.id}
          childLabel={childLabel}
          onCreated={(child) => {
            onAddChild(node.id, child);
            setShowAddForm(false);
            setOpen(true);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {showAssignForm && (
        <AssignLeaderForm
          scopeTier={node.tier}
          scopeId={node.id}
          roles={roles.filter((r) => r.scope === node.tier)}
          members={members}
          onAssigned={() => {
            setShowAssignForm(false);
            loadPositions();
          }}
          onCancel={() => setShowAssignForm(false)}
        />
      )}

      {open && (
        <div className="ml-6 mb-2 mt-1 space-y-1">
          {positions === null && <p className="text-xs text-gray-400">Loading leaders...</p>}
          {positions && positions.length === 0 && <p className="text-xs text-gray-400">No one holds a position here yet.</p>}
          {positions &&
            positions.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs">
                <span>
                  <span className="font-bold text-gray-800">{p.member.name}</span>
                  <span className="text-gray-400"> ({p.member.membershipNo}) - </span>
                  <span className="text-[#024424]">{p.role.name}</span>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm(`Remove ${p.member.name} as ${p.role.name}?`)) return;
                    setBusy(true);
                    await fetch(`/api/admin/positions/${p.id}/revoke`, { method: "POST" });
                    setBusy(false);
                    loadPositions();
                  }}
                  className="font-bold text-[#B22222] hover:underline disabled:opacity-50"
                >
                  Revoke
                </button>
              </div>
            ))}
        </div>
      )}

      {open && hasChildren && (
        <div className="ml-3 space-y-0.5 border-l border-gray-100 pl-2">
          {node.children.map((child) => (
            <Node key={child.id} node={child} depth={depth + 1} roles={roles} members={members} onAddChild={onAddChild} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddChildForm({
  parentTier,
  parentId,
  childLabel,
  onCreated,
  onCancel,
}: {
  parentTier: Tier;
  parentId: string;
  childLabel: string;
  onCreated: (child: StructureNode) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [bishopName, setBishopName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsBishop = childLabel === "Diocese";

  const submit = async () => {
    if (!name.trim() || (needsBishop && !bishopName.trim())) {
      setError(needsBishop ? "Enter both a name and the Bishop's name" : "Enter a name");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/structure/add-node", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentTier, parentId, name: name.trim(), bishopName: bishopName.trim() }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body?.error || "Failed to create");
      return;
    }
    onCreated({ tier: body.tier, id: body.id, name: body.name, children: [] });
  };

  return (
    <div className="ml-6 mb-2 mt-1 flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={`${childLabel} name`}
        className="w-48 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
      />
      {needsBishop && (
        <input
          value={bishopName}
          onChange={(e) => setBishopName(e.target.value)}
          placeholder="Bishop's name"
          className="w-48 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
        />
      )}
      <button onClick={submit} disabled={busy} className="rounded-lg bg-[#024424] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
        {busy ? "Adding..." : `Add ${childLabel}`}
      </button>
      <button onClick={onCancel} className="text-xs font-bold text-gray-400 hover:text-gray-600">
        Cancel
      </button>
      {error && <p className="w-full text-xs text-[#B22222]">{error}</p>}
    </div>
  );
}

function AssignLeaderForm({
  scopeTier,
  scopeId,
  roles,
  members,
  onAssigned,
  onCancel,
}: {
  scopeTier: Tier;
  scopeId: string;
  roles: RoleOption[];
  members: MemberOption[];
  onAssigned: () => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState("");
  const [memberId, setMemberId] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members.slice(0, 20);
    return members.filter((m) => m.name.toLowerCase().includes(q) || m.membershipNo.toLowerCase().includes(q)).slice(0, 20);
  }, [members, search]);

  if (roles.length === 0) {
    return (
      <div className="ml-6 mb-2 mt-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
        No roles are defined at the {TIER_LABEL[scopeTier]} level yet.
        <button onClick={onCancel} className="ml-2 font-bold text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
    );
  }

  const submit = async () => {
    if (!memberId || !roleId) {
      setError("Pick a member and a role");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, roleId, scopeId }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body?.error || "Failed to assign");
      return;
    }
    onAssigned();
  };

  return (
    <div className="ml-6 mb-2 mt-1 space-y-2 rounded-lg bg-gray-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search member by name or Church No..."
          className="w-56 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
        />
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="w-56 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
        >
          <option value="">Select a member...</option>
          {filteredMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.membershipNo})
            </option>
          ))}
        </select>
        <select
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          className="w-56 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-[#D4AF37] px-3 py-1.5 text-xs font-bold text-[#024424] disabled:opacity-50"
        >
          {busy ? "Assigning..." : "Assign"}
        </button>
        <button onClick={onCancel} className="text-xs font-bold text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-[#B22222]">{error}</p>}
    </div>
  );
}
