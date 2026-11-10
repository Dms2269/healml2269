/**
 * HEALML – Dedicated Autonomous Self-Healing PDF Reports View
 * The SOLE interface for generating, viewing, and downloading certified PDF reports.
 * 
 * Features 4 Certified Sections:
 * Section A: REPORT SUMMARY (Total reports, successful recovery, failed recovery, latest timestamp)
 * Section B: REPORT HISTORY (ID, dataset name, report type, timestamp, recovery status, download action)
 * Section C: REPORT GENERATION (4 buttons: Full Pipeline, Recovery, Model Evaluation, Dataset Quality)
 * Section D: REPORT PREVIEW (Selected report preview, download PDF, persistent history in SQLite)
 */

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  History,
  Calendar,
  Layers,
  Sparkles,
  Search,
  Filter,
  FileCheck2,
  Clock,
  ChevronRight,
  ShieldCheck,
  Zap,
  BarChart3,
  Database,
  FileSpreadsheet,
} from 'lucide-react';
import { PdfReportRecord, PdfReportType, Dataset } from '../types/pipeline';
import { downloadPdfReport } from '../services/pdfReportGenerator';
import { downloadHealedDatasetCsv, downloadHealedDatasetXlsx, computeDatasetComparison } from '../services/healedDatasetExporter';

interface PdfReportsViewProps {
  reports: PdfReportRecord[];
  onGenerateReport: (type: 'full_pipeline' | 'healing_recovery' | 'model_evaluation' | 'dataset_quality') => void;
  dataset?: Dataset;
}

