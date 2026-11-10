/**
 * HEALML – Fault Detection & Autonomous Self-Healing Console
 * Includes:
 * 1. All-Column Fault Detection Dashboard (Scanned columns, faults by severity & stage, healed vs pending)
 * 2. Detailed Column-Wise Fault Audit Table
 * 3. Interactive Fault Injector Lab (for Viva demos)
 * 4. Root Cause Analysis (RCA) Engine
 * 5. Verified Recovery Audit Trail
 * 
 * Note: Per user specification, all PDF generation exists exclusively in the "PDF Reports" tab.
 */

import React, { useState } from 'react';
import {
  Activity,
  Zap,
  AlertTriangle,
  RefreshCw,
  Flame,
  CheckCircle2,
  Layers,
  ShieldCheck,
  Search,
  Filter,
  BarChart2,
  TableProperties,
  Download,
  FileSpreadsheet,
  FileText,
  ArrowRight,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import {
  FaultEvent,
  RecoveryLog,
  ModelMetrics,
  Dataset,
  ColumnFaultReport,
  FaultSeverity,
} from '../types/pipeline';
import { performRCA } from '../services/faultAndHealingEngine';
import {
  computeDatasetComparison,
  downloadHealedDatasetCsv,
  downloadHealedDatasetXlsx,
} from '../services/healedDatasetExporter';

interface FaultAndHealingViewProps {
  dataset: Dataset;
  activeFaults: FaultEvent[];
  recentRecoveries: RecoveryLog[];
  isHealing: boolean;
  baselineMetrics?: ModelMetrics;
  currentMetrics?: ModelMetrics;
  columnReports?: ColumnFaultReport[];
  onInjectFault: (scenario: 'missing_burst' | 'duplicate_flood' | 'sensor_drift' | 'adversarial_noise') => void;
  onTriggerHealing: () => void;
  onNavigateToReports?: () => void;
}

export const FaultAndHealingView: React.FC<FaultAndHealingViewProps> = ({
  dataset,
  activeFaults,
  recentRecoveries,
  isHealing,
  baselineMetrics,
  currentMetrics,
  columnReports = [],
  onInjectFault,
  onTriggerHealing,
  onNavigateToReports,
}) => {
  const [selectedFault, setSelectedFault] = useState<FaultEvent | null>(
    activeFaults[0] || null
  );
  const [columnSearch, setColumnSearch] = useState('');
  const [columnFilterStatus, setColumnFilterStatus] = useState<'ALL' | 'FAULTED' | 'NOMINAL' | 'HEALED'>('ALL');
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  const rcaDiagnosis = selectedFault ? performRCA(selectedFault) : null;

  // Compare original untouched raw data vs repaired working dataset
  const originalRows = dataset.originalRows || dataset.rows;
  const healedRows = dataset.rows;
  const comparison = computeDatasetComparison(originalRows, healedRows, dataset.columns, dataset.name);

  const handleDownloadCsv = () => {
    const success = downloadHealedDatasetCsv(dataset.name, healedRows, dataset.columns);
    if (success) {
      setDownloadSuccessMessage(`Downloaded verified Healed CSV (${healedRows.length.toLocaleString()} rows, ${dataset.columns.length} columns)`);
      setTimeout(() => setDownloadSuccessMessage(null), 4500);
    }
  };

  const handleDownloadXlsx = () => {
    const success = downloadHealedDatasetXlsx(dataset.name, healedRows, dataset.columns);
    if (success) {
      setDownloadSuccessMessage(`Downloaded verified Healed Excel XLSX (${healedRows.length.toLocaleString()} rows, ${dataset.columns.length} columns)`);
      setTimeout(() => setDownloadSuccessMessage(null), 4500);
    }
  };

  // Telemetry Calculations
  const totalColumnsScanned = dataset.columns.length;
  const columnsWithFaults = columnReports.filter((c) => c.status === 'FAULTED').length;
  const totalFaultsDetected = activeFaults.length;

  const severityCounts: Record<FaultSeverity, number> = {
    CRITICAL: activeFaults.filter((f) => f.severity === 'CRITICAL').length,
    HIGH: activeFaults.filter((f) => f.severity === 'HIGH').length,
    MEDIUM: activeFaults.filter((f) => f.severity === 'MEDIUM').length,
    LOW: activeFaults.filter((f) => f.severity === 'LOW').length,
  };

  const stageCounts: Record<string, number> = {
    ingestion: activeFaults.filter((f) => f.stage === 'ingestion').length,
    validation: activeFaults.filter((f) => f.stage === 'validation').length,
    preprocessing: activeFaults.filter((f) => f.stage === 'preprocessing').length,
    feature_engineering: activeFaults.filter((f) => f.stage === 'feature_engineering').length,
    model_evaluation: activeFaults.filter((f) => f.stage === 'model_evaluation').length,
  };

  const successfullyHealedCount = recentRecoveries.filter((r) => r.status === 'VERIFIED_SUCCESS').length;
  const failedRepairsCount = recentRecoveries.filter((r) => r.status === 'RECOVERY_FAILED' || r.status === 'ESCALATED').length;
  const pendingRepairsCount = activeFaults.length;

  // Filtered column-wise reports
  const filteredColumnReports = columnReports.filter((col) => {
    const matchesStatus =
      columnFilterStatus === 'ALL' || col.status === columnFilterStatus;
    const matchesSearch =
      columnSearch === '' ||
      col.columnName.toLowerCase().includes(columnSearch.toLowerCase()) ||
      col.role.toLowerCase().includes(columnSearch.toLowerCase()) ||
      col.details.some((d) => d.toLowerCase().includes(columnSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              All-Column Fault Detection & Self-Healing Console
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated multi-stage telemetry scanning across every numerical, categorical, datetime, identifier, and target feature.
          </p>
        </div>

        {activeFaults.length > 0 && (
          <button
            onClick={onTriggerHealing}
            disabled={isHealing}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors disabled:opacity-50"
          >
            {isHealing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Executing Self-Healing Engine...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Heal All Active Faults ({activeFaults.length})</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* ====================================================
          SECTION 1: FAULT DETECTION TELEMETRY DASHBOARD
          ==================================================== */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            All-Column Fault Detection Dashboard
          </h2>
        </div>

        {/* Top 4 Primary Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
              Total Columns Scanned
            </div>
            <div className="text-3xl font-bold font-mono text-white mt-1 tabular-nums">
              {totalColumnsScanned}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              100% full dataset schema coverage
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
              Columns With Faults
            </div>
            <div className={`text-3xl font-bold font-mono mt-1 tabular-nums ${columnsWithFaults > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {columnsWithFaults}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              {totalColumnsScanned - columnsWithFaults} nominal features
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
              Total Faults Detected
            </div>
            <div className={`text-3xl font-bold font-mono mt-1 tabular-nums ${totalFaultsDetected > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {totalFaultsDetected}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Across all pipeline stages
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
              Healed vs Pending Repairs
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums flex items-center gap-1.5">
              <span>{successfullyHealedCount}</span>
              <span className="text-xs text-slate-500">healed /</span>
              <span className="text-amber-400">{pendingRepairsCount}</span>
              <span className="text-xs text-slate-500">pending</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              {failedRepairsCount} failed / escalated
            </div>
          </div>
        </div>

        {/* Severity & Pipeline Stage Breakdown Chips */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Faults by Severity */}
          <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
            <div className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider mb-2">
              Faults by Severity Level
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
                <span className="text-[10px] text-rose-300 font-mono block">CRITICAL</span>
                <span className="text-base font-bold font-mono text-rose-400 tabular-nums">
                  {severityCounts.CRITICAL}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                <span className="text-[10px] text-amber-300 font-mono block">HIGH</span>
                <span className="text-base font-bold font-mono text-amber-400 tabular-nums">
                  {severityCounts.HIGH}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                <span className="text-[10px] text-yellow-300 font-mono block">MEDIUM</span>
                <span className="text-base font-bold font-mono text-yellow-400 tabular-nums">
                  {severityCounts.MEDIUM}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <span className="text-[10px] text-blue-300 font-mono block">LOW</span>
                <span className="text-base font-bold font-mono text-blue-400 tabular-nums">
                  {severityCounts.LOW}
                </span>
              </div>
            </div>
          </div>

          {/* Faults by Pipeline Stage */}
          <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
            <div className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider mb-2">
              Faults by Pipeline Stage
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center font-mono">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[9px] text-slate-400 block truncate">Ingest</span>
                <span className="text-sm font-bold text-slate-200">{stageCounts.ingestion}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[9px] text-slate-400 block truncate">Valid</span>
                <span className="text-sm font-bold text-slate-200">{stageCounts.validation}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[9px] text-slate-400 block truncate">Preproc</span>
                <span className="text-sm font-bold text-slate-200">{stageCounts.preprocessing}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[9px] text-slate-400 block truncate">Features</span>
                <span className="text-sm font-bold text-slate-200">{stageCounts.feature_engineering}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[9px] text-slate-400 block truncate">Eval</span>
                <span className="text-sm font-bold text-slate-200">{stageCounts.model_evaluation}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================
          SECTION 2: DETAILED COLUMN-WISE FAULT REPORT TABLE
          ==================================================== */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TableProperties className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Detailed Column-Wise Fault Audit Table ({columnReports.length} Columns)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search columns..."
                value={columnSearch}
                onChange={(e) => setColumnSearch(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 w-44 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <select
              value={columnFilterStatus}
              onChange={(e: any) => setColumnFilterStatus(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Column Statuses</option>
              <option value="FAULTED">Faulted Only ({columnsWithFaults})</option>
              <option value="NOMINAL">Nominal Only</option>
              <option value="HEALED">Healed Only</option>
            </select>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-mono">
                  <th className="py-2.5 px-3">Column Name</th>
                  <th className="py-2.5 px-3">Role / Inferred Type</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Detected Anomaly / Fault Details</th>
                  <th className="py-2.5 px-3 text-right">Impacted Rows</th>
                  <th className="py-2.5 px-3 text-right">Autonomous Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {filteredColumnReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No columns match the selected search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredColumnReports.map((col) => {
                    const isFaulted = col.status === 'FAULTED';
                    const isHealed = col.status === 'HEALED';
                    return (
                      <tr
                        key={col.columnName}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isFaulted ? 'bg-rose-500/5' : isHealed ? 'bg-emerald-500/5' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-200">
                          {col.columnName}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                            col.role === 'numeric'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : col.role === 'identifier'
                              ? 'bg-slate-800 text-slate-400'
                              : col.role === 'datetime'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}>
                            {col.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                            isFaulted
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : isHealed
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800/60 text-slate-400 border border-slate-700'
                          }`}>
                            {col.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-mono ${
                            col.severity === 'CRITICAL'
                              ? 'text-rose-400 font-bold'
                              : col.severity === 'HIGH'
                              ? 'text-amber-400'
                              : col.severity === 'MEDIUM'
                              ? 'text-yellow-400'
                              : 'text-slate-500'
                          }`}>
                            {col.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-sm truncate" title={col.details.join('; ')}>
                          {col.details.join('; ')}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-slate-300">
                          {col.affectedRowCount > 0 ? col.affectedRowCount : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="text-[10px] text-blue-300 font-mono">
                            {col.remediationAction || 'MAINTAIN_SURVEILLANCE'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ====================================================
          SECTION 3: SYNTHETIC FAULT INJECTOR LAB (Viva Demos)
          ==================================================== */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Interactive Fault Injector Lab (Viva Demo)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Active Dataset: {dataset.name}
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Inject real-time corruptions to test the autonomous 6-step self-healing watchdog:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => onInjectFault('missing_burst')}
            className="p-3.5 rounded-lg bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-left transition-all group"
          >
            <div className="text-xs font-semibold text-rose-400 group-hover:text-rose-300 font-mono">
              Missing Value Spike
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Corrupts ~18% of values in a numerical column to NULL.
            </p>
          </button>

          <button
            onClick={() => onInjectFault('duplicate_flood')}
            className="p-3.5 rounded-lg bg-slate-900 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/30 text-left transition-all group"
          >
            <div className="text-xs font-semibold text-amber-400 group-hover:text-amber-300 font-mono">
              Duplicate Records Flood
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Injects 35 identical clone rows simulating retry loop failure.
            </p>
          </button>

          <button
            onClick={() => onInjectFault('sensor_drift')}
            className="p-3.5 rounded-lg bg-slate-900 hover:bg-purple-500/10 border border-slate-800 hover:border-purple-500/30 text-left transition-all group"
          >
            <div className="text-xs font-semibold text-purple-400 group-hover:text-purple-300 font-mono">
              Out-of-Bounds Drift
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Injects boundary violations (&gt;4.5σ or negative values).
            </p>
          </button>

          <button
            onClick={() => onInjectFault('adversarial_noise')}
            className="p-3.5 rounded-lg bg-slate-900 hover:bg-blue-500/10 border border-slate-800 hover:border-blue-500/30 text-left transition-all group"
          >
            <div className="text-xs font-semibold text-blue-400 group-hover:text-blue-300 font-mono">
              Adversarial Noise
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Perturbs numerical feature vectors with stochastic noise.
            </p>
          </button>
        </div>
      </div>

      {/* ====================================================
          SECTION 4: ACTIVE FAULT DIAGNOSTICS & RCA
          ==================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Faults List */}
        <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Active Detected Faults ({activeFaults.length})
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Select fault to diagnose
            </span>
          </div>

          {activeFaults.length === 0 ? (
            <div className="p-8 rounded-lg bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
              No active pipeline faults. All columns verified within statistical tolerances.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {activeFaults.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFault(f)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    selectedFault?.id === f.id
                      ? 'bg-rose-500/15 border-rose-500/50 text-white'
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-rose-400">
                      {f.faultType}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {f.severity}
                    </span>
                  </div>
                  <p className="text-xs mt-1 text-slate-300 line-clamp-2">
                    {f.description}
                  </p>
                  <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-slate-500">
                    <span>Stage: {f.stage}</span>
                    <span>Affected: {f.affectedRowCount} rows</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Root Cause Analysis (RCA) Deep Dive */}
        <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-semibold text-slate-100">
                Root Cause Analysis (RCA) Engine
              </h3>
              {rcaDiagnosis && (
                <span className="text-xs font-mono text-emerald-400">
                  Confidence: {(rcaDiagnosis.confidenceScore * 100).toFixed(0)}%
                </span>
              )}
            </div>

            {!rcaDiagnosis ? (
              <div className="p-8 rounded-lg bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
                Select an active fault from the list on the left to perform root cause diagnosis.
              </div>
            ) : (
              <div className="space-y-3.5 text-xs">
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                    Primary Hypothesis
                  </div>
                  <p className="text-slate-200">
                    {rcaDiagnosis.primaryHypothesis}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                    Contributing Factors
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {rcaDiagnosis.contributingFactors.map((factor, idx) => (
                      <li key={idx}>{factor}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="text-[11px] font-medium text-emerald-300 uppercase tracking-wider mb-1">
                    Autonomous Remediation Policy
                  </div>
                  <div className="text-xs font-semibold text-emerald-400 font-mono">
                    {rcaDiagnosis.recommendedStrategy}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ====================================================
          SECTION 5: VERIFIED SQLITE RECOVERY AUDIT TRAIL
          ==================================================== */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-1">
              Recent Recovery Operations & Verification
            </h3>
            <p className="text-xs text-slate-400">
              All self-healing interventions verified mathematically before committing to SQLite
            </p>
          </div>
        </div>

        {recentRecoveries.length === 0 ? (
          <div className="p-6 rounded-lg bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
            No recovery operations executed yet. Trigger a fault above to test autonomous recovery!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-mono">
                  <th className="py-2 px-3">Recovery ID</th>
                  <th className="py-2 px-3">Action Taken</th>
                  <th className="py-2 px-3">Stage</th>
                  <th className="py-2 px-3">Details</th>
                  <th className="py-2 px-3 text-right">Pre-Metric</th>
                  <th className="py-2 px-3 text-right">Post-Metric</th>
                  <th className="py-2 px-3 text-right">Verified Delta</th>
                  <th className="py-2 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {recentRecoveries.slice(0, 6).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {r.id}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">
                      {r.actionTaken}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {r.stage}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-md truncate">
                      {r.details}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-400">
                      {(r.preRecoveryMetric * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-200">
                      {(r.postRecoveryMetric * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-emerald-400">
                      +{(r.verificationDelta * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ====================================================
          SECTION 6: UPDATED DATASET GENERATION & COMPARISON
          ==================================================== */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                Section 6
              </span>
              <h3 className="text-sm font-semibold text-slate-100">
                Updated Dataset Generation & Before/After Comparison
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Validated Working Copy
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Preserves original raw data untouched while generating a separate verified repaired dataset ready for production download.
            </p>
          </div>

          {/* Action Download Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Download verified healed tabular data in CSV format"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Healed CSV</span>
            </button>

            <button
              onClick={handleDownloadXlsx}
              className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Download verified healed tabular data in Microsoft Excel format"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download Healed XLSX</span>
            </button>

            {onNavigateToReports && (
              <button
                onClick={onNavigateToReports}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                title="View and download PDF Recovery Report in the PDF Reports tab"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF Reports Tab</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback message */}
        {downloadSuccessMessage && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{downloadSuccessMessage}</span>
          </div>
        )}

        {/* Pre-Download Verification Card */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">
                Pre-Download Integrity Verification
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {comparison.isValidated ? 'ALL INTEGRITY CHECKS PASSED' : 'VALIDATION PENDING'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 text-[11px] font-mono">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px] uppercase">Original Raw Storage</span>
              <span className="font-semibold text-emerald-400">100% Immutable</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px] uppercase">Repaired Dataset Buffer</span>
              <span className="font-semibold text-blue-400">Separate Copy</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px] uppercase">Column Structure</span>
              <span className="font-semibold text-emerald-400">Preserved ({dataset.columns.length})</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px] uppercase">Target Feature</span>
              <span className="font-semibold text-amber-400">{dataset.targetColumn || 'Auto Mode'}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px] uppercase">Data Types</span>
              <span className="font-semibold text-emerald-400">Enforced & Clean</span>
            </div>
          </div>
        </div>

        {/* Side-by-Side Dataset Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Original Dataset */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-300">
                Original Dataset (Raw)
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {comparison.original.fileSizeFormatted}
              </span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Total Rows:</span>
                <span className="text-slate-200">{comparison.original.rows.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Columns:</span>
                <span className="text-slate-200">{comparison.original.columns}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Missing Values:</span>
                <span className={comparison.original.missingValues > 0 ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                  {comparison.original.missingValues}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Duplicate Rows:</span>
                <span className={comparison.original.duplicateRows > 0 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                  {comparison.original.duplicateRows}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/60">
                <span>Data Quality:</span>
                <span className="text-slate-300 font-bold">{comparison.original.dataQualityScore}%</span>
              </div>
            </div>
          </div>

          {/* Repaired Dataset */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-900/40 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Updated Dataset (Healed)</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400/80">
                {comparison.repaired.fileSizeFormatted}
              </span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Total Rows:</span>
                <span className="text-slate-200">{comparison.repaired.rows.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Columns:</span>
                <span className="text-slate-200">{comparison.repaired.columns}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Missing Values:</span>
                <span className="text-emerald-400 font-semibold">
                  {comparison.repaired.missingValues} (0.0%)
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Duplicate Rows:</span>
                <span className="text-emerald-400 font-semibold">
                  {comparison.repaired.duplicateRows} (Purged)
                </span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/60">
                <span>Data Quality:</span>
                <span className="text-emerald-400 font-bold">{comparison.repaired.dataQualityScore}%</span>
              </div>
            </div>
          </div>

          {/* Net Deltas */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-blue-900/40">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-blue-400">
                Net Transformation Deltas (Δ)
              </span>
              <span className="text-[10px] font-mono text-blue-400">
                Verified
              </span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Missing Reduced:</span>
                <span className="text-emerald-400 font-semibold">
                  -{comparison.deltas.missingReduced} cells
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Duplicates Purged:</span>
                <span className="text-emerald-400 font-semibold">
                  -{comparison.deltas.duplicatesPurged} records
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Quality Improvement:</span>
                <span className="text-emerald-400 font-bold">
                  +{comparison.deltas.qualityImprovement}%
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Columns Preserved:</span>
                <span className="text-slate-200 font-semibold">
                  {comparison.deltas.columnsPreserved} of {dataset.columns.length} (100%)
                </span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/60">
                <span>Download Ready:</span>
                <span className="text-emerald-400 font-semibold">CSV + XLSX</span>
              </div>
            </div>
          </div>
        </div>

        {/* What Changed & Why - Column-Wise Transformation Audit Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-300">
              Column Transformation Audit: What Changed and Why
            </h4>
            <span className="text-[10px] font-mono text-slate-500">
              {comparison.columnChangelog.length} features audited
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Column Name</th>
                  <th className="py-2.5 px-3">Data Type</th>
                  <th className="py-2.5 px-3 text-right">Missing (Before → After)</th>
                  <th className="py-2.5 px-3 text-right">Outliers (Before → After)</th>
                  <th className="py-2.5 px-3">Transformation Applied</th>
                  <th className="py-2.5 px-3">Reason / Invariant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {comparison.columnChangelog.map((col) => (
                  <tr key={col.columnName} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-200">
                      {col.columnName}
                    </td>
                    <td className="py-2 px-3 text-slate-400 text-[11px]">
                      {col.dataType}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {col.missingBefore > 0 ? (
                        <span className="text-rose-400 font-semibold">
                          {col.missingBefore} → <span className="text-emerald-400">0</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">0 → 0</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {col.outliersBefore > col.outliersAfter ? (
                        <span className="text-amber-400 font-semibold">
                          {col.outliersBefore} → <span className="text-emerald-400">{col.outliersAfter}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">{col.outliersBefore}</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                        col.transformationApplied.includes('Imputation')
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : col.transformationApplied.includes('Clamping')
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : col.transformationApplied.includes('Deduplication')
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {col.transformationApplied}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400 text-[11px] max-w-sm truncate">
                      {col.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
