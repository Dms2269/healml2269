/**
 * HEALML – Universal Self-Healing ML Pipeline
 * Data models and type definitions for universal tabular datasets,
 * all-column fault detection, automatic multi-target analysis,
 * dynamic ML tasks (classification, regression, unsupervised),
 * 6-step self-healing, and SQLite PDF audit reports.
 */

export type MLTaskType = 
  | 'binary_classification'
  | 'multiclass_classification'
  | 'regression'
  | 'unsupervised';

export type ColumnRole = 'numeric' | 'categorical' | 'datetime' | 'identifier';

export interface DataColumn {
  name: string;
  type: ColumnRole;
  missingCount: number;
  uniqueCount: number;
  mean?: number;
  min?: number;
  max?: number;
  median?: number;
  std?: number;
  isIdentifier?: boolean;
  isConstant?: boolean;
  outlierCount?: number;
  invalidTypeCount?: number;
  categories?: string[];
  skewness?: number;
  variance?: number;
}

export type DataRow = Record<string, string | number | null | undefined>;

export type VerificationStatus = 
  | 'VERIFIED_SUCCESS' 
  | 'NEEDS_MANUAL_REVIEW'
  | 'HEALING_FAILED'
  | 'RECOVERY_FAILED'
  | 'ESCALATED'
  | 'PARTIALLY_HEALED' 
  | 'REQUIRES_MANUAL_REVIEW';

export interface DetailedQualityScore {
  completeness: number; // 0 - 1
  uniqueness: number;   // 0 - 1
  validity: number;     // 0 - 1
  consistency: number;  // 0 - 1
  outlierStability: number; // 0 - 1
  overallScore: number; // 0 - 100
}

export interface RemovedRecordAudit {
  id: string;
  rowIndex: number;
  reason: string;
  purgedRowSnippet: Record<string, any>;
}

export interface TargetEvaluationSummary {
  targetName: string;
  taskType: MLTaskType;
  eligible: boolean;
  exclusionReason?: string;
  modelMetrics?: ModelMetrics;
  trainTimeMs: number;
  status: 'EVALUATED' | 'EXCLUDED' | 'FAILED';
  scoreFormatted: string;
}

export interface ColumnFaultReport {
  columnName: string;
  role: ColumnRole;
  faultsCount: number;
  faultTypes: FaultType[];
  severity: FaultSeverity;
  status: 'NOMINAL' | 'FAULTED' | 'HEALED';
  details: string[];
  remediationAction?: RecoveryAction;
  affectedRowCount: number;
  detectionMethod?: string;
  confidenceScore?: number;
  psiScore?: number;
}

export interface Dataset {
  id: string;
  projectId?: string;
  name: string;
  domain: string;
  description: string;
  rows: DataRow[];
  columns: DataColumn[];
  targetColumn: string; // Specific column name, '' or 'None' for Unsupervised/Data Quality Only, or 'AUTO_ALL_ELIGIBLE'
  taskType: MLTaskType;
  originalRows: DataRow[]; // Untouched raw data preservation
  originalColumns?: DataColumn[]; // Original raw column schema
  healedRows?: DataRow[]; // Explicit validated healed working dataset copy
  isHealed?: boolean;
  autoSuggestedTarget?: string;
  multiTargetMode?: boolean;
  multiTargetResults?: TargetEvaluationSummary[];
  columnFaultReports?: ColumnFaultReport[];
  inputFormat?: 'csv' | 'xlsx' | 'manual';
  verificationStatus?: VerificationStatus;
  qualityScore?: DetailedQualityScore;
  originalQualityScore?: DetailedQualityScore;
  removedAudit?: RemovedRecordAudit[];
  isArchived?: boolean;
  archivedAt?: string;
  versionNum?: number;
  fileHash?: string;
  fileSizeBytes?: number;
  originalFilename?: string;
}

export interface ColumnChangeDetail {
  columnName: string;
  dataType: string;
  missingBefore: number;
  missingAfter: number;
  outliersBefore: number;
  outliersAfter: number;
  transformationApplied: string;
  reason: string;
}

export interface DatasetComparisonStats {
  original: {
    name: string;
    rows: number;
    columns: number;
    missingValues: number;
    duplicateRows: number;
    dataQualityScore: number;
    fileSizeBytes: number;
    fileSizeFormatted: string;
  };
  repaired: {
    name: string;
    rows: number;
    columns: number;
    missingValues: number;
    duplicateRows: number;
    dataQualityScore: number;
    fileSizeBytes: number;
    fileSizeFormatted: string;
  };
  deltas: {
    missingReduced: number;
    duplicatesPurged: number;
    qualityImprovement: number;
    rowsDifference: number;
    columnsPreserved: number;
  };
  columnChangelog: ColumnChangeDetail[];
  isValidated: boolean;
  validationErrors: string[];
}

