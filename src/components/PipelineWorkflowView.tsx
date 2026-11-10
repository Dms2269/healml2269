/**
 * HEALML - Pipeline Workflow Visualizer & Manual Stage Controller
 * Supports both Autonomous Auto-Pilot Execution and Manual Step-by-Step Stage Controls:
 * Ingestion → Validation → Preprocessing → Feature Eng → Training → Evaluation → Anomaly Detection → Fault Watchdog → Self-Healing
 */

import React, { useState } from 'react';
import {
  GitFork,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  ArrowRight,
  ChevronRight,
  Database,
  ShieldCheck,
  Wrench,
  Sliders,
  Cpu,
  BarChart3,
  Search,
  Activity,
  Zap,
  SlidersHorizontal,
  Settings2,
} from 'lucide-react';
import { StageState, PipelineStage } from '../types/pipeline';

interface PipelineWorkflowViewProps {
  stageStates: StageState[];
  isRunning: boolean;
  onRunFullPipeline: () => void;
  onResetPipeline: () => void;
  onExecuteManualStage: (stage: PipelineStage, options?: any) => Promise<void> | void;
  onNavigateTab: (tab: string) => void;
}

const STAGE_ICONS: Record<PipelineStage, any> = {
  ingestion: Database,
  validation: ShieldCheck,
  preprocessing: Wrench,
  feature_engineering: Sliders,
  model_training: Cpu,
  model_evaluation: BarChart3,
  anomaly_detection: Search,
  fault_monitoring: Activity,
  self_healing: Zap,
};

