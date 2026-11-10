"""
HEALML - Universal Self-Healing Machine Learning Platform
SQLAlchemy Relational Database Models & Schema Management
Supports SQLite for development/testing and PostgreSQL for production.
"""

import os
import json
import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

Base = declarative_base()

# Database path resolution
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, 'healml_enterprise.db')
raw_db_url = (os.environ.get('DATABASE_URL') or '').strip()
VALID_SCHEMES = ('sqlite://', 'postgresql://', 'postgres://', 'mysql://', 'mariadb://', 'oracle://', 'mssql://')

if raw_db_url and any(raw_db_url.startswith(scheme) for scheme in VALID_SCHEMES):
    if raw_db_url.startswith('postgres://'):
        DATABASE_URI = raw_db_url.replace('postgres://', 'postgresql://', 1)
    else:
        DATABASE_URI = raw_db_url
else:
    if raw_db_url:
        print(f"⚠️ Warning: Non-URI string '{raw_db_url}' was provided in DATABASE_URL. Defaulting to SQLite database.")
    DATABASE_URI = f'sqlite:///{DB_PATH}'

try:
    engine = create_engine(
        DATABASE_URI,
        echo=False,
        connect_args={'check_same_thread': False} if DATABASE_URI.startswith('sqlite') else {}
    )
