import { Router, Request, Response } from 'express';

export const fallbackApiRouter = Router();

// Test Clients & Master Admin Accounts
const USERS_DB = [
  {
    id: 'ADMIN-MASTER-001',
    email: 'mahadevshinde2269@gmail.com',
    fullName: 'Mahadev Shinde (Master Admin)',
    companyName: 'HEALML HQ Systems',
    role: 'MASTER_ADMIN',
    status: 'ACTIVE',
    phoneNumber: '+1-555-0100',
    canUpload: true,
    canAnalyze: true,
    canHeal: true,
    canTrain: true,
    canEvaluate: true,
    canDownloadReports: true,
    canExportPdf: true,
    maxDatasets: 100,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ADMIN-MASTER-002',
    email: 'admin@healml.com',
    fullName: 'System Administrator',
    companyName: 'HEALML Operations',
    role: 'MASTER_ADMIN',
    status: 'ACTIVE',
    phoneNumber: '+1-555-0101',
    canUpload: true,
    canAnalyze: true,
    canHeal: true,
    canTrain: true,
    canEvaluate: true,
    canDownloadReports: true,
    canExportPdf: true,
    maxDatasets: 100,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'CL-TEST-001',
    email: 'client1@healml.com',
    fullName: 'Alpha Robotics & Automation',
    companyName: 'Alpha Robotics Corp',
    role: 'CLIENT',
    status: 'ACTIVE',
    phoneNumber: '+1-555-0102',
    canUpload: true,
    canAnalyze: true,
    canHeal: true,
    canTrain: true,
    canEvaluate: true,
    canDownloadReports: true,
    canExportPdf: true,
    maxDatasets: 10,
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'CL-TEST-002',
    email: 'client2@healml.com',
    fullName: 'Beta Thermal Power Generation',
    companyName: 'Beta Energy Systems',
    role: 'CLIENT',
    status: 'ACTIVE',
    phoneNumber: '+1-555-0103',
    canUpload: true,
    canAnalyze: true,
    canHeal: true,
    canTrain: true,
    canEvaluate: true,
    canDownloadReports: true,
    canExportPdf: true,
    maxDatasets: 10,
    createdAt: '2026-02-05T00:00:00.000Z',
  },
  {
    id: 'CL-TEST-003',
    email: 'client3@healml.com',
    fullName: 'Gamma Semiconductor Fab',
    companyName: 'Gamma Nano-Circuits Ltd',
    role: 'CLIENT',
    status: 'ACTIVE',
    phoneNumber: '+1-555-0104',
    canUpload: true,
    canAnalyze: true,
    canHeal: true,
    canTrain: true,
    canEvaluate: true,
    canDownloadReports: true,
    canExportPdf: true,
    maxDatasets: 10,
    createdAt: '2026-02-10T00:00:00.000Z',
  }
];

// Seeded Projects strictly separated by Client ID
let PROJECTS_DB = [
  {
    id: 'prj_cl_test_001',
    clientId: 'CL-TEST-001',
    name: 'Machine A Reliability & Vibration Monitoring',
    description: 'Predictive maintenance for multi-axis industrial articulated arms.',
    isArchived: false,
    datasetCount: 2,
    modelCount: 2,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'prj_cl_test_002',
    clientId: 'CL-TEST-002',
    name: 'Turbine B Exhaust & Thermal Prediction',
    description: 'Gas turbine exhaust temperature profiling and flame detection.',
    isArchived: false,
    datasetCount: 2,
    modelCount: 1,
    createdAt: '2026-02-05T00:00:00.000Z',
    updatedAt: '2026-02-05T00:00:00.000Z',
  },
  {
    id: 'prj_cl_test_003',
    clientId: 'CL-TEST-003',
    name: 'Fab C Cleanroom & Power Telemetry',
    description: 'Cleanroom air particulate density and lithography power quality.',
    isArchived: false,
    datasetCount: 2,
    modelCount: 1,
    createdAt: '2026-02-10T00:00:00.000Z',
    updatedAt: '2026-02-10T00:00:00.000Z',
  }
];

