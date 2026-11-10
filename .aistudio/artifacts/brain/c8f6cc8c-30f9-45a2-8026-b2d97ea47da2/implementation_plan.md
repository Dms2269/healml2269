# HEALML – Dataset Lifecycle, Project Management, and Full Model Operations Center

This implementation plan details the architectural and frontend upgrade for **HEALML**, expanding it into a multi-project, multi-tenant tabular MLOps platform with strict dataset lifecycle tracking, immutable model versioning, client project separation, and a dedicated **Master Admin Full Model Operations Center**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user-confirmed preferences guide the design and behavior:
> - **Project & Dataset Switching**: Top navigation dropdown with a live project switcher and quick-create modal for streamlined context switching.
> - **Full Model Operations Center**: Dedicated top-level admin sub-view with persistent breadcrumb navigation ("Admin Workstation > Full Model Operations Center") and comprehensive platform analytics.
> - **Permanent Deletion Safeguards**: Two-step modal requiring a typed confirmation phrase (e.g. `DELETE <DATASET_NAME>`) to prevent accidental destruction of datasets while protecting linked historical models.
> - **Dataset Lifecycle Rules**: Soft deletion moves datasets to "Archived" status, removing them from active training selection while permanently preserving historical training runs, holdout metrics, and version lineage. Restore is explicit.
> - **Project Isolation**: Datasets, models, and predictions are strictly scoped to their respective project. No cross-project dataset bleed or automated unconfirmed training.

---

## 1. Architecture & Database Schema Additions

### 1.1 New Relational Models (`backend/models.py`)

1. **`Project` Entity**:
   - `id`: String (e.g. `prj_1794...`)
   - `client_id`: String (Foreign Key to `users.id`, Indexed)
   - `name`: String (e.g. "Machine A Failure Prediction")
   - `description`: Text
   - `created_at`: DateTime
   - `updated_at`: DateTime
   - `is_archived`: Boolean (default `False`)
   - Relationships: `datasets`, `jobs`, `training_runs`, `predictions`

2. **Enhance `Dataset` Entity**:
   - `project_id`: String (Foreign Key to `projects.id`, Indexed, default fallback to default project)
   - `is_archived`: Boolean (default `False`, Indexed)
   - `archived_at`: DateTime (nullable)
   - `original_filename`: String
   - `file_hash`: String (SHA-256 for data provenance)
   - `version_num`: Integer (default 1)
   - `retention_policy`: String (default `STANDARD_7YR`)
   - `can_delete`: Boolean (computed: `False` if active models rely on it, unless forced with override)

3. **New `TrainingRun` Entity (Immutable Model History)**:
   - `id`: String (e.g. `tr_1794...`)
   - `client_id`: String (Indexed)
   - `project_id`: String (Indexed)
   - `dataset_id`: String (Indexed)
   - `dataset_version`: Integer
   - `dataset_file_hash`: String
   - `model_name`: String (e.g. "Random Forest Classifier", "Gradient Boosting")
   - `model_version`: String (e.g. "v1.0", "v1.1")
   - `algorithm_type`: String (RandomForest, ExtraTrees, GradientBoosting, LogisticRegression, Ridge)
   - `target_column`: String
   - `task_type`: String (binary_classification, multiclass_classification, regression)
   - `features_selected`: Text (JSON array of column names)
   - `hyperparameters`: Text (JSON object)
   - `train_samples`: Integer
   - `test_samples`: Integer
   - `test_accuracy`: Float
   - `balanced_accuracy`: Float
   - `precision`: Float
   - `recall`: Float
   - `f1_score`: Float
   - `roc_auc`: Float
   - `cv_scores`: Text (JSON array of 5-fold cross-validation scores)
   - `confusion_matrix`: Text (JSON 2D array)
   - `classification_report`: Text (JSON)
   - `regression_metrics`: Text (JSON with R2, MAE, MSE, RMSE when applicable)
   - `train_duration_ms`: Float
   - `predict_duration_ms`: Float
   - `training_status`: String (OPTIMAL, DEGRADED, FAILED)
   - `error_message`: Text (nullable)
   - `created_at`: DateTime

4. **New `PredictionLog` Entity**:
   - `id`: String (e.g. `pred_1794...`)
   - `client_id`: String (Indexed)
   - `project_id`: String (Indexed)
   - `dataset_id`: String
   - `dataset_version`: Integer
   - `model_id`: String
   - `model_version`: String
   - `inputs_json`: Text
   - `outputs_json`: Text
   - `prediction_timestamp`: DateTime