except Exception as e:
    print(f"⚠️ Warning: Could not create engine with '{DATABASE_URI}': {e}. Falling back to default SQLite database.")
    DATABASE_URI = f'sqlite:///{DB_PATH}'
    engine = create_engine(
        DATABASE_URI,
        echo=False,
        connect_args={'check_same_thread': False}
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -------------------------------------------------------------------------
# 1. USER & AUTHENTICATION TABLE
# -------------------------------------------------------------------------
class User(Base):
    __tablename__ = 'users'

    id = Column(String(64), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=True, default='')
    phone_number = Column(String(64), nullable=True, default='')
    role = Column(String(32), default='CLIENT') # SUPER_ADMIN, ADMIN, CLIENT
    status = Column(String(32), default='PENDING_APPROVAL') # PENDING_APPROVAL, ACTIVE, REJECTED, SUSPENDED
    rejection_reason = Column(String(512), nullable=True)
    email_verified = Column(Boolean, default=False)
    verification_token = Column(String(128), nullable=True)
    reset_token = Column(String(128), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)

    # Dataset Quotas & Limits
    max_datasets = Column(Integer, default=10)
    max_upload_size_mb = Column(Integer, default=25)
    max_total_storage_mb = Column(Integer, default=100)
    allowed_formats = Column(String(128), default='csv,xlsx,xls')
    max_daily_uploads = Column(Integer, default=20)

    # Granular Feature Permissions
    can_upload = Column(Boolean, default=True)
    can_analyze = Column(Boolean, default=True)
    can_heal = Column(Boolean, default=True)
    can_train = Column(Boolean, default=True)
    can_evaluate = Column(Boolean, default=True)
    can_download_reports = Column(Boolean, default=True)
    can_export_pdf = Column(Boolean, default=True)

    # Relationships
    projects = relationship('Project', back_populates='client', cascade='all, delete-orphan')
    datasets = relationship('Dataset', back_populates='client', cascade='all, delete-orphan')
    jobs = relationship('Job', back_populates='client', cascade='all, delete-orphan')
    audit_logs = relationship('AuditLog', back_populates='user')
    tickets = relationship('SupportTicket', back_populates='client', cascade='all, delete-orphan')
    training_runs = relationship('TrainingRun', back_populates='client', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'fullName': self.full_name,
            'companyName': self.company_name or '',
            'phoneNumber': self.phone_number or '',
            'role': self.role,
            'status': self.status,
            'rejectionReason': self.rejection_reason,
            'emailVerified': self.email_verified,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'lastLoginAt': self.last_login_at.isoformat() if self.last_login_at else None,
            'quotas': {
                'maxDatasets': self.max_datasets or 10,
                'maxUploadSizeMb': self.max_upload_size_mb or 25,
                'maxTotalStorageMb': self.max_total_storage_mb or 100,
                'allowedFormats': self.allowed_formats or 'csv,xlsx,xls',
                'maxDailyUploads': self.max_daily_uploads or 20,
            },
            'permissions': {
                'canUpload': bool(self.can_upload if self.can_upload is not None else True),
                'canAnalyze': bool(self.can_analyze if self.can_analyze is not None else True),
                'canHeal': bool(self.can_heal if self.can_heal is not None else True),
                'canTrain': bool(self.can_train if self.can_train is not None else True),
                'canEvaluate': bool(self.can_evaluate if self.can_evaluate is not None else True),
                'canDownloadReports': bool(self.can_download_reports if self.can_download_reports is not None else True),
                'canExportPdf': bool(self.can_export_pdf if self.can_export_pdf is not None else True),
            }
        }

# -------------------------------------------------------------------------
# 1.1 PROJECT TABLE (Project-wise Separation & Multi-Tenant Isolated)
# -------------------------------------------------------------------------
class Project(Base):
    __tablename__ = 'projects'

    id = Column(String(64), primary_key=True)
    client_id = Column(String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default='')
    is_archived = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    client = relationship('User', back_populates='projects')
    datasets = relationship('Dataset', back_populates='project', cascade='all, delete-orphan')
    training_runs = relationship('TrainingRun', back_populates='project', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'clientId': self.client_id,
            'name': self.name,
            'description': self.description,
            'isArchived': self.is_archived,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }

# -------------------------------------------------------------------------
# 2. DATASET TABLE (Multi-Tenant Isolated & Project Scoped)
# -------------------------------------------------------------------------
class Dataset(Base):
    __tablename__ = 'datasets'

    id = Column(String(64), primary_key=True)
    client_id = Column(String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    project_id = Column(String(64), ForeignKey('projects.id', ondelete='CASCADE'), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=True)
    filepath = Column(String(512), nullable=False)
    file_hash = Column(String(128), default='')
    file_size_bytes = Column(Integer, default=0)
    row_count = Column(Integer, default=0)
    col_count = Column(Integer, default=0)
    format = Column(String(16), default='csv') # csv, xlsx, xls
    domain = Column(String(128), default='General Tabular')
    description = Column(Text, default='')
    target_col = Column(String(128), default='')
    task_type = Column(String(64), default='unsupervised') # binary_classification, multiclass_classification, regression, unsupervised
    quality_score = Column(Float, default=100.0)
    version_num = Column(Integer, default=1)
    is_archived = Column(Boolean, default=False, index=True)
    archived_at = Column(DateTime, nullable=True)
    retention_policy = Column(String(64), default='STANDARD_7YR')
    schema_json = Column(Text, default='[]')
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    client = relationship('User', back_populates='datasets')
    project = relationship('Project', back_populates='datasets')
    versions = relationship('DatasetVersion', back_populates='dataset', cascade='all, delete-orphan')
    jobs = relationship('Job', back_populates='dataset', cascade='all, delete-orphan')
    training_runs = relationship('TrainingRun', back_populates='dataset', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'clientId': self.client_id,
            'projectId': self.project_id,
            'name': self.name,
            'filename': self.filename,
            'originalFilename': self.original_filename or self.filename,
            'fileHash': self.file_hash,
            'fileSizeBytes': self.file_size_bytes,
            'rowCount': self.row_count,
            'colCount': self.col_count,
            'format': self.format,
            'domain': self.domain,
            'description': self.description,
            'targetCol': self.target_col,
            'taskType': self.task_type,
            'qualityScore': self.quality_score,
            'versionNum': self.version_num or 1,
            'isArchived': bool(self.is_archived),
            'archivedAt': self.archived_at.isoformat() if self.archived_at else None,
            'retentionPolicy': self.retention_policy or 'STANDARD_7YR',
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }

# -------------------------------------------------------------------------
# 3. DATASET VERSION HISTORY TABLE
# -------------------------------------------------------------------------
class DatasetVersion(Base):
    __tablename__ = 'dataset_versions'

    id = Column(String(64), primary_key=True)
    dataset_id = Column(String(64), ForeignKey('datasets.id', ondelete='CASCADE'), nullable=False, index=True)
    client_id = Column(String(64), nullable=False, index=True)
    version_num = Column(Integer, default=1)
    row_count = Column(Integer, default=0)
    quality_score = Column(Float, default=100.0)
    change_summary = Column(Text, default='Original Raw Upload')
    filepath = Column(String(512), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    dataset = relationship('Dataset', back_populates='versions')

    def to_dict(self):
        return {
            'id': self.id,
            'datasetId': self.dataset_id,
            'clientId': self.client_id,
            'versionNum': self.version_num,
            'rowCount': self.row_count,
            'qualityScore': self.quality_score,
            'changeSummary': self.change_summary,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }

# -------------------------------------------------------------------------
# 4. PIPELINE JOBS TABLE
# -------------------------------------------------------------------------
class Job(Base):
    __tablename__ = 'pipeline_jobs'

    id = Column(String(64), primary_key=True)
    client_id = Column(String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    dataset_id = Column(String(64), ForeignKey('datasets.id', ondelete='CASCADE'), nullable=False, index=True)
    status = Column(String(32), default='PENDING', index=True) # PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
    current_stage = Column(String(64), default='ingestion')
    progress_percent = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)
    results_json = Column(Text, default='{}')
    execution_log = Column(Text, default='')

    client = relationship('User', back_populates='jobs')
    dataset = relationship('Dataset', back_populates='jobs')
    recoveries = relationship('RecoveryRecord', back_populates='job', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'clientId': self.client_id,
            'datasetId': self.dataset_id,
            'status': self.status,
            'currentStage': self.current_stage,
            'progressPercent': self.progress_percent,
            'startedAt': self.started_at.isoformat() if self.started_at else None,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
            'durationSeconds': self.duration_seconds,
            'errorMessage': self.error_message,
        }

# -------------------------------------------------------------------------
# 5. RECOVERY RECORDS / LEDGER TABLE
# -------------------------------------------------------------------------
class RecoveryRecord(Base):
    __tablename__ = 'recovery_records'

    id = Column(String(64), primary_key=True)
    job_id = Column(String(64), ForeignKey('pipeline_jobs.id', ondelete='CASCADE'), nullable=False, index=True)
    client_id = Column(String(64), nullable=False, index=True)
    dataset_id = Column(String(64), nullable=False, index=True)
    fault_id = Column(String(64), nullable=False)
    stage = Column(String(64), nullable=False)
    action_taken = Column(String(64), nullable=False)
    details = Column(Text, nullable=False)
    pre_metric = Column(Float, default=0.0)
    post_metric = Column(Float, default=0.0)
    delta_metric = Column(Float, default=0.0)
    verification_status = Column(String(32), default='VERIFIED_SUCCESS') # VERIFIED_SUCCESS, NEEDS_MANUAL_REVIEW, HEALING_FAILED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    job = relationship('Job', back_populates='recoveries')

    def to_dict(self):
        return {
            'id': self.id,
            'jobId': self.job_id,
            'clientId': self.client_id,
            'datasetId': self.dataset_id,
            'faultId': self.fault_id,
            'stage': self.stage,
            'actionTaken': self.action_taken,
            'details': self.details,
            'preMetric': self.pre_metric,
            'postMetric': self.post_metric,
            'deltaMetric': self.delta_metric,
            'verificationStatus': self.verification_status,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }

# -------------------------------------------------------------------------
# 6. APPEND-ONLY AUDIT LOGS TABLE
# -------------------------------------------------------------------------
class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    user_email = Column(String(255), nullable=False)
    action = Column(String(64), nullable=False, index=True)
    entity_type = Column(String(64), nullable=False)
    entity_id = Column(String(128), nullable=True)
    details = Column(Text, nullable=False)
    ip_address = Column(String(64), default='127.0.0.1')
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship('User', back_populates='audit_logs')

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'userEmail': self.user_email,
            'action': self.action,
            'entityType': self.entity_type,
            'entityId': self.entity_id,
            'details': self.details,
            'ipAddress': self.ip_address,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }

# -------------------------------------------------------------------------
# 7. SYSTEM SETTINGS TABLE
# -------------------------------------------------------------------------
class SystemSetting(Base):
    __tablename__ = 'system_settings'

    key = Column(String(128), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

# -------------------------------------------------------------------------
# 8. DATABASE BACKUP AUDIT TABLE
# -------------------------------------------------------------------------
class BackupLog(Base):
    __tablename__ = 'backup_logs'

    id = Column(String(64), primary_key=True)
    backup_filename = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    status = Column(String(32), default='SUCCESS')
    checksum_sha256 = Column(String(64), nullable=True)
    is_pre_restore = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.backup_filename,
            'fileSizeBytes': self.file_size_bytes,
            'status': self.status,
            'checksumSha256': self.checksum_sha256,
            'isPreRestore': self.is_pre_restore,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }

# -------------------------------------------------------------------------
# 9. SUPPORT TICKETS TABLE (Help Requests)
# -------------------------------------------------------------------------
class SupportTicket(Base):
    __tablename__ = 'support_tickets'

    id = Column(String(64), primary_key=True) # e.g. TKT-2026-1001
    client_id = Column(String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    client_email = Column(String(255), nullable=False)
    client_name = Column(String(255), nullable=False)
    category = Column(String(64), default='General') # General, Data Faults, Self-Healing, Account, Billing
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(32), default='MEDIUM') # LOW, MEDIUM, HIGH, URGENT
    status = Column(String(32), default='NEW', index=True) # NEW, IN_PROGRESS, WAITING_FOR_CLIENT, RESOLVED, CLOSED
    is_read_by_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    client = relationship('User', back_populates='tickets')
    replies = relationship('TicketReply', back_populates='ticket', cascade='all, delete-orphan', order_by='TicketReply.created_at')

    def to_dict(self, include_replies: bool = False):
        data = {
            'id': self.id,
            'clientId': self.client_id,
            'clientEmail': self.client_email,
            'clientName': self.client_name,
            'category': self.category,
            'subject': self.subject,
            'description': self.description,
            'priority': self.priority,
            'status': self.status,
            'isReadByAdmin': self.is_read_by_admin,
            'replyCount': len(self.replies) if self.replies else 0,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_replies:
            data['replies'] = [r.to_dict() for r in self.replies]
        return data

# -------------------------------------------------------------------------
# 10. TICKET REPLIES TABLE
# -------------------------------------------------------------------------
class TicketReply(Base):
    __tablename__ = 'ticket_replies'

    id = Column(String(64), primary_key=True)
    ticket_id = Column(String(64), ForeignKey('support_tickets.id', ondelete='CASCADE'), nullable=False, index=True)
    sender_id = Column(String(64), nullable=False)
    sender_name = Column(String(255), nullable=False)
    sender_role = Column(String(32), default='ADMIN') # ADMIN, SUPER_ADMIN, CLIENT
    message = Column(Text, nullable=False)
    email_status = Column(String(32), default='PENDING') # SENT, FAILED, AUDIT_LOGGED
    email_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    ticket = relationship('SupportTicket', back_populates='replies')

    def to_dict(self):
        return {
            'id': self.id,
            'ticketId': self.ticket_id,
            'senderId': self.sender_id,
            'senderName': self.sender_name,
            'senderRole': self.sender_role,
            'message': self.message,
            'emailStatus': self.email_status,
            'emailError': self.email_error,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }

# -------------------------------------------------------------------------
# 11. CRITICAL ALERTS TABLE (with SMTP tracking to 2269dms@gmail.com)
# -------------------------------------------------------------------------
class CriticalAlert(Base):
    __tablename__ = 'critical_alerts'

    id = Column(String(64), primary_key=True)
    severity = Column(String(32), default='WARNING', index=True) # INFO, WARNING, HIGH, CRITICAL
    category = Column(String(64), default='SYSTEM') # SERVER_FAILURE, DATABASE_FAILURE, ML_FAILURE, PROCESSING_ERROR, UNAUTHORIZED_ACCESS
    affected_service = Column(String(128), default='Backend API')
    summary = Column(String(512), nullable=False)
    details = Column(Text, nullable=True)
    recommended_action = Column(String(512), nullable=True)
    recipient_email = Column(String(255), default='2269dms@gmail.com')
    email_status = Column(String(32), default='PENDING') # SENT, FAILED, AUDIT_LOGGED
    error_trace = Column(Text, nullable=True)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'severity': self.severity,
            'category': self.category,
            'affectedService': self.affected_service,
            'summary': self.summary,
            'details': self.details,
            'recommendedAction': self.recommended_action,
            'recipientEmail': self.recipient_email,
            'emailStatus': self.email_status,
            'isResolved': self.is_resolved,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }

# -------------------------------------------------------------------------
# 12. ACTUAL ML MODEL EVALUATION RECORDS TABLE
# -------------------------------------------------------------------------
class ModelEvaluationRecord(Base):
    __tablename__ = 'model_evaluations'

    id = Column(String(64), primary_key=True)
    dataset_id = Column(String(64), nullable=False, index=True)
    dataset_name = Column(String(255), nullable=False)
    client_id = Column(String(64), nullable=False, index=True)
    model_name = Column(String(128), nullable=False) # e.g. RandomForest, ExtraTrees, GradientBoosting, Logistic
    model_version = Column(String(32), default='v1.0')
    task_type = Column(String(64), default='binary_classification')
    train_samples = Column(Integer, default=0)
    test_samples = Column(Integer, default=0)
    features_count = Column(Integer, default=0)
    accuracy = Column(Float, nullable=True) # None if not evaluated
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    balanced_accuracy = Column(Float, nullable=True)
    cv_score = Column(Float, nullable=True)
    cv_std = Column(Float, nullable=True)
    train_duration_ms = Column(Float, default=0.0)
    predict_duration_ms = Column(Float, default=0.0)
    confusion_matrix_json = Column(Text, default='[]')
    classification_report_json = Column(Text, default='{}')
    roc_curve_json = Column(Text, default='[]')
    is_selected = Column(Boolean, default=False)
    evaluation_status = Column(String(32), default='EVALUATED') # EVALUATED, NOT_EVALUATED, FAILED
    evaluation_notes = Column(Text, default='')
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'datasetId': self.dataset_id,
            'datasetName': self.dataset_name,
            'clientId': self.client_id,
            'modelName': self.model_name,
            'modelVersion': self.model_version,
            'taskType': self.task_type,
            'trainSamples': self.train_samples,
            'testSamples': self.test_samples,
            'featuresCount': self.features_count,
            'accuracy': self.accuracy,
            'precision': self.precision,
            'recall': self.recall,
            'f1Score': self.f1_score,
            'balancedAccuracy': self.balanced_accuracy,
            'cvScore': self.cv_score,
            'cvStd': self.cv_std,
            'trainDurationMs': self.train_duration_ms,
            'predictDurationMs': self.predict_duration_ms,
            'confusionMatrix': json.loads(self.confusion_matrix_json) if self.confusion_matrix_json else [],
            'classificationReport': json.loads(self.classification_report_json) if self.classification_report_json else {},
            'rocCurve': json.loads(self.roc_curve_json) if self.roc_curve_json else [],
            'isSelected': self.is_selected,
            'evaluationStatus': self.evaluation_status,
            'evaluationNotes': self.evaluation_notes,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }

# -------------------------------------------------------------------------
# 11. IMMUTABLE TRAINING RUN HISTORY TABLE
# -------------------------------------------------------------------------
class TrainingRun(Base):
    __tablename__ = 'training_runs'

    id = Column(String(64), primary_key=True)
    client_id = Column(String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    project_id = Column(String(64), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    dataset_id = Column(String(64), ForeignKey('datasets.id', ondelete='CASCADE'), nullable=False, index=True)
    dataset_version = Column(Integer, default=1)
    dataset_file_hash = Column(String(128), default='')
    model_name = Column(String(128), nullable=False)
    model_version = Column(String(32), default='v1.0')
    algorithm_type = Column(String(64), default='RandomForest')
    target_column = Column(String(128), nullable=False)
    task_type = Column(String(64), default='binary_classification')
    features_selected_json = Column(Text, default='[]')
    hyperparameters_json = Column(Text, default='{}')
    train_samples = Column(Integer, default=0)
    test_samples = Column(Integer, default=0)
    test_accuracy = Column(Float, nullable=True)
    balanced_accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    roc_auc = Column(Float, nullable=True)
    cv_scores_json = Column(Text, default='[]')
    confusion_matrix_json = Column(Text, default='[]')
    classification_report_json = Column(Text, default='{}')
    regression_metrics_json = Column(Text, default='{}')
    train_duration_ms = Column(Float, default=0.0)
    predict_duration_ms = Column(Float, default=0.0)
    training_status = Column(String(32), default='OPTIMAL') # OPTIMAL, DEGRADED, FAILED
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    client = relationship('User', back_populates='training_runs')
    project = relationship('Project', back_populates='training_runs')
    dataset = relationship('Dataset', back_populates='training_runs')

    def to_dict(self):
        return {
            'id': self.id,
            'clientId': self.client_id,
            'projectId': self.project_id,
            'datasetId': self.dataset_id,
            'datasetVersion': self.dataset_version,
            'datasetFileHash': self.dataset_file_hash,
            'modelName': self.model_name,
            'modelVersion': self.model_version,
            'algorithmType': self.algorithm_type,
            'targetColumn': self.target_column,
            'taskType': self.task_type,
            'featuresSelected': json.loads(self.features_selected_json) if self.features_selected_json else [],
            'hyperparameters': json.loads(self.hyperparameters_json) if self.hyperparameters_json else {},
            'trainSamples': self.train_samples,
            'testSamples': self.test_samples,
            'testAccuracy': self.test_accuracy,
            'balancedAccuracy': self.balanced_accuracy,
            'precision': self.precision,
            'recall': self.recall,
            'f1Score': self.f1_score,
            'rocAuc': self.roc_auc,
            'cvScores': json.loads(self.cv_scores_json) if self.cv_scores_json else [],
            'confusionMatrix': json.loads(self.confusion_matrix_json) if self.confusion_matrix_json else [],
            'classificationReport': json.loads(self.classification_report_json) if self.classification_report_json else {},
            'regressionMetrics': json.loads(self.regression_metrics_json) if self.regression_metrics_json else {},
            'trainDurationMs': self.train_duration_ms,
            'predictDurationMs': self.predict_duration_ms,
            'trainingStatus': self.training_status,
            'errorMessage': self.error_message,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }

# -------------------------------------------------------------------------
# 12. PREDICTION LOG AUDIT TABLE
# -------------------------------------------------------------------------
class PredictionLog(Base):
    __tablename__ = 'prediction_logs'

    id = Column(String(64), primary_key=True)
    client_id = Column(String(64), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    project_id = Column(String(64), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    dataset_id = Column(String(64), nullable=False)
    dataset_version = Column(Integer, default=1)
    model_id = Column(String(64), nullable=False)
    model_version = Column(String(32), default='v1.0')
    inputs_json = Column(Text, default='{}')
    outputs_json = Column(Text, default='{}')
    prediction_timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'clientId': self.client_id,
            'projectId': self.project_id,
            'datasetId': self.dataset_id,
            'datasetVersion': self.dataset_version,
            'modelId': self.model_id,
            'modelVersion': self.model_version,
            'inputs': json.loads(self.inputs_json) if self.inputs_json else {},
            'outputs': json.loads(self.outputs_json) if self.outputs_json else {},
            'predictionTimestamp': self.prediction_timestamp.isoformat() if self.prediction_timestamp else None,
        }

# Create all tables on module load
def init_db():
    Base.metadata.create_all(bind=engine)
    # Lightweight schema migration for SQLite (compatible with SQLAlchemy 1.4 & 2.0)
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # Check existing columns in users table
            res = conn.execute(text("PRAGMA table_info(users)"))
            existing_cols = {row[1] for row in res.fetchall()}
            if 'company_name' not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN company_name VARCHAR(128) DEFAULT ''"))
            if 'phone_number' not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN phone_number VARCHAR(32) DEFAULT ''"))
            if 'rejection_reason' not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN rejection_reason TEXT DEFAULT ''"))

            # Quotas
            if 'max_datasets' not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN max_datasets INTEGER DEFAULT 10"))
            if 'max_upload_size_mb' not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN max_upload_size_mb INTEGER DEFAULT 25"))
            if 'max_total_storage_mb' not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN max_total_storage_mb INTEGER DEFAULT 100"))
            if 'allowed_formats' not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN allowed_formats VARCHAR(128) DEFAULT 'csv,xlsx,xls'"))
            if 'max_daily_uploads' not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN max_daily_uploads INTEGER DEFAULT 20"))

            # Permissions
            if 'can_upload' not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN can_upload BOOLEAN DEFAULT 1"))
            if 'can_analyze' not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN can_analyze BOOLEAN DEFAULT 1"))
            if 'can_heal' not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN can_heal BOOLEAN DEFAULT 1"))
            if 'can_train' not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN can_train BOOLEAN DEFAULT 1"))
            if 'can_evaluate' not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN can_evaluate BOOLEAN DEFAULT 1"))
            if 'can_download_reports' not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN can_download_reports BOOLEAN DEFAULT 1"))
            if 'can_export_pdf' not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN can_export_pdf BOOLEAN DEFAULT 1"))

            # Ticket replies email tracking
            res_reply = conn.execute(text("PRAGMA table_info(ticket_replies)"))
            existing_reply_cols = {row[1] for row in res_reply.fetchall()}
            if 'email_status' not in existing_reply_cols:
                conn.execute(text("ALTER TABLE ticket_replies ADD COLUMN email_status VARCHAR(32) DEFAULT 'PENDING'"))
            if 'email_error' not in existing_reply_cols:
                conn.execute(text("ALTER TABLE ticket_replies ADD COLUMN email_error TEXT DEFAULT ''"))

            # Datasets lifecycle & project columns migration
            res_ds = conn.execute(text("PRAGMA table_info(datasets)"))
            existing_ds_cols = {row[1] for row in res_ds.fetchall()}
            if 'project_id' not in existing_ds_cols:
                conn.execute(text("ALTER TABLE datasets ADD COLUMN project_id VARCHAR(64) NULL"))
            if 'is_archived' not in existing_ds_cols:
                conn.execute(text("ALTER TABLE datasets ADD COLUMN is_archived BOOLEAN DEFAULT 0"))
            if 'archived_at' not in existing_ds_cols:
                conn.execute(text("ALTER TABLE datasets ADD COLUMN archived_at TIMESTAMP NULL"))
            if 'original_filename' not in existing_ds_cols:
                conn.execute(text("ALTER TABLE datasets ADD COLUMN original_filename VARCHAR(255) NULL"))
            if 'file_hash' not in existing_ds_cols:
                conn.execute(text("ALTER TABLE datasets ADD COLUMN file_hash VARCHAR(128) DEFAULT ''"))
            if 'file_size_bytes' not in existing_ds_cols:
                conn.execute(text("ALTER TABLE datasets ADD COLUMN file_size_bytes INTEGER DEFAULT 0"))
            if 'version_num' not in existing_ds_cols:
                conn.execute(text("ALTER TABLE datasets ADD COLUMN version_num INTEGER DEFAULT 1"))
            if 'retention_policy' not in existing_ds_cols:
                conn.execute(text("ALTER TABLE datasets ADD COLUMN retention_policy VARCHAR(64) DEFAULT 'STANDARD_7YR'"))

            if hasattr(conn, 'commit'):
                conn.commit()

            # Ensure default project exists for all clients and link any unassigned datasets
            with SessionLocal() as db_session:
                clients = db_session.query(User).all()
                for c in clients:
                    user_projects = db_session.query(Project).filter(Project.client_id == c.id).all()
                    if not user_projects:
                        default_prj = Project(
                            id=f"prj_default_{c.id[-8:] if len(c.id) >= 8 else c.id}",
                            client_id=c.id,
                            name="Primary Research & Failure Prediction",
                            description="Initial project workspace for machine learning experiments and self-healing pipelines.",
                            is_archived=False
                        )
                        db_session.add(default_prj)
                        db_session.flush()
                        # Assign unassigned datasets
                        unassigned_ds = db_session.query(Dataset).filter(Dataset.client_id == c.id, Dataset.project_id.is_(None)).all()
                        for ds in unassigned_ds:
                            ds.project_id = default_prj.id
                db_session.commit()
    except Exception as e:
        print("[DB MIGRATION WARNING]:", e)


if __name__ == '__main__':
    init_db()
    print("Database initialized successfully at:", DB_PATH)
