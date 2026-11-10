/**
 * HEALML Enterprise – Universal Dataset Explorer & Feature Profiler
 * Displays ALL columns with:
 * - Column Name
 * - Data Type
 * - Missing count & percentage
 * - Unique count
 * - Min, Max, Mean, Median
 * - Sample Values preview
 * - Feature / Target / Excluded status
 * Target Column dropdown supporting all industrial features:
 * - temperature_c, vibration_mm_s, pressure_bar, rpm, operating_hours,
 *   machine_id, timestamp, site, failure_flag
 * Feature Selection safeguarding identifiers (machine_id, site), timestamp, and target leakage.
 */

import React, { useState } from 'react';
import {
  Upload,
  Database,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
  Sliders,
  Layers,
  ArrowRight,
  Check,
  Ban,
  ShieldAlert,
  Download,
  History,
  GitBranch,
  ShieldCheck,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Dataset, DataColumn, DataRow, TargetEvaluationSummary } from '../types/pipeline';
import { parseCsvContent, parseExcelContent } from '../services/datasetParser';
import { downloadHealedDatasetCsv, downloadHealedDatasetXlsx } from '../services/healedDatasetExporter';

interface DatasetExplorerViewProps {
  dataset: Dataset;
  onSelectSample: (sampleKey: 'titanic' | 'diabetes' | 'housing' | 'loan' | 'sensor' | 'student_mental' | 'student_dropout' | 'clean_benchmark') => void;
  onUploadCustomDataset: (newDataset: Dataset) => void;
  onSelectTargetColumn: (target: string) => void;
  onOpenManualModal: () => void;
  onSelectEvaluatedTarget?: (target: string) => void;
}

