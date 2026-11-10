/**
 * HEALML Enterprise – Client Overview View
 * Clean, professional SaaS overview in modern light mode (with dark mode support):
 * - 4 Core KPI cards
 * - Overhauled "Requires Attention" card detailing Dataset Name, Dataset ID, Project ID, Upload Date,
 *   exact issues detected, affected columns, affected row count, and prominent VIEW DATASET button.
 * - Active Working Dataset card
 * - Export & Certified PDF Reports
 */

import React from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FolderGit2,
  FileText,
  Download,
  ArrowRight,
  ShieldCheck,
  Activity,
  FileSpreadsheet,
  Calendar,
  Layers,
  ExternalLink,
  Zap
} from 'lucide-react';
import { Dataset, FaultEvent, VerificationStatus } from '../types/pipeline';
import { downloadHealedDatasetCsv, downloadHealedDatasetXlsx } from '../services/healedDatasetExporter';
import { ProjectItem } from '../types/auth';

interface ClientOverviewViewProps {
  datasetsCount: number;
  healedDatasetsCount: number;
  datasetsRequiringAttentionCount: number;
  activeJobsCount: number;
  latestDataset: Dataset;
  latestRecoveryStatus: VerificationStatus | 'NO_RECOVERY_YET';
  latestRecoveryDate?: string;
  hasActiveFaults: boolean;
  activeFaults?: FaultEvent[];
  activeProject?: ProjectItem | null;
  onNavigateTab: (tab: string) => void;
  onTriggerHealing: () => void;
}