---

## 2. Backend REST API Endpoints (`backend/app.py`)

### 2.1 Project Management Endpoints
- `GET /api/projects`: List all active projects for the authenticated client (with dataset and model counts).
- `POST /api/projects`: Create a new project (name, description). Generates unique `Project ID`.
- `GET /api/projects/<project_id>`: Fetch detailed project record, associated active/archived datasets, training runs, and pipeline history.
- `PATCH /api/projects/<project_id>`: Update project name/description or archive project.

### 2.2 Advanced Dataset Lifecycle Endpoints
- `GET /api/projects/<project_id>/datasets`: List active and archived datasets strictly filtered by project.
- `POST /api/projects/<project_id>/datasets/upload`: Ingest new dataset scoped directly to `project_id`. Computes SHA-256 hash and version 1.
- `POST /api/datasets/<dataset_id>/archive`: Soft-archive dataset. Removes from active training queue, marks `is_archived = True`, records timestamp in audit ledger.
- `POST /api/datasets/<dataset_id>/restore`: Restores an archived dataset back to the active repository.
- `DELETE /api/datasets/<dataset_id>/permanent`: Permanently deletes dataset after validating authorization, checks dependent models, requires confirmation payload `{ confirmationPhrase: "DELETE <name>" }`.
- `GET /api/datasets/<dataset_id>/history`: Comprehensive dataset audit trail (original upload metadata, version history, cleaning runs, trained models).

### 2.3 Training History & Model Comparison Endpoints
- `GET /api/projects/<project_id>/training-runs`: Retrieve chronological immutable training runs for the active project.
- `POST /api/pipeline/start`: Enhanced with mandatory pre-training confirmation payload `{ projectId, datasetId, targetCol, modelConfig, confirmExplicit: true }`. Creates a permanent `TrainingRun` record upon completion.
- `GET /api/training-runs/<run_id>`: Detailed telemetry for an individual model run.
- `POST /api/training-runs/compare`: Side-by-side comparative analysis between two or more model versions.

### 2.4 Master Admin Full Model Operations Endpoints
- `GET /api/admin/model-operations/overview`: Platform-wide KPIs (total clients, projects, active datasets, archived datasets, active models, successful/failed runs, review-flagged models, system health).
- `GET /api/admin/model-operations/clients/<client_id>`: Complete client dossier with all projects, datasets, models, prediction logs, and audit trails.
- `GET /api/admin/model-operations/projects/<project_id>`: Deep project lifecycle tracker displaying the 12 explicit stages with timestamps, status, and error logs:
  1. Project Creation
  2. Dataset Upload
  3. Dataset Validation
  4. Data Quality Analysis
  5. Self-Healing Processing
  6. Feature Engineering
  7. Model Training
  8. Model Validation
  9. Model Evaluation
  10. Model Approval
  11. Model Deployment
  12. Model Monitoring & Retraining
- `GET /api/admin/model-operations/leaderboard`: Comparative multi-model matrix with holdout accuracy, balanced accuracy, precision, recall, F1, ROC-AUC, PR-AUC, confusion matrix, and regression metrics (R2, MAE, MSE, RMSE).

---

## 3. Frontend Architecture & User Interface Upgrades

### 3.1 Global Top Navigation: Project Switcher & Quick-Create (`Navbar.tsx`)
- Add a modern **Project Selector dropdown** in the header next to the HEALML logo:
  - Displays current active project name and ID badge.
  - Dropdown lists all client projects with dataset count, model count, and "Create New Project" button.
  - Quick-Create modal opens inline to register a new project without leaving the current view.
  - Switching projects automatically refreshes active datasets, training history, and pipelines for that project.

### 3.2 Enhanced Client Navigation & Views
1. **My Projects & Project Details View (`ProjectManagementView.tsx`)**:
   - Project cards displaying active dataset count, trained model versions, last training timestamp, and health status.
   - Project settings, description editor, and project-level export.