export interface DetailedColumnAnalysis {
  columnName: string;
  dataType: string;
  missingCount: number;
  missingPercentage: number;
  duplicateCount?: number;
  outlierCount: number;
  invalidValuesCount: number;
  driftStatus: string;
  detectedFaultStatus: 'OPTIMAL' | 'FAULTED' | 'HEALED';
}

export type PipelineStage = 
  | 'ingestion'
  | 'validation'
  | 'preprocessing'
  | 'feature_engineering'
  | 'model_training'
  | 'model_evaluation'
  | 'anomaly_detection'
  | 'fault_monitoring'
  | 'self_healing';

export type StageStatus = 'idle' | 'running' | 'success' | 'warning' | 'faulted' | 'healed';

export interface StageState {
  stage: PipelineStage;
  label: string;
  status: StageStatus;
  durationMs: number;
  message: string;
  timestamp: string;
}

export interface ClassReport {
  label: string;
  precision: number;
  recall: number;
  f1Score: number;
  support: number;
}

export interface ResidualPoint {
  actual: number;
  predicted: number;
  error: number;
}

export interface ModelLeaderboardEntry {
  modelName: string;
  algorithmType: 'RandomForest' | 'ExtraTrees' | 'GradientBoosting' | 'LogisticRegression' | 'RidgeRegression' | 'IsolationForest';
  accuracyOrR2: number;
  f1OrMae: number;
  balancedAccuracy?: number;
  cvScore: number;
  cvStd?: number;
  trainTimeMs: number;
  isSelected: boolean;
  notes?: string;
}

export interface ModelMetrics {
  taskType: MLTaskType;
  algorithmName?: string;
  accuracy: number; // For classification: holdout accuracy; For regression: R^2; For unsupervised: 0 (genuine metrics below)
  precision: number;
  recall: number;
  f1Score: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  weightedPrecision: number;
  weightedRecall: number;
  weightedF1: number;
  balancedAccuracy?: number;
  rocAuc?: number;
  cvScores?: number[];
  cvMean?: number;
  cvStd?: number;
  targetClasses: string[];
  matrix: number[][];
  classReports: ClassReport[];
  classDistribution: { label: string; count: number; percentage: number }[];
  confusionMatrix: {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
  };
  rocCurve: { fpr: number; tpr: number }[];
  featureImportance: { feature: string; importance: number }[];
  trainTimeMs: number;
  trainingStatus: 'OPTIMAL' | 'EVALUATED' | 'TRAINING' | 'DEGRADED';
  lastExecutionTimestamp: string;
  errorMessage?: string;
  modelLeaderboard?: ModelLeaderboardEntry[];

  // Regression-specific metrics
  mae?: number;
  mse?: number;
  rmse?: number;
  r2Score?: number;
  residuals?: ResidualPoint[];

  // Unsupervised-specific metrics (Isolation Forest telemetry)
  anomalyRatio?: number;
  contamination?: number;
  clusterCount?: number;
  normalCount?: number;
  anomalyCount?: number;
  averageIsolationScore?: number;
}

export interface AnomalyPoint {
  index: number;
  score: number;
  prediction: 1 | -1;
  isAnomaly: boolean;
  row: DataRow;
  primaryReason: string;
}

export type FaultType = 
  | 'MISSING_VALUES_SPIKE'
  | 'OUT_OF_BOUNDS_DRIFT'
  | 'DUPLICATE_RECORD_FLOOD'
  | 'SCHEMA_DRIFT'
  | 'MODEL_PERFORMANCE_DEGRADATION'
  | 'EXECUTION_TYPE_ERROR'
  | 'EXTREME_OUTLIER_CLUSTER'
  | 'CONSTANT_COLUMN_DETECTED'
  | 'HIGH_CARDINALITY_CATEGORICAL'
  | 'CATEGORY_DISTRIBUTION_DRIFT'
  | 'DATETIME_FORMAT_OR_GAP_ERROR'
  | 'IDENTIFIER_INTEGRITY_VIOLATION'
  | 'TARGET_CLASS_IMBALANCE';

