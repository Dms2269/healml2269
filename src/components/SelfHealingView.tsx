/**
 * HEALML Enterprise – Self-Healing View (Option 5: Heal Dataset)
 * Autonomous 1-click execution connected to live backend/ML pipeline
 * adhering strictly to the 8 centralized states:
 * IDLE, QUEUED, RUNNING, HEALING, VERIFYING, COMPLETED, DEGRADED, FAILED
 *
 * Includes the complete 9-Step Autonomous Repair Policy Sequence:
 * Step 1: Dataset Validation
 * Step 2: Detection
 * Step 3: Classification
 * Step 4: Policy Selection
 * Step 5: Safety Validation
 * Step 6: Corrections
 * Step 7: Post-Repair Validation
 * Step 8: Updated Dataset Generation
 * Step 9: Generate Healing Report
 */

import React, { useState } from 'react';
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Download,
  Shield,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Dataset, StageState, VerificationStatus } from '../types/pipeline';

export type PipelineExecutionState =
  | 'IDLE'
  | 'QUEUED'
  | 'RUNNING'
  | 'HEALING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'DEGRADED'
  | 'FAILED';

interface SelfHealingViewProps {
  dataset: Dataset;
  executionState: PipelineExecutionState;
  isExecuting: boolean;
  stageStates: StageState[];
  verificationStatus?: VerificationStatus;
  faultsCount: number;
  onRunAutonomousHealing: () => void;
  onNavigateTab: (tab: string) => void;
}