2. **Dataset Management & History Hub (`DatasetHistoryView.tsx` & `UploadDatasetView.tsx`)**:
   - Tab 1: **Active Datasets** (ready for training and self-healing).
   - Tab 2: **Archived Datasets** (read-only historical records with one-click **Restore**).
   - Tab 3: **Dataset Audit History** (complete timeline, original file metadata, row/column counts, file size, SHA-256 hash).
   - **Archive Dataset Modal**: Explains dataset will be moved to cold storage without deleting past models.
   - **Permanent Deletion Modal**: Danger styling, displays all models trained on this dataset, requires typing `DELETE <DATASET_NAME>` to unlock deletion.
3. **Pre-Training Confirmation Modal**:
   - Before executing pipeline or training, displays explicit confirmation summary:
     - Active Project Name & ID
     - Selected Dataset Name & Version
     - Target Column
     - Algorithms to Benchmark (Random Forest, Gradient Boosting, Extra Trees, Logistic/Ridge)
     - Data Split Method (80/20 Holdout with Stratified 5-Fold Cross-Validation)
   - Requires explicit click on **"Confirm & Initiate Training"**.
4. **Immutable Model Training History & Comparison View (`ModelHistoryView.tsx`)**:
   - Chronological table of training runs with version badges (`v1.0`, `v1.1`, `v2.0`).
   - Side-by-side **Model Version Comparator**: select any two models to compare ROC curves, confusion matrices, test accuracy, precision, recall, and training latency.

### 3.3 Master Admin: Full Model Operations Center (`ModelOperationsCenterView.tsx`)
- In `AdminWorkstationView.tsx`, place a prominent hero banner button:
  - **`OPEN FULL MODEL OPERATIONS`** with telemetry pulse icon.
- Clicking opens a dedicated top-level view with persistent breadcrumbs:
  `Admin Workstation > Full Model Operations Center`.
- Contains:
  1. **Executive Platform Telemetry Grid**: 11 real-time KPI metrics.
  2. **Client-Wise Deep Inspector**: Select any client to view their entire project catalog, datasets, models, and predictions.
  3. **Project-Wise 12-Stage Pipeline Visualizer**: Interactive stepper showing timestamps, duration, and error traces for each stage.
  4. **Multi-Model Accuracy & Evaluation Matrix**: Leaderboard comparing models across clients, projects, and dataset versions with real holdout metrics and confusion matrices.
  5. **Breadcrumb / Exit Bar**: One-click return to Admin Workstation.

---

## 4. Implementation Steps & Verification Plan

### Phase 1: Database Schema & Migration
- Add `Project`, `TrainingRun`, and `PredictionLog` models to `backend/models.py`.
- Add `project_id`, `is_archived`, `archived_at`, and `file_hash` to `Dataset` model.
- Update `init_db()` migration script in `backend/models.py` to auto-migrate SQLite database without data loss.

### Phase 2: Backend APIs
- Implement Project CRUD routes in `backend/app.py`.
- Implement Dataset Archival, Restoration, and 2-step Permanent Deletion routes.
- Implement Model Operations Center aggregation endpoints.
- Update `backend/run_pipeline_job.py` to write immutable `TrainingRun` records linked to `project_id` and `file_hash`.

### Phase 3: Frontend API Client & Types
- Update `src/types/pipeline.ts` and `src/types/auth.ts` with `Project`, `TrainingRun`, `PredictionLog`, and `ModelOperationsData` interfaces.
- Add corresponding methods in `src/services/apiClient.ts`.

### Phase 4: UI Components
- Build Project Switcher dropdown and Quick-Create Modal in `src/components/Navbar.tsx`.
- Upgrade `src/components/DatasetHistoryView.tsx` with Active vs Archived tabs, Restore action, and typed phrase Permanent Delete modal.
- Build `src/components/ModelOperationsCenterView.tsx` with persistent breadcrumb navigation, 12-stage visualizer, and comparative leaderboard.
- Connect **OPEN FULL MODEL OPERATIONS** button in `src/components/AdminWorkstationView.tsx`.
- Wire tab routing in `src/App.tsx`.

### Phase 5: Verification & Testing
- Run `compile_applet` and `lint_applet` to confirm zero TypeScript errors.
- Test project creation, dataset upload within project, and project switching.
- Test dataset archiving (verify it disappears from training select but stays in history).
- Test permanent deletion 2-step modal with typed phrase validation.
- Run model training pipeline and verify immutable `TrainingRun` record is created.
- Test Master Admin Model Operations Center: inspect 12-stage pipeline and comparative metrics.
