/**
 * HEALML - Isolation Forest Anomaly Detection Explorer
 * Inspects multivariate anomalies detected via recursive isolation trees,
 * computes path length statistics, and visualizes anomalous records.
 */

import React, { useState } from 'react';
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Info,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
} from 'lucide-react';
import { AnomalyPoint, Dataset } from '../types/pipeline';

interface AnomalyDetectorViewProps {
  dataset: Dataset;
  anomalies: AnomalyPoint[];
}

export const AnomalyDetectorView: React.FC<AnomalyDetectorViewProps> = ({
  dataset,
  anomalies,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'anomalies_only' | 'normal_only'>('anomalies_only');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12;

  const totalScanned = anomalies.length;
  // fit_predict(): -1 = anomaly, 1 = normal
  const anomalousCount = anomalies.filter((a) => a.prediction === -1 || a.isAnomaly).length;
  const normalCount = totalScanned - anomalousCount;
  const anomalyRate = totalScanned > 0 ? ((anomalousCount / totalScanned) * 100).toFixed(1) : '0.0';

  const displayedPoints = anomalies.filter((a) => {
    if (filterMode === 'anomalies_only') return a.prediction === -1 || a.isAnomaly;
    if (filterMode === 'normal_only') return a.prediction === 1 && !a.isAnomaly;
    return true;
  });

  const totalPages = Math.ceil(displayedPoints.length / rowsPerPage) || 1;
  const paginatedPoints = displayedPoints.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-amber-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              Isolation Forest Anomaly Detection
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              fit_predict() Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Recursive multivariate isolation trees · contamination=0.08 · -1 Anomaly / 1 Normal
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 overflow-x-auto">
          <button
            onClick={() => {
              setFilterMode('anomalies_only');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
              filterMode === 'anomalies_only'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Anomalies (-1) ({anomalousCount})
          </button>
          <button
            onClick={() => {
              setFilterMode('normal_only');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
              filterMode === 'normal_only'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Normal (1) ({normalCount})
          </button>
          <button
            onClick={() => {
              setFilterMode('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
              filterMode === 'all'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({totalScanned})
          </button>
        </div>
      </div>

      {/* Anomaly Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Total Records Scanned
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
            {totalScanned.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
            {dataset.name}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Normal Inliers (Prediction = 1)
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            {normalCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-0.5 font-mono">
            {totalScanned > 0 ? ((normalCount / totalScanned) * 100).toFixed(1) : '0.0'}% inliers
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Detected Anomalies (Prediction = -1)
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
            {anomalousCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-0.5 font-mono">
            {anomalyRate}% contamination rate
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Algorithm Calibration
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400 mt-1 tabular-nums">
            c = 0.08
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
            25 iTrees · 92nd percentile split
          </div>
        </div>
      </div>

      {/* Mathematical Formulation Explainer Card */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 font-mono text-xs">
        <div className="flex items-center gap-2 text-slate-200 font-semibold mb-2">
          <Info className="w-4 h-4 text-blue-400" />
          <span>Isolation Forest Calibration & Thresholding (B.Tech Viva Formulation)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-slate-300 text-[11px] leading-relaxed">
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-blue-400 font-semibold">1. Average Path Length c(n):</span>
            <p className="mt-1">
              c(n) = 2 · (ln(n - 1) + 0.5772) - 2(n - 1) / n
            </p>
            <p className="text-slate-500 mt-1">
              Expected depth of unsuccessful search in a BST of size n.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-emerald-400 font-semibold">2. Anomaly Score s(x, n):</span>
            <p className="mt-1">
              s(x, n) = 2^(-E(h(x)) / c(n))
            </p>
            <p className="text-slate-500 mt-1">
              If s &rarr; 1, path length is short: point is isolated quickly.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-amber-400 font-semibold">3. Decision Rule:</span>
            <p className="mt-1">
              prediction = -1 if s &ge; &tau; (Anomaly) else +1 (Normal)
            </p>
            <p className="text-slate-500 mt-1">
              Exact calibrated 92nd percentile cutoff yields 8.0% anomalies.
            </p>
          </div>
        </div>
      </div>

      {/* Anomalous Instances Table */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-100">
            Isolation Forest Predictions & Feature Snapshot ({displayedPoints.length} records)
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {displayedPoints.length === 0 ? (
          <div className="p-8 rounded-lg bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
            No records matching the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-mono">
                  <th className="py-2.5 px-3">Row Index</th>
                  <th className="py-2.5 px-3 text-center">Prediction</th>
                  <th className="py-2.5 px-3 text-right">Anomaly Score (s)</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3">Diagnosis Reason</th>
                  <th className="py-2.5 px-3">Feature Snapshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {paginatedPoints.map((pt) => {
                  const featurePairs = Object.entries(pt.row)
                    .filter(([k]) => k !== 'id' && !k.includes('_id'))
                    .slice(0, 4)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(' · ');

                  const isAnom = pt.prediction === -1 || pt.isAnomaly;

                  return (
                    <tr key={pt.index} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                        #{pt.index + 1}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          isAnom
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {isAnom ? '-1' : '+1'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold">
                        <span className={isAnom ? 'text-amber-400' : 'text-slate-400'}>
                          {pt.score.toFixed(3)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          isAnom
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {isAnom ? 'ANOMALY' : 'NORMAL'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                        {pt.primaryReason}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-xs">
                        {featurePairs}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 font-mono">
          <span>
            Showing records {(currentPage - 1) * rowsPerPage + 1} to{' '}
            {Math.min(displayedPoints.length, currentPage * rowsPerPage)} of{' '}
            {displayedPoints.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
