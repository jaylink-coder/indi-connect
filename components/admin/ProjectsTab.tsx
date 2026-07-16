"use client";

import { useEffect, useState } from "react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  targetAmount: number;
  raisedAmount: number;
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
      body: JSON.stringify({ name: projectName, description: projectDesc || undefined, targetAmount: Number(projectTarget) }),
    });
    setCreatingProject(false);
    if (response.ok) {
      setProjectName("");
      setProjectTarget("");
      setProjectDesc("");
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
            {projects.map((project) => {
              const pct = project.targetAmount > 0 ? (project.raisedAmount / project.targetAmount) * 100 : 0;
              return (
                <div key={project.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900">{project.name}</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-gray-500">{project.status}</span>
                  </div>
                  {project.description && <p className="mt-1 text-xs text-gray-500">{project.description}</p>}
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-[#024424]" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <span>Raised: KES {project.raisedAmount.toLocaleString()}</span>
                    <span>Target: KES {project.targetAmount.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
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
          <input
            value={projectTarget}
            onChange={(e) => setProjectTarget(e.target.value)}
            type="number"
            min="1"
            placeholder="Target amount (KES)"
            required
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#024424]"
          />
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
