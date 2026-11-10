import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Play,
  RefreshCw,
  User,
  LogIn,
  LogOut,
  Sun,
  Moon,
  Cpu,
  ShieldAlert,
  FolderGit2,
  ChevronDown,
  Plus,
  Check,
  LayoutDashboard,
  Layers,
  Activity,
  FolderKanban,
  Wifi,
  WifiOff
} from 'lucide-react';
import { UserProfile, ProjectItem } from '../types/auth';
import { apiClient } from '../services/apiClient';
import { PWAInstallButton } from './PWAInstallButton';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isRunningPipeline: boolean;
  onRunDiagnostics: () => void;
  pipelineHealth: 'OPTIMAL' | 'DEGRADED' | 'HEALING' | 'ERROR';
  currentUser?: UserProfile | null;
  projects?: ProjectItem[];
  activeProject?: ProjectItem | null;
  onSelectProject?: (project: ProjectItem) => void;
  onProjectCreated?: (project: ProjectItem) => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isRunningPipeline,
  onRunDiagnostics,
  currentUser,
  projects = [],
  activeProject,
  onSelectProject,
  onProjectCreated,
  onOpenAuthModal,
  onLogout,
}) => {
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MASTER_ADMIN';
  const isOnline = useOnlineStatus();

  // Project Switcher dropdown & modal states
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [createProjectError, setCreateProjectError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setIsCreatingProject(true);
    setCreateProjectError(null);
    try {
      const res = await apiClient.createProject(newProjectName.trim(), newProjectDesc.trim());
      if (onProjectCreated) {
        onProjectCreated(res.project);
      }
      setCreateModalOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      setProjectDropdownOpen(false);
    } catch (err: any) {
      setCreateProjectError(err.message || 'Failed to create project.');
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Theme toggle state (defaults to Modern Clean SaaS Light Theme, with Dark Mode toggle)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('healml_theme');
    if (saved) return saved === 'dark';
    return false; // Modern Clean SaaS Light Theme default
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('healml_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('healml_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Workspace sub-tabs check
  const isWorkspaceTab = [
    'workspace',
    'upload',
    'explorer',
    'detect',
    'heal',
    'updated',
    'history',
    'model_history',
    'reports'
  ].includes(activeTab);

  return (
    <header className="bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 shrink-0 sticky top-0 z-40 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 h-16">
        {/* Left: Brand Logo & Project Switcher */}
        <div className="flex items-center gap-4 shrink-0">
          <div
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap group select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  HEALML
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  ENTERPRISE
                </span>
              </div>
              <span className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 font-sans leading-none">
                Self-Healing MLOps
              </span>
            </div>
          </div>

          {/* Project Switcher Dropdown */}
          {currentUser && (
            <div className="relative pl-3 border-l border-slate-200 dark:border-slate-800" ref={dropdownRef}>
              <button
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
                title="Switch Active Project Workspace"
              >
                <FolderGit2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="text-left hidden sm:block">
                  <span className="block text-[9px] text-slate-400 font-mono leading-none">PROJECT</span>
                  <span className="font-semibold max-w-[130px] truncate block leading-tight">
                    {activeProject?.name || 'Primary Workspace'}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {projectDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 space-y-1">
                  <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    <span>Projects ({projects.length})</span>
                    <button
                      onClick={() => {
                        setCreateModalOpen(true);
                        setProjectDropdownOpen(false);
                      }}
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New</span>
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {projects.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No projects created yet.
                      </div>
                    ) : (
                      projects.map((p) => {
                        const isSelected = activeProject?.id === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              if (onSelectProject) onSelectProject(p);
                              setProjectDropdownOpen(false);
                            }}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-900 dark:text-blue-200 font-semibold'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="truncate mr-2">
                              <div className="truncate text-xs">{p.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">{p.id}</div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setCreateModalOpen(true);
                        setProjectDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Project</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Single, Unified Primary Navigation */}
        {currentUser && (
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'overview'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'projects'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span>Projects</span>
            </button>

            <button
              onClick={() => setActiveTab(isWorkspaceTab ? activeTab : 'explorer')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                isWorkspaceTab
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Main Workspace</span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'activity'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Activity</span>
            </button>

            {/* Admin Independent Main Tab: Admin Workstation */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin_workstation')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'admin_workstation' || activeTab === 'model_operations'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>Admin Workstation</span>
              </button>
            )}

            {/* Admin Grouped Main Tab: Admin Management */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin_management')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'admin_management'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Admin Management</span>
              </button>
            )}
          </nav>
        )}

        {/* Right: Actions, PWA, Network Status, Theme Toggle, Profile */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* PWA In-App Install Button */}
          <PWAInstallButton />

          {/* Network Offline / Online Badge */}
          <div
            className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono ${
              isOnline
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
            }`}
            title={isOnline ? 'Online - Synchronized with backend' : 'Offline - Local storage buffer active'}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </div>

          {/* Theme Toggle Button (Light SaaS default, Dark mode option) */}
          <button
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to Clean Light SaaS Theme' : 'Switch to Dark Theme'}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Profile & Auth CTAs */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('settings')}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                title="Profile & Preferences"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs">
                  {currentUser.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden xl:block">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight truncate max-w-[110px]">
                    {currentUser.fullName}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {currentUser.role}
                  </span>
                </div>
              </button>

              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-500 border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}

          {currentUser && (
            <button
              onClick={onRunDiagnostics}
              disabled={isRunningPipeline}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm shadow-blue-500/20 transition-all whitespace-nowrap shrink-0"
              title="Run quality diagnostics and problem detection without retraining models"
            >
              {isRunningPipeline ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Scanning...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Run Diagnostics</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Quick-Create Project Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 flex items-center justify-center">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Create New Project Workspace
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Isolated workspace for datasets, models, and evaluation runs
                </p>
              </div>
            </div>

            {createProjectError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
                {createProjectError}
              </div>
            )}

            <form onSubmit={handleCreateProjectSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Industrial Turbine Vibration Analysis"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Goals, target failure mode, or equipment partition details..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim() || isCreatingProject}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 transition-all shadow-sm shadow-blue-600/30"
                >
                  {isCreatingProject ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
