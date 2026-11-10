/**
 * HEALML - Manual Dataset Modal & Interactive Data Builder
 * Enables manual dataset construction via:
 * 1. Raw CSV Paste & Schema Parsing
 * 2. Interactive Column & Row Grid Builder
 * 3. Adding individual test instances to active dataset (for edge-case testing)
 */

import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Plus,
  Trash2,
  Check,
  Upload,
  Sparkles,
  AlertCircle,
  Database,
  ArrowRight,
} from 'lucide-react';
import { Dataset, DataColumn, DataRow } from '../types/pipeline';
import { parseCustomCsv, createManualDataset, addRowToDataset } from '../services/sampleDatasets';

interface ManualDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDataset: Dataset;
  onApplyManualDataset: (newDataset: Dataset) => void;
  onAddRowToActiveDataset: (updatedDataset: Dataset) => void;
}

export const ManualDatasetModal: React.FC<ManualDatasetModalProps> = ({
  isOpen,
  onClose,
  activeDataset,
  onApplyManualDataset,
  onAddRowToActiveDataset,
}) => {
  const [activeTab, setActiveTab] = useState<'csv_paste' | 'grid_builder' | 'add_single_row'>('csv_paste');

  // CSV Paste State
  const [datasetName, setDatasetName] = useState('My Custom Pipeline Dataset');
  const [rawCsvText, setRawCsvText] = useState(
`patient_age,blood_pressure,glucose,cholesterol,readmitted
45,120,85,180,0
62,145,160,240,1
38,115,90,175,0
71,155,190,260,1
55,130,110,210,0
49,125,95,190,0
68,160,175,250,1
42,118,88,165,0`
  );
  const [targetColumnName, setTargetColumnName] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  // Single Row Input State
  const [singleRowData, setSingleRowData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    activeDataset.columns.forEach((c) => {
      initial[c.name] = c.type === 'numeric' ? (c.mean?.toString() || '50') : 'Default';
    });
    return initial;
  });

  if (!isOpen) return null;

  // Handle CSV Paste Deployment
  const handleDeployPastedCsv = () => {
    try {
      if (!rawCsvText.trim()) {
        setParseError('Please provide CSV content.');
        return;
      }
      const parsed = parseCustomCsv(rawCsvText, datasetName || 'Custom_Dataset.csv');
      if (targetColumnName && parsed.columns.some((c) => c.name === targetColumnName)) {
        parsed.targetColumn = targetColumnName;
      }
      onApplyManualDataset(parsed);
      setParseError(null);
      onClose();
    } catch (err: any) {
      setParseError(err.message || 'Invalid CSV format.');
    }
  };

  // Quick Templates for CSV Paste
  const handleLoadTemplate = (type: 'iot' | 'finance' | 'medical') => {
    if (type === 'medical') {
      setDatasetName('Cardiology Patient Cohort');
      setRawCsvText(
`patient_age,systolic_bp,diastolic_bp,fasting_glucose,bmi,high_risk
52,128,82,95,24.5,0
67,152,94,165,31.2,1
41,118,76,88,22.1,0
74,165,102,185,34.0,1
58,135,88,115,27.8,0
63,148,92,145,29.5,1
45,122,80,92,23.4,0
70,158,98,170,32.6,1`
      );
    } else if (type === 'finance') {
      setDatasetName('Customer Loan Underwriting');
      setRawCsvText(
`credit_score,annual_income,debt_ratio,loan_requested,default_risk
720,65000,0.22,12000,0
580,32000,0.48,25000,1
690,54000,0.28,15000,0
510,24000,0.58,18000,1
760,92000,0.15,30000,0
640,48000,0.35,10000,0
590,36000,0.42,20000,1
810,115000,0.12,45000,0`
      );
    } else {
      setDatasetName('Wind Turbine Telemetry');
      setRawCsvText(
`vibration_hz,rotor_temp_c,oil_pressure_psi,rpm,mechanical_alarm
18.4,62.5,45.2,1650,0
48.2,94.1,28.4,2420,1
16.2,58.4,46.8,1580,0
52.5,98.6,24.1,2550,1
22.1,68.2,42.5,1720,0
46.8,91.3,31.2,2380,1
19.5,64.1,44.7,1690,0
21.4,66.8,43.2,1710,0`
      );
    }
    setParseError(null);
  };

  // Handle Add Single Row to Active Dataset
  const handleAddSingleRow = () => {
    const newRow: DataRow = {};
    activeDataset.columns.forEach((c) => {
      const val = singleRowData[c.name];
      if (c.type === 'numeric') {
        const num = Number(val);
        newRow[c.name] = isNaN(num) || val === '' ? null : num;
      } else {
        newRow[c.name] = val;
      }
    });

    const updated = addRowToDataset(activeDataset, newRow);
    onAddRowToActiveDataset(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Manual Dataset Pipeline Studio
              </h2>
              <p className="text-xs text-slate-400">
                Directly define custom datasets, paste raw CSV, or inject live test records
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-slate-800/80 flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('csv_paste')}
            className={`pb-3 border-b-2 font-medium transition-all ${
              activeTab === 'csv_paste'
                ? 'text-blue-400 border-blue-500 font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-300'
            }`}
          >
            Paste Raw CSV Text
          </button>
          <button
            onClick={() => setActiveTab('add_single_row')}
            className={`pb-3 border-b-2 font-medium transition-all ${
              activeTab === 'add_single_row'
                ? 'text-blue-400 border-blue-500 font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-300'
            }`}
          >
            Inject Single Row to Active Dataset
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'csv_paste' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                    Dataset Name
                  </label>
                  <input
                    type="text"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="E.g. Custom Clinical Trial"
                  />
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                    Quick Templates:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleLoadTemplate('medical')}
                      className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      Medical
                    </button>
                    <button
                      onClick={() => handleLoadTemplate('finance')}
                      className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      Finance
                    </button>
                    <button
                      onClick={() => handleLoadTemplate('iot')}
                      className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      IoT Sensor
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  Raw CSV Content (First row must be comma-separated column headers)
                </label>
                <textarea
                  rows={9}
                  value={rawCsvText}
                  onChange={(e) => setRawCsvText(e.target.value)}
                  className="w-full bg-[#070D18] border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed"
                  placeholder="feature1,feature2,feature3,target&#10;10.2,4.5,yes,1&#10;12.1,5.2,no,0"
                />
              </div>

              {parseError && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'add_single_row' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/20 text-xs text-slate-300">
                Enter custom values for each feature of active dataset <strong className="text-blue-400 font-mono">{activeDataset.name}</strong>. You can enter edge values (e.g. extreme high/low) to test fault detection and Isolation Forest live!
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {activeDataset.columns.map((col) => (
                  <div key={col.name} className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                      <span className="truncate">{col.name}</span>
                      <span className="text-[10px] text-slate-500 uppercase">{col.type}</span>
                    </label>
                    <input
                      type="text"
                      value={singleRowData[col.name] ?? ''}
                      onChange={(e) =>
                        setSingleRowData({
                          ...singleRowData,
                          [col.name]: e.target.value,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                      placeholder={`Enter ${col.name}...`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>

          {activeTab === 'csv_paste' ? (
            <button
              onClick={handleDeployPastedCsv}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors"
            >
              <span>Deploy to Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleAddSingleRow}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Append Row to Dataset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
