"use client";

import { useEffect, useState } from "react";

type ProjectStatus = "PLANNED" | "ACTIVE" | "STALLED" | "COMPLETED" | "CANCELLED";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNED: "Planned",
  ACTIVE: "Ongoing",
  STALLED: "Stalled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_COLOR: Record<ProjectStatus, string> = {
  PLANNED: "bg-gray-100 text-gray-600",
  ACTIVE: "bg-green-50 text-green-700",
  STALLED: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-400",
};

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  targetAmount: number | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  order: number;
}

interface Velocity {
  dailyRate: number;
  daysRemaining: number | null;
  etaDate: string | null;
  status: "complete" | "stalled" | "on_track";
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  leadContact: string | null;
  status: ProjectStatus;
  startDate: string;
  endDate: string | null;
  targetAmount: number;
  raisedAmount: number;
  velocity: Velocity;
  milestones: Milestone[];
}

interface WelfareCase {
  id: string;
  title: string;
  description: string | null;
  beneficiaryName: string | null;
  status: string;
  targetAmount: number | null;
  raisedAmount: number;
}

export function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [welfareCases, setWelfareCases] = useState<WelfareCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("");
  const [projectTarget, setProjectTarget] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [projectLead, setProjectLead] = useState("");
  const [projectStatus, setProjectStatus] = useState<"ACTIVE" | "PLANNED">("ACTIVE");
  const [creatingProject, setCreatingProject] = useState(false);

  const [caseTitle, setCaseTitle] = useState("");
  const [caseBeneficiary, setCaseBeneficiary] = useState("");
  const [caseTarget, setCaseTarget] = useState("");
  const [caseDesc, setCaseDesc] = useState("");
  const [creatingCase, setCreatingCase] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [projectsRes, casesRes] = await Promise.all([
      fetch("/api/projects?manage=1"),
      fetch("/api/welfare-cases?manage=1"),
    ]);
    if (projectsRes.ok) setProjects(await projectsRes.json());
    if (casesRes.ok) setWelfareCases(await casesRes.json());
    if (!projectsRes.ok || !casesRes.ok) setError("Couldn't load projects/welfare cases.");
    setLoading(false);
  };

  useEffect(() => {
    Promise.resolve().then(load);
  }, []);

  const createProject = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreatingProject(true);
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectName,
        description: projectDesc || undefined,
        location: projectLocation || undefined,
        leadContact: projectLead || undefined,
        status: projectStatus,
        targetAmount: Number(projectTarget),
      }),
    });
    setCreatingProject(false);
    if (response.ok) {
      setProjectName("");
      setProjectTarget("");
      setProjectDesc("");
      setProjectLocation("");
      setProjectLead("");
      setProjectStatus("ACTIVE");
      load();
    } else {
      const body = await response.json().catch(() => null);
      setError(body?.error || "Couldn't create project.");
    }
  };

  const createCase = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreatingCase(true);
    const response = await fetch("/api/welfare-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: caseTitle,
        beneficiaryName: caseBeneficiary || undefined,
        targetAmount: caseTarget ? Number(caseTarget) : undefined,
        description: caseDesc || undefined,
      }),
    });
    setCreatingCase(false);
    if (response.ok) {
      setCaseTitle("");
      setCaseBeneficiary("");
      setCaseTarget("");
      setCaseDesc("");
      load();
    } else {
      const body = await response.json().catch(() => null);
      setError(body?.error || "Couldn't create welfare case.");
    }
  };

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-[#B22222]">{error}</p>}

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-[#024424]">Parish Projects</h3>

        {loading ? (
          <p className="py-4 text-center text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="mb-6 space-y-3">
            {projects.length === 0 && <p className="text-sm text-gray-400">No projects yet.</p>}
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onChanged={load} />
            ))}
          </div>
        )}

        <form onSubmit={createProject} className="space-y-2 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500">New Project</p>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project name"
            required
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
          <input
            value={projectDesc}
            onChange={(e) => setProjectDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={projectLocation}
              onChange={(e) => setProjectLocation(e.target.value)}
              placeholder="Location (optional)"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
            />
            <input
              value={projectLead}
              onChange={(e) => setProjectLead(e.target.value)}
              placeholder="Person responsible (optional)"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={projectTarget}
              onChange={(e) => setProjectTarget(e.target.value)}
              type="number"
              min="1"
              placeholder="Target amount (KES)"
              required
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#024424]"
            />
            <select
              value={projectStatus}
              onChange={(e) => setProjectStatus(e.target.value as "ACTIVE" | "PLANNED")}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
            >
              <option value="ACTIVE">Start as Ongoing (open for giving now)</option>
              <option value="PLANNED">Start as Planned (not open for giving yet)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={creatingProject}
            className="rounded-lg bg-[#024424] px-4 py-2 text-sm font-bold text-white hover:bg-[#01331a] disabled:opacity-50"
          >
            {creatingProject ? "Creating..." : "Create Project"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-[#024424]">Welfare Cases</h3>

        {loading ? (
          <p className="py-4 text-center text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="mb-6 space-y-3">
            {welfareCases.length === 0 && <p className="text-sm text-gray-400">No welfare cases yet.</p>}
            {welfareCases.map((welfareCase) => (
              <div key={welfareCase.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900">{welfareCase.title}</p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-gray-500">{welfareCase.status}</span>
                </div>
                {welfareCase.beneficiaryName && (
                  <p className="mt-0.5 text-xs text-gray-500">Beneficiary: {welfareCase.beneficiaryName}</p>
                )}
                {welfareCase.description && <p className="mt-1 text-xs text-gray-500">{welfareCase.description}</p>}
                <p className="mt-2 text-xs font-bold text-gray-700">
                  Raised: KES {welfareCase.raisedAmount.toLocaleString()}
                  {welfareCase.targetAmount ? ` / KES ${welfareCase.targetAmount.toLocaleString()}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={createCase} className="space-y-2 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500">New Welfare Case</p>
          <input
            value={caseTitle}
            onChange={(e) => setCaseTitle(e.target.value)}
            placeholder="Title (e.g. Bereavement - Family of...)"
            required
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
          <input
            value={caseBeneficiary}
            onChange={(e) => setCaseBeneficiary(e.target.value)}
            placeholder="Beneficiary name (optional)"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
          <input
            value={caseDesc}
            onChange={(e) => setCaseDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
          <input
            value={caseTarget}
            onChange={(e) => setCaseTarget(e.target.value)}
            type="number"
            min="1"
            placeholder="Target amount (optional)"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
          <button
            type="submit"
            disabled={creatingCase}
            className="rounded-lg bg-[#024424] px-4 py-2 text-sm font-bold text-white hover:bg-[#01331a] disabled:opacity-50"
          >
            {creatingCase ? "Creating..." : "Create Welfare Case"}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * One project's card: the funding progress bar that was already here, plus
 * the "government register" structure the project now has - a status
 * lifecycle a leader can move through, location/person responsible, and
 * an expandable list of phases each with their own optional budget and due
 * date, checked off one at a time rather than the whole project being a
 * single lump status.
 */
function ProjectCard({ project, onChanged }: { project: Project; onChanged: () => void }) {
  const [statusBusy, setStatusBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMilestones, setShowMilestones] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showPledges, setShowPledges] = useState(false);

  const pct = project.targetAmount > 0 ? (project.raisedAmount / project.targetAmount) * 100 : 0;
  const completedCount = project.milestones.filter((m) => m.completed).length;

  const changeStatus = async (status: ProjectStatus) => {
    setStatusBusy(true);
    setError(null);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setStatusBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || "Couldn't update status");
      return;
    }
    onChanged();
  };

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-gray-900">{project.name}</p>
        <select
          value={project.status}
          onChange={(e) => changeStatus(e.target.value as ProjectStatus)}
          disabled={statusBusy}
          className={`rounded-full border-0 px-2.5 py-1 text-xs font-bold disabled:opacity-50 ${STATUS_COLOR[project.status]}`}
        >
          {(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {project.description && <p className="mt-1 text-xs text-gray-500">{project.description}</p>}
      {(project.location || project.leadContact) && (
        <p className="mt-1 text-xs text-gray-500">
          {project.location && <span>{project.location}</span>}
          {project.location && project.leadContact && <span> · </span>}
          {project.leadContact && <span>Responsible: {project.leadContact}</span>}
        </p>
      )}

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full bg-[#024424]" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
        <span>Raised: KES {project.raisedAmount.toLocaleString()}</span>
        <span>Target: KES {project.targetAmount.toLocaleString()}</span>
      </div>

      {project.velocity.status === "on_track" && project.velocity.etaDate && (
        <p className="mt-1 text-[10px] text-gray-400">
          Pace: KES {Math.round(project.velocity.dailyRate).toLocaleString()}/day (last 30 days) - on track for{" "}
          <span className="font-bold text-gray-600">
            {new Date(project.velocity.etaDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </span>
        </p>
      )}
      {project.velocity.status === "stalled" && (
        <p className="mt-1 text-[10px] text-[#B22222]">No giving in the last 30 days - no completion estimate.</p>
      )}

      {error && <p className="mt-2 text-xs text-[#B22222]">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-4 border-t border-gray-200 pt-2">
        <button
          type="button"
          onClick={() => setShowMilestones((v) => !v)}
          className="text-xs font-bold text-[#024424] hover:underline"
        >
          {showMilestones ? "Hide" : "Show"} Phases
          {project.milestones.length > 0 && ` (${completedCount}/${project.milestones.length} complete)`}
        </button>
        <button
          type="button"
          onClick={() => setShowPledges((v) => !v)}
          className="text-xs font-bold text-[#024424] hover:underline"
        >
          {showPledges ? "Hide" : "Show"} Pledges
        </button>
      </div>

      {showMilestones && (
        <div className="mt-2 space-y-1.5">
          {project.milestones
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((m) => (
              <MilestoneRow key={m.id} milestone={m} onChanged={onChanged} />
            ))}

          {!showAddMilestone && (
            <button
              type="button"
              onClick={() => setShowAddMilestone(true)}
              className="mt-1 text-xs font-bold text-gray-400 hover:text-gray-600"
            >
              + Add Phase
            </button>
          )}
          {showAddMilestone && (
            <AddMilestoneForm
              projectId={project.id}
              onAdded={() => {
                setShowAddMilestone(false);
                onChanged();
              }}
              onCancel={() => setShowAddMilestone(false)}
            />
          )}
        </div>
      )}

      {showPledges && <PledgesPanel projectId={project.id} />}
    </div>
  );
}

interface Assignment {
  id: string;
  memberId: string;
  memberName: string;
  membershipNo: string;
  assignedAmount: number;
  paidAmount: number;
}

interface ScopeMember {
  id: string;
  name: string;
  membershipNo: string;
}

/**
 * "How much am I assigned as a member" needs a leader to actually assign
 * it first - either the same amount to everyone in the project's scope
 * (a flat harambee quota) or a custom amount per person. Paid-so-far is
 * never entered here, only ever read live from Contribution rows.
 */
function PledgesPanel({ projectId }: { projectId: string }) {
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [scopeMembers, setScopeMembers] = useState<ScopeMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [pickedMember, setPickedMember] = useState<ScopeMember | null>(null);
  const [individualAmount, setIndividualAmount] = useState("");
  const [individualBusy, setIndividualBusy] = useState(false);

  const load = () => {
    fetch(`/api/projects/${projectId}/assignments`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(setAssignments)
      .catch(() => setError("Couldn't load pledges."));
    fetch(`/api/projects/${projectId}/members`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(setScopeMembers)
      .catch(() => setScopeMembers([]));
  };

  useEffect(load, [projectId]);

  const bulkAssign = async () => {
    const amount = Number(bulkAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid pledge amount");
      return;
    }
    if (!window.confirm(`Assign KES ${amount.toLocaleString()} to every member in this project's scope? This overwrites any existing individual pledges.`)) {
      return;
    }
    setBulkBusy(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/assignments/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    setBulkBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || "Couldn't bulk-assign pledges");
      return;
    }
    setBulkAmount("");
    load();
  };

  const assignIndividual = async () => {
    const amount = Number(individualAmount);
    if (!pickedMember) {
      setError("Pick a member first");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid pledge amount");
      return;
    }
    setIndividualBusy(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: pickedMember.id, amount }),
    });
    setIndividualBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || "Couldn't assign pledge");
      return;
    }
    setPickedMember(null);
    setSearch("");
    setIndividualAmount("");
    load();
  };

  const removeAssignment = async (assignmentId: string) => {
    if (!window.confirm("Remove this pledge?")) return;
    await fetch(`/api/projects/assignments/${assignmentId}`, { method: "DELETE" });
    load();
  };

  const searchResults =
    search.trim() && scopeMembers
      ? scopeMembers
          .filter((m) => m.name.toLowerCase().includes(search.trim().toLowerCase()) || m.membershipNo.toLowerCase().includes(search.trim().toLowerCase()))
          .slice(0, 8)
      : [];

  return (
    <div className="mt-2 space-y-3 rounded-md border border-gray-200 bg-white p-3">
      {error && <p className="text-[10px] text-[#B22222]">{error}</p>}

      {!assignments && <p className="text-xs text-gray-400">Loading pledges...</p>}
      {assignments && assignments.length === 0 && <p className="text-xs text-gray-400">No pledges assigned yet.</p>}
      {assignments && assignments.length > 0 && (
        <div className="space-y-1.5">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-800">{a.memberName}</p>
                <p className="font-mono text-[10px] text-gray-400">{a.membershipNo}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] text-gray-500">
                <span>Assigned: KES {a.assignedAmount.toLocaleString()}</span>
                <span className={a.paidAmount >= a.assignedAmount ? "text-green-700" : "text-gray-500"}>
                  Paid: KES {a.paidAmount.toLocaleString()}
                </span>
                <button type="button" onClick={() => removeAssignment(a.id)} className="text-gray-300 hover:text-[#B22222]" aria-label="Remove pledge">
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 pt-2">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">Assign to Everyone in Scope</p>
        <div className="flex gap-1.5">
          <input
            value={bulkAmount}
            onChange={(e) => setBulkAmount(e.target.value)}
            type="number"
            min="1"
            placeholder="Amount per member (KES)"
            className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
          <button
            type="button"
            onClick={bulkAssign}
            disabled={bulkBusy}
            className="shrink-0 rounded-md bg-[#024424] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#01331a] disabled:opacity-50"
          >
            {bulkBusy ? "Assigning..." : "Assign All"}
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-2">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">Assign to One Person</p>
        {pickedMember ? (
          <div className="flex items-center justify-between rounded-md bg-gray-50 px-2 py-1.5 text-xs">
            <span className="font-semibold text-gray-800">
              {pickedMember.name} <span className="font-mono text-[10px] text-gray-400">{pickedMember.membershipNo}</span>
            </span>
            <button type="button" onClick={() => setPickedMember(null)} className="text-gray-400 hover:text-gray-600">
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or Church No..."
              className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#024424]"
            />
            {searchResults.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {searchResults.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPickedMember(m)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs hover:bg-gray-50"
                  >
                    <span className="font-semibold text-gray-800">{m.name}</span>
                    <span className="font-mono text-[10px] text-gray-400">{m.membershipNo}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {pickedMember && (
          <div className="mt-1.5 flex gap-1.5">
            <input
              value={individualAmount}
              onChange={(e) => setIndividualAmount(e.target.value)}
              type="number"
              min="1"
              placeholder="Pledge amount (KES)"
              className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#024424]"
            />
            <button
              type="button"
              onClick={assignIndividual}
              disabled={individualBusy}
              className="shrink-0 rounded-md bg-[#024424] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#01331a] disabled:opacity-50"
            >
              {individualBusy ? "Assigning..." : "Assign"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MilestoneRow({ milestone, onChanged }: { milestone: Milestone; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    await fetch(`/api/projects/milestones/${milestone.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !milestone.completed }),
    });
    setBusy(false);
    onChanged();
  };

  const remove = async () => {
    if (!window.confirm(`Remove phase "${milestone.title}"?`)) return;
    setBusy(true);
    await fetch(`/api/projects/milestones/${milestone.id}`, { method: "DELETE" });
    setBusy(false);
    onChanged();
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-white px-3 py-2">
      <label className="flex min-w-0 flex-1 items-center gap-2">
        <input type="checkbox" checked={milestone.completed} disabled={busy} onChange={toggle} className="h-4 w-4 accent-[#024424]" />
        <span className={`truncate text-xs font-semibold ${milestone.completed ? "text-gray-400 line-through" : "text-gray-800"}`}>
          {milestone.title}
        </span>
      </label>
      <div className="flex shrink-0 items-center gap-2 text-[10px] text-gray-400">
        {milestone.targetAmount !== null && <span className="font-mono">KES {milestone.targetAmount.toLocaleString()}</span>}
        {milestone.dueDate && <span>Due {new Date(milestone.dueDate).toLocaleDateString("en-GB")}</span>}
        <button type="button" onClick={remove} disabled={busy} className="text-gray-300 hover:text-[#B22222]" aria-label="Remove phase">
          ×
        </button>
      </div>
    </div>
  );
}

function AddMilestoneForm({ projectId, onAdded, onCancel }: { projectId: string; onAdded: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) {
      setError("Phase title is required.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        targetAmount: targetAmount || undefined,
        dueDate: dueDate || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error || "Couldn't add phase");
      return;
    }
    onAdded();
  };

  return (
    <div className="mt-2 space-y-1.5 rounded-md border border-gray-200 bg-white p-2.5">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Phase title (e.g. Foundation)"
        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#024424]"
      />
      <div className="flex gap-1.5">
        <input
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          type="number"
          min="1"
          placeholder="Budget (optional)"
          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#024424]"
        />
        <input
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          type="date"
          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#024424]"
        />
      </div>
      {error && <p className="text-[10px] text-[#B22222]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-md bg-[#024424] px-3 py-1 text-xs font-bold text-white hover:bg-[#01331a] disabled:opacity-50"
        >
          {busy ? "Adding..." : "Add"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs font-bold text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
    </div>
  );
}
