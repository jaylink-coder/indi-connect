"use client";

import { useEffect, useState } from "react";

type Tier = "HEADQUARTERS" | "ARCHDIOCESE" | "DIOCESE" | "PARISH" | "LOCAL_CHURCH";
type Access = "VIEW" | "EDIT" | null;

interface PermissionRow {
  id: string;
  key: string;
  label: string;
  section: string;
}

interface RoleRow {
  id: string;
  name: string;
  scope: Tier;
  description: string | null;
  grants: Record<string, "VIEW" | "EDIT">;
}

const TIER_LABEL: Record<Tier, string> = {
  HEADQUARTERS: "National Headquarters",
  ARCHDIOCESE: "Archdiocese",
  DIOCESE: "Diocese",
  PARISH: "Parish",
  LOCAL_CHURCH: "Local Church",
};

function nextAccess(current: Access): Access {
  if (current === null) return "VIEW";
  if (current === "VIEW") return "EDIT";
  return null;
}

const ACCESS_STYLE: Record<Exclude<Access, null> | "none", string> = {
  none: "bg-gray-50 text-gray-300",
  VIEW: "bg-amber-50 text-amber-700",
  EDIT: "bg-green-50 text-[#024424]",
};

export function RolesTab() {
  const [permissions, setPermissions] = useState<PermissionRow[] | null>(null);
  const [roles, setRoles] = useState<RoleRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNewRole, setShowNewRole] = useState(false);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  const load = () => {
    Promise.all([
      fetch("/api/admin/permissions").then((res) => (res.ok ? res.json() : Promise.reject(res))),
      fetch("/api/admin/roles?withGrants=1").then((res) => (res.ok ? res.json() : Promise.reject(res))),
    ])
      .then(([perms, rls]) => {
        setPermissions(perms);
        setRoles(rls);
      })
      .catch(() => setError("Couldn't load roles & permissions. This section is Super Admin only."));
  };

  useEffect(() => {
    load();
  }, []);

  const sections = permissions ? [...new Set(permissions.map((p) => p.section))] : [];

  const toggleGrant = async (role: RoleRow, permissionKey: string) => {
    const current = role.grants[permissionKey] ?? null;
    const next = nextAccess(current);
    const cellKey = `${role.id}:${permissionKey}`;
    setSavingCell(cellKey);

    setRoles((prev) =>
      prev
        ? prev.map((r) =>
            r.id === role.id
              ? {
                  ...r,
                  grants: next === null ? Object.fromEntries(Object.entries(r.grants).filter(([k]) => k !== permissionKey)) : { ...r.grants, [permissionKey]: next },
                }
              : r
          )
        : prev
    );

    const res = await fetch(`/api/admin/roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grants: { [permissionKey]: next } }),
    });
    setSavingCell(null);
    if (!res.ok) {
      setError("Couldn't save that change - reloading.");
      load();
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <h3 className="text-lg font-bold text-[#024424]">Roles &amp; Permissions</h3>
          <p className="mt-1 text-xs text-gray-500">
            Click a cell to cycle it: none → View → Edit → none. Changes take effect immediately for everyone
            holding that role.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewRole((v) => !v)}
          className="rounded-lg bg-[#024424] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#01331a]"
        >
          + New Role
        </button>
      </div>

      {showNewRole && (
        <NewRoleForm
          onCreated={() => {
            setShowNewRole(false);
            load();
          }}
          onCancel={() => setShowNewRole(false)}
        />
      )}

      {error && <p className="py-4 text-center text-sm text-[#B22222]">{error}</p>}
      {!error && (!permissions || !roles) && <p className="py-6 text-center text-sm text-gray-400">Loading...</p>}

      {!error && permissions && roles && (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white px-3 py-2 text-gray-500">Role</th>
                {sections.map((section) => (
                  <th key={section} colSpan={permissions.filter((p) => p.section === section).length} className="border-b px-3 py-1 text-center font-bold uppercase tracking-wider text-gray-400">
                    {section}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 bg-white px-3 py-2"></th>
                {permissions.map((p) => (
                  <th key={p.id} className="min-w-[100px] border-b px-2 py-2 text-center font-semibold text-gray-600">
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-t border-gray-100">
                  <td className="sticky left-0 bg-white px-3 py-2 align-top">
                    <p className="font-bold text-gray-900">{role.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">{TIER_LABEL[role.scope]}</p>
                  </td>
                  {permissions.map((p) => {
                    const value = role.grants[p.key] ?? null;
                    const cellKey = `${role.id}:${p.key}`;
                    return (
                      <td key={p.id} className="px-2 py-2 text-center">
                        <button
                          type="button"
                          disabled={savingCell === cellKey}
                          onClick={() => toggleGrant(role, p.key)}
                          className={`w-full rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 ${ACCESS_STYLE[value ?? "none"]}`}
                        >
                          {value ?? "—"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NewRoleForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [scope, setScope] = useState<Tier>("LOCAL_CHURCH");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError("Enter a role name");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), scope, description: description.trim() || undefined }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body?.error || "Failed to create role");
      return;
    }
    onCreated();
  };

  return (
    <div className="mb-4 space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Role name, e.g. Choir Director"
          className="w-56 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
        />
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as Tier)}
          className="w-56 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
        >
          {(Object.keys(TIER_LABEL) as Tier[]).map((t) => (
            <option key={t} value={t}>
              {TIER_LABEL[t]}
            </option>
          ))}
        </select>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-64 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#024424]"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="rounded-lg bg-[#D4AF37] px-3 py-1.5 text-xs font-bold text-[#024424] disabled:opacity-50">
          {busy ? "Creating..." : "Create Role"}
        </button>
        <button onClick={onCancel} className="text-xs font-bold text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-[#B22222]">{error}</p>}
    </div>
  );
}