// Seeded Datasets (2 per client = 6 total)
let DATASETS_DB = [
  // Client 1 Datasets
  {
    id: 'ds_cl1_vibration_telemetry',
    clientId: 'CL-TEST-001',
    projectId: 'prj_cl_test_001',
    name: 'Bearing Vibration Telemetry (Machine A)',
    filename: 'machine_a_bearing_vibration.csv',
    fileSizeBytes: 1048576,
    format: 'csv',
    rowCount: 400,
    columnCount: 9,
    targetCol: 'failure_flag',
    qualityScore: 94.5,
    isArchived: false,
    createdAt: '2026-02-01T01:00:00.000Z',
    healingStatus: 'ORIGINAL_VALID',
  },
  {
    id: 'ds_cl1_hydraulic_pressure',
    clientId: 'CL-TEST-001',
    projectId: 'prj_cl_test_001',
    name: 'Hydraulic Pressure & Fluid Dynamics (Machine A)',
    filename: 'machine_a_hydraulic_telemetry.csv',
    fileSizeBytes: 819200,
    format: 'csv',
    rowCount: 350,
    columnCount: 8,
    targetCol: 'pressure_bar',
    qualityScore: 92.8,
    isArchived: false,
    createdAt: '2026-02-02T01:00:00.000Z',
    healingStatus: 'ORIGINAL_VALID',
  },
  // Client 2 Datasets
  {
    id: 'ds_cl2_steam_temperature',
    clientId: 'CL-TEST-002',
    projectId: 'prj_cl_test_002',
    name: 'Turbine Thermal Exhaust Profile (Turbine B)',
    filename: 'turbine_b_exhaust_thermal.csv',
    fileSizeBytes: 1228800,
    format: 'csv',
    rowCount: 520,
    columnCount: 9,
    targetCol: 'temperature_c',
    qualityScore: 95.1,
    isArchived: false,
    createdAt: '2026-02-05T01:00:00.000Z',
    healingStatus: 'ORIGINAL_VALID',
  },
  {
    id: 'ds_cl2_rpm_frequency',
    clientId: 'CL-TEST-002',
    projectId: 'prj_cl_test_002',
    name: 'Rotational Velocity & Harmonic Resonance (Turbine B)',
    filename: 'turbine_b_rpm_resonance.csv',
    fileSizeBytes: 950000,
    format: 'csv',
    rowCount: 480,
    columnCount: 7,
    targetCol: 'rpm',
    qualityScore: 93.4,
    isArchived: false,
    createdAt: '2026-02-06T01:00:00.000Z',
    healingStatus: 'ORIGINAL_VALID',
  },
  // Client 3 Datasets
  {
    id: 'ds_cl3_cleanroom_particulates',
    clientId: 'CL-TEST-003',
    projectId: 'prj_cl_test_003',
    name: 'Cleanroom Atmospheric Sensors (Fab C)',
    filename: 'fab_c_cleanroom_atmospheric.csv',
    fileSizeBytes: 1400000,
    format: 'csv',
    rowCount: 600,
    columnCount: 8,
    targetCol: 'failure_flag',
    qualityScore: 96.8,
    isArchived: false,
    createdAt: '2026-02-10T01:00:00.000Z',
    healingStatus: 'ORIGINAL_VALID',
  },
  {
    id: 'ds_cl3_voltage_fluctuations',
    clientId: 'CL-TEST-003',
    projectId: 'prj_cl_test_003',
    name: 'Lithography Power Grid & Fluctuations (Fab C)',
    filename: 'fab_c_power_grid_telemetry.csv',
    fileSizeBytes: 750000,
    format: 'csv',
    rowCount: 420,
    columnCount: 7,
    targetCol: 'vibration_mm_s',
    qualityScore: 91.2,
    isArchived: false,
    createdAt: '2026-02-11T01:00:00.000Z',
    healingStatus: 'ORIGINAL_VALID',
  }
];

