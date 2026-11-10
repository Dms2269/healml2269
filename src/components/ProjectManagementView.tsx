import React, { useState } from 'react';
import {
  FolderGit2,
  Plus,
  Layers,
  Database,
  Cpu,
  Calendar,
  ArrowRight,
  Search,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { ProjectItem } from '../types/auth';

interface ProjectManagementViewProps {
  projects: ProjectItem[];
  activeProject?: ProjectItem | null;
  onSelectProject: (project: ProjectItem) => void;
  onOpenCreateModal: () => void;
  onNavigateTab: (tab: string) => void;
}

export const ProjectManagementView: React.FC<ProjectManagementViewProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onOpenCreateModal,
  onNavigateTab,
}) => {
  const [search, setSearch] = useState('');

  const filteredProjects = projects.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Project Workspaces
            </h1>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Tenant Isolated
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage independent machine learning partitions. Datasets, self-healing transformations, and model runs are strictly isolated per project.
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Project Workspace</span>
        </button>
      </div>

      {/* Search & Counter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search projects by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Showing {filteredProjects.length} of {projects.length} workspaces
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0F172A] border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
          <FolderGit2 className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Project Workspaces Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Create your first project workspace to isolate industrial telemetry datasets, run autonomous self-healing, and track model version histories.
          </p>
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => {
            const isActive = activeProject?.id === p.id;
            return (
              <div
                key={p.id}
                className={`p-5 rounded-2xl bg-white dark:bg-[#0F172A] border transition-all shadow-xs flex flex-col justify-between space-y-4 ${
                  isActive
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                        <FolderGit2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.id}</div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                          {p.name}
                        </h3>
                      </div>
                    </div>
                    {isActive && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 shrink-0">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {p.description || 'Dedicated telemetry pipeline and failure prediction workspace.'}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[9px]">DATASETS</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{p.datasetCount ?? 1}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[9px]">MODELS</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{p.modelCount ?? 1}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Active'}</span>
                    </div>

                    <button
                      onClick={() => {
                        onSelectProject(p);
                        onNavigateTab('explorer');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-colors flex items-center gap-1"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