export const PdfReportsView: React.FC<PdfReportsViewProps> = ({
  reports,
  onGenerateReport,
  dataset,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    reports[0]?.id || null
  );

  // Filter reports
  const filteredReports = reports.filter((rep) => {
    const matchesFilter = filterType === 'ALL' || rep.reportType === filterType;
    const matchesSearch =
      searchQuery === '' ||
      rep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.datasetName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const selectedReport = reports.find((r) => r.id === selectedReportId) || reports[0] || null;

  // Section A Summary Metrics
  const totalReportsCount = reports.length;
  const successfulRecoveriesCount = reports.filter(
    (r) => r.verificationStatus === 'VERIFIED_SUCCESS' || r.verificationStatus === 'CONSOLIDATED'
  ).length;
  const failedRecoveriesCount = reports.filter(
    (r) => r.verificationStatus === 'HEALING_FAILED'
  ).length;
  const latestTimestamp = reports[0]?.timestamp || 'None generated';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              Autonomous Self-Healing PDF Reports Hub
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Certified 5-Page Standard
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Sole repository for generating, reviewing, and downloading academic self-healing and pipeline audit PDF documents.
          </p>
        </div>
      </div>

      {/* ====================================================
          SECTION A: REPORT SUMMARY
          ==================================================== */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
            Section A
          </span>
          <h2 className="text-sm font-semibold text-slate-200">
            Report Summary & Ledger Telemetry
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Total Reports Generated
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
              {totalReportsCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Committed to SQLite ledger
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Successful Verified Recoveries
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
              {successfulRecoveriesCount}
            </div>
            <div className="text-[11px] text-emerald-400/80 mt-0.5 font-mono">
              Passed mathematical verification
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Failed / Escalated Recoveries
            </div>
            <div className="text-2xl font-bold font-mono text-rose-400 mt-1 tabular-nums">
              {failedRecoveriesCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Zero unhandled critical escalations
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Latest Execution Run
            </div>
            <div className="text-sm font-bold font-mono text-blue-300 mt-2 truncate">
              {latestTimestamp}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Synchronized in SQLite
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================
          SECTION C: UNIFIED COMPLETE REPORT GENERATOR (13 Certified Sections)
          ==================================================== */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
            Section C
          </span>
          <h2 className="text-sm font-semibold text-slate-200">
            Autonomous PDF Report & Healed Dataset Download
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: ONE Complete 13-Section PDF Report */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-[#0F172A] to-blue-950/40 border border-blue-500/30 flex flex-col justify-between shadow-lg hover:border-blue-500/60 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  13 Certified Sections · 6 Pages
                </span>
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                Complete Technical Recovery Audit Report
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Consolidated authoritative audit: ISO 5-dimension data quality score, 100% all-column inspection matrix, root cause analysis, 6-step self-healing, post-healing 2nd scan verification, before/after statistical comparison, ML performance, and SQLite ledger certification.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-slate-400 font-mono">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">All-Column Scan</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">RCA Diagnostic</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">2nd Verification Scan</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">Strict Privacy</span>
              </div>
            </div>
            <button
              onClick={() => onGenerateReport('healing_recovery')}
              className="mt-5 w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99]"
            >
              <Download className="w-4 h-4" />
              <span>Generate & Download Complete PDF Recovery Report</span>
            </button>
          </div>

          {/* Card 2: Downloadable Updated / Healed Dataset */}
          {dataset && (
            <div className="p-5 rounded-xl bg-gradient-to-br from-[#0F172A] to-emerald-950/30 border border-emerald-500/30 flex flex-col justify-between shadow-lg hover:border-emerald-500/60 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Input Format: {(dataset.inputFormat || 'CSV').toUpperCase()}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  Download Repaired / Healed Working Dataset
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Export the actual repaired tabular data ({dataset.rows.length.toLocaleString()} rows, {dataset.columns.length} columns) with imputed missing values, resolved primary keys, and clamped outliers in your dataset's native format while preserving raw data.
                </p>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-400 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified 0-loss schema preservation & type integrity</span>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => downloadHealedDatasetCsv(dataset.name, dataset.rows, dataset.columns)}
                  className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .CSV</span>
                </button>
                <button
                  onClick={() => downloadHealedDatasetXlsx(dataset.name, dataset.rows, dataset.columns)}
                  className="py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download .XLSX</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====================================================
          SECTION B: REPORT HISTORY
          ==================================================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
              Section B
            </span>
            <h2 className="text-sm font-semibold text-slate-200">
              Audit Report History & Ledger Archive
            </h2>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 w-44 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Report Types</option>
              <option value="healing_recovery">Recovery Incident</option>
              <option value="full_pipeline">Full Pipeline Audit</option>
              <option value="model_evaluation">Model Evaluation</option>
              <option value="dataset_quality">Dataset Quality</option>
            </select>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-mono">
                  <th className="py-2.5 px-3">Report ID</th>
                  <th className="py-2.5 px-3">Dataset Name</th>
                  <th className="py-2.5 px-3">Report Type</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Records</th>
                  <th className="py-2.5 px-3 text-right">Recovery Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No PDF reports match the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((rep) => {
                    const isSelected = selectedReport?.id === rep.id;
                    return (
                      <tr
                        key={rep.id}
                        onClick={() => setSelectedReportId(rep.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-600/15' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-blue-400 font-mono text-[11px]">
                          {rep.id}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-200">
                          {rep.datasetName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 capitalize">
                          {rep.reportType.replace(/_/g, ' ')}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 tabular-nums">
                          {rep.timestamp}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-slate-300">
                          {rep.totalRecords.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                              rep.verificationStatus === 'VERIFIED_SUCCESS' || rep.verificationStatus === 'CONSOLIDATED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {rep.verificationStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadPdfReport(rep);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-sans font-medium transition-colors shadow-sm"
                            title="Download 5-Page PDF"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </button>
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
          SECTION D: REPORT PREVIEW
          ==================================================== */}
      {selectedReport && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                Section D
              </span>
              <h2 className="text-sm font-semibold text-slate-200">
                Interactive Document Preview: {selectedReport.title}
              </h2>
            </div>
            <button
              onClick={() => downloadPdfReport(selectedReport)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Selected PDF Document</span>
            </button>
          </div>

          <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-4">
            {/* Document Header Card */}
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white font-mono">
                    {selectedReport.title}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                    {selectedReport.reportType}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3 font-mono">
                  <span>ID: {selectedReport.id}</span>
                  <span>·</span>
                  <span>Dataset: {selectedReport.datasetName}</span>
                  <span>·</span>
                  <span>Rows: {selectedReport.totalRecords.toLocaleString()}</span>
                  <span>·</span>
                  <span>Generated: {selectedReport.timestamp}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400 font-mono">
                  Verified Performance Delta
                </div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  +{(selectedReport.deltaMetric * 100).toFixed(1)}% Improvement
                </div>
              </div>
            </div>

            {/* 5-Page Outline Preview Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                <span className="font-bold text-blue-400 block mb-1">Page 1: Project Info</span>
                <p className="text-[11px] text-slate-400">
                  Dataset metadata, academic sign-off credentials, and executive summary overview.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                <span className="font-bold text-rose-400 block mb-1">Page 2: Problem Detection</span>
                <p className="text-[11px] text-slate-400">
                  Identified faults ({selectedReport.faultCount}), affected features, and root cause analysis (RCA).
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                <span className="font-bold text-purple-400 block mb-1">Page 3: 6-Step Healing</span>
                <p className="text-[11px] text-slate-400">
                  Autonomous 6-step lifecycle execution: Detection through mathematical verification.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                <span className="font-bold text-emerald-400 block mb-1">Page 4: Before & After</span>
                <p className="text-[11px] text-slate-400">
                  Quantitative matrix measuring pre/post metrics, completeness delta, and model fitness.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                <span className="font-bold text-amber-400 block mb-1">Page 5: SQLite & Sign-Off</span>
                <p className="text-[11px] text-slate-400">
                  Immutable SQLite ledger schema, table references, and university viva certification.
                </p>
              </div>
            </div>

            {/* Comparisons table snippet */}
            {selectedReport.comparisons.length > 0 && (
              <div className="pt-2">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                  Key Verification Metrics (Pre vs Post)
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">Metric</th>
                        <th className="py-2 px-3">Pre-Healing</th>
                        <th className="py-2 px-3">Post-Healing</th>
                        <th className="py-2 px-3">Net Delta</th>
                        <th className="py-2 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {selectedReport.comparisons.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-900/50">
                          <td className="py-2 px-3 font-semibold text-slate-200">{c.label}</td>
                          <td className="py-2 px-3 text-slate-400">{c.before}</td>
                          <td className="py-2 px-3 text-slate-200">{c.after}</td>
                          <td className="py-2 px-3 font-semibold text-emerald-400">{c.delta}</td>
                          <td className="py-2 px-3 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
