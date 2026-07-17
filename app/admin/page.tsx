"use client";

import { useEffect, useState } from "react";
import { ChurchLogo } from "../components/ChurchLogo";
import { INDI_CONNECT_CONFIG } from "../config/indi-config";
import { FrozenSection } from "@/components/FrozenSection";
import { CommandCentreTab } from "@/components/admin/CommandCentreTab";
import { AttendanceTab } from "@/components/admin/AttendanceTab";
import { ContributionsTab } from "@/components/admin/ContributionsTab";
import { MembersTab } from "@/components/admin/MembersTab";
import { GroupsTab } from "@/components/admin/GroupsTab";
import { ProjectsTab } from "@/components/admin/ProjectsTab";
import { RollupTab } from "@/components/admin/RollupTab";
import { StructureTab } from "@/components/admin/StructureTab";
import { RolesTab } from "@/components/admin/RolesTab";
import { hasAccess, type PermissionMap } from "@/lib/permission-check";

interface Stats {
  totalMembers: number;
  activeMembers: number;
  totalDependents: number;
  monthlyTithe: number;
  totalProjectFunds: number;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    "command" | "attendance" | "contributions" | "members" | "groups" | "projects" | "rollup" | "structure" | "roles"
  >("command");
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/member/access")
      .then((res) => res.json())
      .then((body) => setPermissions(body.permissions ?? {}))
      .catch(() => setPermissions({}));
    fetch("/api/admin/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setStats(body))
      .catch(() => setStats(null));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-gray-900">
      <div className="flex flex-col bg-[#024424] px-6 py-4 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ChurchLogo className="" showText={false} />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">{INDI_CONNECT_CONFIG.denomination}</span>
            <h2 className="text-xl font-black">Inner Circle - Admin Dashboard</h2>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Total Members</p>
            <p className="mt-2 text-2xl font-black text-[#024424]">{(stats?.totalMembers ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Activated Accounts</p>
            <p className="mt-2 text-2xl font-black text-[#024424]">{(stats?.activeMembers ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Children (Dependents)</p>
            <p className="mt-2 text-2xl font-black text-[#024424]">{(stats?.totalDependents ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">This Month&apos;s Tithe</p>
            <p className="mt-2 text-2xl font-black text-[#024424]">KES {(stats?.monthlyTithe ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Total Project Funds</p>
            <p className="mt-2 text-2xl font-black text-[#D4AF37]">KES {(stats?.totalProjectFunds ?? 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="mb-6 flex gap-2 border-b border-gray-200">
          {(
            [
              { id: "command", label: "Command Centre" },
              { id: "attendance", label: "Attendance Register" },
              { id: "contributions", label: "Contributions" },
              { id: "members", label: "Member Management" },
              { id: "groups", label: "Groups & Fellowships" },
              { id: "projects", label: "Projects" },
              { id: "rollup", label: "Financial Rollup" },
              { id: "structure", label: "Leadership & Structure" },
              { id: "roles", label: "Roles & Permissions" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-[#024424] text-[#024424]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "command" && (
          <FrozenSection
            allowed={hasAccess(permissions, "admin.members") || hasAccess(permissions, "admin.contributions")}
            label="Command Centre"
          >
            <CommandCentreTab />
          </FrozenSection>
        )}

        {activeTab === "attendance" && (
          <FrozenSection allowed={hasAccess(permissions, "admin.attendance")} label="Attendance Register">
            <AttendanceTab />
          </FrozenSection>
        )}

        {activeTab === "contributions" && (
          <FrozenSection allowed={hasAccess(permissions, "admin.contributions")} label="Contributions">
            <ContributionsTab />
          </FrozenSection>
        )}

        {activeTab === "members" && (
          <FrozenSection allowed={hasAccess(permissions, "admin.members")} label="Member Management">
            <MembersTab />
          </FrozenSection>
        )}

        {activeTab === "groups" && (
          <FrozenSection allowed={hasAccess(permissions, "admin.groups")} label="Groups & Fellowships">
            <GroupsTab />
          </FrozenSection>
        )}

        {activeTab === "projects" && (
          <FrozenSection allowed={hasAccess(permissions, "admin.projects")} label="Projects & Welfare">
            <ProjectsTab />
          </FrozenSection>
        )}

        {activeTab === "rollup" && (
          <FrozenSection allowed={hasAccess(permissions, "admin.rollup")} label="Financial Rollup">
            <RollupTab />
          </FrozenSection>
        )}

        {activeTab === "structure" && (
          <FrozenSection allowed={hasAccess(permissions, "admin.members", "EDIT")} label="Leadership & Structure">
            <StructureTab />
          </FrozenSection>
        )}

        {activeTab === "roles" && (
          <FrozenSection allowed={hasAccess(permissions, "admin.roles", "EDIT")} label="Roles & Permissions">
            <RolesTab />
          </FrozenSection>
        )}
      </main>
    </div>
  );
}