// Seeded Training Runs (strictly per project & client)
let TRAINING_RUNS_DB = [
  {
    id: 'tr_cl1_001',
    clientId: 'CL-TEST-001',
    projectId: 'prj_cl_test_001',
    datasetId: 'ds_cl1_vibration_telemetry',
    datasetVersion: 1,
    modelName: 'Random Forest Ensemble',
    modelVersion: 'v1.0',
    algorithmType: 'RandomForestClassifier',
    targetColumn: 'failure_flag',
    taskType: 'binary_classification',
    featuresSelected: ['temperature_c', 'vibration_mm_s', 'pressure_bar', 'rpm', 'operating_hours'],
    trainSamples: 320,
    testSamples: 80,
    testAccuracy: 0.8875,
    balancedAccuracy: 0.881,
    precision: 0.892,
    recall: 0.885,
    f1Score: 0.8885,
    rocAuc: 0.942,
    cvScores: [0.89, 0.87, 0.90, 0.88, 0.89],
    confusionMatrix: [[41, 4], [5, 40]],
    trainDurationMs: 142.5,
    predictDurationMs: 1.4,
    trainingStatus: 'OPTIMAL',
    createdAt: '2026-02-01T02:00:00.000Z',
  },
  {
    id: 'tr_cl1_002',
    clientId: 'CL-TEST-001',
    projectId: 'prj_cl_test_001',
    datasetId: 'ds_cl1_vibration_telemetry',
    datasetVersion: 1,
    modelName: 'Gradient Boosting Trees',
    modelVersion: 'v1.1',
    algorithmType: 'GradientBoostingClassifier',
    targetColumn: 'failure_flag',
    taskType: 'binary_classification',
    featuresSelected: ['temperature_c', 'vibration_mm_s', 'pressure_bar', 'rpm', 'operating_hours'],
    trainSamples: 320,
    testSamples: 80,
    testAccuracy: 0.9250,
    balancedAccuracy: 0.920,
    precision: 0.930,
    recall: 0.921,
    f1Score: 0.9250,
    rocAuc: 0.968,
    cvScores: [0.92, 0.93, 0.91, 0.94, 0.92],
    confusionMatrix: [[43, 2], [3, 42]],
    trainDurationMs: 168.2,
    predictDurationMs: 1.1,
    trainingStatus: 'OPTIMAL',
    createdAt: '2026-02-02T02:00:00.000Z',
  },
  {
    id: 'tr_cl2_001',
    clientId: 'CL-TEST-002',
    projectId: 'prj_cl_test_002',
    datasetId: 'ds_cl2_steam_temperature',
    datasetVersion: 1,
    modelName: 'Thermal Gradient Regressor',
    modelVersion: 'v1.0',
    algorithmType: 'RandomForestClassifier',
    targetColumn: 'temperature_c',
    taskType: 'binary_classification',
    featuresSelected: ['vibration_mm_s', 'pressure_bar', 'rpm', 'operating_hours'],
    trainSamples: 416,
    testSamples: 104,
    testAccuracy: 0.9135,
    balancedAccuracy: 0.910,
    precision: 0.918,
    recall: 0.912,
    f1Score: 0.9135,
    rocAuc: 0.955,
    cvScores: [0.91, 0.92, 0.90, 0.92, 0.91],
    confusionMatrix: [[52, 3], [4, 45]],
    trainDurationMs: 155.0,
    predictDurationMs: 1.2,
    trainingStatus: 'OPTIMAL',
    createdAt: '2026-02-05T02:00:00.000Z',
  },
  {
    id: 'tr_cl3_001',
    clientId: 'CL-TEST-003',
    projectId: 'prj_cl_test_003',
    datasetId: 'ds_cl3_cleanroom_particulates',
    datasetVersion: 1,
    modelName: 'Cleanroom Anomaly Classifier',
    modelVersion: 'v1.0',
    algorithmType: 'RandomForestClassifier',
    targetColumn: 'failure_flag',
    taskType: 'binary_classification',
    featuresSelected: ['temperature_c', 'vibration_mm_s', 'pressure_bar', 'rpm'],
    trainSamples: 480,
    testSamples: 120,
    testAccuracy: 0.9417,
    balancedAccuracy: 0.938,
    precision: 0.945,
    recall: 0.940,
    f1Score: 0.9417,
    rocAuc: 0.978,
    cvScores: [0.94, 0.95, 0.93, 0.95, 0.94],
    confusionMatrix: [[61, 2], [3, 54]],
    trainDurationMs: 148.0,
    predictDurationMs: 1.0,
    trainingStatus: 'OPTIMAL',
    createdAt: '2026-02-10T02:00:00.000Z',
  }
];

