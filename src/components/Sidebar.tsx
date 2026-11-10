/**
 * HEALML - Sidebar Component
 * Provides clean MLOps navigation, active dataset indicator,
 * and pipeline health status monitoring.
 */

import React from 'react';
import {
  LayoutDashboard,
  Upload,
  Database,
  Search,
  Zap,
  FileSpreadsheet,
  FileText,
  History,
  Activity,
  Settings,
  FolderGit2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  X,
  Cpu,
} from 'lucide-react';
import { UserProfile, ProjectItem } from '../types/auth';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  datasetName: string;
  totalRecords: number;
  pipelineHealth: 'OPTIMAL' | 'DEGRADED' | 'HEALING' | 'ERROR';
  faultCount: number;
  anomalyCount: number;
  reportCount?: number;
  currentUser?: UserProfile | null;
  activeProject?: ProjectItem | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  datasetName,
  totalRecords,
  pipelineHealth,
  faultCount,
  reportCount = 0,
  currentUser,
  activeProject,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  // The Exact Client Navigation Items (Including Model Version History)
  const clientMenuItems = [
    { id: 'overview', label: '1. Overview', icon: LayoutDashboard },
    { id: 'upload', label: '2. Upload Dataset', icon: Upload },
    { id: 'explorer', label: '3. Dataset Explorer', icon: Database },
    { id: 'detect', label: '4. Detect Data Problems', icon: Search, badge: faultCount > 0 ? `${faultCount}` : undefined },
    { id: 'heal', label: '5. Heal Dataset', icon: Zap },
    { id: 'updated', label: '6. Updated Dataset', icon: FileSpreadsheet },
    { id: 'reports', label: '7. PDF Reports', icon: FileText, badge: reportCount > 0 ? `${reportCount}` : undefined },
    { id: 'history', label: '8. Dataset Inventory & History', icon: History },
    { id: 'model_history', label: '8b. Model Version History', icon: Cpu },
    { id: 'activity', label: '9. My Activity', icon: Activity },
    { id: 'settings', label: '10. Profile Settings', icon: Settings },
  ];

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`w-64 bg-white dark:bg-[#0F172A] border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-57px)] transition-transform duration-200 z-50 ${
          isOpenMobile
            ? 'fixed inset-y-0 left-0 pt-14 lg:pt-0 translate-x-0'
            : 'hidden lg:flex'
        }`}
      >
        {/* Mobile Close Button */}
        {isOpenMobile && (
          <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 lg:hidden">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Workspace Menu</span>
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Current Workspace & Dataset Context */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800/80 space-y-2">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-0.5">
              Project Workspace
            </div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={activeProject?.name || 'Primary Workspace'}>
              {activeProject?.name || 'Primary Workspace'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Active Dataset</span>
              <span className="font-mono text-blue-600 dark:text-blue-400 tabular-nums">{totalRecords} rows</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={datasetName}>
              <FolderGit2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate">{datasetName}</span>
            </div>
          </div>
        </div>

        {/* 10 Navigation Links for Client */}
        <div className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-1">
            Client Workspace
          </div>
          {clientMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/10 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Admin Station Switchers (Only for Admins) */}
          {isAdmin && (
            <div className="pt-3 mt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400/80 px-3 py-1">
                Supervision
              </div>
              {/* Option 1: Admin Workstation */}
              <button
                onClick={() => handleTabClick('admin_workstation')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'admin_workstation' || activeTab === 'admin'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Activity className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
                  <span className="truncate">Admin Workstation</span>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  ML Tech
                </span>
              </button>

              {/* Option 1b: Model Operations Center */}
              <button
                onClick={() => handleTabClick('model_operations')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'model_operations'
                    ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Cpu className="w-4 h-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
                  <span className="truncate">Model Operations</span>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                  Fleet
                </span>
              </button>

              {/* Option 2: Admin Management */}
              <button
                onClick={() => handleTabClick('admin_management')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'admin_management'
                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-blue-500 dark:text-blue-400" />
                  <span className="truncate">Admin Management</span>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                  12 Sec
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Pipeline Status Indicator Panel */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Pipeline Health
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              {pipelineHealth === 'OPTIMAL' && <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
              {pipelineHealth === 'DEGRADED' && <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />}
              {pipelineHealth === 'HEALING' && <RefreshCw className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-spin" />}
              {pipelineHealth === 'ERROR' && <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{pipelineHealth}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {pipelineHealth === 'OPTIMAL' ? 'Nominal' : pipelineHealth === 'HEALING' ? 'Repairing' : 'Degraded'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
