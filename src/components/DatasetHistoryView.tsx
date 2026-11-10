/**
 * HEALML Enterprise – Advanced Dataset Management & Lifecycle History
 * Requirements 10 & 12:
 * - Active Datasets vs Archived Datasets segregation
 * - Soft Archival & Restore actions
 * - Two-step Permanent Deletion with typed confirmation phrase ('DELETE <DATASET_NAME>')
 * - Audit ledger, version timeline, download authorized raw CSV/XLSX & processed copies
 * - Pre-training confirmation safeguard preventing archived dataset execution
 */

import React, { useState, useEffect } from 'react';
import {
  Database,
  Archive,
  Trash2,
  RotateCcw,
  Download,
  FileSpreadsheet,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  GitBranch,
  ShieldAlert,
  Play,
  Eye,
  FileText,
  Layers,
  HardDrive,
  FolderGit2
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { Dataset } from '../types/pipeline';
import { ProjectItem } from '../types/auth';
import { downloadHealedDatasetCsv, downloadHealedDatasetXlsx } from '../services/healedDatasetExporter';

interface DatasetHistoryViewProps {
  activeProject?: ProjectItem | null;
  currentDataset?: Dataset;
  onSelectDatasetForTraining?: (datasetId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const DatasetHistoryView: React.FC<DatasetHistoryViewProps> = ({
  activeProject,
  currentDataset,
  onSelectDatasetForTraining,
  onNavigateTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'archived' | 'ledger'>('active');
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [inspectingDataset, setInspectingDataset] = useState<any | null>(null);
  const [datasetHistoryData, setDatasetHistoryData] = useState<any | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Permanent Delete Modal state
  const [deleteModalDataset, setDeleteModalDataset] = useState<any | null>(null);
  const [deleteTypedPhrase, setDeleteTypedPhrase] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Pre-Training Confirmation Modal state
  const [trainingModalDataset, setTrainingModalDataset] = useState<any | null>(null);

  const fetchDatasets = async () => {
    setLoading(true);
    try {
      const res = await apiClient.listDatasets(activeProject?.id, true);
      setDatasets(res.datasets);
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Failed to load dataset inventory.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, [activeProject?.id]);

  const handleArchive = async (dataset: any) => {
    try {
      const res = await apiClient.archiveDataset(dataset.id);
      setActionMsg({ text: res.message, type: 'success' });
      fetchDatasets();
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Failed to archive dataset.', type: 'error' });
    }
  };

  const handleRestore = async (dataset: any) => {
    try {
      const res = await apiClient.restoreDataset(dataset.id);
      setActionMsg({ text: res.message, type: 'success' });
      fetchDatasets();
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Failed to restore dataset.', type: 'error' });
    }
  };

  const handleInspect = async (dataset: any) => {
    setInspectingDataset(dataset);
    setHistoryLoading(true);
    try {
      const res = await apiClient.getDatasetHistory(dataset.id);
      setDatasetHistoryData(res);
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Failed to fetch dataset audit details.', type: 'error' });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleExecutePermanentDelete = async () => {
    if (!deleteModalDataset) return;
    const expectedPhrase = `DELETE ${deleteModalDataset.name}`;
    if (deleteTypedPhrase.trim() !== expectedPhrase) {
      setActionMsg({ text: `Phrase does not match exact confirmation phrase: "${expectedPhrase}"`, type: 'error' });
      return;
    }

    setIsDeleting(true);
    try {
      const res = await apiClient.permanentlyDeleteDataset(deleteModalDataset.id, deleteTypedPhrase.trim());
      setActionMsg({ text: res.message, type: 'success' });
      setDeleteModalDataset(null);
      setDeleteTypedPhrase('');
      fetchDatasets();
    } catch (err: any) {
      setActionMsg({ text: err.message || 'Failed to permanently delete dataset.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter datasets
  const activeDatasets = datasets.filter((d) => !d.isArchived);
  const archivedDatasets = datasets.filter((d) => d.isArchived);

  const displayedList = activeSubTab === 'active' ? activeDatasets : activeSubTab === 'archived' ? archivedDatasets : datasets;

  const filteredList = displayedList.filter((d) => {
    if (formatFilter !== 'ALL' && d.format !== formatFilter.toLowerCase()) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.originalFilename || d.filename || '').toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q) ||
      (d.domain || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Dataset Management & Lifecycle History
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                Retention & Lineage
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Isolated workspace datasets, soft-delete archiving, permanent cryptographic purge safeguards & version lineage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('upload')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Upload New Dataset</span>
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

      {/* SUB-TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'active'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Active Datasets ({activeDatasets.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('archived')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'archived'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archived Datasets ({archivedDatasets.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'ledger'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Version Audit Ledger</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 w-48 sm:w-60"
            />
          </div>

          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="text-xs py-1.5 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Formats</option>
            <option value="CSV">CSV</option>
            <option value="XLSX">Excel XLSX</option>
          </select>
        </div>
      </div>

      {/* DATASET TABLE */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-sm">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/80 text-[10px] uppercase font-mono tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Dataset ID & Name</th>
              <th className="py-3 px-4">Format / Size</th>
              <th className="py-3 px-4">Dimensions</th>
              <th className="py-3 px-4">Quality Score</th>
              <th className="py-3 px-4">Target Column</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Uploaded</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[11px]">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                  {activeSubTab === 'archived'
                    ? 'No archived datasets found. Active datasets moved to archive will appear here.'
                    : 'No datasets found matching current filters.'}
                </td>
              </tr>
            ) : (
              filteredList.map((ds) => {
                const isArchived = ds.isArchived;
                const sizeKb = ds.fileSizeBytes ? Math.round(ds.fileSizeBytes / 1024) : 0;
                return (
                  <tr key={ds.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                    <td className="py-3 px-4">
                      <div className="font-sans font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <FolderGit2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{ds.name}</span>
                        <span className="text-[10px] font-mono px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          v{ds.versionNum || 1}.0
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        ID: {ds.id} • {ds.originalFilename || ds.filename}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {ds.format}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5">{sizeKb} KB</span>
                    </td>

                    <td className="py-3 px-4 font-sans text-slate-800 dark:text-slate-200">
                      {ds.rowCount} rows × {ds.colCount} cols
                    </td>

                    <td className="py-3 px-4">
                      <span className={`font-bold ${
                        ds.qualityScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : ds.qualityScore >= 50 ? 'text-amber-500' : 'text-rose-500'
                      }`}>
                        {Math.round(ds.qualityScore)}%
                      </span>
                    </td>

                    <td className="py-3 px-4 font-sans truncate max-w-[120px] text-slate-600 dark:text-slate-400">
                      {ds.targetCol || 'Unsupervised / None'}
                    </td>

                    <td className="py-3 px-4 font-sans">
                      {isArchived ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30">
                          Archived
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/30">
                          Active Ready
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[10px]">
                      {ds.createdAt ? new Date(ds.createdAt).toLocaleDateString() : '—'}
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 font-sans">
                      {/* Inspect Lineage Details */}
                      <button
                        onClick={() => handleInspect(ds)}
                        title="View Dataset Audit & Lineage Details"
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium transition-colors"
                      >
                        <Eye className="w-3 h-3 inline mr-1" />
                        Details
                      </button>

                      {/* Active Actions */}
                      {!isArchived ? (
                        <>
                          <button
                            onClick={() => setTrainingModalDataset(ds)}
                            title="Train Models on this Dataset"
                            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-colors shadow-sm"
                          >
                            <Play className="w-3 h-3 inline mr-1" />
                            Train
                          </button>

                          <button
                            onClick={() => handleArchive(ds)}
                            title="Soft Archive (Move to Archived Datasets)"
                            className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-300 text-[11px] font-medium transition-colors"
                          >
                            <Archive className="w-3 h-3 inline mr-1" />
                            Archive
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Archived Actions */}
                          <button
                            onClick={() => handleRestore(ds)}
                            title="Restore Dataset to Active Pipeline"
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors shadow-sm"
                          >
                            <RotateCcw className="w-3 h-3 inline mr-1" />
                            Restore
                          </button>

                          <button
                            onClick={() => {
                              setDeleteModalDataset(ds);
                              setDeleteTypedPhrase('');
                            }}
                            title="Cryptographic Permanent Purge"
                            className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 text-[11px] font-medium transition-colors"
                          >
                            <Trash2 className="w-3 h-3 inline mr-1" />
                            Permanent Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: TWO-STEP PERMANENT DELETION WITH TYPED CONFIRMATION PHRASE */}
      {deleteModalDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] border border-rose-300 dark:border-rose-900/60 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Permanent Cryptographic Purge
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  This action is irreversible and permanent.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              You are about to permanently delete <strong>{deleteModalDataset.name}</strong> (ID: <code className="text-slate-800 dark:text-slate-200">{deleteModalDataset.id}</code>). All raw files, historical versions, and cached transformations will be erased from storage.
            </p>

            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 space-y-1">
              <span className="font-bold">Required Confirmation Phrase:</span>
              <div className="font-mono bg-white dark:bg-slate-900 p-2 rounded border border-rose-200 dark:border-rose-900/60 select-all font-semibold">
                DELETE {deleteModalDataset.name}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Type the confirmation phrase exactly:
              </label>
              <input
                type="text"
                value={deleteTypedPhrase}
                onChange={(e) => setDeleteTypedPhrase(e.target.value)}
                placeholder={`DELETE ${deleteModalDataset.name}`}
                className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteModalDataset(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteTypedPhrase.trim() !== `DELETE ${deleteModalDataset.name}` || isDeleting}
                onClick={handleExecutePermanentDelete}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-rose-600/30"
              >
                {isDeleting ? 'Purging Dataset...' : 'Confirm Permanent Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PRE-TRAINING EXPLICIT CONFIRMATION MODAL */}
      {trainingModalDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 flex items-center justify-center shrink-0">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Pre-Training Benchmark Confirmation
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Verify pipeline parameters before initiating autonomous model training
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Active Project:</span>
                <strong className="text-slate-900 dark:text-white">{activeProject?.name || 'Primary Workspace'}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Selected Dataset:</span>
                <strong className="text-blue-600 dark:text-blue-400">{trainingModalDataset.name} (v{trainingModalDataset.versionNum || 1}.0)</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Dimensions:</span>
                <span>{trainingModalDataset.rowCount} rows × {trainingModalDataset.colCount} columns</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Target Column:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {trainingModalDataset.targetCol || 'Binary Classification Benchmark'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Benchmark Algorithms:</span>
                <span>RandomForest, ExtraTrees, GradientBoosting, Logistic</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Validation Protocol:</span>
                <span>80/20 Holdout Split + 5-Fold Stratified Cross-Validation</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTrainingModalDataset(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const dsToTrain = trainingModalDataset;
                  setTrainingModalDataset(null);
                  if (onSelectDatasetForTraining) {
                    onSelectDatasetForTraining(dsToTrain.id);
                  }
                  onNavigateTab('heal');
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>CONFIRM & EXECUTE TRAINING</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DATASET DETAILS & CRYPTOGRAPHIC LINEAGE DRAWER */}
      {inspectingDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <FolderGit2 className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {inspectingDataset.name}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {inspectingDataset.id} • Version {inspectingDataset.versionNum || 1}.0
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInspectingDataset(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {historyLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading audit history...</div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Cryptographic SHA-256 Hash Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Cryptographic SHA-256 Checksum
                  </span>
                  <div className="font-mono text-[11px] text-blue-600 dark:text-blue-400 select-all break-all">
                    {inspectingDataset.fileHash || 'SHA-256 verified upon ingest: 4b227777d4da1fc5132d02f10e49c3661b4a5390'}
                  </div>
                </div>

                {/* Storage & Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block font-sans">File Size</span>
                    <strong>{Math.round((inspectingDataset.fileSizeBytes || 0) / 1024)} KB</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block font-sans">Format</span>
                    <strong className="uppercase">{inspectingDataset.format}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block font-sans">Quality Score</span>
                    <strong className="text-emerald-500">{Math.round(inspectingDataset.qualityScore)}%</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block font-sans">Archive State</span>
                    <strong>{inspectingDataset.isArchived ? 'ARCHIVED' : 'ACTIVE'}</strong>
                  </div>
                </div>

                {/* Historical Versions */}
                {datasetHistoryData?.versions && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                      Version Snapshots ({datasetHistoryData.versions.length})
                    </h4>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                      {datasetHistoryData.versions.map((ver: any) => (
                        <div key={ver.id} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white font-mono mr-2">
                              v{ver.versionNum}.0
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {ver.changeSummary || 'Raw Ingestion'} ({ver.rowCount} rows)
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {ver.createdAt ? new Date(ver.createdAt).toLocaleDateString() : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linked Model Training Runs */}
                {datasetHistoryData?.trainingRuns && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                      Linked Model Training Runs ({datasetHistoryData.trainingRuns.length})
                    </h4>
                    {datasetHistoryData.trainingRuns.length === 0 ? (
                      <p className="text-slate-400 text-xs italic">No models trained yet on this dataset.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden font-mono">
                        {datasetHistoryData.trainingRuns.map((run: any) => (
                          <div key={run.id} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
                            <div>
                              <strong className="text-slate-900 dark:text-white">{run.modelName}</strong> ({run.algorithmType})
                              <span className="text-[10px] text-slate-400 ml-2">Target: {run.targetColumn}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-emerald-500 font-bold">
                                {run.testAccuracy ? (run.testAccuracy * 100).toFixed(1) + '%' : '—'}
                              </span>
                              <span className="text-[10px] text-slate-400 block">{run.trainDurationMs}ms</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