export const PipelineWorkflowView: React.FC<PipelineWorkflowViewProps> = ({
  stageStates,
  isRunning,
  onRunFullPipeline,
  onResetPipeline,
  onExecuteManualStage,
  onNavigateTab,
}) => {
  const [selectedStage, setSelectedStage] = useState<StageState>(stageStates[0]);
  const [executionMode, setExecutionMode] = useState<'auto' | 'manual'>('auto');

  // Manual Stage Configs
  const [imputationStrategy, setImputationStrategy] = useState<'median_mode' | 'mean_mode' | 'drop'>('median_mode');
  const [dedupEnabled, setDedupEnabled] = useState(true);
  const [scalingMethod, setScalingMethod] = useState<'minmax' | 'standard'>('minmax');
  const [nEstimators, setNEstimators] = useState<number>(50);
  const [maxDepth, setMaxDepth] = useState<number>(6);
  const [contaminationRate, setContaminationRate] = useState<number>(0.08);
  const [selectedHealingAction, setSelectedHealingAction] = useState<string>('MEDIAN_IMPUTATION');
  const [isExecutingStage, setIsExecutingStage] = useState(false);

  const handleRunSelectedStage = async () => {
    setIsExecutingStage(true);
    let options: any = {};

    if (selectedStage.stage === 'preprocessing') {
      options = { handleMissing: imputationStrategy, removeDuplicates: dedupEnabled };
    } else if (selectedStage.stage === 'feature_engineering') {
      options = { scalingMethod };
    } else if (selectedStage.stage === 'model_training') {
      options = { nEstimators, maxDepth };
    } else if (selectedStage.stage === 'anomaly_detection') {
      options = { contamination: contaminationRate };
    } else if (selectedStage.stage === 'self_healing') {
      options = { action: selectedHealingAction };
    }

    try {
      await onExecuteManualStage(selectedStage.stage, options);
    } finally {
      setIsExecutingStage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow Header & Execution Toolbar */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitFork className="w-4 h-4 text-blue-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              Autonomous & Manual MLOps Pipeline Flow
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Toggle between end-to-end Auto-Pilot or manual step-by-step pipeline execution
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-700/80 rounded-lg text-xs">
            <button
              onClick={() => setExecutionMode('auto')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                executionMode === 'auto'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Auto-Pilot (Full Run)
            </button>
            <button
              onClick={() => setExecutionMode('manual')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                executionMode === 'manual'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Manual Step Control
            </button>
          </div>

          <button
            onClick={onResetPipeline}
            disabled={isRunning || isExecutingStage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={onRunFullPipeline}
            disabled={isRunning || isExecutingStage}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Full Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Visual Pipeline Stage Flow Graph */}
      <div className="p-6 rounded-xl bg-[#0F172A] border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Pipeline Architecture Nodes
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Click any stage node below to configure and execute manually
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-3">
          {stageStates.map((st, idx) => {
            const Icon = STAGE_ICONS[st.stage] || GitFork;
            const isSelected = selectedStage.stage === st.stage;
            const isFaulted = st.status === 'faulted';
            const isHealed = st.status === 'healed';
            const isSuccess = st.status === 'success';

            return (
              <div key={st.stage} className="flex flex-col">
                <button
                  onClick={() => setSelectedStage(st)}
                  className={`p-3 rounded-xl border text-left transition-all h-full flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-blue-500 border-transparent bg-slate-800/90'
                      : isFaulted
                      ? 'bg-rose-500/10 border-rose-500/40 hover:bg-rose-500/15'
                      : isHealed
                      ? 'bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/15'
                      : isSuccess
                      ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-900/60 border-slate-800/60 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-1.5 rounded-lg ${
                        isFaulted
                          ? 'bg-rose-500/20 text-rose-300'
                          : isHealed
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : isSuccess
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        0{idx + 1}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-200 line-clamp-1">
                      {st.label}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                    <span className={`uppercase font-semibold ${
                      isFaulted ? 'text-rose-400' : isHealed ? 'text-emerald-400' : isSuccess ? 'text-blue-400' : 'text-slate-500'
                    }`}>
                      {st.status}
                    </span>
                    <span className="text-slate-500 tabular-nums">
                      {st.durationMs}ms
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Stage Detail & Manual Execution Control Panel */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/15 text-blue-400 border border-blue-500/20">
              {React.createElement(STAGE_ICONS[selectedStage.stage] || GitFork, { className: 'w-4 h-4' })}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <span>Stage 0{stageStates.findIndex((s) => s.stage === selectedStage.stage) + 1}: {selectedStage.label}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/25 uppercase">
                  {selectedStage.status}
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                System Identifier: <span className="text-blue-400">{selectedStage.stage}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{selectedStage.durationMs} ms latency</span>
            </span>
          </div>
        </div>

        {/* Operational Log Box */}
        <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
          <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">
            Stage Diagnostic Output
          </div>
          <div>{selectedStage.message}</div>
        </div>

        {/* Manual Stage Configuration Controls */}
        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Settings2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Manual Parameters & Execution</span>
            </div>
            <span className="text-[11px] text-slate-500">
              Tune parameters and trigger this stage individually
            </span>
          </div>

          {/* Conditional Stage Controls */}
          {selectedStage.stage === 'ingestion' && (
            <div className="space-y-2 text-xs text-slate-300">
              <p>Dataset ingestion parses CSV schemas and preserves raw data immutability.</p>
              <button
                onClick={() => onNavigateTab('dataset')}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors"
              >
                Open Dataset Explorer to Upload or Switch
              </button>
            </div>
          )}

          {selectedStage.stage === 'validation' && (
            <div className="space-y-3 text-xs text-slate-300">
              <p>Validates schema integrity, null ratios, and categorical cardinality.</p>
              <button
                onClick={handleRunSelectedStage}
                disabled={isExecutingStage}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                {isExecutingStage ? 'Validating...' : 'Run Validation Stage'}
              </button>
            </div>
          )}

          {selectedStage.stage === 'preprocessing' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
                  Missing Value Imputation Strategy:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => setImputationStrategy('median_mode')}
                    className={`p-2.5 rounded-lg border text-left font-mono transition-all ${
                      imputationStrategy === 'median_mode'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-semibold text-xs">Median / Mode</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Robust against outliers</div>
                  </button>
                  <button
                    onClick={() => setImputationStrategy('mean_mode')}
                    className={`p-2.5 rounded-lg border text-left font-mono transition-all ${
                      imputationStrategy === 'mean_mode'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-semibold text-xs">Mean / Mode</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Parametric mean fill</div>
                  </button>
                  <button
                    onClick={() => setImputationStrategy('drop')}
                    className={`p-2.5 rounded-lg border text-left font-mono transition-all ${
                      imputationStrategy === 'drop'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-semibold text-xs">Drop Incomplete</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Remove rows with nulls</div>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dedupCheck"
                  checked={dedupEnabled}
                  onChange={(e) => setDedupEnabled(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-600"
                />
                <label htmlFor="dedupCheck" className="text-xs text-slate-300 cursor-pointer">
                  Purge duplicate rows automatically (Recommended)
                </label>
              </div>

              <button
                onClick={handleRunSelectedStage}
                disabled={isExecutingStage}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                {isExecutingStage ? 'Processing...' : 'Execute Preprocessing Step'}
              </button>
            </div>
          )}

          {selectedStage.stage === 'feature_engineering' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
                  Numerical Feature Scaler:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => setScalingMethod('minmax')}
                    className={`p-2.5 rounded-lg border text-left font-mono transition-all ${
                      scalingMethod === 'minmax'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-semibold text-xs">MinMax Scaler [0, 1]</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">x_scaled = (x - min) / (max - min)</div>
                  </button>
                  <button
                    onClick={() => setScalingMethod('standard')}
                    className={`p-2.5 rounded-lg border text-left font-mono transition-all ${
                      scalingMethod === 'standard'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-semibold text-xs">Standard Scaler (Z-Score)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">z = (x - μ) / σ</div>
                  </button>
                </div>
              </div>

              <button
                onClick={handleRunSelectedStage}
                disabled={isExecutingStage}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                {isExecutingStage ? 'Scaling...' : 'Execute Feature Scaling Step'}
              </button>
            </div>
          )}

          {selectedStage.stage === 'model_training' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                    Number of Decision Trees (n_estimators): {nEstimators}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={nEstimators}
                    onChange={(e) => setNEstimators(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                    Tree Max Depth: {maxDepth}
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="10"
                    step="1"
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <button
                onClick={handleRunSelectedStage}
                disabled={isExecutingStage}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                {isExecutingStage ? 'Training Trees...' : `Train Random Forest (${nEstimators} Trees)`}
              </button>
            </div>
          )}

          {selectedStage.stage === 'model_evaluation' && (
            <div className="space-y-3 text-xs text-slate-300">
              <p>Computes Confusion Matrix, Precision, Recall, F1-Score, and ROC Curve on holdout test set.</p>
              <button
                onClick={() => onNavigateTab('evaluation')}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                View Full Evaluation Dashboard & Heatmap
              </button>
            </div>
          )}

          {selectedStage.stage === 'anomaly_detection' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  Isolation Forest Contamination Rate: {(contaminationRate * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.02"
                  max="0.20"
                  step="0.02"
                  value={contaminationRate}
                  onChange={(e) => setContaminationRate(Number(e.target.value))}
                  className="w-full max-w-xs"
                />
              </div>

              <button
                onClick={handleRunSelectedStage}
                disabled={isExecutingStage}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors"
              >
                {isExecutingStage ? 'Evaluating Trees...' : 'Run Isolation Forest Scan'}
              </button>
            </div>
          )}

          {selectedStage.stage === 'fault_monitoring' && (
            <div className="space-y-3 text-xs text-slate-300">
              <p>Scans for missingness spikes, duplicate floods, domain violations, and model decay.</p>
              <button
                onClick={handleRunSelectedStage}
                disabled={isExecutingStage}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors"
              >
                {isExecutingStage ? 'Scanning...' : 'Trigger Watchdog Fault Scan'}
              </button>
            </div>
          )}

          {selectedStage.stage === 'self_healing' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
                  Select Remediation Action to Execute:
                </label>
                <select
                  value={selectedHealingAction}
                  onChange={(e) => setSelectedHealingAction(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                >
                  <option value="MEDIAN_IMPUTATION">Adaptive Median/Mode Imputation</option>
                  <option value="DEDUPLICATION_PURGE">Deduplication Purge</option>
                  <option value="ROBUST_SCALER_RECALIBRATION">IQR Outlier Clamping</option>
                  <option value="ADAPTIVE_MODEL_RETRAINING">Adaptive Model Retraining</option>
                </select>
              </div>

              <button
                onClick={handleRunSelectedStage}
                disabled={isExecutingStage}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{isExecutingStage ? 'Healing...' : 'Execute Selected Healing & Verify'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
