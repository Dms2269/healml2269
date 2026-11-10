/**
 * HEALML Enterprise - Authentication & Role-Based Access Control Types
 */

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CLIENT' | 'MASTER_ADMIN';
export type AccountStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';

export interface ClientQuotas {
  maxDatasets: number;
  maxUploadSizeMb: number;
  maxTotalStorageMb: number;
  allowedFormats: string;
  maxDailyUploads: number;
}

export interface ClientPermissions {
  canUpload: boolean;
  canAnalyze: boolean;
  canHeal: boolean;
  canTrain: boolean;
  canEvaluate: boolean;
  canDownloadReports: boolean;
  canExportPdf: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  companyName?: string;
  phoneNumber?: string;
  role: UserRole;
  status: AccountStatus;
  rejectionReason?: string;
  organization?: string;
  quotas?: ClientQuotas;
  permissions?: ClientPermissions;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
}

export interface DatasetVersionItem {
  id: string;
  datasetId: string;
  versionNum: number;
  rowCount: number;
  qualityScore: number;
  changeSummary: string;
  createdAt: string;
  format?: string;
}

export interface AdminKPIs {
  totalClients: number;
  pendingApprovals: number;
  activeClients: number;
  totalDatasets: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  successfulRecoveries: number;
  unreadTickets?: number;
  unresolvedAlerts?: number;
  systemHealth: string;
}

export interface TicketReplyItem {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  emailStatus?: string;
  emailError?: string;
  createdAt: string;
}

export interface SupportTicketItem {
  id: string;
  clientId: string;
  clientEmail: string;
  clientName: string;
  category: string;
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'NEW' | 'IN_PROGRESS' | 'WAITING_FOR_CLIENT' | 'RESOLVED' | 'CLOSED';
  isReadByAdmin: boolean;
  replyCount: number;
  replies?: TicketReplyItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CriticalAlertItem {
  id: string;
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
  category: string;
  affectedService: string;
  summary: string;
  details?: string;
  recommendedAction?: string;
  recipientEmail: string;
  emailStatus: 'SENT' | 'FAILED' | 'AUDIT_LOGGED' | 'PENDING';
  isResolved: boolean;
  createdAt: string;
}

export interface ModelEvaluationItem {
  id: string;
  datasetId: string;
  datasetName: string;
  clientId: string;
  modelName: string;
  modelVersion: string;
  taskType: string;
  trainSamples: number;
  testSamples: number;
  featuresCount: number;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1Score: number | null;
  balancedAccuracy: number | null;
  cvScore: number | null;
  cvStd: number | null;
  trainDurationMs: number;
  predictDurationMs: number;
  confusionMatrix: any[];
  classificationReport: any;
  rocCurve: any[];
  isSelected: boolean;
  evaluationStatus: string;
  evaluationNotes: string;
  createdAt: string;
}

export interface AuditLogItem {
  id: number;
  user_id: string | null;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  ip_address: string;
  created_at: string;
}

export interface BackupItem {
  id: string;
  backup_filename: string;
  file_size_bytes: number;
  status: string;
  checksum_sha256: string;
  is_pre_restore: boolean;
  created_at: string;
}

export interface SystemHealthData {
  backendStatus: string;
  databaseConnectivity: string;
  mlPipelineAvailable: boolean;
  backgroundWorkers: string;
  diskSpace: {
    totalGb: number;
    usedGb: number;
    freeGb: number;
  };
  databaseSizeKb: number;
  timestamp: string;
}

export interface ProjectItem {
  id: string;
  clientId: string;
  name: string;
  description: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  datasetCount?: number;
  modelCount?: number;
}

export interface TrainingRunItem {
  id: string;
  clientId: string;
  projectId: string;
  datasetId: string;
  datasetVersion: number;
  datasetFileHash?: string;
  modelName: string;
  modelVersion: string;
  algorithmType: string;
  targetColumn: string;
  taskType: string;
  featuresSelected?: string[];
  hyperparameters?: Record<string, any>;
  trainSamples: number;
  testSamples: number;
  testAccuracy: number | null;
  balancedAccuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1Score: number | null;
  rocAuc: number | null;
  cvScores?: number[];
  confusionMatrix?: any[];
  classificationReport?: any;
  regressionMetrics?: Record<string, number>;
  trainDurationMs: number;
  predictDurationMs: number;
  trainingStatus: 'OPTIMAL' | 'DEGRADED' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
}

export interface PredictionLogItem {
  id: string;
  clientId: string;
  projectId: string;
  datasetId: string;
  datasetVersion: number;
  modelId: string;
  modelVersion: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  predictionTimestamp: string;
}

export interface ModelOperationsOverview {
  kpis: {
    totalClients: number;
    activeProjects: number;
    activeDatasets: number;
    archivedDatasets: number;
    totalDatasets: number;
    totalTrainingRuns: number;
    optimalRuns: number;
    failedRuns: number;
    degradedRuns: number;
    avgAccuracy: number;
    maxAccuracy: number;
    topAlgorithm: string;
    avgTrainDurationMs: number;
    healingInterventions: number;
    totalJobs: number;
    storageMb: number;
  };
  clients: Array<{
    clientId: string;
    name: string;
    email: string;
    company?: string;
    status: string;
    activeProjects: number;
    activeDatasets: number;
    totalModelsBuilt: number;
    latestModel: string;
    latestAccuracy: number | null;
    avgAccuracy: number;
    lastTrainingDate: string | null;
  }>;
  recentRuns: Array<TrainingRunItem & { clientName?: string; projectName?: string; datasetName?: string }>;
}
