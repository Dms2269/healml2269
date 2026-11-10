/**
 * HEALML Enterprise - API Client
 * Connects frontend to the Express/Python REST backend with Bearer auth token persistence.
 */

import {
  UserProfile,
  AdminKPIs,
  AuditLogItem,
  BackupItem,
  SystemHealthData,
  DatasetVersionItem,
  ProjectItem,
  TrainingRunItem,
  PredictionLogItem,
  ModelOperationsOverview,
} from '../types/auth';

const TOKEN_KEY = 'healml_auth_token';
const USER_KEY = 'healml_auth_user';

export const apiClient = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setSession(token: string, user: UserProfile): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getStoredUser(): UserProfile | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      this.clearSession();
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `HTTP error ${res.status}`);
      (err as any).status = res.status;
      (err as any).accountStatus = data.accountStatus;
      throw err;
    }

    return data as T;
  },

  // Auth Endpoints
  async register(
    fullName: string,
    email: string,
    password: string,
    confirmPassword?: string,
    companyName?: string,
    phoneNumber?: string
  ): Promise<{ message: string; status: string; user: UserProfile }> {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, password, confirmPassword, companyName, phoneNumber }),
    });
  },

  async login(email: string, password: string): Promise<{ token: string; user: UserProfile }> {
    const res = await this.request<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setSession(res.token, res.user);
    return res;
  },

  async getMe(): Promise<{ user: UserProfile }> {
    return this.request('/api/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.clearSession();
    }
  },

  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    return this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  // Dataset Endpoints
  async getDatasets(): Promise<{ datasets: any[] }> {
    return this.request('/api/datasets');
  },

  async listDatasets(projectId?: string, includeArchived?: boolean): Promise<{ datasets: any[] }> {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);
    if (includeArchived) params.append('includeArchived', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/datasets${qs}`);
  },

  async getDataset(datasetId: string): Promise<{ dataset: any; columns: any[]; previewRows: any[]; totalRows: number }> {
    return this.request(`/api/datasets/${datasetId}`);
  },

  async uploadDataset(formData: FormData): Promise<{ dataset: any }> {
    return this.request('/api/datasets/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async uploadManualDataset(name: string, rows: any[], targetCol?: string): Promise<{ dataset: any }> {
    return this.request('/api/datasets/upload', {
      method: 'POST',
      body: JSON.stringify({ name, rows, targetCol }),
    });
  },

  async getDatasetVersions(datasetId: string): Promise<{ versions: DatasetVersionItem[] }> {
    return this.request(`/api/datasets/${datasetId}/versions`);
  },

  getVersionDownloadUrl(datasetId: string, versionId: string, format: 'csv' | 'xlsx'): string {
    return `/api/datasets/${datasetId}/versions/${versionId}/download?format=${format}`;
  },

  // Live Pipeline Execution
  async startPipeline(datasetId: string, targetCol?: string): Promise<{ jobId: string; job: any }> {
    return this.request('/api/pipeline/start', {
      method: 'POST',
      body: JSON.stringify({ datasetId, targetCol }),
    });
  },

  async getJobStatus(jobId: string): Promise<{ job: any; results: any }> {
    return this.request(`/api/pipeline/${jobId}/status`);
  },

  // Support Tickets Endpoints
  async createSupportTicket(data: {
    category: string;
    subject: string;
    description: string;
    priority?: string;
    name?: string;
    email?: string;
  }): Promise<{ message: string; ticket: any }> {
    return this.request('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMyTickets(): Promise<{ tickets: any[] }> {
    return this.request('/api/support/my-tickets');
  },

  async replyTicket(ticketId: string, message: string, status?: string): Promise<{ message: string; reply: any; ticket: any }> {
    return this.request(`/api/support/tickets/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message, status }),
    });
  },

  // Admin Endpoints
  async getAdminDashboard(): Promise<{ kpis: AdminKPIs }> {
    return this.request('/api/admin/dashboard');
  },

  async getAdminClients(): Promise<{ clients: UserProfile[] }> {
    return this.request('/api/admin/clients');
  },

  async getAdminClientDetail(clientId: string): Promise<{ client: UserProfile; datasets: any[]; jobs: any[]; tickets: any[] }> {
    return this.request(`/api/admin/clients/${clientId}/detail`);
  },

  async updateClientStatus(
    clientId: string,
    status: string,
    reason?: string,
    quotas?: any,
    permissions?: any
  ): Promise<{ message: string; client: UserProfile }> {
    return this.request(`/api/admin/clients/${clientId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason, quotas, permissions }),
    });
  },

  async approveClient(
    clientId: string,
    quotas?: any,
    permissions?: any
  ): Promise<{ message: string; client: UserProfile }> {
    return this.updateClientStatus(clientId, 'ACTIVE', undefined, quotas, permissions);
  },

  async rejectClient(clientId: string, reason?: string): Promise<{ message: string; client: UserProfile }> {
    return this.updateClientStatus(clientId, 'REJECTED', reason);
  },

  async suspendClient(clientId: string, reason?: string): Promise<{ message: string; client: UserProfile }> {
    return this.updateClientStatus(clientId, 'SUSPENDED', reason);
  },

  async reactivateClient(clientId: string): Promise<{ message: string; client: UserProfile }> {
    return this.updateClientStatus(clientId, 'ACTIVE');
  },

  async getAdminClientMlModels(clientId: string): Promise<{ client: UserProfile; models: any[]; totalModels: number }> {
    return this.request(`/api/admin/clients/${clientId}/ml-models`);
  },

  async flagModelReview(modelId: string, status: string, notes?: string): Promise<{ message: string; model: any }> {
    return this.request(`/api/admin/models/${modelId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  },

  async updateClientRole(clientId: string, role: string): Promise<{ message: string; client: UserProfile }> {
    return this.request(`/api/admin/clients/${clientId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },

  async getAdminJobs(): Promise<{ jobs: any[] }> {
    return this.request('/api/admin/jobs');
  },

  async getAdminTickets(statusFilter?: string): Promise<{ tickets: any[]; unreadCount: number }> {
    const q = statusFilter ? `?status=${statusFilter}` : '';
    return this.request(`/api/admin/support/tickets${q}`);
  },

  async updateAdminTicketStatus(ticketId: string, status: string, resolutionNotes?: string): Promise<{ message: string; ticket: any; emailNotification?: any }> {
    return this.request(`/api/admin/support/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolutionNotes }),
    });
  },

  async getAdminAlerts(): Promise<{ alerts: any[]; unresolvedCount: number; recipientEmail: string }> {
    return this.request('/api/admin/alerts');
  },

  async resolveAlert(alertId: string): Promise<{ message: string; alert: any }> {
    return this.request(`/api/admin/alerts/${alertId}/resolve`, { method: 'POST' });
  },

  async testSmtpAlert(): Promise<{ message: string; alert: any; status: string }> {
    return this.request('/api/admin/alerts/test-smtp', { method: 'POST' });
  },

  async getAdminMlMonitoring(): Promise<{ evaluations: any[]; totalEvaluated: number }> {
    return this.request('/api/admin/ml-monitoring');
  },

  async getAdminAuditLogs(): Promise<{ logs: AuditLogItem[] }> {
    return this.request('/api/admin/audit-logs');
  },

  async getAdminSystemHealth(): Promise<SystemHealthData> {
    return this.request('/api/admin/system-health');
  },

  async createBackup(): Promise<{ message: string; backup: BackupItem }> {
    return this.request('/api/admin/backup/create', { method: 'POST' });
  },

  async listBackups(): Promise<{ backups: BackupItem[] }> {
    return this.request('/api/admin/backup/list');
  },

  async restoreBackup(backupId: string): Promise<{ message: string }> {
    return this.request('/api/admin/backup/restore', {
      method: 'POST',
      body: JSON.stringify({ backupId }),
    });
  },

  // Project Management Endpoints
  async getProjects(): Promise<{ projects: ProjectItem[] }> {
    return this.request('/api/projects');
  },

  async createProject(name: string, description?: string): Promise<{ message: string; project: ProjectItem }> {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  },

  async getProject(projectId: string): Promise<{ project: ProjectItem; datasets: any[]; trainingRuns: TrainingRunItem[] }> {
    return this.request(`/api/projects/${projectId}`);
  },

  async archiveProject(projectId: string): Promise<{ message: string; project: ProjectItem }> {
    return this.request(`/api/projects/${projectId}/archive`, { method: 'POST' });
  },

  // Advanced Dataset Lifecycle Endpoints
  async getProjectDatasets(projectId: string): Promise<{ activeDatasets: any[]; archivedDatasets: any[] }> {
    return this.request(`/api/projects/${projectId}/datasets`);
  },

  async archiveDataset(datasetId: string): Promise<{ message: string; dataset: any }> {
    return this.request(`/api/datasets/${datasetId}/archive`, { method: 'POST' });
  },

  async restoreDataset(datasetId: string): Promise<{ message: string; dataset: any }> {
    return this.request(`/api/datasets/${datasetId}/restore`, { method: 'POST' });
  },

  async permanentlyDeleteDataset(datasetId: string, confirmationPhrase: string): Promise<{ message: string }> {
    return this.request(`/api/datasets/${datasetId}/permanent`, {
      method: 'DELETE',
      body: JSON.stringify({ confirmationPhrase }),
    });
  },

  async getDatasetHistory(datasetId: string): Promise<{ dataset: any; versions: any[]; trainingRuns: TrainingRunItem[] }> {
    return this.request(`/api/datasets/${datasetId}/history`);
  },

  // Immutable Training Runs Endpoints
  async getProjectTrainingRuns(projectId: string): Promise<{ runs: TrainingRunItem[]; trainingRuns: TrainingRunItem[] }> {
    return this.request(`/api/projects/${projectId}/training-runs`);
  },

  async getTrainingRun(runId: string): Promise<{ run: TrainingRunItem }> {
    return this.request(`/api/training-runs/${runId}`);
  },

  // Master Admin: Full Model Operations Center
  async getModelOperationsOverview(): Promise<ModelOperationsOverview> {
    return this.request('/api/admin/model-operations/overview');
  },

  async getModelOperationsClient(clientId: string): Promise<{
    client: UserProfile;
    stats: any;
    projects: ProjectItem[];
    datasets: any[];
    trainingRuns: any[];
  }> {
    return this.request(`/api/admin/model-operations/clients/${clientId}`);
  },

  async getModelOperationsProject(projectId: string): Promise<{
    project: ProjectItem;
    client: UserProfile | null;
    datasets: any[];
    trainingRuns: any[];
    latestJob: any;
  }> {
    return this.request(`/api/admin/model-operations/projects/${projectId}`);
  },

  async getModelOperationsLeaderboard(algorithm?: string, status?: string): Promise<{ leaderboard: any[]; totalEntries: number }> {
    const params = new URLSearchParams();
    if (algorithm) params.append('algorithm', algorithm);
    if (status) params.append('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/admin/model-operations/leaderboard${qs}`);
  },
};