// Seeded Tickets
let TICKETS_DB = [
  {
    id: 'tkt_001',
    clientId: 'CL-TEST-001',
    clientName: 'Alpha Robotics & Automation',
    subject: 'Sensor sampling frequency configuration inquiry',
    description: 'We require guidance on syncing 100Hz vibration accelerometer telemetry with HEALML.',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    createdAt: '2026-02-02T10:00:00.000Z',
    replies: [
      {
        id: 'rep_001',
        senderName: 'Master Admin',
        senderRole: 'ADMIN',
        message: 'You can stream telemetry at up to 1kHz using the CSV ingestion API or WebSocket buffer.',
        createdAt: '2026-02-02T11:00:00.000Z',
      }
    ]
  },
  {
    id: 'tkt_002',
    clientId: 'CL-TEST-002',
    clientName: 'Beta Thermal Power Generation',
    subject: 'Exhaust thermocouple drift threshold adjustment',
    description: 'Requesting custom Z-score calibration for high-temperature turbine exhaust.',
    priority: 'HIGH',
    status: 'OPEN',
    createdAt: '2026-02-06T14:30:00.000Z',
    replies: []
  }
];

// Helper to extract authenticated user from Authorization Bearer token
function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return null;
  }

  // Tokens format: token_<userId> or user_<userId> or healml_token_<userId>
  const matchedUser = USERS_DB.find((u) => {
    return token.includes(u.id) || token.includes(u.email);
  });

  if (matchedUser) {
    return matchedUser;
  }

  // Default to Master Admin if generic active token
  return USERS_DB[0];
}

// -------------------------------------------------------------------------
// 1. SYSTEM HEALTH
// -------------------------------------------------------------------------
fallbackApiRouter.get('/system/health', (req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    database: 'CONNECTED',
    mlSubsystem: 'ACTIVE',
    service: 'HEALML Universal Self-Healing ML Engine',
    timestamp: new Date().toISOString(),
  });
});

fallbackApiRouter.get('/admin/system/health', (req: Request, res: Response) => {
  res.json({
    backendStatus: 'ONLINE',
    databaseConnectivity: 'CONNECTED',
    mlPipelineAvailable: true,
    backgroundWorkers: 'RUNNING',
    diskSpace: { totalGb: 100, usedGb: 24, freeGb: 76 },
    databaseSizeKb: 8192,
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------------------
// 2. AUTHENTICATION (Supports Client ID, Registered Email, Master Admin Email)
// -------------------------------------------------------------------------
fallbackApiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, username, clientId, password } = req.body || {};
  const identifier = (email || username || clientId || '').trim().toLowerCase();

  if (!identifier || !password) {
    res.status(400).json({ error: 'Client ID or Email and password are required.' });
    return;
  }

  const user = USERS_DB.find((u) => {
    return u.id.toLowerCase() === identifier || u.email.toLowerCase() === identifier;
  });

  if (!user) {
    res.status(401).json({ error: 'Invalid Client ID / Email or password credentials.' });
    return;
  }

  // Account status verification
  if (user.status === 'PENDING_APPROVAL') {
    res.status(403).json({
      error: 'Your account is pending administrator review and approval.',
      accountStatus: 'PENDING_APPROVAL'
    });
    return;
  }

  // Return verified session token encoding the user's permanent role and ID
  const token = `healml_token_${user.id}_${Date.now()}`;
  res.json({
    token,
    user: { ...user },
  });
});

fallbackApiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({ user });
});

fallbackApiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { fullName = 'New Client', email = 'newclient@healml.com', companyName = '' } = req.body || {};
  const newClientId = `CL-TEST-00${USERS_DB.length}`;
  const newUser = {
    id: newClientId,
    email,
    fullName,
    companyName,
    role: 'CLIENT',
    status: 'ACTIVE',
    phoneNumber: '',
    canUpload: true,
    canAnalyze: true,
    canHeal: true,
    canTrain: true,
    canEvaluate: true,
    canDownloadReports: true,
    canExportPdf: true,
    maxDatasets: 10,
    createdAt: new Date().toISOString(),
  };
  USERS_DB.push(newUser);
  res.json({
    message: 'Client registered successfully.',
    status: 'ACTIVE',
    user: newUser,
  });
});

fallbackApiRouter.post('/auth/logout', (req: Request, res: Response) => {
  res.json({ message: 'Session terminated successfully.' });
});

fallbackApiRouter.post('/auth/forgot-password', (req: Request, res: Response) => {
  res.json({ message: 'Password reset link dispatched.', resetToken: 'mock_token_123' });
});

fallbackApiRouter.post('/auth/reset-password', (req: Request, res: Response) => {
  res.json({ message: 'Password updated successfully.' });
});

// -------------------------------------------------------------------------
// 3. PROJECTS (Strict Client Isolation)
// -------------------------------------------------------------------------
fallbackApiRouter.get('/projects', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // If Master Admin, return all projects. If Client, return ONLY their projects.
  if (user.role === 'MASTER_ADMIN' || user.role === 'SUPER_ADMIN') {
    res.json({ projects: PROJECTS_DB });
  } else {
    const clientProjects = PROJECTS_DB.filter((p) => p.clientId === user.id);
    res.json({ projects: clientProjects });
  }
});

fallbackApiRouter.post('/projects', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { name = 'New Project', description = '' } = req.body || {};
  const newProject = {
    id: `prj_${Date.now()}`,
    clientId: user.id,
    name,
    description,
    isArchived: false,
    datasetCount: 0,
    modelCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  PROJECTS_DB.unshift(newProject);
  res.json({ message: `Project '${name}' created.`, project: newProject });
});

// -------------------------------------------------------------------------
// 4. DATASETS (Strict Client Isolation)
// -------------------------------------------------------------------------
fallbackApiRouter.get('/datasets', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { projectId, includeArchived } = req.query || {};

  let filtered = DATASETS_DB;

  // Enforce Tenant Separation
  if (user.role !== 'MASTER_ADMIN' && user.role !== 'SUPER_ADMIN') {
    filtered = filtered.filter((d) => d.clientId === user.id);
  }

  if (projectId) {
    filtered = filtered.filter((d) => d.projectId === projectId);
  }

  if (!includeArchived || includeArchived === 'false') {
    filtered = filtered.filter((d) => !d.isArchived);
  }

  res.json({ datasets: filtered });
});

fallbackApiRouter.get('/datasets/:id', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const ds = DATASETS_DB.find((d) => d.id === req.params.id);
  if (!ds) {
    res.status(404).json({ error: 'Dataset not found.' });
    return;
  }

  // Cross-tenant protection
  if (user && user.role !== 'MASTER_ADMIN' && user.role !== 'SUPER_ADMIN' && ds.clientId !== user.id) {
    res.status(403).json({ error: 'Access forbidden: Dataset belongs to another client.' });
    return;
  }

  res.json({
    dataset: ds,
    columns: ['machine_id', 'timestamp', 'site', 'temperature_c', 'vibration_mm_s', 'pressure_bar', 'rpm', 'operating_hours', 'failure_flag'],
    previewRows: [],
    totalRows: ds.rowCount || 400,
  });
});

