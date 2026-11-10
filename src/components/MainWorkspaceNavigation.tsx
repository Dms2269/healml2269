import React from 'react';
import {
  FileSpreadsheet,
  Upload,
  AlertTriangle,
  Zap,
  CheckCircle2,
  History,
  Cpu,
  FileText
} from 'lucide-react';

interface MainWorkspaceNavigationProps {
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  faultsCount?: number;
  isHealed?: boolean;
}

export const MainWorkspaceNavigation: React.FC<MainWorkspaceNavigationProps> = ({
  activeTab,
  onNavigateTab,
  faultsCount = 0,
  isHealed = false,
}) => {
  const tabs = [
    { id: 'explorer', label: 'Dataset Explorer', icon: FileSpreadsheet },
    { id: 'upload', label: 'Upload Dataset', icon: Upload },
    { id: 'detect', label: 'Data Problems', icon: AlertTriangle, badge: faultsCount > 0 ? faultsCount : undefined, alert: faultsCount > 0 },
    { id: 'heal', label: 'Self-Healing Engine', icon: Zap },
    { id: 'updated', label: 'Updated Dataset', icon: CheckCircle2, success: isHealed },
    { id: 'history', label: 'Dataset History', icon: History },
    { id: 'model_history', label: 'Model Version History', icon: Cpu },
    { id: 'reports', label: 'PDF Reports', icon: FileText },
  ];

  return (
    <div className="mb-6 p-1.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-1 overflow-x-auto scrollbar-none transition-colors">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onNavigateTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              isActive
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
