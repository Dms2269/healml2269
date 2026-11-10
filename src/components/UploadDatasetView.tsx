/**
 * HEALML – Upload Dataset View
 * Dedicated drag-and-drop ingestion for CSV, XLSX, and XLS datasets
 * with immediate schema profiling and instant sample dataset loader.
 */

import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Database,
  ArrowRight,
  FolderGit2,
  Sparkles,
} from 'lucide-react';
import { Dataset } from '../types/pipeline';
import { ProjectItem } from '../types/auth';
import { parseCsvContent, parseExcelContent } from '../services/datasetParser';
import { apiClient } from '../services/apiClient';

interface UploadDatasetViewProps {
  activeProject?: ProjectItem | null;
  onUploadCustomDataset: (newDataset: Dataset) => void;
  onSelectSample: (sampleKey: 'titanic' | 'diabetes' | 'housing' | 'loan' | 'sensor' | 'student_mental' | 'student_dropout' | 'clean_benchmark') => void;
  onNavigateTab: (tab: string) => void;
}

export const UploadDatasetView: React.FC<UploadDatasetViewProps> = ({
  activeProject,
  onUploadCustomDataset,
  onSelectSample,
  onNavigateTab,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const processFile = (file: File) => {
    const fileName = file.name.toLowerCase();
    const isCsv = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCsv && !isExcel) {
      setUploadError('Unsupported format. Please upload a .csv, .xlsx, or .xls file.');
      setSuccessInfo(null);
      return;
    }

    // Also persist to backend database associated with activeProject
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name.replace(/\.[^/.]+$/, ''));
    if (activeProject?.id) {
      formData.append('projectId', activeProject.id);
    }
    apiClient.uploadDataset(formData).catch((err) => {
      console.warn('Backend upload notice:', err.message);
    });

    const reader = new FileReader();
    if (isCsv) {
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = parseCsvContent(content, file.name);
          onUploadCustomDataset(parsed);
          setSuccessInfo(`Successfully ingested "${file.name}" with ${parsed.rows.length} rows and ${parsed.columns.length} columns.`);
          setUploadError(null);
        } catch (err: any) {
          setUploadError(err.message || 'Failed to parse CSV file.');
          setSuccessInfo(null);
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const parsed = parseExcelContent(buffer, file.name);
          onUploadCustomDataset(parsed);
          setSuccessInfo(`Successfully ingested Excel workbook "${file.name}" with ${parsed.rows.length} rows and ${parsed.columns.length} columns.`);
          setUploadError(null);
        } catch (err: any) {
          setUploadError(err.message || 'Failed to parse Excel workbook.');
          setSuccessInfo(null);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Upload Dataset</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Ingest your tabular data in CSV or Excel format. The system automatically reads schema, detects data types, and prepares a working copy.
          </p>
        </div>
        {activeProject && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono self-start sm:self-auto">
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Workspace: <strong className="text-white">{activeProject.name}</strong></span>
          </div>
        )}
      </div>

      {/* Notifications */}
      {uploadError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}
      {successInfo && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successInfo}</span>
          </div>
          <button
            onClick={() => onNavigateTab('detect')}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-[11px] inline-flex items-center gap-1 transition-colors"
          >
            <span>Scan Problems</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`p-10 rounded-2xl border-2 border-dashed text-center transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
            : 'border-slate-700 bg-[#0F172A] hover:border-slate-600'
        }`}
      >
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto shadow-inner">
            <Upload className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-white">Drag & drop your dataset file</h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports standard tabular formats: <span className="text-slate-200 font-mono">.csv</span>, <span className="text-slate-200 font-mono">.xlsx</span>, <span className="text-slate-200 font-mono">.xls</span> up to 50MB
            </p>
          </div>

          <div>
            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-md transition-all">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Browse Local Files</span>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Instant Exploration Samples (Phase 1 User Choice) */}
      <div className="p-6 rounded-2xl bg-[#0F172A] border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 pb-3 border-b border-slate-800">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Or Explore Pre-Configured Benchmark Datasets</span>
        </div>
        <p className="text-xs text-slate-400">
          Select any real-world domain to test universal all-column fault detection and autonomous self-healing immediately:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {[
            { key: 'healthcare', label: 'Diabetes Healthcare', rows: '768 rows', desc: 'Zero glucose bounds & clinical missingness' },
            { key: 'housing', label: 'Real Estate Housing', rows: '506 rows', desc: 'Extreme price outliers & spatial drift' },
            { key: 'loan', label: 'Loan Credit Risk', rows: '614 rows', desc: 'Credit missingness & income spikes' },
            { key: 'sensor', label: 'IoT Sensor Telemetry', rows: '800 rows', desc: 'Thermal drift & transducer spikes' },
            { key: 'student_dropout', label: 'Student Academic Records', rows: '650 rows', desc: 'Categorical drift & enrollment nulls' },
            { key: 'titanic', label: 'Titanic Passenger Batch', rows: '891 rows', desc: 'Age missingness & cabin nulls' },
            { key: 'student_mental', label: 'Student Wellness', rows: '500 rows', desc: 'GPA scale errors & survey drift' },
            { key: 'clean_benchmark', label: 'Clean Synthetic Benchmark', rows: '600 rows', desc: 'Baseline high-integrity control' },
          ].map((sample) => (
            <button
              key={sample.key}
              onClick={() => {
                onSelectSample(sample.key as any);
                setSuccessInfo(`Loaded sample dataset: ${sample.label}`);
              }}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-850 text-left transition-all group"
            >
              <div className="font-semibold text-xs text-white group-hover:text-blue-400 transition-colors">
                {sample.label}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">{sample.rows}</div>
              <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">{sample.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