export type FaultSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FaultEvent {
  id: string;
  timestamp: string;
  stage: PipelineStage;
  faultType: FaultType;
  severity: FaultSeverity;
  affectedColumns: string[];
  affectedRowCount: number;
  description: string;
  rootCause: string;
  recommendedAction: string;
  detectionMethod?: string;
  confidenceScore?: number;
  isConfirmed?: boolean;
  psiScore?: number;
  isSynthetic?: boolean;
}

export type RecoveryAction = 
  | 'MEDIAN_IMPUTATION'
  | 'MEAN_IMPUTATION'
  | 'MODE_IMPUTATION'
  | 'DEDUPLICATION_PURGE'
  | 'ROBUST_SCALER_RECALIBRATION'
  | 'ISOLATION_OUTLIER_FILTERING'
  | 'ADAPTIVE_MODEL_RETRAINING'
  | 'PIPELINE_STAGE_ROLLBACK'
  | 'CARDINALITY_REDUCTION'
  | 'CONSTANT_COLUMN_PRUNING'
  | 'CLASS_WEIGHT_BALANCING';

export interface RecoveryLog {
  id: string;
  faultId: string;
  timestamp: string;
  stage: PipelineStage;
  actionTaken: RecoveryAction;
  details: string;
  preRecoveryMetric: number;
  postRecoveryMetric: number;
  verificationDelta: number;
  status: 'VERIFIED_SUCCESS' | 'RECOVERY_FAILED' | 'ESCALATED';
}

export interface RetrainComparison {
  baselineModel: ModelMetrics;
  degradedModel?: ModelMetrics;
  retrainedModel: ModelMetrics;
  accuracyDelta: number;
  f1Delta: number;
  timestamp: string;
  status: 'APPROVED' | 'REJECTED';
}

export interface PipelineSummary {
  totalRecords: number;
  processedRecords: number;
  dataQualityScore: number; // 0-100%
  detectedFaultsCount: number;
  anomaliesCount: number;
  recoveriesCount: number;
  activeModelAccuracy: number;
  pipelineHealth: 'OPTIMAL' | 'DEGRADED' | 'HEALING' | 'ERROR';
  taskType?: MLTaskType;

  // All-column & multi-target telemetry
  totalColumnsScanned: number;
  columnsWithFaultsCount: number;
  faultsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  faultsByStage: Record<string, number>;
  successfullyHealedCount: number;
  pendingRepairsCount: number;
  failedRepairsCount: number;
  multiTargetEvaluatedCount?: number;
}

export interface FaultDetailSnapshot {
  faultId: string;
  faultType: FaultType;
  stage: PipelineStage;
  severity: FaultSeverity;
  affectedColumns: string[];
  affectedRowCount: number;
  description: string;
  rootCause: string;
  recommendedAction: string;
  isSynthetic?: boolean;
}

export interface MetricComparisonSnapshot {
  label: string;
  before: string | number;
  after: string | number;
  delta: string | number;
  status: 'IMPROVED' | 'RESTORED' | 'STABLE' | 'DEGRADED';
}

export type PdfReportType = 
  | 'full_pipeline'
  | 'healing_recovery'
  | 'model_evaluation'
  | 'dataset_quality'
  | 'consolidated_pipeline';

export interface PdfReportRecord {
  id: string;
  title: string;
  reportType: PdfReportType;
  timestamp: string;
  datasetName: string;
  taskType?: MLTaskType;
  targetColumn?: string;
  totalRecords: number;
  totalColumnsScanned?: number;
  faultCount: number;
  recoveryCount: number;
  verificationStatus: VerificationStatus | 'CONSOLIDATED';
  recoveryLogIds: string[];
  preMetric: number;
  postMetric: number;
  deltaMetric: number;
  faults: FaultDetailSnapshot[];
  actionsTaken: RecoveryAction[];
  comparisons: MetricComparisonSnapshot[];
  explanationNotes: string;
  sqliteReference: string;
  columnFaultsSummary?: {
    columnName: string;
    role: ColumnRole;
    faultsCount: number;
    severity: FaultSeverity;
    status: string;
  }[];
  multiTargetSummaries?: {
    target: string;
    task: string;
    score: string;
    status: string;
  }[];
  regressionMetrics?: {
    mae: number;
    mse: number;
    rmse: number;
    r2Score: number;
  };
  dataQualityMetrics?: {
    completeness: number;
    duplicates: number;
    outliers: number;
    constantColumns: number;
  };
  qualityScoreBreakdown?: DetailedQualityScore;
  originalQualityScoreBreakdown?: DetailedQualityScore;
  removedAuditSample?: RemovedRecordAudit[];
  datasetComparison?: DatasetComparisonStats;
  detailedColumnAnalysis?: DetailedColumnAnalysis[];
}

