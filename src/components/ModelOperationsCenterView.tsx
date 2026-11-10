/**
 * HEALML Enterprise - Master Admin Full Model Operations Center
 * Dedicated top-level sub-view with persistent breadcrumb navigation:
 * - Platform Telemetry Grid (11 KPIs)
 * - Client-wise Deep Inspector (Projects, Datasets, Training Runs)
 * - Interactive 12-Stage Pipeline Visualizer
 * - Multi-Model Comparative Accuracy Leaderboard (ROC, Confusion Matrix, 5-Fold CV)
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  Cpu,
  Search,
  Filter,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Database,
  User,
  Clock,
  TrendingUp,
  FolderGit2,
  HardDrive,
  BarChart3,
  GitBranch,
  RefreshCw,
  Award,
  Zap,
  Sliders,
  FileSpreadsheet
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { UserProfile, ProjectItem, TrainingRunItem } from '../types/auth';

interface ModelOperationsCenterViewProps {
  currentUser: UserProfile;
  onBackToWorkstation: () => void;
}

export const ModelOperationsCenterView: React.FC<ModelOperationsCenterViewProps> = ({
  currentUser,
  onBackToWorkstation,
}) => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  
  // Filtering & Selection
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientDetail, setClientDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any>(null);

  // Leaderboard filters
  const [algoFilter, setAlgoFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const [overviewRes, lbRes] = await Promise.all([
        apiClient.getModelOperationsOverview(),
        apiClient.getModelOperationsLeaderboard(
          algoFilter !== 'ALL' ? algoFilter : undefined,
          statusFilter !== 'ALL' ? statusFilter : undefined
        )
      ]);
      setKpis(overviewRes.kpis);
      setClients(overviewRes.clients);
      setRecentRuns(overviewRes.recentRuns);
      setLeaderboard(lbRes.leaderboard);
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Failed to load Model Operations telemetry.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [algoFilter, statusFilter]);

  const handleSelectClient = async (clientId: string) => {
    setSelectedClientId(clientId);
    setDetailLoading(true);
    try {
      const res = await apiClient.getModelOperationsClient(clientId);
      setClientDetail(res);
      if (res.trainingRuns && res.trainingRuns.length > 0) {
        setSelectedRun(res.trainingRuns[0]);
      } else {
        setSelectedRun(null);
      }
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Failed to fetch client details.', type: 'error' });
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredClients = clients.filter(c => {
    if (!clientSearch) return true;
    const q = clientSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.clientId.toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q)
    );
  });

  const pipelineStages = [
    { num: 1, name: 'Data Ingestion & Hash Audit', desc: 'SHA-256 verification & format validation' },
    { num: 2, name: 'Schema Profiling & Type Inference', desc: 'Detect numeric vs categorical distributions' },
    { num: 3, name: 'Null Burst & Missing Scan', desc: 'Identify missingness rates and patterns' },
    { num: 4, name: 'Boundary Drift & Outlier Scan', desc: 'Z-score & IQR interquartile filtering' },
    { num: 5, name: 'Autonomous Imputation Healing', desc: 'Distribution-aware central tendency recovery' },
    { num: 6, name: 'Boundary Winsorization', desc: 'Autonomous threshold clamping on working copy' },
    { num: 7, name: 'Second-Pass Verification', desc: 'Confirm 0 post-repair anomalies or nulls' },
    { num: 8, name: 'Feature Normalization & MinMax', desc: 'Leakage-free standard scaling on train split' },
    { num: 9, name: 'Stratified Train/Holdout Split', desc: '80/20 train/test partition preserving labels' },
    { num: 10, name: '5-Fold Cross Validation', desc: 'Rigorous cross-validation across folds' },
    { num: 11, name: 'Multi-Algorithm Evaluation', desc: 'Benchmark RF, ET, GB & Logistic classifiers' },
    { num: 12, name: 'Audit Commit & Model Versioning', desc: 'Immutable snapshot & ledger registration' },
  ];

  return (
    <div className="space-y-6">
      {/* Persistent Breadcrumb Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToWorkstation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Admin Workstation</span>
          </button>
          <span className="text-slate-400">/</span>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Full Model Operations Center
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
              Enterprise Fleet Monitoring
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadOverview}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Fleet</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
          actionMsg.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300'
            : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {actionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">✕</button>
        </div>
      )}

      {/* 11 KEY PERFORMANCE INDICATORS GRID */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Clients</span>
              <User className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">{kpis.totalClients}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Active accounts</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Projects</span>
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">{kpis.activeProjects}</div>
            <div className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-0.5">Isolated workspaces</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Datasets</span>
              <Database className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">{kpis.activeDatasets}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{kpis.archivedDatasets} archived</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Training Runs</span>
              <Cpu className="w-3.5 h-3.5 text-violet-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">{kpis.totalTrainingRuns}</div>
            <div className="text-[10px] text-emerald-500 dark:text-emerald-400 mt-0.5">{kpis.optimalRuns} optimal</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Avg Accuracy</span>
              <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
            </div>
            <div className="text-xl font-bold text-teal-600 dark:text-teal-400 font-mono">
              {kpis.avgAccuracy > 0 ? (kpis.avgAccuracy * 100).toFixed(1) + '%' : '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Peak: {(kpis.maxAccuracy * 100).toFixed(1)}%</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Top Algorithm</span>
              <Award className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white truncate font-mono">
              {kpis.topAlgorithm}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Fleet Leader</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Train Time</span>
              <Clock className="w-3.5 h-3.5 text-sky-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {kpis.avgTrainDurationMs}ms
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Holdout evaluation</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Self-Healing</span>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
              {kpis.healingInterventions}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Repairs committed</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Failed Runs</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">
              {kpis.failedRuns}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{kpis.degradedRuns} degraded</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Storage</span>
              <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {kpis.storageMb} MB
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Encrypted datasets</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm col-span-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Pipeline Jobs</span>
              <Layers className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {kpis.totalJobs} Executions
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Auto-healing watchdog active</div>
          </div>
        </div>
      )}

      {/* SECTION 2: CLIENT-WISE DEEP INSPECTOR & PIPELINE TRACKER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Client Selector (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="p-4 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Client Model Fleet ({filteredClients.length})
              </h2>
              <span className="text-[10px] font-mono text-slate-400">Click to Inspect</span>
            </div>

            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search by client or email..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredClients.map((c) => {
                const isSelected = selectedClientId === c.clientId;
                return (
                  <div
                    key={c.clientId}
                    onClick={() => handleSelectClient(c.clientId)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-600/15 border-blue-500 text-blue-900 dark:text-blue-100 shadow-sm'
                        : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {c.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {c.totalModelsBuilt} models
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {c.email}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span>Latest: <strong className="text-slate-700 dark:text-slate-300">{c.latestModel}</strong></span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {c.latestAccuracy !== null && c.latestAccuracy !== undefined ? (c.latestAccuracy * 100).toFixed(1) + '%' : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Client Deep Dossier & Active Pipeline (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {detailLoading ? (
            <div className="p-12 text-center rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-mono">Loading client telemetry & training runs...</p>
            </div>
          ) : clientDetail ? (
            <div className="space-y-4">
              {/* Client Header Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {clientDetail.client.name}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold">
                      {clientDetail.client.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {clientDetail.client.email} • {clientDetail.client.company || 'Enterprise Client'}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <div className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 mr-1">Projects:</span>
                    <strong>{clientDetail.stats.totalProjects}</strong>
                  </div>
                  <div className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 mr-1">Datasets:</span>
                    <strong>{clientDetail.stats.activeDatasets}</strong>
                  </div>
                  <div className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    <span className="text-slate-400 mr-1">Best Acc:</span>
                    <strong>{clientDetail.stats.bestAccuracy ? (clientDetail.stats.bestAccuracy * 100).toFixed(1) + '%' : '—'}</strong>
                  </div>
                </div>
              </div>

              {/* Client's Immutable Training Runs Table */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-blue-500" />
                    <span>Immutable Training Runs ({clientDetail.trainingRuns.length})</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">Click a row to inspect metrics</span>
                </div>

                {clientDetail.trainingRuns.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    No models trained yet for this client.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-50 dark:bg-slate-900/60 text-[10px] uppercase font-mono tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Model</th>
                          <th className="py-2.5 px-3">Project</th>
                          <th className="py-2.5 px-3">Dataset</th>
                          <th className="py-2.5 px-3">Accuracy</th>
                          <th className="py-2.5 px-3">F1-Score</th>
                          <th className="py-2.5 px-3">Train Time</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                        {clientDetail.trainingRuns.map((r: any) => {
                          const isCur = selectedRun?.id === r.id;
                          return (
                            <tr
                              key={r.id}
                              onClick={() => setSelectedRun(r)}
                              className={`cursor-pointer transition-colors ${
                                isCur
                                  ? 'bg-blue-50/80 dark:bg-blue-600/20 font-bold text-blue-900 dark:text-white'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              <td className="py-2 px-3 font-sans font-semibold">
                                {r.modelName} <span className="text-[10px] text-slate-400">{r.modelVersion}</span>
                              </td>
                              <td className="py-2 px-3 font-sans truncate max-w-[120px]">{r.projectName}</td>
                              <td className="py-2 px-3 font-sans truncate max-w-[120px]">{r.datasetName}</td>
                              <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                                {r.testAccuracy !== null && r.testAccuracy !== undefined ? (r.testAccuracy * 100).toFixed(1) + '%' : '—'}
                              </td>
                              <td className="py-2 px-3">
                                {r.f1Score !== null && r.f1Score !== undefined ? (r.f1Score * 100).toFixed(1) + '%' : '—'}
                              </td>
                              <td className="py-2 px-3">{r.trainDurationMs}ms</td>
                              <td className="py-2 px-3 font-sans">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  r.trainingStatus === 'OPTIMAL'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                    : r.trainingStatus === 'DEGRADED'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                                }`}>
                                  {r.trainingStatus}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right text-slate-400">
                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Selected Run Detailed Breakdown (Holdout metrics, Confusion Matrix, 5-Fold CV) */}
              {selectedRun && (
                <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-sm">{selectedRun.modelName} ({selectedRun.modelVersion})</span>
                      <span className="text-[10px] font-mono text-slate-400">ID: {selectedRun.id}</span>
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      Target: <strong className="text-white">{selectedRun.targetColumn}</strong> • Algorithm: <strong className="text-blue-400">{selectedRun.algorithmType}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 block">Test Accuracy</span>
                      <span className="text-base font-bold text-emerald-400 font-mono">
                        {selectedRun.testAccuracy ? (selectedRun.testAccuracy * 100).toFixed(2) + '%' : '—'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 block">Balanced Accuracy</span>
                      <span className="text-base font-bold text-teal-400 font-mono">
                        {selectedRun.balancedAccuracy ? (selectedRun.balancedAccuracy * 100).toFixed(2) + '%' : '—'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 block">Precision / Recall</span>
                      <span className="text-base font-bold text-sky-400 font-mono">
                        {selectedRun.precision ? (selectedRun.precision * 100).toFixed(1) + '%' : '—'} / {selectedRun.recall ? (selectedRun.recall * 100).toFixed(1) + '%' : '—'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 block">ROC-AUC</span>
                      <span className="text-base font-bold text-indigo-400 font-mono">
                        {selectedRun.rocAuc ? (selectedRun.rocAuc * 100).toFixed(2) + '%' : '—'}
                      </span>
                    </div>
                  </div>

                  {/* 5-Fold Cross Validation Fold Scores */}
                  {selectedRun.cvScores && selectedRun.cvScores.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                        5-Fold Cross Validation Scores
                      </span>
                      <div className="grid grid-cols-5 gap-2">
                        {selectedRun.cvScores.map((score: number, idx: number) => (
                          <div key={idx} className="p-2 rounded bg-slate-800 border border-slate-700 text-center font-mono text-xs">
                            <span className="text-[10px] text-slate-400 block">Fold {idx + 1}</span>
                            <span className="font-bold text-emerald-400">{(score * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confusion Matrix Table */}
                  {selectedRun.confusionMatrix && selectedRun.confusionMatrix.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                        Holdout Confusion Matrix
                      </span>
                      <div className="p-3 rounded-lg bg-slate-800/90 border border-slate-700 overflow-x-auto">
                        <table className="text-center font-mono text-xs mx-auto">
                          <tbody>
                            {selectedRun.confusionMatrix.map((row: any[], rIdx: number) => (
                              <tr key={rIdx}>
                                <td className="p-2 text-[10px] text-slate-400 font-sans font-medium">True Class {rIdx}</td>
                                {row.map((val: number, cIdx: number) => (
                                  <td
                                    key={cIdx}
                                    className={`p-2 min-w-[70px] border border-slate-700 rounded ${
                                      rIdx === cIdx
                                        ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                                        : 'bg-rose-500/10 text-rose-300'
                                    }`}
                                  >
                                    {val}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              Select a client from the left directory to inspect their isolated projects, datasets, and immutable ML model training records.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: INTERACTIVE 12-STAGE PIPELINE VISUALIZER */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <span>Universal 12-Stage Self-Healing & Training Pipeline Tracker</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Strict execution lifecycle with anti-leakage guards, holdout splits, and automated ledger commits
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
            Pipeline Nominal
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {pipelineStages.map((stage) => (
            <div
              key={stage.num}
              className="p-3 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1.5 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center font-mono text-[10px] font-bold">
                  {stage.num}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {stage.name}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {stage.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: COMPARATIVE MULTI-MODEL ACCURACY LEADERBOARD */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <span>Comparative Multi-Model Fleet Leaderboard</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ranked cross-client model benchmark based on actual holdout test accuracy and cross-validation
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={algoFilter}
              onChange={(e) => setAlgoFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All Algorithms</option>
              <option value="RandomForest">Random Forest</option>
              <option value="ExtraTrees">Extra Trees</option>
              <option value="GradientBoosting">Gradient Boosting</option>
              <option value="LogisticRegression">Logistic Regression</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPTIMAL">OPTIMAL</option>
              <option value="DEGRADED">DEGRADED</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-[10px] uppercase font-mono tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Client</th>
                <th className="py-2.5 px-3">Project</th>
                <th className="py-2.5 px-3">Dataset</th>
                <th className="py-2.5 px-3">Test Accuracy</th>
                <th className="py-2.5 px-3">Balanced Acc</th>
                <th className="py-2.5 px-3">F1-Score</th>
                <th className="py-2.5 px-3">Train Duration</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[11px]">
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 font-sans">
                    No evaluated models matching the selected filters.
                  </td>
                </tr>
              ) : (
                leaderboard.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                    <td className="py-2.5 px-3 font-bold text-slate-400">
                      #{idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {idx === 0 && <Award className="w-3.5 h-3.5 text-amber-500" />}
                      <span>{item.modelName}</span>
                      <span className="text-[10px] text-slate-400">{item.modelVersion}</span>
                    </td>
                    <td className="py-2.5 px-3 font-sans truncate max-w-[130px]">{item.clientName}</td>
                    <td className="py-2.5 px-3 font-sans truncate max-w-[130px]">{item.projectName}</td>
                    <td className="py-2.5 px-3 font-sans truncate max-w-[130px]">{item.datasetName}</td>
                    <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                      {item.testAccuracy !== null && item.testAccuracy !== undefined ? (item.testAccuracy * 100).toFixed(2) + '%' : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      {item.balancedAccuracy !== null && item.balancedAccuracy !== undefined ? (item.balancedAccuracy * 100).toFixed(2) + '%' : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      {item.f1Score !== null && item.f1Score !== undefined ? (item.f1Score * 100).toFixed(2) + '%' : '—'}
                    </td>
                    <td className="py-2.5 px-3">{item.trainDurationMs}ms</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        item.trainingStatus === 'OPTIMAL'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : item.trainingStatus === 'DEGRADED'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                      }`}>
                        {item.trainingStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400 font-sans text-[10px]">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