export const SelfHealingView: React.FC<SelfHealingViewProps> = ({
  dataset,
  executionState,
  isExecuting,
  stageStates,
  verificationStatus,
  faultsCount,
  onRunAutonomousHealing,
  onNavigateTab,
}) => {
  const isCompleted = executionState === 'COMPLETED';

  // 9-Step Autonomous Repair Policy Sequence
  const nineStepSequence = [
    {
      step: 1,
      name: 'Dataset Validation',
      desc: 'Verify tabular schema integrity, column headers, encoding format, and row invariants.',
      category: 'Pre-flight',
      safetyRule: 'Non-destructive',
    },
    {
      step: 2,
      name: 'Detection',
      desc: 'Multi-signal scanner sweeps numerical, categorical, and sensor spaces for all 20 failure modes.',
      category: 'Diagnostic',
      safetyRule: 'Read-only audit',
    },
    {
      step: 3,
      name: 'Classification',
      desc: 'Categorize anomalies into LOW, MEDIUM, HIGH, and CRITICAL severity tiers with root-cause attribution.',
      category: 'Severity Triage',
      safetyRule: 'Statistical fences',
    },
    {
      step: 4,
      name: 'Policy Selection',
      desc: 'Select distribution-aware remedies (skewness-calibrated median/mean imputation, IQR Winsorization, casing canonicalization).',
      category: 'Policy Match',
      safetyRule: 'Deterministic strategy',
    },
    {
      step: 5,
      name: 'Safety Validation',
      desc: 'Lock target columns (e.g. failure_flag) and primary identifiers against modification. Prevent target leakage.',
      category: 'Safety Guard',
      safetyRule: 'Target column immutable',
    },
    {
      step: 6,
      name: 'Corrections',
      desc: 'Apply transformations in isolated memory buffer, eliminating duplicates and clamping sensor drift.',
      category: 'Execution',
      safetyRule: 'Working buffer only',
    },
    {
      step: 7,
      name: 'Post-Repair Validation',
      desc: 'Conduct mandatory second-pass all-column audit comparing data quality and model test performance.',
      category: 'Verification',
      safetyRule: 'Rollback on degradation',
    },
    {
      step: 8,
      name: 'Updated Dataset Generation',
      desc: 'Serialize verified dataset with unique ID (ds_healed_...) and immutable version tag.',
      category: 'Persistence',
      safetyRule: 'Original preserved intact',
    },
    {
      step: 9,
      name: 'Generate Healing Report',
      desc: 'Compile comprehensive audit ledger with applied and skipped repairs for permanent compliance.',
      category: 'Audit & PDF',
      safetyRule: 'ISO 25012 compliance',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Autonomous Dataset Self-Healing Engine
            </h1>
            <span className="text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
              Zero-Target-Drift Policy
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Executes autonomous remediation across 20 statistical failure modes on an isolated working memory copy. Target labels (such as <code className="font-mono text-blue-600 dark:text-blue-400 font-bold">failure_flag</code>) are strictly protected against modification.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onRunAutonomousHealing}
            disabled={isExecuting}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm shadow-blue-600/30 transition-all flex items-center gap-2"
          >
            {isExecuting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing Self-Healing...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current" />
                <span>Execute Autonomous Healing</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pipeline State & Progress Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Pipeline Execution State:</span>
            <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold font-mono tracking-wider uppercase ${
              executionState === 'COMPLETED'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : executionState === 'HEALING' || executionState === 'VERIFYING' || executionState === 'RUNNING'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 animate-pulse'
                : executionState === 'DEGRADED' || executionState === 'FAILED'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              {executionState}
            </span>
          </div>

          <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
            {faultsCount > 0 ? `${faultsCount} faults queued for remediation` : 'Dataset nominal (0 active faults)'}
          </div>
        </div>

        {/* State Stepper Visualizer */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
          {[
            { key: 'QUEUED', label: '1. Ingestion Queue' },
            { key: 'RUNNING', label: '2. Problem Detection' },
            { key: 'HEALING', label: '3. Remediation Policy' },
            { key: 'VERIFYING', label: '4. 2nd Scan Audit' },
            { key: 'COMPLETED', label: '5. Healed Dataset' },
          ].map((step, idx) => {
            const stepOrder = ['IDLE', 'QUEUED', 'RUNNING', 'HEALING', 'VERIFYING', 'COMPLETED'];
            const currentIndex = stepOrder.indexOf(executionState);
            const thisIndex = stepOrder.indexOf(step.key.split('.')[1].trim().toUpperCase()) || (idx + 1);
            const isDone = currentIndex >= (idx + 1) && currentIndex > 0;
            const isCurrent = (executionState === 'RUNNING' && idx === 1) ||
                              (executionState === 'HEALING' && idx === 2) ||
                              (executionState === 'VERIFYING' && idx === 3) ||
                              (executionState === 'COMPLETED' && idx === 4);

            return (
              <div
                key={step.key}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isDone
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : isCurrent
                    ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 font-semibold'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                  <span>0{idx + 1}</span>
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : isCurrent ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" /> : null}
                </div>
                <div className="text-xs font-bold truncate text-slate-900 dark:text-white">{step.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verification Success Callout */}
      {isCompleted && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Self-Healing Verified Successfully</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold">
                  VERIFIED_SUCCESS
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Data quality improved without distortion of ground-truth target distributions or loss of primary keys. A separate updated dataset version has been generated.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigateTab('updated')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5"
            >
              <span>View Updated Dataset</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* POINT 7: 9-STEP AUTONOMOUS REPAIR POLICY SEQUENCE */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>9-Step Autonomous Repair Policy Sequence</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Atomic Rollback Protection Active</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          The autonomous repair engine executes this formal 9-step policy sequence in strict chronological order. Each step validates statistical invariants before advancing:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {nineStepSequence.map((item) => {
            const isStepActive = isExecuting;
            const isStepDone = isCompleted;

            return (
              <div
                key={item.step}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold font-mono text-[11px] flex items-center justify-center">
                      {item.step}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {item.name}
                    </span>
                  </div>
                  {isStepDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400">
                      {item.category}
                    </span>
                  )}
                </div>

                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  {item.desc}
                </p>

                <div className="pt-1 flex items-center justify-between text-[10px] font-mono border-t border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400">Policy Guard:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {item.safetyRule}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
