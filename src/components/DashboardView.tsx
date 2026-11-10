/**
 * HEALML – Dashboard View
 * Displays high-level MLOps telemetry:
 * Total Records, Data Quality, Detected Faults, Anomalies, Recovery Count, Model Accuracy,
 * and live pipeline health status.
 * 
 * Note: Per project requirements, all PDF downloads and generation exist strictly
 * within the dedicated "PDF Reports" tab.
 */

import React from 'react';
import {
  Database,
  ShieldCheck,
  AlertTriangle,
  Search,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  Activity,
  History,
  Zap,
  FileText,
} from 'lucide-react';
import { PipelineSummary, StageState, RecoveryLog, ModelMetrics, FaultEvent } from '../types/pipeline';

interface DashboardViewProps {
  summary: PipelineSummary;
  stageStates: StageState[];
  recentRecoveries: RecoveryLog[];
  metrics?: ModelMetrics;
  activeFaults: FaultEvent[];
  onNavigateTab: (tab: string) => void;
  onRunPipeline: () => void;
  onTriggerHealing: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  stageStates,
  recentRecoveries,
  metrics,
  activeFaults,
  onNavigateTab,
  onRunPipeline,
  onTriggerHealing,
}) => {
  const isRegression = metrics?.taskType === 'regression';
  const isUnsupervised = metrics?.taskType === 'unsupervised';

  const kpiCards = [
    {
      label: 'Total Records',
      value: summary.totalRecords.toLocaleString(),
      subtext: `${summary.processedRecords} cleansed rows`,
      icon: Database,
      accentColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      label: 'Data Quality Index',
      value: `${summary.dataQualityScore}%`,
      subtext: summary.dataQualityScore > 85 ? 'High statistical integrity' : 'Corruptions detected',
      icon: ShieldCheck,
      accentColor: summary.dataQualityScore > 85 ? 'text-emerald-400' : 'text-amber-400',
      bgColor: summary.dataQualityScore > 85 ? 'bg-emerald-500/10' : 'bg-amber-500/10',
      borderColor: summary.dataQualityScore > 85 ? 'border-emerald-500/20' : 'border-amber-500/20',
    },
    {
      label: 'Detected Faults',
      value: summary.detectedFaultsCount.toString(),
      subtext: summary.detectedFaultsCount === 0 ? 'Zero active faults' : `${summary.detectedFaultsCount} require remediation`,
      icon: AlertTriangle,
      accentColor: summary.detectedFaultsCount === 0 ? 'text-slate-400' : 'text-rose-400',
      bgColor: summary.detectedFaultsCount === 0 ? 'bg-slate-800/40' : 'bg-rose-500/10',
      borderColor: summary.detectedFaultsCount === 0 ? 'border-slate-800' : 'border-rose-500/20',
    },
    {
      label: 'Isolation Anomalies',
      value: summary.anomaliesCount.toString(),
      subtext: 'Flagged by Isolation Forest',
      icon: Search,
      accentColor: summary.anomaliesCount > 0 ? 'text-amber-400' : 'text-slate-400',
      bgColor: summary.anomaliesCount > 0 ? 'bg-amber-500/10' : 'bg-slate-800/40',
      borderColor: summary.anomaliesCount > 0 ? 'border-amber-500/20' : 'border-slate-800',
    },
    {
      label: 'Verified Recoveries',
      value: summary.recoveriesCount.toString(),
      subtext: 'Committed to SQLite ledger',
      icon: History,
      accentColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    {
      label: isRegression ? 'Model R² Goodness' : isUnsupervised ? 'Cluster Reliability' : 'Model Accuracy',
      value: `${(summary.activeModelAccuracy * 100).toFixed(1)}%`,
      subtext: isRegression
        ? `RMSE: ${metrics?.rmse || 0} · MAE: ${metrics?.mae || 0}`
        : isUnsupervised
        ? 'Contamination: 8.0%'
        : metrics
        ? `W-F1: ${(metrics.weightedF1 * 100).toFixed(1)}%`
        : 'Model evaluated',
      icon: TrendingUp,
      accentColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Trigger Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              HEALML Autonomous Pipeline Console
            </h1>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                metrics?.trainingStatus === 'OPTIMAL' || !metrics?.trainingStatus
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : metrics?.trainingStatus === 'DEGRADED'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}
            >
              STATUS: {metrics?.trainingStatus || 'OPTIMAL'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 uppercase">
              {metrics?.taskType || 'SUPERVISED'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
              {summary.totalColumnsScanned} COLUMNS SCANNED
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
            <span>Universal Tabular Self-Healing Platform · All-Column Watchdog Active</span>
            {metrics?.lastExecutionTimestamp && (
              <span className="text-[11px] font-mono text-slate-500 border-l border-slate-700 pl-3">
                Last Run: {new Date(metrics.lastExecutionTimestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {activeFaults.length > 0 && (
            <button
              onClick={onTriggerHealing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Heal {activeFaults.length} Fault{activeFaults.length > 1 ? 's' : ''}</span>
            </button>
          )}
          <button
            onClick={() => onNavigateTab('reports')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>PDF Reports Hub</span>
          </button>
          <button
            onClick={() => onNavigateTab('faults')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Fault Lab</span>
          </button>
          <button
            onClick={() => onNavigateTab('code')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <span>Python Bundle</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Evaluation Failure Banner if applicable */}
      {metrics?.errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <span className="font-semibold text-xs">Model Pipeline Error: </span>
              <span className="text-xs">{metrics.errorMessage}</span>
            </div>
          </div>
          <button
            onClick={onRunPipeline}
            className="px-2.5 py-1 text-xs font-medium rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 transition-colors"
          >
            Retry Pipeline
          </button>
        </div>
      )}

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className={`p-4 rounded-xl bg-[#0F172A] border ${card.borderColor} flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  {card.label}
                </span>
                <div className={`p-1.5 rounded-md ${card.bgColor}`}>
                  <Icon className={`w-3.5 h-3.5 ${card.accentColor}`} />
                </div>
              </div>
              <div>
                <div className="text-xl font-bold font-mono tracking-tight text-white tabular-nums">
                  {card.value}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {card.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline Stage Health Strip */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Pipeline Stage Orchestration
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live operational state across autonomous pipeline stages
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('pipeline')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
          >
            <span>Detailed Workflow</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
          {stageStates.map((st) => {
            const isFaulted = st.status === 'faulted';
            const isHealed = st.status === 'healed';
            const isSuccess = st.status === 'success';

            return (
              <div
                key={st.stage}
                className={`p-3 rounded-lg border text-center transition-all ${
                  isFaulted
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                    : isHealed
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : isSuccess
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-[11px] font-semibold truncate capitalize">
                  {st.label}
                </div>
                <div className="text-[10px] font-mono mt-1 uppercase tracking-wider">
                  {st.status}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Active Faults & Recent SQLite Recoveries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Faults & Diagnostics */}
        <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Active Fault Watchdog
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {activeFaults.length} issues detected
              </span>
            </div>

            {activeFaults.length === 0 ? (
              <div className="p-8 rounded-lg bg-slate-900/40 border border-slate-800 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <div className="text-xs font-semibold text-slate-200">
                  All Pipeline Stages Nominal
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Zero missing data spikes, boundary violations, or model degradation detected.
                </p>
                <button
                  onClick={() => onNavigateTab('faults')}
                  className="mt-3.5 px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors"
                >
                  Simulate Fault Injection
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {activeFaults.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-rose-400 font-mono">
                          {f.faultType}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Stage: {f.stage}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        {f.description}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 italic">
                        Root cause: {f.rootCause}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                      {f.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activeFaults.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={onTriggerHealing}
                className="w-full py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Execute Self-Healing Remediation</span>
              </button>
            </div>
          )}
        </div>

        {/* Verified SQLite Recovery Audit Ledger */}
        <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  SQLite Recovery Audit Ledger
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('logs')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                View All
              </button>
            </div>

            {recentRecoveries.length === 0 ? (
              <div className="p-8 rounded-lg bg-slate-900/40 border border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  No recovery actions executed in this session yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {recentRecoveries.slice(0, 4).map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-400 font-mono">
                          {rec.actionTaken}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {rec.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        {rec.details}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-slate-400">
                        <span>Pre: {(rec.preRecoveryMetric * 100).toFixed(1)}%</span>
                        <span>Post: {(rec.postRecoveryMetric * 100).toFixed(1)}%</span>
                        <span className="text-emerald-400 font-semibold">
                          Δ +{(rec.verificationDelta * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                      {rec.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Verified operations logged to `recovery_logs`</span>
            <span className="font-mono text-slate-300">{recentRecoveries.length} entries</span>
          </div>
        </div>
      </div>
    </div>
  );
};