fallbackApiRouter.post('/datasets/:id/archive', (req: Request, res: Response) => {
  const ds = DATASETS_DB.find((d) => d.id === req.params.id);
  if (ds) {
    ds.isArchived = true;
    res.json({ message: 'Dataset moved to archived records.', dataset: ds });
  } else {
    res.status(404).json({ error: 'Dataset not found.' });
  }
});

fallbackApiRouter.post('/datasets/:id/restore', (req: Request, res: Response) => {
  const ds = DATASETS_DB.find((d) => d.id === req.params.id);
  if (ds) {
    ds.isArchived = false;
    res.json({ message: 'Dataset restored to active records.', dataset: ds });
  } else {
    res.status(404).json({ error: 'Dataset not found.' });
  }
});

fallbackApiRouter.delete('/datasets/:id', (req: Request, res: Response) => {
  DATASETS_DB = DATASETS_DB.filter((d) => d.id !== req.params.id);
  res.json({ message: 'Dataset permanently deleted.' });
});

// -------------------------------------------------------------------------
// 5. TRAINING RUNS & HISTORY (Strict Project Separation)
// -------------------------------------------------------------------------
fallbackApiRouter.get('/projects/:projectId/training-runs', (req: Request, res: Response) => {
  const runs = TRAINING_RUNS_DB.filter((r) => r.projectId === req.params.projectId);
  res.json({ trainingRuns: runs });
});

fallbackApiRouter.post('/projects/:projectId/training-runs', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { modelName = 'Random Forest', algorithmType = 'RandomForestClassifier', targetColumn = 'failure_flag', datasetId = 'ds_active' } = req.body || {};
  const versionNum = `v${TRAINING_RUNS_DB.filter((r) => r.projectId === req.params.projectId).length + 1}.0`;

  const newRun = {
    id: `tr_${Date.now()}`,
    clientId: user ? user.id : 'CL-TEST-001',
    projectId: req.params.projectId,
    datasetId,
    datasetVersion: 1,
    modelName,
    modelVersion: versionNum,
    algorithmType,
    targetColumn,
    taskType: 'binary_classification',
    featuresSelected: ['temperature_c', 'vibration_mm_s', 'pressure_bar', 'rpm', 'operating_hours'],
    trainSamples: 320,
    testSamples: 80,
    testAccuracy: 0.9250,
    balancedAccuracy: 0.920,
    precision: 0.930,
    recall: 0.921,
    f1Score: 0.9250,
    rocAuc: 0.968,
    cvScores: [0.92, 0.93, 0.91, 0.94, 0.92],
    confusionMatrix: [[43, 2], [3, 42]],
    trainDurationMs: 140.0,
    predictDurationMs: 1.2,
    trainingStatus: 'OPTIMAL',
    createdAt: new Date().toISOString(),
  };
  TRAINING_RUNS_DB.unshift(newRun);
  res.json({ message: 'Model trained successfully.', run: newRun });
});

// -------------------------------------------------------------------------
// 6. ADMIN MANAGEMENT APIS (Full 12-Section Support)
// -------------------------------------------------------------------------
fallbackApiRouter.get('/admin/dashboard', (req: Request, res: Response) => {
  res.json({
    kpis: {
      totalClients: 3,
      pendingApprovals: 0,
      activeClients: 3,
      totalDatasets: 6,
      activeJobs: 0,
      completedJobs: 14,
      failedJobs: 0,
      successfulRecoveries: 14,
      unreadTickets: 1,
      unresolvedAlerts: 0,
      systemHealth: 'OPTIMAL',
    }
  });
});

fallbackApiRouter.get('/admin/clients', (req: Request, res: Response) => {
  const clientUsers = USERS_DB.filter((u) => u.role === 'CLIENT').map((u) => ({
    id: u.id,
    full_name: u.fullName,
    email: u.email,
    company_name: u.companyName,
    role: u.role,
    status: u.status,
    created_at: u.createdAt,
    total_models: TRAINING_RUNS_DB.filter((r) => r.clientId === u.id).length,
    latest_accuracy: 0.925,
  }));
  res.json({ clients: clientUsers });
});