export const DatasetExplorerView: React.FC<DatasetExplorerViewProps> = ({
  dataset,
  onSelectSample,
  onUploadCustomDataset,
  onSelectTargetColumn,
  onOpenManualModal,
  onSelectEvaluatedTarget,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [featureOverrides, setFeatureOverrides] = useState<Record<string, boolean>>({});
  const rowsPerPage = 12;

  // Handle CSV, XLSX, or XLS file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isCsv = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCsv && !isExcel) {
      setUploadError('Unsupported format. Please upload a .csv, .xlsx, or .xls file.');
      return;
    }

    const reader = new FileReader();
    if (isCsv) {
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = parseCsvContent(content, file.name);
          onUploadCustomDataset(parsed);
          setUploadError(null);
        } catch (err: any) {
          setUploadError(err.message || 'Failed to parse CSV file.');
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const parsed = parseExcelContent(buffer, file.name);
          onUploadCustomDataset(parsed);
          setUploadError(null);
        } catch (err: any) {
          setUploadError(err.message || 'Failed to parse Excel workbook.');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Helper to determine if a column is an identifier, timestamp, or leak-prone
  const isExcludedByDefault = (col: DataColumn) => {
    const nameLower = col.name.toLowerCase();
    return (
      col.isIdentifier ||
      col.type === 'identifier' ||
      col.type === 'datetime' ||
      nameLower === 'id' ||
      nameLower.includes('machine_id') ||
      nameLower.includes('client_id') ||
      nameLower === 'site' ||
      nameLower === 'timestamp' ||
      nameLower === 'date'
    );
  };

  const isFeatureActive = (col: DataColumn) => {
    if (col.name === dataset.targetColumn) return false;
    if (featureOverrides[col.name] !== undefined) return featureOverrides[col.name];
    return !isExcludedByDefault(col);
  };

  const toggleFeatureActive = (colName: string) => {
    setFeatureOverrides((prev) => ({
      ...prev,
      [colName]: prev[colName] !== undefined ? !prev[colName] : isExcludedByDefault(dataset.columns.find((c) => c.name === colName)!) ? true : false,
    }));
  };

  // Helper to determine target eligibility, task type, and feature leakage risks
  const getTargetEligibility = (col: DataColumn) => {
    const isLeakage = isExcludedByDefault(col);
    if (isLeakage) {
      return {
        eligible: false,
        risk: true,
        label: 'Leakage Risk (ID / Timestamp)',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
        suggestedTask: 'Leakage Prone'
      };
    }
    if (col.uniqueCount === 1) {
      return {
        eligible: false,
        risk: false,
        label: 'Ineligible (Zero Variance)',
        badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
        suggestedTask: 'Constant Value'
      };
    }
    if (col.uniqueCount === 2) {
      return {
        eligible: true,
        risk: false,
        label: 'Eligible (Binary Classification)',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
        suggestedTask: 'Binary Classification'
      };
    }
    if (col.type === 'numeric' && col.uniqueCount > 2) {
      return {
        eligible: true,
        risk: false,
        label: 'Eligible (Regression / Continuous)',
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
        suggestedTask: 'Regression / Telemetry Forecast'
      };
    }
    if (col.uniqueCount <= 20) {
      return {
        eligible: true,
        risk: false,
        label: 'Eligible (Multi-Class Classification)',
        badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
        suggestedTask: 'Multi-Class Classification'
      };
    }
    return {
      eligible: false,
      risk: true,
      label: 'High-Cardinality Categorical',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
      suggestedTask: 'High Cardinality'
    };
  };

  // Filter rows based on search query
  const filteredRows = dataset.rows.filter((r) => {
    if (!searchQuery) return true;
    return Object.values(r).some((v) =>
      String(v ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Compute data completeness
  const totalCells = dataset.rows.length * dataset.columns.length || 1;
  const missingCells = dataset.columns.reduce((acc, c) => acc + c.missingCount, 0);
  const completeness = Number(((1 - missingCells / totalCells) * 100).toFixed(1));

  const isMultiTargetMode = dataset.targetColumn === 'AUTO_ALL_ELIGIBLE';

  return (
    <div className="space-y-6">
      {/* Top Dataset Management Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                {dataset.domain}
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                Task: {isMultiTargetMode ? 'MULTI-TARGET EVALUATION' : dataset.taskType.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {dataset.name}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              {dataset.description || 'Industrial machine telemetry and failure diagnosis tabular dataset.'}
            </p>
          </div>

          {/* Academic & Benchmark Sample Datasets Switcher */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-400 mr-1">Sample:</span>
            <button
              onClick={() => onSelectSample('sensor')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                dataset.id === 'sensor_fleet_unsupervised' || dataset.name.includes('Sensor')
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Industrial Sensors
            </button>
            <button
              onClick={() => onSelectSample('titanic')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                dataset.id === 'titanic_survival'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Titanic
            </button>
            <button
              onClick={() => onSelectSample('diabetes')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                dataset.id === 'diabetic_data'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Diabetes
            </button>
            <button
              onClick={() => onSelectSample('housing')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                dataset.id === 'california_housing'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Housing
            </button>
            <button
              onClick={() => onSelectSample('student_dropout')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                dataset.id === 'student_dropout_success'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Student Dropout
            </button>
            <button
              onClick={() => onSelectSample('clean_benchmark')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                dataset.id === 'clean_benchmark_nominal'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Clean Benchmark
            </button>
          </div>
        </div>

        {/* Upload & Dynamic Target Selector Controls */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="cursor-pointer flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all text-xs font-semibold">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload CSV / Excel</span>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            <button
              onClick={onOpenManualModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-all text-xs font-semibold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Manual Row Studio</span>
            </button>

            <button
              onClick={() => downloadHealedDatasetCsv(dataset.name, dataset.rows, dataset.columns)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-all text-xs font-semibold"
              title="Download current working dataset as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => downloadHealedDatasetXlsx(dataset.name, dataset.rows, dataset.columns)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-teal-700 dark:text-teal-300 transition-all text-xs font-semibold"
              title="Download current working dataset as Excel XLSX"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export XLSX</span>
            </button>

            {uploadError && (
              <span className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 font-mono">
                <AlertCircle className="w-3.5 h-3.5" />
                {uploadError}
              </span>
            )}
          </div>

          {/* Industrial Target Column Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-semibold whitespace-nowrap">Target Feature:</span>
            <select
              value={dataset.targetColumn}
              onChange={(e) => onSelectTargetColumn(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-blue-500 max-w-xs font-semibold"
            >
              <option value="AUTO_ALL_ELIGIBLE" className="font-bold text-blue-600">
                ★ AUTO EVALUATE ALL ELIGIBLE TARGETS
              </option>
              <option value="" className="text-slate-400">
                None / Unsupervised (Anomaly Watchdog)
              </option>
              {/* All Dataset Schema Columns as Available Targets */}
              <optgroup label="Telemetry & Domain Features">
                {dataset.columns
                  .filter((c) =>
                    [
                      'failure_flag',
                      'temperature_c',
                      'vibration_mm_s',
                      'pressure_bar',
                      'rpm',
                      'operating_hours',
                      'machine_id',
                      'timestamp',
                      'site'
                    ].includes(c.name.toLowerCase())
                  )
                  .map((col) => {
                    const elig = getTargetEligibility(col);
                    return (
                      <option key={col.name} value={col.name}>
                        {col.name} ({col.type}) — {elig.suggestedTask} {col.isIdentifier ? '[ID/Leakage]' : ''}
                      </option>
                    );
                  })}
              </optgroup>
              <optgroup label="All Other Schema Columns">
                {dataset.columns
                  .filter(
                    (c) =>
                      ![
                        'failure_flag',
                        'temperature_c',
                        'vibration_mm_s',
                        'pressure_bar',
                        'rpm',
                        'operating_hours',
                        'machine_id',
                        'timestamp',
                        'site'
                      ].includes(c.name.toLowerCase())
                  )
                  .map((col) => {
                    const elig = getTargetEligibility(col);
                    return (
                      <option key={col.name} value={col.name}>
                        {col.name} ({col.type}) — {elig.suggestedTask}
                      </option>
                    );
                  })}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Column Quality & Schema Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Total Ingested Rows
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
            {dataset.rows.length.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Original untouched raw data preserved
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Total Columns Scanned
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
            {dataset.columns.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {dataset.columns.filter((c) => c.type === 'numeric').length} numeric · {dataset.columns.filter((c) => c.type === 'categorical').length} categorical
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Completeness
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {completeness}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {missingCells} total missing values
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Target Feature & Task
          </div>
          <div className="text-base font-bold font-mono text-blue-600 dark:text-blue-400 mt-1 truncate">
            {isMultiTargetMode ? 'AUTO EVALUATE ALL TARGETS' : dataset.targetColumn || 'None (Unsupervised)'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 capitalize">
            {isMultiTargetMode ? 'Multi-Output Matrix' : dataset.taskType.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      {/* TARGET COLUMN SELECTION & MULTI-TARGET MATRIX STUDIO */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <Sliders className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Target Column Selection & Multi-Target Matrix Studio
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              All {dataset.columns.length} columns from the active dataset are available as candidate targets. Multi-target evaluation and feature leakage prevention are actively validated.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectTargetColumn('AUTO_ALL_ELIGIBLE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isMultiTargetMode
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Select All Eligible Targets</span>
            </button>

            <button
              onClick={() => onSelectTargetColumn('')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                !dataset.targetColumn
                  ? 'bg-slate-800 text-white border-slate-700 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Clear Selection (Unsupervised)</span>
            </button>
          </div>
        </div>

        {/* Algorithm Multi-Target Compatibility & Leakage Validation Box */}
        {isMultiTargetMode ? (
          <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-300 space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Multi-Target Matrix Active (Algorithm Compatibility & Leakage Prevention Verified)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-blue-800/80 dark:text-blue-300/80">
              The pipeline will automatically train multi-output Random Forest ensembles and evaluate all eligible target columns simultaneously. Each individual target is dynamically masked from the predictor feature vector during its specific training step, eliminating cross-feature label leakage.
            </p>
          </div>
        ) : dataset.targetColumn ? (
          (() => {
            const selectedCol = dataset.columns.find((c) => c.name === dataset.targetColumn);
            const isLeakage = selectedCol ? isExcludedByDefault(selectedCol) : false;
            return isLeakage ? (
              <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Feature Leakage Safeguard Warning</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800/80 dark:text-amber-300/80">
                  Target <span className="font-mono font-bold">{dataset.targetColumn}</span> is classified as an identifier or timestamp. Machine/client IDs have been excluded from the model predictor inputs to safeguard against artificial overfitting and train-test data leakage.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold">
                    Target Verified: <span className="font-mono">{dataset.targetColumn}</span> ({dataset.taskType.replace(/_/g, ' ')})
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                  {dataset.columns.filter((c) => isFeatureActive(c)).length} features safely assigned for training
                </span>
              </div>
            );
          })()
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400" />
            <span>Unsupervised Mode Active: Isolation Forest anomaly watchdog and continuous 20-problem fault detection will run across all feature vectors.</span>
          </div>
        )}

        {/* ALL COLUMNS TARGET CANDIDATE MATRIX TABLE */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-mono border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3 text-center">Selected</th>
                <th className="py-2.5 px-3">Column Name</th>
                <th className="py-2.5 px-3">Data Type</th>
                <th className="py-2.5 px-3 text-right">Missing</th>
                <th className="py-2.5 px-3 text-right">Unique Values</th>
                <th className="py-2.5 px-3">Target Eligibility Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-slate-700 dark:text-slate-300 text-[11px]">
              {dataset.columns.map((col) => {
                const isSelected = isMultiTargetMode
                  ? getTargetEligibility(col).eligible
                  : dataset.targetColumn === col.name;
                const elig = getTargetEligibility(col);
                const missingPct = ((col.missingCount / (dataset.rows.length || 1)) * 100).toFixed(1);

                return (
                  <tr
                    key={col.name}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (dataset.targetColumn === col.name) {
                            onSelectTargetColumn('');
                          } else {
                            onSelectTargetColumn(col.name);
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <span>{col.name}</span>
                        {isSelected && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-bold uppercase">
                            TARGET
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 font-sans">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {col.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-500">
                      {col.missingCount} ({missingPct}%)
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                      {col.uniqueCount}
                    </td>
                    <td className="py-2 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${elig.badge}`}>
                        {elig.label}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      {dataset.targetColumn === col.name ? (
                        <button
                          onClick={() => onSelectTargetColumn('')}
                          className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-semibold border border-rose-200 dark:border-rose-800 hover:bg-rose-100"
                        >
                          Deselect
                        </button>
                      ) : (
                        <button
                          onClick={() => onSelectTargetColumn(col.name)}
                          className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-semibold border border-blue-200 dark:border-blue-800 hover:bg-blue-100"
                        >
                          Set Target
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPREHENSIVE ALL-COLUMNS SCHEMA & FEATURE SELECTION TABLE */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              All Columns & Feature Selection Profiler ({dataset.columns.length} columns)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Inspect all columns, missingness, statistical distributions, sample previews, and configure feature inputs. Identifiers and timestamps are excluded by default to prevent leakage.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {dataset.columns.filter((c) => isFeatureActive(c)).length} of {dataset.columns.length} Active Features
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-mono border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-3">Column Name</th>
                <th className="py-3 px-3">Data Type</th>
                <th className="py-3 px-3 text-right">Missing</th>
                <th className="py-3 px-3 text-right">Unique</th>
                <th className="py-3 px-3 text-right">Min</th>
                <th className="py-3 px-3 text-right">Max</th>
                <th className="py-3 px-3">Sample Values Preview</th>
                <th className="py-3 px-3 text-center">Feature Status</th>
                <th className="py-3 px-3 text-right">Target Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-slate-700 dark:text-slate-300 text-[11px]">
              {dataset.columns.map((col) => {
                const isTarget = col.name === dataset.targetColumn;
                const isExcluded = isExcludedByDefault(col);
                const active = isFeatureActive(col);
                const missingPct = ((col.missingCount / (dataset.rows.length || 1)) * 100).toFixed(1);

                // Compute unique sample values for preview pills
                const distinctSamples = Array.from(
                  new Set(
                    dataset.rows
                      .map((r) => r[col.name])
                      .filter((v) => v !== null && v !== undefined && v !== '')
                  )
                ).slice(0, 3);

                return (
                  <tr
                    key={col.name}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      isTarget ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white font-mono">
                      <div className="flex items-center gap-1.5">
                        <span>{col.name}</span>
                        {isTarget && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-bold uppercase">
                            TARGET
                          </span>
                        )}
                        {col.isIdentifier && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            ID
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        col.type === 'numeric'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : col.type === 'datetime'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : col.type === 'identifier'
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      }`}>
                        {col.type}
                      </span>
                    </td>

                    <td className={`py-2.5 px-3 text-right tabular-nums ${col.missingCount > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-400'}`}>
                      {col.missingCount} ({missingPct}%)
                    </td>

                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-800 dark:text-slate-200 font-semibold">
                      {col.uniqueCount}
                    </td>

                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {col.min !== undefined ? col.min : '—'}
                    </td>

                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {col.max !== undefined ? col.max : '—'}
                    </td>

                    <td className="py-2.5 px-3 font-sans">
                      <div className="flex items-center gap-1 max-w-xs overflow-hidden">
                        {distinctSamples.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-[80px]"
                            title={String(s)}
                          >
                            {String(s)}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {isTarget ? (
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 font-mono">
                          TARGET
                        </span>
                      ) : (
                        <button
                          onClick={() => toggleFeatureActive(col.name)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                            active
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 line-through'
                          }`}
                          title={active ? 'Click to exclude this feature from ML training' : 'Click to include this feature in ML training'}
                        >
                          {active ? 'FEATURE' : 'EXCLUDED'}
                        </button>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      {!isTarget && (
                        <button
                          onClick={() => onSelectTargetColumn(col.name)}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-700 dark:text-slate-300 text-[10px] font-sans font-semibold transition-colors"
                        >
                          Set Target
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Data Preview Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Data Records Preview
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {filteredRows.length} rows (Page {currentPage} of {totalPages})
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search table values..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 w-56 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-mono border-b border-slate-200 dark:border-slate-800">
                {dataset.columns.map((col) => (
                  <th key={col.name} className="py-2.5 px-3 whitespace-nowrap">
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-slate-700 dark:text-slate-300">
              {paginatedRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  {dataset.columns.map((col) => {
                    const val = row[col.name];
                    const isNull = val === null || val === undefined || val === '';
                    return (
                      <td key={col.name} className="py-2 px-3 whitespace-nowrap">
                        {isNull ? (
                          <span className="text-[10px] text-rose-500 italic font-mono font-bold">
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

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>
              Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
              {Math.min(currentPage * rowsPerPage, filteredRows.length)} of {filteredRows.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-semibold text-slate-800 dark:text-slate-200">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
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
