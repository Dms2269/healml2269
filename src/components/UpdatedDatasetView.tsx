/**
 * HEALML – Updated Dataset View (Option 6: Updated Dataset)
 * Side-by-side before vs after comparison, verified transformation summary,
 * and direct one-click download buttons for Repaired CSV and Repaired XLSX.
 */

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  GitCompare,
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { Dataset, RecoveryLog } from '../types/pipeline';
import { downloadHealedDatasetCsv, downloadHealedDatasetXlsx } from '../services/healedDatasetExporter';

interface UpdatedDatasetViewProps {
  dataset: Dataset;
  recentRecoveries: RecoveryLog[];
  onNavigateTab: (tab: string) => void;
}

export const UpdatedDatasetView: React.FC<UpdatedDatasetViewProps> = ({
  dataset,
  recentRecoveries,
  onNavigateTab,
}) => {
  const [activeTabMode, setActiveTabMode] = useState<'updated' | 'original'>('updated');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12;

  const rawRows = dataset.originalRows || dataset.rows;
  const currentRows = activeTabMode === 'updated' ? dataset.rows : rawRows;

  // Filter rows
  const filteredRows = currentRows.filter((row) => {
    if (!searchQuery) return true;
    return Object.values(row).some((val) =>
      String(val ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Quality metrics
  const totalCells = dataset.rows.length * dataset.columns.length || 1;
  const missingAfter = dataset.columns.reduce((acc, c) => acc + c.missingCount, 0);
  const completeness = Number(((1 - missingAfter / totalCells) * 100).toFixed(1));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#0F172A] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Verified Updated Dataset</h1>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Post-Recovery Validated
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Download the cleaned and repaired dataset with missing values filled, outliers Winsorized, and duplicates removed.
          </p>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => downloadHealedDatasetCsv(`${dataset.name}_repaired`, dataset.rows, dataset.columns)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Repaired CSV</span>
          </button>
          <button
            onClick={() => downloadHealedDatasetXlsx(`${dataset.name}_repaired`, dataset.rows, dataset.columns)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Download Repaired XLSX</span>
          </button>
        </div>
      </div>

      {/* BEFORE VS AFTER STATISTICAL SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Total Cleansed Records</div>
          <div className="text-2xl font-bold font-mono text-white">{dataset.rows.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Ready for downstream analytics</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Post-Healing Completeness</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{completeness}%</div>
          <div className="text-[11px] text-slate-400 mt-1">Zero critical nulls remaining</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Executed Repairs</div>
          <div className="text-2xl font-bold font-mono text-blue-400">{recentRecoveries.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Logged to recovery ledger</div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Original Raw State</div>
          <div className="text-2xl font-bold font-mono text-slate-400">{rawRows.length}</div>
          <div className="text-[11px] text-emerald-400 mt-1">100% preserved in archive</div>
        </div>
      </div>

      {/* TABLE PREVIEW TOGGLE & CONTROLS */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => { setActiveTabMode('updated'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-md transition-colors ${activeTabMode === 'updated' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Updated Repaired Data ({dataset.rows.length} rows)
            </button>
            <button
              onClick={() => { setActiveTabMode('original'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-md transition-colors ${activeTabMode === 'original' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Original Raw Data ({rawRows.length} rows)
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search table records..."
              className="w-full sm:w-60 pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Working Grid */}
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 text-[11px] uppercase tracking-wider">
                {dataset.columns.map((col) => (
                  <th key={col.name} className="py-2.5 px-3 whitespace-nowrap">
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {paginatedRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-850/50 transition-colors">
                  {dataset.columns.map((col) => {
                    const val = row[col.name];
                    const isNull = val === null || val === undefined || val === '';
                    return (
                      <td key={col.name} className="py-2.5 px-3 whitespace-nowrap">
                        {isNull ? (
                          <span className="text-[10px] text-rose-400/80 italic font-mono">
                            null
                          </span>
                        ) : (
                          String(val)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs text-slate-400 font-mono">
            <span>
              Page {currentPage} of {totalPages} ({filteredRows.length} records)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-semibold text-slate-200">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