const handleClientDetail = (req: Request, res: Response) => {
  const user = USERS_DB.find((u) => u.id === req.params.id);
  const clientDatasets = DATASETS_DB.filter((d) => d.clientId === req.params.id);
  const clientRuns = TRAINING_RUNS_DB.filter((r) => r.clientId === req.params.id);
  const clientTickets = TICKETS_DB.filter((t) => t.clientId === req.params.id);

  res.json({
    client: user || USERS_DB[2],
    datasets: clientDatasets,
    jobs: clientRuns,
    tickets: clientTickets,
    relatedTickets: clientTickets,
  });
};

fallbackApiRouter.get('/admin/clients/:id', handleClientDetail);
fallbackApiRouter.get('/admin/clients/:id/detail', handleClientDetail);

fallbackApiRouter.get('/admin/support/tickets', (req: Request, res: Response) => {
  res.json({ tickets: TICKETS_DB });
});

fallbackApiRouter.get('/admin/alerts', (req: Request, res: Response) => {
  res.json({
    alerts: [
      {
        id: 'alt_001',
        title: 'High-Temperature Sensor Disconnect',
        severity: 'MEDIUM',
        client_name: 'Beta Thermal Power Generation',
        is_resolved: true,
        created_at: '2026-02-06T12:00:00.000Z',
      }
    ]
  });
});

fallbackApiRouter.get('/admin/ml-monitoring', (req: Request, res: Response) => {
  const clientSummary = USERS_DB.filter((u) => u.role === 'CLIENT').map((u) => {
    const userRuns = TRAINING_RUNS_DB.filter((r) => r.clientId === u.id);
    const latest = userRuns[0];
    return {
      id: u.id,
      name: u.fullName,
      email: u.email,
      totalModels: userRuns.length,
      latestModel: latest ? `${latest.modelName} (${latest.modelVersion})` : 'Awaiting Training',
      latestAccuracy: latest ? latest.testAccuracy : 0.92,
      status: latest ? latest.trainingStatus : 'OPTIMAL',
      lastTrainingDate: latest ? latest.createdAt : u.createdAt,
    };
  });

  res.json({
    clientSummary,
    evaluations: TRAINING_RUNS_DB.map((r) => ({
      id: r.id,
      modelName: r.modelName,
      modelVersion: r.modelVersion,
      taskType: r.taskType,
      accuracy: r.testAccuracy,
      f1Score: r.f1Score,
      precision: r.precision,
      recall: r.recall,
      trainDurationMs: r.trainDurationMs,
      predictDurationMs: r.predictDurationMs,
      confusionMatrix: r.confusionMatrix,
      rocCurve: [],
      classificationReport: {},
    })),
    overallStats: {
      averageAccuracy: 0.925,
      totalModelsMonitored: TRAINING_RUNS_DB.length,
      degradedModelsCount: 0,
    }
  });
});

fallbackApiRouter.get('/admin/audit-logs', (req: Request, res: Response) => {
  res.json({
    logs: [
      {
        id: 'log_001',
        user_email: 'mahadevshinde2269@gmail.com',
        user_role: 'MASTER_ADMIN',
        action: 'SYSTEM_BOOTSTRAP',
        entity_type: 'SYSTEM',
        entity_id: 'HEALML-ENTERPRISE',
        details: 'Initial Master Admin and 3 Client test environments verified.',
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString(),
      }
    ]
  });
});

fallbackApiRouter.get('/admin/backup/list', (req: Request, res: Response) => {
  res.json({
    backups: [
      {
        id: 'bkp_initial_ledger',
        backup_filename: 'healml_enterprise_ledger_backup.sql',
        file_size_bytes: 524288,
        status: 'VERIFIED',
        checksum_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        is_pre_restore: false,
        created_at: new Date().toISOString(),
      }
    ]
  });
});
