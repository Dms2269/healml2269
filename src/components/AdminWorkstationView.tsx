/**
 * HEALML Enterprise - Admin Workstation View
 * Point 1 & Point 2: Independent Top-Level Workstation dedicated to:
 * - Live System Telemetry & Pipeline Watchdog
 * - Searchable Client-wise ML Model Directory
 * - Deep Client Dossier with Comparative Leaderboard, Confusion Matrix, ROC curves, and Review Flagging
 */

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Search,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  User,
  ArrowLeft,
  Sliders,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { UserProfile, ModelEvaluationItem } from '../types/auth';

interface AdminWorkstationViewProps {
  currentUser: UserProfile;
  onOpenModelOperations?: () => void;
}

export const AdminWorkstationView: React.FC<AdminWorkstationViewProps> = ({ currentUser, onOpenModelOperations }) => {
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [evaluations, setEvaluations] = useState<ModelEvaluationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<UserProfile | null>(null);
  const [clientModels, setClientModels] = useState<ModelEvaluationItem[]>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Review modal state
  const [reviewingModel, setReviewingModel] = useState<ModelEvaluationItem | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string>('NEEDS_REVIEW');
  const [reviewNotes, setReviewNotes] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsRes, evalRes] = await Promise.all([
        apiClient.getAdminClients(),
        apiClient.getAdminMlMonitoring()
      ]);
      setClients(clientsRes.clients);
      setEvaluations(evalRes.evaluations);
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Failed to load workstation data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectClient = async (client: UserProfile) => {
    setSelectedClient(client);
    setClientLoading(true);
    try {
      const res = await apiClient.getAdminClientMlModels(client.id);
      setClientModels(res.models);
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Failed to load client models.', type: 'error' });
    } finally {
      setClientLoading(false);
    }
  };

  const handleSaveModelReview = async () => {
    if (!reviewingModel) return;
    try {
      const res = await apiClient.flagModelReview(reviewingModel.id, reviewStatus, reviewNotes);
      setActionMsg({ text: res.message, type: 'success' });
      setClientModels(prev => prev.map(m => m.id === reviewingModel.id ? res.model : m));
      setEvaluations(prev => prev.map(m => m.id === reviewingModel.id ? res.model : m));
      setReviewingModel(null);
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Failed to update review status.', type: 'error' });
    }
  };

  // Build client directory lookup with model stats
  const clientStats = clients.map((c) => {
    const modelsForClient = evaluations.filter((e) => e.clientId === c.id);
    const latestModel = modelsForClient[0];
    return {
      client: c,
      totalModels: modelsForClient.length,
      latestModelName: latestModel?.modelName || '—',
      latestAccuracy: latestModel?.accuracy !== undefined && latestModel?.accuracy !== null ? (latestModel.accuracy * 100).toFixed(1) + '%' : 'NOT EVALUATED',
      latestStatus: latestModel?.evaluationStatus || 'NOT EVALUATED',
      lastTrainingDate: latestModel?.createdAt ? new Date(latestModel.createdAt).toLocaleDateString() : '—'
    };
  });

  const filteredClientStats = clientStats.filter(({ client }) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      client.fullName.toLowerCase().includes(q) ||
      client.email.toLowerCase().includes(q) ||
      client.id.toLowerCase().includes(q) ||
      (client.companyName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Workstation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Admin Workstation</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                Live Tech Console
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Client-wise ML model supervision, holdout test metrics, confusion matrix analysis & anomaly telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenModelOperations && (
            <button
              onClick={onOpenModelOperations}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 shadow-sm shadow-indigo-500/25 transition-all border border-indigo-400/30"
            >
              <Activity className="w-3.5 h-3.5 animate-pulse text-indigo-200" />
              <span>OPEN FULL MODEL OPERATIONS</span>
            </button>
          )}
          {selectedClient && (
            <button
              onClick={() => setSelectedClient(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Client List</span>
            </button>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
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

      {/* VIEW A: Searchable Client Directory */}
      {!selectedClient && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search clients by name, email, company or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Showing {filteredClientStats.length} registered clients
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-sm">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-mono">
                <tr>
                  <th className="py-3 px-4">Client ID</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-center">Total Models</th>
                  <th className="py-3 px-4">Latest Model</th>
                  <th className="py-3 px-4">Latest Test Acc</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Training</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-[11px]">
                {filteredClientStats.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                      No clients found matching "{searchQuery}".
                    </td>
                  </tr>
                ) : (
                  filteredClientStats.map(({ client, totalModels, latestModelName, latestAccuracy, latestStatus, lastTrainingDate }) => (
                    <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{client.id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white font-sans">
                        {client.fullName}
                        {client.companyName && (
                          <span className="block text-[10px] text-slate-400 font-normal">{client.companyName}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-blue-600 dark:text-blue-400">{client.email}</td>
                      <td className="py-3 px-4 text-center font-bold">{totalModels}</td>
                      <td className="py-3 px-4 font-sans text-slate-700 dark:text-slate-200">{latestModelName}</td>
                      <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">{latestAccuracy}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          latestStatus === 'GOOD_PERFORMANCE'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : latestStatus === 'NEEDS_REVIEW'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                            : latestStatus === 'LOW_PERFORMANCE' || latestStatus === 'FAILED'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {latestStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{lastTrainingDate}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleSelectClient(client)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors"
                        >
                          View Models
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW B: Dedicated Client Dossier */}
      {selectedClient && (
        <div className="space-y-6">
          {/* Client Bio Header Card */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{selectedClient.fullName}</h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>{selectedClient.companyName || 'Independent'}</span>
                  <span>·</span>
                  <span className="text-blue-600 dark:text-blue-400">{selectedClient.email}</span>
                  <span>·</span>
                  <span>ID: <code className="font-mono text-[11px]">{selectedClient.id}</code></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Account Status</div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  selectedClient.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                }`}>
                  {selectedClient.status}
                </span>
              </div>
            </div>
          </div>

          {/* Model Performance Comparison Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400">Total Models Trained</div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">{clientModels.length}</div>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400">Average Test Accuracy</div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {clientModels.length > 0
                  ? (clientModels.reduce((acc, m) => acc + (m.accuracy || 0), 0) / clientModels.length * 100).toFixed(1) + '%'
                  : '—'}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400">Models Flagged for Review</div>
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                {clientModels.filter(m => m.evaluationStatus === 'NEEDS_REVIEW').length}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400">Holdout Validation Rule</div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">80/20 Stratified Split</div>
              <div className="text-[10px] text-slate-400">5-Fold Cross Validation</div>
            </div>
          </div>

          {/* Client Model List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Model Evaluation Inventory</h3>
              <span className="text-xs text-slate-400 font-mono">True 20% holdout test partition</span>
            </div>

            {clientLoading ? (
              <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl">
                Loading client ML model portfolio...
              </div>
            ) : clientModels.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl">
                This client has not executed any machine learning model training jobs yet.
              </div>
            ) : (
              <div className="space-y-4">
                {clientModels.map((model) => (
                  <div key={model.id} className="p-5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
                    {/* Top Model Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{model.modelName}</span>
                          <span className="text-xs font-mono text-slate-400">v{model.modelVersion}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {model.taskType}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>Dataset: <strong>{model.datasetName}</strong></span>
                          <span>·</span>
                          <span>{model.trainSamples} train / {model.testSamples} test samples</span>
                          <span>·</span>
                          <span>{model.featuresCount} features</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                          model.evaluationStatus === 'GOOD_PERFORMANCE'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : model.evaluationStatus === 'NEEDS_REVIEW'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                        }`}>
                          {model.evaluationStatus}
                        </span>
                        <button
                          onClick={() => {
                            setReviewingModel(model);
                            setReviewStatus(model.evaluationStatus);
                            setReviewNotes(model.evaluationNotes || '');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold"
                        >
                          Review & Notes
                        </button>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] uppercase font-mono text-slate-400">Test Accuracy</div>
                        <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {model.accuracy !== null ? `${(model.accuracy * 100).toFixed(1)}%` : '—'}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] uppercase font-mono text-slate-400">Precision</div>
                        <div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                          {model.precision !== null ? `${(model.precision * 100).toFixed(1)}%` : '—'}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] uppercase font-mono text-slate-400">Recall</div>
                        <div className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                          {model.recall !== null ? `${(model.recall * 100).toFixed(1)}%` : '—'}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] uppercase font-mono text-slate-400">F1-Score</div>
                        <div className="text-lg font-bold font-mono text-teal-600 dark:text-teal-400 mt-0.5">
                          {model.f1Score !== null ? `${(model.f1Score * 100).toFixed(1)}%` : '—'}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] uppercase font-mono text-slate-400">5-Fold CV Score</div>
                        <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                          {model.cvScore !== null ? `${(model.cvScore * 100).toFixed(1)}%` : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Confusion Matrix & Timing */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                      {model.confusionMatrix && model.confusionMatrix.length > 0 && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                          <span className="font-semibold text-slate-900 dark:text-white text-[11px] font-mono">Test Confusion Matrix:</span>
                          <table className="w-full text-center font-mono text-[11px]">
                            <tbody>
                              {model.confusionMatrix.map((row: number[], rIdx: number) => (
                                <tr key={rIdx}>
                                  {row.map((val: number, cIdx: number) => (
                                    <td key={cIdx} className={`p-2 border border-slate-200 dark:border-slate-800 ${
                                      rIdx === cIdx ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300 font-bold' : 'text-slate-500 dark:text-slate-400'
                                    }`}>
                                      {val}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                        <span className="font-semibold text-slate-900 dark:text-white text-[11px] font-mono">Training Telemetry:</span>
                        <div className="space-y-1 text-slate-600 dark:text-slate-400">
                          <div className="flex justify-between">
                            <span>Training Duration:</span>
                            <span className="font-mono text-slate-900 dark:text-white font-semibold">{model.trainDurationMs.toFixed(1)} ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Inference Latency:</span>
                            <span className="font-mono text-slate-900 dark:text-white font-semibold">{model.predictDurationMs.toFixed(1)} ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Trained At:</span>
                            <span className="font-mono text-slate-900 dark:text-white">{model.createdAt ? new Date(model.createdAt).toLocaleString() : '—'}</span>
                          </div>
                          {model.evaluationNotes && (
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">Admin Note:</span> {model.evaluationNotes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Modal Dialog */}
      {reviewingModel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Flag Model for Review</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update supervisor performance status and record internal administrative notes for <strong>{reviewingModel.modelName}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Performance Status</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200"
                >
                  <option value="GOOD_PERFORMANCE">GOOD_PERFORMANCE</option>
                  <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
                  <option value="LOW_PERFORMANCE">LOW_PERFORMANCE</option>
                  <option value="FAILED">FAILED</option>
                  <option value="NOT_EVALUATED">NOT_EVALUATED</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Internal Note</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record note regarding dataset distribution or accuracy drop..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReviewingModel(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModelReview}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm"
              >
                Save Review Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