export const ClientOverviewView: React.FC<ClientOverviewViewProps> = ({
  datasetsCount,
  healedDatasetsCount,
  datasetsRequiringAttentionCount,
  activeJobsCount,
  latestDataset,
  latestRecoveryStatus,
  latestRecoveryDate,
  hasActiveFaults,
  activeFaults = [],
  activeProject,
  onNavigateTab,
  onTriggerHealing,
}) => {
  const isHealed = latestDataset.isHealed || latestRecoveryStatus === 'VERIFIED_SUCCESS';
  const datasetId = latestDataset.id || `ds_${latestDataset.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  const projectId = activeProject?.id || latestDataset.projectId || 'prj_industrial_default';

  // Compute all affected columns across active faults
  const allAffectedCols = Array.from(
    new Set(activeFaults.flatMap((f) => f.affectedColumns || []))
  ).filter((col) => col !== 'ALL_COLUMNS');

  const totalAffectedRows = activeFaults.reduce((acc, f) => acc + (f.affectedRowCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Welcome & System Status Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Dataset Health & MLOps Dashboard
            </h1>
            <span className="text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
              Universal Self-Healing
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Autonomous data quality diagnostics, multi-problem detection, and verified pipeline recovery for industrial machine telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigateTab('upload')}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Upload Dataset</span>
          </button>
          <button
            onClick={() => onNavigateTab('detect')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5"
          >
            <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Scan Problems</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Uploaded Datasets */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Total Uploaded</span>
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {datasetsCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Active in workspace repository
          </div>
        </div>

        {/* Metric 2: Datasets Successfully Healed */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Successfully Healed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {healedDatasetsCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Verified post-repair scans
          </div>
        </div>

        {/* Metric 3: Datasets Requiring Attention */}
        <div className={`p-5 rounded-2xl border shadow-xs space-y-2 transition-colors ${
          datasetsRequiringAttentionCount > 0
            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
            : 'bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Requires Attention</span>
            <AlertTriangle className={`w-4 h-4 ${datasetsRequiringAttentionCount > 0 ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono ${datasetsRequiringAttentionCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400'}`}>
            {datasetsRequiringAttentionCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {datasetsRequiringAttentionCount > 0 ? 'Faults or corruptions detected' : 'All datasets healthy'}
          </div>
        </div>

        {/* Metric 4: Active Processing Jobs */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Active Jobs</span>
            <RefreshCw className={`w-4 h-4 ${activeJobsCount > 0 ? 'text-blue-600 animate-spin' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {activeJobsCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {activeJobsCount > 0 ? 'Diagnostic worker active' : 'Worker queue idle'}
          </div>
        </div>
      </div>

      {/* POINT 4: DEDICATED "REQUIRES ATTENTION" DATASET DETAIL BANNER */}
      {hasActiveFaults && (
        <div className="p-6 rounded-2xl bg-amber-50/80 dark:bg-[#1E1B13] border-2 border-amber-300 dark:border-amber-700 shadow-md space-y-5 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-amber-950 dark:text-amber-200">
                    Dataset Requires Immediate Attention
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                    {activeFaults.length} ISSUES IDENTIFIED
                  </span>
                </div>
                <p className="text-xs text-amber-900/80 dark:text-amber-300 mt-0.5">
                  Anomalies, sensor drift, or invalid telemetry detected. Autonomous healing is available to remediate these issues safely.
                </p>
              </div>
            </div>

            {/* PROMINENT VIEW DATASET BUTTON */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => onNavigateTab('explorer')}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
              >
                <span>VIEW DATASET</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigateTab('heal')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Heal Dataset</span>
              </button>
            </div>
          </div>

          {/* Dataset Identity & Diagnostic Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Dataset Name</span>
              <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                {latestDataset.name}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Dataset ID</span>
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-[11px] truncate block mt-0.5">
                {datasetId}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Project ID</span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-[11px] truncate block mt-0.5">
                {projectId}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Affected Telemetry</span>
              <span className="font-bold text-amber-700 dark:text-amber-400 block mt-0.5">
                {totalAffectedRows} rows across {allAffectedCols.length || 'multiple'} cols
              </span>
            </div>
          </div>

          {/* Detailed Issues Breakdown */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wider block font-mono">
              Exact Diagnostic Telemetry Findings:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {activeFaults.map((f, idx) => (
                <div
                  key={f.id || idx}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-slate-800 text-xs space-y-1 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {f.faultType.replace(/_/g, ' ')}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                      f.severity === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                        : f.severity === 'HIGH'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                    }`}>
                      {f.severity}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    {f.description}
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    <span>Columns:</span>
                    {f.affectedColumns.map((col) => (
                      <span key={col} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">
                        {col}
                      </span>
                    ))}
                    <span className="ml-auto font-bold text-amber-600 dark:text-amber-400">
                      {f.affectedRowCount} rows
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Working Dataset & Export Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Working Dataset */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <FolderGit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Active Working Dataset</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {latestDataset.rows.length.toLocaleString()} rows · {latestDataset.columns.length} columns
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Dataset Filename</div>
              <div className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {latestDataset.name}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Domain Classification</div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{latestDataset.domain}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Target Feature</div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono truncate">
                  {latestDataset.targetColumn || 'None (Unsupervised)'}
                </div>
              </div>
            </div>

            {/* Recovery Status Pill */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Latest Recovery Status</div>
                <div className="flex items-center gap-2 mt-1">
                  {latestRecoveryStatus === 'VERIFIED_SUCCESS' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>VERIFIED SUCCESS</span>
                    </span>
                  ) : hasActiveFaults ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>ATTENTION REQUIRED</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>NOMINAL</span>
                    </span>
                  )}
                  {latestRecoveryDate && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({latestRecoveryDate})
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('explorer')}
                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 dark:text-blue-300 text-xs font-semibold transition-colors"
              >
                Inspect Data
              </button>
            </div>
          </div>
        </div>

        {/* Export & Certified Reports */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Export & Certified Documentation</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Export verified cleaned datasets in CSV and Excel formats, or compile certified technical PDF reports with full statistical audit trails.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {/* Download Updated Dataset */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Download Working Dataset</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Available in CSV and Excel XLSX formats</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => downloadHealedDatasetCsv(`${latestDataset.name}_export`, latestDataset.rows, latestDataset.columns)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  CSV
                </button>
                <button
                  onClick={() => downloadHealedDatasetXlsx(`${latestDataset.name}_export`, latestDataset.rows, latestDataset.columns)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3 h-3" /> XLSX
                </button>
              </div>
            </div>

            {/* View Recovery Report */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Technical PDF Reports</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Identity, Information, Self-Healing & Model Ledgers</div>
              </div>
              <button
                onClick={() => onNavigateTab('reports')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Reports</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
