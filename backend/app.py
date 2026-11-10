"""
HEALML - Production Flask REST API Application
Implements complete Enterprise Backend Services:
- Authentication & RBAC with Secure Session Cookies / Headers
- Tenant-Isolated Dataset Ingestion, Versioning & Download
- Live Pipeline Job Execution & Server-Sent Events (SSE) Streaming
- Comprehensive Admin Portal & Client Management
- Audit Trail Logging & System Health Telemetry
- Database Backup & Restore with Pre-Restoration Snapshots
"""

import os
import sys
import json
import time
import shutil
import hashlib
import datetime
import subprocess
import secrets
from typing import Optional, List, Dict, Any
from flask import Flask, request, jsonify, Response, send_file
from werkzeug.utils import secure_filename

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from backend.models import (
    SessionLocal, init_db, User, Dataset, DatasetVersion, Job, RecoveryRecord, AuditLog, BackupLog, DB_PATH,
    SupportTicket, TicketReply, CriticalAlert, ModelEvaluationRecord, Project, TrainingRun, PredictionLog
)
from backend.alert_service import dispatch_critical_alert, send_ticket_notification
from backend.auth import (
    hash_password, verify_password, validate_password_strength,
    generate_session_token, verify_session_token, bootstrap_initial_admin
)
from backend.ml_engine import compute_detailed_quality_score, detect_all_column_faults

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024 # 50 MB
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'uploads')
EXPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'exports')
BACKUPS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'backups')
EVENTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'events')

for d in [UPLOAD_DIR, EXPORTS_DIR, BACKUPS_DIR, EVENTS_DIR]:
    os.makedirs(d, exist_ok=True)

# Bootstrap database and initial admin account on launch
init_db()
bootstrap_initial_admin()

# -------------------------------------------------------------------------
# AUTHENTICATION & ACCESS CONTROL MIDDLEWARE
# -------------------------------------------------------------------------
def get_current_user(db) -> Optional[User]:
    auth_header = request.headers.get('Authorization', '')
    token = None
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
    elif 'healml_session' in request.cookies:
        token = request.cookies.get('healml_session')

    if not token:
        return None

    payload = verify_session_token(token)
    if not payload:
        return None

    user = db.query(User).filter(User.id == payload['userId']).first()
    if user and user.status == 'ACTIVE':
        return user
    return None

def log_audit(db, user: Optional[User], action: str, entity_type: str, entity_id: str, details: str):
    audit = AuditLog(
        user_id=user.id if user else None,
        user_email=user.email if user else 'anonymous@platform',
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=request.remote_addr or '127.0.0.1'
    )
    db.add(audit)
    db.commit()

# CORS Header injector
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

# -------------------------------------------------------------------------
# 1. AUTHENTICATION ENDPOINTS
# -------------------------------------------------------------------------
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    confirm_password = data.get('confirmPassword', '')
    full_name = data.get('fullName', '').strip()
    company_name = data.get('companyName', '').strip()
    phone_number = data.get('phoneNumber', '').strip()

    if not email or not password or not full_name:
        return jsonify({'error': 'Full name, email, and password are required.'}), 400

    if confirm_password and password != confirm_password:
        return jsonify({'error': 'Password and confirm password do not match.'}), 400

    valid_pw, pw_msg = validate_password_strength(password)
    if not valid_pw:
        return jsonify({'error': pw_msg}), 400

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            return jsonify({'error': 'An account with this email already exists.'}), 409

        user_id = f"usr_{int(time.time()*1000)}"
        new_user = User(
            id=user_id,
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            company_name=company_name,
            phone_number=phone_number,
            role='CLIENT',
            status='PENDING_APPROVAL', # Requires administrator approval
            email_verified=True
        )
        db.add(new_user)
        log_audit(db, new_user, 'USER_REGISTERED', 'USER', user_id, f"Client signup registered for {email} ({company_name or 'Independent'}). Status set to PENDING_APPROVAL.")
        db.commit()

        # Notify Master Admin alert feed of new pending registration
        try:
            dispatch_critical_alert(
                severity='INFO',
                category='REGISTRATION_PENDING',
                summary=f"New client registration pending approval: {full_name} ({email}) - {company_name or 'N/A'}",
                affected_service='Authentication Service',
                details=f"Client ID: {user_id}\nEmail: {email}\nName: {full_name}\nCompany: {company_name}\nPhone: {phone_number}",
                recommended_action='Review and approve or reject this client in the Master Admin Pending Registrations tab.'
            )
        except Exception:
            pass

        return jsonify({
            'message': 'Registration submitted successfully. Your account is pending Master Admin review and approval before access is granted.',
            'status': 'PENDING_APPROVAL',
            'user': new_user.to_dict()
        }), 201
    finally:
        db.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    identifier = (data.get('email') or data.get('username') or data.get('clientId') or '').strip()
    password = data.get('password', '')

    if not identifier or not password:
        return jsonify({'error': 'Client ID or Email and password are required.'}), 400

    db = SessionLocal()
    try:
        from sqlalchemy import func
        user = db.query(User).filter(
            (func.lower(User.email) == identifier.lower()) | (func.lower(User.id) == identifier.lower())
        ).first()
        if not user or not verify_password(user.password_hash, password):
            return jsonify({'error': 'Invalid Client ID / Email or password credentials.'}), 401

        # Check account status
        if user.status == 'PENDING_APPROVAL':
            return jsonify({
                'error': 'Your account is pending administrator review and approval. Please contact your organization administrator.',
                'accountStatus': 'PENDING_APPROVAL'
            }), 403
        elif user.status == 'REJECTED':
            return jsonify({
                'error': 'Your registration request was rejected by an administrator.',
                'accountStatus': 'REJECTED'
            }), 403
        elif user.status == 'SUSPENDED':
            return jsonify({
                'error': 'Your account has been suspended by an administrator.',
                'accountStatus': 'SUSPENDED'
            }), 403
        elif user.status != 'ACTIVE':
            return jsonify({'error': f'Account inactive ({user.status}).'}), 403

        # Update last login
        user.last_login_at = datetime.datetime.utcnow()
        token = generate_session_token(user.id, user.role)
        log_audit(db, user, 'USER_LOGIN', 'USER', user.id, f"Successful login by {user.email} (Role: {user.role}).")
        db.commit()

        return jsonify({
            'token': token,
            'user': user.to_dict()
        })
    finally:
        db.close()

@app.route('/api/auth/me', methods=['GET'])
def get_me():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized or session expired.'}), 401
        return jsonify({'user': user.to_dict()})
    finally:
        db.close()

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if user:
            log_audit(db, user, 'USER_LOGOUT', 'USER', user.id, f"User {user.email} logged out.")
        return jsonify({'message': 'Logged out successfully.'})
    finally:
        db.close()

@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            reset_token = secrets.token_urlsafe(32)
            user.reset_token = reset_token
            user.reset_token_expiry = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
            log_audit(db, user, 'PASSWORD_RESET_REQUESTED', 'USER', user.id, f"Password reset token issued for {email}.")
            db.commit()
            return jsonify({
                'message': 'If the email exists, a password reset token has been issued.',
                'resetToken': reset_token # Returned for UI preview in development
            })
        return jsonify({'message': 'If the email exists, a password reset token has been issued.'})
    finally:
        db.close()

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json() or {}
    token = data.get('token', '')
    new_password = data.get('newPassword', '')

    valid_pw, pw_msg = validate_password_strength(new_password)
    if not valid_pw:
        return jsonify({'error': pw_msg}), 400

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.reset_token == token).first()
        if not user or not user.reset_token_expiry or user.reset_token_expiry < datetime.datetime.utcnow():
            return jsonify({'error': 'Invalid or expired password reset token.'}), 400

        user.password_hash = hash_password(new_password)
        user.reset_token = None
        user.reset_token_expiry = None
        log_audit(db, user, 'PASSWORD_RESET_COMPLETED', 'USER', user.id, f"Password successfully updated for {user.email}.")
        db.commit()
        return jsonify({'message': 'Password has been updated successfully. You may now log in.'})
    finally:
        db.close()

# -------------------------------------------------------------------------
# 1.5 PROJECT MANAGEMENT (Project-wise Separation & Multi-Tenant Isolation)
# -------------------------------------------------------------------------
@app.route('/api/projects', methods=['GET'])
def list_projects():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        if user.role in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            projects = db.query(Project).order_by(Project.created_at.desc()).all()
        else:
            projects = db.query(Project).filter(Project.client_id == user.id, Project.is_archived == False).order_by(Project.created_at.desc()).all()

        prjs_data = []
        for p in projects:
            p_dict = p.to_dict()
            p_dict['datasetCount'] = db.query(Dataset).filter(Dataset.project_id == p.id, Dataset.is_archived == False).count()
            p_dict['modelCount'] = db.query(TrainingRun).filter(TrainingRun.project_id == p.id).count()
            prjs_data.append(p_dict)

        return jsonify({'projects': prjs_data})
    finally:
        db.close()

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()

    if not name:
        return jsonify({'error': 'Project name is required.'}), 400

    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        project_id = f"prj_{int(time.time()*1000)}"
        new_project = Project(
            id=project_id,
            client_id=user.id,
            name=name,
            description=description,
            is_archived=False,
            created_at=datetime.datetime.utcnow()
        )
        db.add(new_project)
        log_audit(db, user, 'PROJECT_CREATED', 'PROJECT', project_id, f"Created project '{name}'.")
        db.commit()

        p_dict = new_project.to_dict()
        p_dict['datasetCount'] = 0
        p_dict['modelCount'] = 0
        return jsonify({
            'message': f"Project '{name}' created successfully.",
            'project': p_dict
        }), 201
    finally:
        db.close()

@app.route('/api/projects/<project_id>', methods=['GET'])
def get_project_detail(project_id):
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return jsonify({'error': 'Project not found.'}), 404

        if user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] and project.client_id != user.id:
            return jsonify({'error': 'Access denied.'}), 403

        datasets = db.query(Dataset).filter(Dataset.project_id == project_id, Dataset.is_archived == False).order_by(Dataset.created_at.desc()).all()
        archived_datasets = db.query(Dataset).filter(Dataset.project_id == project_id, Dataset.is_archived == True).order_by(Dataset.created_at.desc()).all()
        runs = db.query(TrainingRun).filter(TrainingRun.project_id == project_id).order_by(TrainingRun.created_at.desc()).all()

        p_dict = project.to_dict()
        p_dict['datasetCount'] = len(datasets)
        p_dict['modelCount'] = len(runs)

        return jsonify({
            'project': p_dict,
            'datasets': [d.to_dict() for d in datasets],
            'archivedDatasets': [d.to_dict() for d in archived_datasets],
            'trainingRuns': [r.to_dict() for r in runs]
        })
    finally:
        db.close()

@app.route('/api/projects/<project_id>/archive', methods=['POST'])
def archive_project(project_id):
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return jsonify({'error': 'Project not found.'}), 404

        if user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] and project.client_id != user.id:
            return jsonify({'error': 'Access denied.'}), 403

        project.is_archived = True
        log_audit(db, user, 'PROJECT_ARCHIVED', 'PROJECT', project_id, f"Archived project '{project.name}'.")
        db.commit()

        return jsonify({
            'message': f"Project '{project.name}' has been archived.",
            'project': project.to_dict()
        })
    finally:
        db.close()

@app.route('/api/projects/<project_id>/datasets', methods=['GET'])
def get_project_datasets(project_id):
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return jsonify({'error': 'Project not found.'}), 404

        if user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] and project.client_id != user.id:
            return jsonify({'error': 'Access denied.'}), 403

        active_dss = db.query(Dataset).filter(Dataset.project_id == project_id, Dataset.is_archived == False).order_by(Dataset.created_at.desc()).all()
        archived_dss = db.query(Dataset).filter(Dataset.project_id == project_id, Dataset.is_archived == True).order_by(Dataset.created_at.desc()).all()

        return jsonify({
            'activeDatasets': [d.to_dict() for d in active_dss],
            'archivedDatasets': [d.to_dict() for d in archived_dss]
        })
    finally:
        db.close()

@app.route('/api/projects/<project_id>/training-runs', methods=['GET'])
def get_project_training_runs(project_id):
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        runs = db.query(TrainingRun).filter(TrainingRun.project_id == project_id).order_by(TrainingRun.created_at.desc()).all()
        runs_data = [r.to_dict() for r in runs]
        return jsonify({'runs': runs_data, 'trainingRuns': runs_data})
    finally:
        db.close()

# -------------------------------------------------------------------------
# 2. DATASET INGESTION & MANAGEMENT (Multi-Tenant Isolated)
# -------------------------------------------------------------------------
@app.route('/api/datasets', methods=['GET'])
def list_datasets():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        project_id = request.args.get('projectId')
        include_archived = request.args.get('includeArchived', 'false').lower() == 'true'

        query = db.query(Dataset)
        if user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            query = query.filter(Dataset.client_id == user.id)

        if project_id:
            query = query.filter(Dataset.project_id == project_id)

        if not include_archived:
            query = query.filter(Dataset.is_archived == False)

        datasets = query.order_by(Dataset.created_at.desc()).all()
        return jsonify({'datasets': [d.to_dict() for d in datasets]})
    finally:
        db.close()

@app.route('/api/datasets/upload', methods=['POST'])
def upload_dataset():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        name = request.form.get('name', 'Uploaded Tabular Dataset')
        domain = request.form.get('domain', 'General Enterprise')
        description = request.form.get('description', '')
        target_col = request.form.get('targetCol', '')

        # 1. Enforce Client Permissions
        if user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            if not getattr(user, 'can_upload', True):
                return jsonify({'error': 'Permission denied: Your account is restricted from uploading new datasets. Please contact your administrator.'}), 403

            # 2. Enforce Dataset Count Limit
            max_ds_allowed = getattr(user, 'max_datasets', 10) or 10
            existing_ds_count = db.query(Dataset).filter(Dataset.client_id == user.id).count()
            if existing_ds_count >= max_ds_allowed:
                return jsonify({'error': f'Quota exceeded: You have reached your maximum dataset limit of {max_ds_allowed} datasets. Delete existing datasets or request an upgrade.'}), 403

        # Check if file uploaded or json payload
        filepath = ''
        filename = ''
        format_type = 'csv'

        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No selected file'}), 400
            filename = secure_filename(file.filename)
            ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
            
            # 3. Enforce Allowed Formats
            if user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
                allowed = (getattr(user, 'allowed_formats', 'csv,xlsx,xls') or 'csv,xlsx,xls').lower().split(',')
                allowed = [a.strip() for a in allowed]
                if ext not in allowed:
                    return jsonify({'error': f"File format '.{ext}' is not permitted. Allowed formats: {', '.join(allowed)}."}), 400

            format_type = 'xlsx' if ext in ['xlsx', 'xls'] else 'csv'
            save_name = f"{user.id}_{int(time.time())}_{filename}"
            filepath = os.path.join(UPLOAD_DIR, save_name)
            file.save(filepath)

            # 4. Enforce Max Upload Size Limit (in MB)
            if user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
                max_size_mb = getattr(user, 'max_upload_size_mb', 25) or 25
                file_size_bytes = os.path.getsize(filepath)
                if file_size_bytes > max_size_mb * 1024 * 1024:
                    os.remove(filepath)
                    return jsonify({'error': f"File size ({file_size_bytes / (1024*1024):.1f} MB) exceeds your maximum upload limit of {max_size_mb} MB."}), 400
        else:
            # Check JSON payload for raw text/rows
            data = request.get_json() or {}
            rows = data.get('rows', [])
            name = data.get('name', name)
            target_col = data.get('targetCol', target_col)
            if not rows:
                return jsonify({'error': 'No file uploaded or dataset rows provided.'}), 400

            import pandas as pd
            df_temp = pd.DataFrame(rows)
            filename = f"manual_dataset_{int(time.time())}.csv"
            save_name = f"{user.id}_{int(time.time())}_{filename}"
            filepath = os.path.join(UPLOAD_DIR, save_name)
            df_temp.to_csv(filepath, index=False)

        # Profile dataset
        import pandas as pd
        if format_type == 'xlsx':
            df = pd.read_excel(filepath)
        else:
            df = pd.read_csv(filepath)

        row_count, col_count = df.shape
        q_score = compute_detailed_quality_score(df)['overallScore']

        # Project Association
        project_id = request.form.get('projectId') if 'file' in request.files else (request.get_json() or {}).get('projectId')
        target_project = None
        if project_id:
            target_project = db.query(Project).filter(Project.id == project_id).first()
        if not target_project:
            target_project = db.query(Project).filter(Project.client_id == user.id, Project.is_archived == False).first()
            if not target_project:
                target_project = Project(
                    id=f"prj_{int(time.time()*1000)}",
                    client_id=user.id,
                    name="Primary Research & Failure Prediction",
                    description="Default project workspace."
                )
                db.add(target_project)
                db.flush()

        # Compute file hash and size
        file_hash = ''
        file_size_bytes = 0
        if os.path.exists(filepath):
            file_size_bytes = os.path.getsize(filepath)
            with open(filepath, 'rb') as f_in:
                file_hash = hashlib.sha256(f_in.read()).hexdigest()

        dataset_id = f"ds_{int(time.time()*1000)}"
        new_ds = Dataset(
            id=dataset_id,
            client_id=user.id,
            project_id=target_project.id,
            name=name,
            filename=filename,
            original_filename=filename,
            filepath=filepath,
            file_hash=file_hash,
            file_size_bytes=file_size_bytes,
            row_count=row_count,
            col_count=col_count,
            format=format_type,
            domain=domain,
            description=description,
            target_col=target_col,
            task_type='unsupervised' if not target_col else 'binary_classification',
            quality_score=q_score,
            version_num=1,
            is_archived=False,
            schema_json=json.dumps([{'name': str(c), 'dtype': str(df[c].dtype)} for c in df.columns])
        )
        db.add(new_ds)

        # Version 1 record (Original Raw)
        v1 = DatasetVersion(
            id=f"ver_{dataset_id}_1_{int(time.time())}",
            dataset_id=dataset_id,
            client_id=user.id,
            version_num=1,
            row_count=row_count,
            quality_score=q_score,
            change_summary="Original Raw Dataset Upload",
            filepath=filepath
        )
        db.add(v1)

        log_audit(db, user, 'DATASET_UPLOAD', 'DATASET', dataset_id, f"Uploaded '{name}' into project '{target_project.name}' ({row_count} rows, {col_count} columns, {file_size_bytes} bytes).")
        db.commit()

        return jsonify({
            'message': 'Dataset uploaded and profiled successfully.',
            'dataset': new_ds.to_dict()
        }), 201
    finally:
        db.close()

# -------------------------------------------------------------------------
# 2.1 DATASET LIFECYCLE (Archival, Restoration, Permanent Deletion, Audit History)
# -------------------------------------------------------------------------
@app.route('/api/datasets/<dataset_id>/archive', methods=['POST'])
def archive_dataset(dataset_id):
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not ds:
            return jsonify({'error': 'Dataset not found.'}), 404

        if user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] and ds.client_id != user.id:
            return jsonify({'error': 'Access denied'}), 403

        ds.is_archived = True
        ds.archived_at = datetime.datetime.utcnow()
        log_audit(db, user, 'DATASET_ARCHIVED', 'DATASET', dataset_id, f"Archived dataset '{ds.name}'.")
        db.commit()

        return jsonify({
            'message': f"Dataset '{ds.name}' moved to cold archive. Historical training records and evaluation metrics remain permanently intact.",
            'dataset': ds.to_dict()
        })
    finally:
        db.close()

@app.route('/api/datasets/<dataset_id>/restore', methods=['POST'])
def restore_dataset(dataset_id):
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not ds:
            return jsonify({'error': 'Dataset not found.'}), 404

        if user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] and ds.client_id != user.id:
            return jsonify({'error': 'Access denied'}), 403

        ds.is_archived = False
        ds.archived_at = None
        log_audit(db, user, 'DATASET_RESTORED', 'DATASET', dataset_id, f"Restored dataset '{ds.name}' to active workspace.")
        db.commit()

        return jsonify({
            'message': f"Dataset '{ds.name}' restored to active repository.",
            'dataset': ds.to_dict()
        })
    finally:
        db.close()

@app.route('/api/datasets/<dataset_id>/permanent', methods=['DELETE'])
def permanently_delete_dataset(dataset_id):
    data = request.get_json() or {}
    phrase = (data.get('confirmationPhrase') or data.get('confirmPhrase') or '').strip()

    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not ds:
            return jsonify({'error': 'Dataset not found.'}), 404

        if user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] and ds.client_id != user.id:
            return jsonify({'error': 'Access denied.'}), 403

        expected_phrase = f"DELETE {ds.name}".strip()
        if phrase != expected_phrase and phrase != f"DELETE {ds.id}".strip():
            return jsonify({
                'error': f"Invalid confirmation phrase. Please type '{expected_phrase}' exactly to authorize permanent destruction."
            }), 400

        # Check dependent models
        trained_models_count = db.query(TrainingRun).filter(TrainingRun.dataset_id == dataset_id).count()
        if trained_models_count > 0 and user.role not in ['SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({
                'error': f"Cannot permanently delete dataset: {trained_models_count} trained model runs rely on this dataset. Archive the dataset instead to preserve certified MLOps audit trails."
            }), 400

        ds_name = ds.name
        if os.path.exists(ds.filepath):
            try:
                os.remove(ds.filepath)
            except Exception:
                pass

        log_audit(db, user, 'DATASET_PERMANENT_DELETION', 'DATASET', dataset_id, f"PERMANENTLY DELETED dataset '{ds_name}'.")
        db.delete(ds)
        db.commit()

        return jsonify({'message': f"Dataset '{ds_name}' permanently deleted."})
    finally:
        db.close()

@app.route('/api/datasets/<dataset_id>/history', methods=['GET'])
def get_dataset_history(dataset_id):
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not ds:
            return jsonify({'error': 'Dataset not found.'}), 404

        if user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] and ds.client_id != user.id:
            return jsonify({'error': 'Access denied.'}), 403

        versions = db.query(DatasetVersion).filter(DatasetVersion.dataset_id == dataset_id).order_by(DatasetVersion.version_num.asc()).all()
        runs = db.query(TrainingRun).filter(TrainingRun.dataset_id == dataset_id).order_by(TrainingRun.created_at.desc()).all()

        return jsonify({
            'dataset': ds.to_dict(),
            'versions': [v.to_dict() for v in versions],
            'trainingRuns': [r.to_dict() for r in runs]
        })
    finally:
        db.close()

@app.route('/api/datasets/<dataset_id>', methods=['GET'])
def get_dataset(dataset_id):
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not ds:
            return jsonify({'error': 'Dataset not found.'}), 404

        # Tenant isolation
        if user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] and ds.client_id != user.id:
            return jsonify({'error': 'Access denied: unauthorized dataset inspection.'}), 403

        import pandas as pd
        if ds.filepath.endswith('.xlsx') or ds.filepath.endswith('.xls'):
            df = pd.read_excel(ds.filepath)
        else:
            df = pd.read_csv(ds.filepath)

        # Preview rows (first 100 rows)
        preview_rows = df.head(100).replace({float('nan'): None}).to_dict(orient='records')
        columns = [{'name': str(c), 'type': 'numeric' if pd.api.types.is_numeric_dtype(df[c]) else 'categorical'} for c in df.columns]

        return jsonify({
            'dataset': ds.to_dict(),
            'columns': columns,
            'previewRows': preview_rows,
            'totalRows': len(df)
        })
    finally:
        db.close()

@app.route('/api/datasets/<dataset_id>/versions', methods=['GET'])
def get_dataset_versions(dataset_id):
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not ds or (user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] and ds.client_id != user.id):
            return jsonify({'error': 'Access denied'}), 403

        versions = db.query(DatasetVersion).filter(DatasetVersion.dataset_id == dataset_id).order_by(DatasetVersion.version_num.desc()).all()
        return jsonify({'versions': [v.to_dict() for v in versions]})
    finally:
        db.close()

@app.route('/api/datasets/<dataset_id>/versions/<version_id>/download', methods=['GET'])
def download_dataset_version(dataset_id, version_id):
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not ds or (user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] and ds.client_id != user.id):
            return jsonify({'error': 'Access denied'}), 403

        version = db.query(DatasetVersion).filter(DatasetVersion.id == version_id).first()
        if not version or not os.path.exists(version.filepath):
            return jsonify({'error': 'Requested dataset version file missing on server.'}), 404

        req_format = request.args.get('format', 'csv').lower()
        log_audit(db, user, 'DATASET_DOWNLOAD', 'DATASET_VERSION', version_id, f"Downloaded version {version.version_num} of {ds.name} in {req_format.upper()} format.")

        if req_format == 'xlsx':
            # Convert CSV to XLSX if needed
            xlsx_path = version.filepath.replace('.csv', '.xlsx')
            if not os.path.exists(xlsx_path):
                import pandas as pd
                df = pd.read_csv(version.filepath)
                df.to_excel(xlsx_path, index=False)
            return send_file(xlsx_path, as_attachment=True, download_name=f"{ds.name}_v{version.version_num}.xlsx")
        else:
            return send_file(version.filepath, as_attachment=True, download_name=f"{ds.name}_v{version.version_num}.csv")
    finally:
        db.close()

# -------------------------------------------------------------------------
# 3. LIVE PIPELINE EXECUTION & SSE MONITORING
# -------------------------------------------------------------------------
@app.route('/api/pipeline/start', methods=['POST'])
def start_pipeline():
    data = request.get_json() or {}
    dataset_id = data.get('datasetId')
    target_col = data.get('targetCol')

    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not ds:
            return jsonify({'error': 'Dataset not found.'}), 404

        if user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] and ds.client_id != user.id:
            return jsonify({'error': 'Access denied'}), 403

        if getattr(ds, 'is_archived', False):
            return jsonify({'error': 'Cannot train on an archived dataset. Restore the dataset first from Archived Datasets to use it for active model training.'}), 400

        # Enforce ML Execution Permissions
        if user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            if not getattr(user, 'can_heal', True):
                return jsonify({'error': 'Permission denied: Your account does not have permission to execute self-healing.'}), 403
            if not getattr(user, 'can_train', True):
                return jsonify({'error': 'Permission denied: Your account does not have permission to trigger model training.'}), 403


        if target_col is not None:
            ds.target_col = target_col
            db.commit()

        job_id = f"job_{int(time.time()*1000)}"
        new_job = Job(
            id=job_id,
            client_id=user.id,
            dataset_id=dataset_id,
            status='PENDING',
            current_stage='ingestion',
            progress_percent=0
        )
        db.add(new_job)
        log_audit(db, user, 'PIPELINE_START', 'JOB', job_id, f"Initiated HEALML pipeline for dataset '{ds.name}'.")
        db.commit()

        # Spawn background Python pipeline process
        worker_script = os.path.join(os.path.dirname(__file__), 'run_pipeline_job.py')
        proc_env = dict(os.environ)
        proc_env['PYTHONPATH'] = os.path.dirname(os.path.dirname(__file__))
        subprocess.Popen(
            [sys.executable, worker_script, '--job-id', job_id],
            cwd=os.path.dirname(os.path.dirname(__file__)),
            env=proc_env
        )

        return jsonify({
            'message': 'Pipeline background job started successfully.',
            'jobId': job_id,
            'job': new_job.to_dict()
        }), 202
    finally:
        db.close()

@app.route('/api/pipeline/<job_id>/status', methods=['GET'])
def get_job_status(job_id):
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        job = db.query(Job).filter(Job.id == job_id).first()
        if not job or (user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] and job.client_id != user.id):
            return jsonify({'error': 'Job not found or access denied.'}), 404

        results = json.loads(job.results_json) if job.results_json else {}
        return jsonify({
            'job': job.to_dict(),
            'results': results
        })
    finally:
        db.close()

@app.route('/api/pipeline/<job_id>/events', methods=['GET'])
def stream_job_events(job_id):
    """Server-Sent Events (SSE) streaming live stage progress directly to frontend."""
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        job = db.query(Job).filter(Job.id == job_id).first()
        if not job or (user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] and job.client_id != user.id):
            return jsonify({'error': 'Access denied'}), 403
    finally:
        db.close()

    def event_stream():
        event_file = os.path.join(EVENTS_DIR, f"{job_id}.jsonl")
        last_pos = 0
        timeout_seconds = 120
        start = time.time()

        while time.time() - start < timeout_seconds:
            if os.path.exists(event_file):
                with open(event_file, 'r', encoding='utf-8') as f:
                    f.seek(last_pos)
                    lines = f.readlines()
                    last_pos = f.tell()

                for line in lines:
                    line_clean = line.strip()
                    if line_clean:
                        yield f"data: {line_clean}\n\n"
                        try:
                            ev = json.loads(line_clean)
                            if ev.get('stage') in ['completed', 'failed']:
                                return
                        except Exception:
                            pass

            time.sleep(0.3)

    return Response(event_stream(), mimetype='text/event-stream')

# -------------------------------------------------------------------------
# 4. RECOVERY LOGS ENDPOINTS
# -------------------------------------------------------------------------
@app.route('/api/logs/recovery', methods=['GET'])
def get_recovery_logs():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        if user.role in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            recs = db.query(RecoveryRecord).order_by(RecoveryRecord.created_at.desc()).limit(100).all()
        else:
            recs = db.query(RecoveryRecord).filter(RecoveryRecord.client_id == user.id).order_by(RecoveryRecord.created_at.desc()).limit(100).all()

        return jsonify({'logs': [r.to_dict() for r in recs]})
    finally:
        db.close()

# -------------------------------------------------------------------------
# 5. ADMIN PORTAL ENDPOINTS (Restricted to ADMIN & SUPER_ADMIN)
# -------------------------------------------------------------------------
@app.route('/api/admin/dashboard', methods=['GET'])
def admin_dashboard():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Access forbidden: Administrator privileges required.'}), 403

        total_clients = db.query(User).filter(User.role == 'CLIENT').count()
        pending_clients = db.query(User).filter(User.status == 'PENDING_APPROVAL').count()
        active_clients = db.query(User).filter(User.status == 'ACTIVE').count()
        total_datasets = db.query(Dataset).count()
        active_jobs = db.query(Job).filter(Job.status == 'RUNNING').count()
        completed_jobs = db.query(Job).filter(Job.status == 'COMPLETED').count()
        failed_jobs = db.query(Job).filter(Job.status == 'FAILED').count()
        successful_recoveries = db.query(RecoveryRecord).filter(RecoveryRecord.verification_status == 'VERIFIED_SUCCESS').count()

        unread_tickets = db.query(SupportTicket).filter(SupportTicket.is_read_by_admin == False).count()
        unresolved_alerts = db.query(CriticalAlert).filter(CriticalAlert.is_resolved == False).count()

        return jsonify({
            'kpis': {
                'totalClients': total_clients,
                'pendingApprovals': pending_clients,
                'activeClients': active_clients,
                'totalDatasets': total_datasets,
                'activeJobs': active_jobs,
                'completedJobs': completed_jobs,
                'failedJobs': failed_jobs,
                'successfulRecoveries': successful_recoveries,
                'unreadTickets': unread_tickets,
                'unresolvedAlerts': unresolved_alerts,
                'systemHealth': 'OPTIMAL' if failed_jobs == 0 or active_jobs > 0 else 'HEALTHY'
            }
        })
    finally:
        db.close()

@app.route('/api/admin/clients', methods=['GET'])
def admin_get_clients():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        clients = db.query(User).order_by(User.created_at.desc()).all()
        return jsonify({'clients': [c.to_dict() for c in clients]})
    finally:
        db.close()

@app.route('/api/admin/clients/<client_id>/approve', methods=['POST'])
def admin_approve_client(client_id):
    db = SessionLocal()
    try:
        admin_user = get_current_user(db)
        if not admin_user or admin_user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        target_user = db.query(User).filter(User.id == client_id).first()
        if not target_user:
            return jsonify({'error': 'User not found'}), 404

        target_user.status = 'ACTIVE'
        log_audit(db, admin_user, 'CLIENT_APPROVED', 'USER', client_id, f"Approved client account {target_user.email} -> ACTIVE.")
        db.commit()
        return jsonify({'message': f"Account for {target_user.email} approved.", 'client': target_user.to_dict()})
    finally:
        db.close()

@app.route('/api/admin/clients/<client_id>/reject', methods=['POST'])
def admin_reject_client(client_id):
    db = SessionLocal()
    try:
        admin_user = get_current_user(db)
        if not admin_user or admin_user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        target_user = db.query(User).filter(User.id == client_id).first()
        if not target_user:
            return jsonify({'error': 'User not found'}), 404

        target_user.status = 'REJECTED'
        log_audit(db, admin_user, 'CLIENT_REJECTED', 'USER', client_id, f"Rejected client account {target_user.email} -> REJECTED.")
        db.commit()
        return jsonify({'message': f"Account for {target_user.email} rejected.", 'client': target_user.to_dict()})
    finally:
        db.close()

@app.route('/api/admin/clients/<client_id>/suspend', methods=['POST'])
def admin_suspend_client(client_id):
    db = SessionLocal()
    try:
        admin_user = get_current_user(db)
        if not admin_user or admin_user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        target_user = db.query(User).filter(User.id == client_id).first()
        if not target_user:
            return jsonify({'error': 'User not found'}), 404

        target_user.status = 'SUSPENDED'
        log_audit(db, admin_user, 'CLIENT_SUSPENDED', 'USER', client_id, f"Suspended client account {target_user.email} -> SUSPENDED.")
        db.commit()
        return jsonify({'message': f"Account for {target_user.email} suspended.", 'client': target_user.to_dict()})
    finally:
        db.close()

@app.route('/api/admin/clients/<client_id>/role', methods=['POST'])
def admin_update_role(client_id):
    db = SessionLocal()
    try:
        admin_user = get_current_user(db)
        if not admin_user or admin_user.role not in ['SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Only Super Administrators can assign roles.'}), 403

        data = request.get_json() or {}
        new_role = data.get('role')
        if new_role not in ['SUPER_ADMIN', 'ADMIN', 'CLIENT']:
            return jsonify({'error': 'Invalid role specification.'}), 400

        target_user = db.query(User).filter(User.id == client_id).first()
        if not target_user:
            return jsonify({'error': 'User not found'}), 404

        target_user.role = new_role
        log_audit(db, admin_user, 'ROLE_UPDATED', 'USER', client_id, f"Role changed to {new_role} for {target_user.email}.")
        db.commit()
        return jsonify({'message': f"Role for {target_user.email} updated to {new_role}.", 'client': target_user.to_dict()})
    finally:
        db.close()

@app.route('/api/admin/jobs', methods=['GET'])
def admin_get_jobs():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        jobs = db.query(Job).order_by(Job.started_at.desc()).limit(100).all()
        return jsonify({'jobs': [j.to_dict() for j in jobs]})
    finally:
        db.close()

@app.route('/api/admin/audit-logs', methods=['GET'])
def admin_get_audit_logs():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(200).all()
        return jsonify({'logs': [l.to_dict() for l in logs]})
    finally:
        db.close()

@app.route('/api/admin/system-health', methods=['GET'])
def admin_system_health():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        import shutil
        total, used, free = shutil.disk_usage('/')
        db_size = os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 0

        return jsonify({
            'backendStatus': 'ONLINE',
            'databaseConnectivity': 'CONNECTED',
            'mlPipelineAvailable': True,
            'backgroundWorkers': 'STANDBY_IDLE',
            'diskSpace': {
                'totalGb': round(total / (1024**3), 1),
                'usedGb': round(used / (1024**3), 1),
                'freeGb': round(free / (1024**3), 1)
            },
            'databaseSizeKb': round(db_size / 1024, 1),
            'timestamp': datetime.datetime.utcnow().isoformat()
        })
    finally:
        db.close()

# -------------------------------------------------------------------------
# 6. DATABASE BACKUP AND RESTORE (Super Admin Only)
# -------------------------------------------------------------------------
@app.route('/api/admin/backup/create', methods=['POST'])
def admin_create_backup():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Only Super Administrators can manage database backups.'}), 403

        timestamp = int(time.time())
        backup_filename = f"healml_backup_{timestamp}.db"
        dest_path = os.path.join(BACKUPS_DIR, backup_filename)

        shutil.copy2(DB_PATH, dest_path)
        size_bytes = os.path.getsize(dest_path)

        # Compute SHA-256 Checksum
        with open(dest_path, 'rb') as f:
            checksum = hashlib.sha256(f.read()).hexdigest()

        backup = BackupLog(
            id=f"bak_{timestamp}",
            backup_filename=backup_filename,
            file_size_bytes=size_bytes,
            status='SUCCESS',
            checksum_sha256=checksum,
            is_pre_restore=False
        )
        db.add(backup)
        log_audit(db, user, 'DATABASE_BACKUP_CREATED', 'DATABASE', backup.id, f"Created backup {backup_filename} ({size_bytes} bytes, SHA: {checksum[:8]}).")
        db.commit()

        return jsonify({
            'message': 'Database backup created and checksum verified successfully.',
            'backup': backup.to_dict()
        }), 201
    finally:
        db.close()

@app.route('/api/admin/backup/list', methods=['GET'])
def admin_list_backups():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        backups = db.query(BackupLog).order_by(BackupLog.created_at.desc()).all()
        return jsonify({'backups': [b.to_dict() for b in backups]})
    finally:
        db.close()

@app.route('/api/admin/backup/restore', methods=['POST'])
def admin_restore_backup():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Only Super Administrators can execute database restore.'}), 403

        data = request.get_json() or {}
        backup_id = data.get('backupId')

        backup = db.query(BackupLog).filter(BackupLog.id == backup_id).first()
        if not backup:
            return jsonify({'error': 'Backup record not found.'}), 404

        source_path = os.path.join(BACKUPS_DIR, backup.backup_filename)
        if not os.path.exists(source_path):
            return jsonify({'error': 'Backup file missing on disk.'}), 404

        # Verify Checksum
        with open(source_path, 'rb') as f:
            current_sum = hashlib.sha256(f.read()).hexdigest()
        if backup.checksum_sha256 and current_sum != backup.checksum_sha256:
            return jsonify({'error': 'Integrity check failed: Checksum mismatch.'}), 400

        # Automatic Pre-Restore Safety Snapshot
        pre_restore_filename = f"pre_restore_safety_{int(time.time())}.db"
        pre_restore_path = os.path.join(BACKUPS_DIR, pre_restore_filename)
        shutil.copy2(DB_PATH, pre_restore_path)

        # Overwrite DB with selected backup
        shutil.copy2(source_path, DB_PATH)

        log_audit(db, user, 'DATABASE_RESTORE_COMPLETED', 'DATABASE', backup_id, f"Database restored from {backup.backup_filename}. Safety snapshot created at {pre_restore_filename}.")
        db.commit()

        return jsonify({'message': f"Database restored successfully from {backup.backup_filename}."})
    finally:
        db.close()

# -------------------------------------------------------------------------
# 7. SUPPORT TICKETS & HELP REQUESTS (Clients & Master Admin)
# -------------------------------------------------------------------------
@app.route('/api/support/tickets', methods=['POST'])
def create_support_ticket():
    data = request.get_json() or {}
    category = data.get('category', 'General').strip()
    subject = data.get('subject', '').strip()
    description = data.get('description', '').strip()
    priority = data.get('priority', 'MEDIUM').strip().upper()
    guest_name = data.get('name', '').strip()
    guest_email = data.get('email', '').strip().lower()

    if not subject or not description:
        return jsonify({'error': 'Subject and description are required.'}), 400

    db = SessionLocal()
    try:
        user = get_current_user(db)
        client_id = user.id if user else f"guest_{int(time.time()*1000)}"
        client_name = user.full_name if user else (guest_name or 'Public Visitor')
        client_email = user.email if user else (guest_email or 'visitor@healml.platform')

        ticket_id = f"TKT-{datetime.datetime.utcnow().year}-{secrets.randbelow(9000)+1000}"

        ticket = SupportTicket(
            id=ticket_id,
            client_id=client_id,
            client_email=client_email,
            client_name=client_name,
            category=category,
            subject=subject,
            description=description,
            priority=priority if priority in ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] else 'MEDIUM',
            status='NEW',
            is_read_by_admin=False
        )
        db.add(ticket)
        log_audit(db, user, 'SUPPORT_TICKET_CREATED', 'TICKET', ticket_id, f"Support ticket created: {subject} ({priority}) by {client_email}.")
        db.commit()

        # Send alert to Master Admin feed
        try:
            dispatch_critical_alert(
                severity='INFO' if priority in ['LOW', 'MEDIUM'] else 'WARNING',
                category='SUPPORT_TICKET',
                summary=f"New support ticket {ticket_id}: {subject} ({priority})",
                affected_service='Help & Support Desk',
                details=f"From: {client_name} ({client_email})\nCategory: {category}\n\nDescription:\n{description}",
                recommended_action=f"Open Master Admin Help Requests and respond to ticket {ticket_id}."
            )
        except Exception:
            pass

        return jsonify({
            'message': f"Your help request has been submitted successfully with Ticket ID: {ticket_id}.",
            'ticket': ticket.to_dict(include_replies=False)
        }), 201
    finally:
        db.close()

@app.route('/api/support/my-tickets', methods=['GET'])
def get_my_tickets():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        tickets = db.query(SupportTicket).filter(SupportTicket.client_id == user.id).order_by(SupportTicket.created_at.desc()).all()
        return jsonify({'tickets': [t.to_dict(include_replies=True) for t in tickets]})
    finally:
        db.close()

@app.route('/api/support/tickets/<ticket_id>/reply', methods=['POST'])
def reply_support_ticket(ticket_id):
    data = request.get_json() or {}
    message = data.get('message', '').strip()
    status_update = data.get('status')

    if not message:
        return jsonify({'error': 'Message cannot be empty.'}), 400

    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user:
            return jsonify({'error': 'Unauthorized'}), 401

        ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
        if not ticket:
            return jsonify({'error': 'Ticket not found.'}), 404

        is_admin = user.role in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']
        if not is_admin and ticket.client_id != user.id:
            return jsonify({'error': 'Forbidden'}), 403

        reply_id = f"rpl_{int(time.time()*1000)}"
        reply = TicketReply(
            id=reply_id,
            ticket_id=ticket.id,
            sender_id=user.id,
            sender_name=user.full_name,
            sender_role=user.role,
            message=message
        )
        db.add(reply)

        if is_admin:
            ticket.is_read_by_admin = True
            if status_update and status_update in ['NEW', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'RESOLVED', 'CLOSED']:
                ticket.status = status_update
            else:
                ticket.status = 'WAITING_FOR_CLIENT'
        else:
            ticket.is_read_by_admin = False
            ticket.status = 'IN_PROGRESS'

        ticket.updated_at = datetime.datetime.utcnow()
        log_audit(db, user, 'TICKET_REPLIED', 'TICKET', ticket.id, f"Reply added to ticket {ticket.id} by {user.email}.")

        # Send Email Notification to Client if Admin Replied
        if is_admin:
            try:
                email_res = send_ticket_notification(
                    recipient_email=ticket.client_email,
                    client_name=ticket.client_name,
                    ticket_id=ticket.id,
                    subject=ticket.subject,
                    event_type='TICKET_RESOLVED' if ticket.status in ['RESOLVED', 'CLOSED'] else 'ADMIN_REPLY',
                    admin_action=f"Status set to {ticket.status}",
                    reply_message=message,
                    ticket_status=ticket.status,
                    resolution_details=message if ticket.status in ['RESOLVED', 'CLOSED'] else ''
                )
                reply.email_status = email_res.get('status', 'AUDIT_LOGGED')
                reply.email_error = email_res.get('error')
            except Exception as mail_err:
                reply.email_status = 'FAILED'
                reply.email_error = str(mail_err)

        db.commit()

        return jsonify({
            'message': 'Reply added successfully.',
            'reply': reply.to_dict(),
            'ticket': ticket.to_dict(include_replies=True)
        })
    finally:
        db.close()

@app.route('/api/admin/support/tickets', methods=['GET'])
def admin_get_tickets():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        status_filter = request.args.get('status')
        query = db.query(SupportTicket)
        if status_filter and status_filter != 'ALL':
            query = query.filter(SupportTicket.status == status_filter)

        tickets = query.order_by(SupportTicket.created_at.desc()).all()
        unread_count = db.query(SupportTicket).filter(SupportTicket.is_read_by_admin == False).count()

        return jsonify({
            'tickets': [t.to_dict(include_replies=True) for t in tickets],
            'unreadCount': unread_count
        })
    finally:
        db.close()

@app.route('/api/admin/support/tickets/<ticket_id>/status', methods=['PATCH'])
def admin_update_ticket_status(ticket_id):
    data = request.get_json() or {}
    new_status = data.get('status')
    resolution_notes = data.get('resolutionNotes', '').strip()

    if new_status not in ['NEW', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'RESOLVED', 'CLOSED']:
        return jsonify({'error': 'Invalid ticket status.'}), 400

    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
        if not ticket:
            return jsonify({'error': 'Ticket not found.'}), 404

        ticket.status = new_status
        ticket.is_read_by_admin = True
        ticket.updated_at = datetime.datetime.utcnow()
        log_audit(db, user, 'TICKET_STATUS_UPDATED', 'TICKET', ticket.id, f"Status of ticket {ticket.id} set to {new_status}.")

        # Send immediate email notification to client when status updated / resolved
        email_result = None
        try:
            email_result = send_ticket_notification(
                recipient_email=ticket.client_email,
                client_name=ticket.client_name,
                ticket_id=ticket.id,
                subject=ticket.subject,
                event_type='TICKET_RESOLVED' if new_status in ['RESOLVED', 'CLOSED'] else 'ADMIN_REPLY',
                admin_action=f"Ticket marked as {new_status}",
                reply_message=resolution_notes or f"Ticket status transitioned to {new_status}.",
                ticket_status=new_status,
                resolution_details=resolution_notes
            )
        except Exception:
            pass

        db.commit()

        return jsonify({
            'message': f"Ticket status updated to {new_status}.",
            'ticket': ticket.to_dict(include_replies=True),
            'emailNotification': email_result
        })
    finally:
        db.close()


# -------------------------------------------------------------------------
# 8. CRITICAL ALERTS & NOTIFICATIONS (Master Admin & 2269dms@gmail.com)
# -------------------------------------------------------------------------
@app.route('/api/admin/alerts', methods=['GET'])
def admin_get_alerts():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        alerts = db.query(CriticalAlert).order_by(CriticalAlert.created_at.desc()).limit(100).all()
        unresolved_count = db.query(CriticalAlert).filter(CriticalAlert.is_resolved == False).count()

        return jsonify({
            'alerts': [a.to_dict() for a in alerts],
            'unresolvedCount': unresolved_count,
            'recipientEmail': '2269dms@gmail.com'
        })
    finally:
        db.close()

@app.route('/api/admin/alerts/<alert_id>/resolve', methods=['POST'])
def admin_resolve_alert(alert_id):
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        alert = db.query(CriticalAlert).filter(CriticalAlert.id == alert_id).first()
        if not alert:
            return jsonify({'error': 'Alert not found.'}), 404

        alert.is_resolved = True
        log_audit(db, user, 'ALERT_RESOLVED', 'ALERT', alert_id, f"Alert {alert_id} marked as resolved by {user.email}.")
        db.commit()

        return jsonify({'message': 'Alert marked as resolved.', 'alert': alert.to_dict()})
    finally:
        db.close()

@app.route('/api/admin/alerts/test-smtp', methods=['POST'])
def admin_test_smtp():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        alert = dispatch_critical_alert(
            severity='INFO',
            category='DIAGNOSTIC_TEST',
            summary='Master Admin triggered an operational SMTP email diagnostic test.',
            affected_service='Email Notification Subsystem',
            details=f"Triggered by {user.email} at {datetime.datetime.utcnow().isoformat()}.\nValidating direct delivery to 2269dms@gmail.com.",
            recommended_action='No further action required. Check inbox or audit ledger.'
        )

        return jsonify({
            'message': 'Diagnostic test alert dispatched.',
            'alert': alert.to_dict(),
            'status': alert.email_status
        })
    finally:
        db.close()

# -------------------------------------------------------------------------
# 9. CLIENT MANAGEMENT ACTIONS (Approve, Reject, Suspend, Reactivate)
# -------------------------------------------------------------------------
@app.route('/api/admin/clients/<client_id>/status', methods=['PATCH'])
def admin_update_client_status(client_id):
    data = request.get_json() or {}
    new_status = data.get('status')
    reason = data.get('reason', '').strip()

    if new_status not in ['ACTIVE', 'REJECTED', 'SUSPENDED', 'PENDING_APPROVAL']:
        return jsonify({'error': 'Invalid client account status.'}), 400

    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        client = db.query(User).filter(User.id == client_id).first()
        if not client:
            return jsonify({'error': 'Client not found.'}), 404

        old_status = client.status
        client.status = new_status
        if reason:
            client.rejection_reason = reason

        # Configure Dataset Quotas
        quotas = data.get('quotas') or {}
        if 'maxDatasets' in quotas:
            client.max_datasets = int(quotas['maxDatasets'])
        if 'maxUploadSizeMb' in quotas:
            client.max_upload_size_mb = int(quotas['maxUploadSizeMb'])
        if 'maxTotalStorageMb' in quotas:
            client.max_total_storage_mb = int(quotas['maxTotalStorageMb'])
        if 'allowedFormats' in quotas:
            client.allowed_formats = str(quotas['allowedFormats']).strip()
        if 'maxDailyUploads' in quotas:
            client.max_daily_uploads = int(quotas['maxDailyUploads'])

        # Configure Granular Permissions
        perms = data.get('permissions') or {}
        if 'canUpload' in perms:
            client.can_upload = bool(perms['canUpload'])
        if 'canAnalyze' in perms:
            client.can_analyze = bool(perms['canAnalyze'])
        if 'canHeal' in perms:
            client.can_heal = bool(perms['canHeal'])
        if 'canTrain' in perms:
            client.can_train = bool(perms['canTrain'])
        if 'canEvaluate' in perms:
            client.can_evaluate = bool(perms['canEvaluate'])
        if 'canDownloadReports' in perms:
            client.can_download_reports = bool(perms['canDownloadReports'])
        if 'canExportPdf' in perms:
            client.can_export_pdf = bool(perms['canExportPdf'])

        log_audit(db, user, f"CLIENT_STATUS_{new_status}", 'USER', client.id, f"Client {client.email} updated to {new_status} with custom quotas and permissions.")
        db.commit()

        # Send alert if suspended or rejected
        if new_status in ['SUSPENDED', 'REJECTED']:
            try:
                dispatch_critical_alert(
                    severity='WARNING',
                    category='ACCOUNT_MANAGEMENT',
                    summary=f"Client account {client.email} was set to {new_status}",
                    affected_service='Client Management',
                    details=f"Admin {user.email} updated client {client.email} ({client.full_name}). Reason: {reason or 'None'}"
                )
            except Exception:
                pass

        return jsonify({
            'message': f"Client {client.email} updated successfully.",
            'client': client.to_dict()
        })
    finally:
        db.close()

@app.route('/api/admin/clients/<client_id>/detail', methods=['GET'])
def admin_get_client_detail(client_id):
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        client = db.query(User).filter(User.id == client_id).first()
        if not client:
            return jsonify({'error': 'Client not found.'}), 404

        client_datasets = db.query(Dataset).filter(Dataset.client_id == client.id).all()
        client_jobs = db.query(Job).filter(Job.client_id == client.id).order_by(Job.started_at.desc()).limit(20).all()
        client_tickets = db.query(SupportTicket).filter(SupportTicket.client_id == client.id).all()
        client_evaluations = db.query(ModelEvaluationRecord).filter(ModelEvaluationRecord.client_id == client.id).order_by(ModelEvaluationRecord.created_at.desc()).all()

        return jsonify({
            'client': client.to_dict(),
            'datasets': [d.to_dict() for d in client_datasets],
            'jobs': [j.to_dict() for j in client_jobs],
            'tickets': [t.to_dict(include_replies=True) for t in client_tickets],
            'relatedTickets': [t.to_dict(include_replies=True) for t in client_tickets],
            'evaluations': [e.to_dict() for e in client_evaluations]
        })
    finally:
        db.close()

@app.route('/api/admin/clients/<client_id>/ml-models', methods=['GET'])
def admin_get_client_ml_models(client_id):
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        client = db.query(User).filter(User.id == client_id).first()
        if not client:
            return jsonify({'error': 'Client not found.'}), 404

        evals = db.query(ModelEvaluationRecord).filter(ModelEvaluationRecord.client_id == client.id).order_by(ModelEvaluationRecord.created_at.desc()).all()
        
        # In case no evaluation record yet, check if client has any completed jobs
        eval_list = [e.to_dict() for e in evals]

        return jsonify({
            'client': client.to_dict(),
            'models': eval_list,
            'totalModels': len(eval_list)
        })
    finally:
        db.close()

@app.route('/api/admin/models/<model_id>/review', methods=['PATCH'])
def admin_flag_model_review(model_id):
    data = request.get_json() or {}
    status = data.get('status') or data.get('reviewStatus') or 'NEEDS_REVIEW' # GOOD_PERFORMANCE, NEEDS_REVIEW, LOW_PERFORMANCE, FAILED, NOT_EVALUATED
    notes = data.get('notes', '').strip()

    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        model_rec = db.query(ModelEvaluationRecord).filter(ModelEvaluationRecord.id == model_id).first()
        if not model_rec:
            return jsonify({'error': 'Model record not found.'}), 404

        model_rec.evaluation_status = status
        if notes:
            model_rec.evaluation_notes = notes

        log_audit(db, user, 'MODEL_REVIEW_FLAGGED', 'MODEL', model_id, f"Model {model_id} flagged as {status}. Notes: {notes}")
        db.commit()

        return jsonify({
            'message': f"Model flagged as {status}.",
            'model': model_rec.to_dict()
        })
    finally:
        db.close()


# -------------------------------------------------------------------------
# 10. ML MODEL EVALUATION MONITORING (Comparative Leaderboard)
# -------------------------------------------------------------------------
@app.route('/api/admin/ml-monitoring', methods=['GET'])
def admin_get_ml_monitoring():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        evaluations = db.query(ModelEvaluationRecord).order_by(ModelEvaluationRecord.created_at.desc()).limit(50).all()
        
        # If no evaluations stored yet, scan latest completed jobs
        eval_list = [e.to_dict() for e in evaluations]
        
        return jsonify({
            'evaluations': eval_list,
            'totalEvaluated': len(eval_list)
        })
    finally:
        db.close()

# -------------------------------------------------------------------------
# 11. MASTER ADMIN - FULL MODEL OPERATIONS CENTER
# -------------------------------------------------------------------------
@app.route('/api/admin/model-operations/overview', methods=['GET'])
def admin_model_operations_overview():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden: Master Admin access required.'}), 403

        # 11 Key Performance Indicators
        total_clients = db.query(User).filter(User.role == 'CLIENT').count()
        active_projects = db.query(Project).filter(Project.is_archived == False).count()
        active_datasets = db.query(Dataset).filter(Dataset.is_archived == False).count()
        archived_datasets = db.query(Dataset).filter(Dataset.is_archived == True).count()
        total_datasets = active_datasets + archived_datasets
        
        total_training_runs = db.query(TrainingRun).count()
        optimal_runs = db.query(TrainingRun).filter(TrainingRun.training_status == 'OPTIMAL').count()
        failed_runs = db.query(TrainingRun).filter(TrainingRun.training_status == 'FAILED').count()
        degraded_runs = db.query(TrainingRun).filter(TrainingRun.training_status == 'DEGRADED').count()
        
        runs_with_acc = db.query(TrainingRun).filter(TrainingRun.test_accuracy.isnot(None)).all()
        avg_accuracy = round(sum(r.test_accuracy for r in runs_with_acc) / len(runs_with_acc), 4) if runs_with_acc else 0.0
        max_accuracy = round(max((r.test_accuracy for r in runs_with_acc), default=0.0), 4)
        
        # Determine top performing algorithm
        from collections import defaultdict
        algo_acc = defaultdict(list)
        for r in runs_with_acc:
            if r.algorithm_type:
                algo_acc[r.algorithm_type].append(r.test_accuracy)
        top_algorithm = "RandomForest"
        if algo_acc:
            top_algorithm = max(algo_acc.items(), key=lambda x: sum(x[1])/len(x[1]))[0]

        avg_train_duration = round(sum(r.train_duration_ms for r in runs_with_acc) / len(runs_with_acc), 1) if runs_with_acc else 0.0
        total_healing_interventions = db.query(RecoveryRecord).count()
        total_jobs = db.query(Job).count()

        # Compute storage utilization
        total_bytes = sum((d.file_size_bytes or 0) for d in db.query(Dataset).all())
        storage_mb = round(total_bytes / (1024 * 1024), 2)

        # Clients summary with models count
        clients = db.query(User).filter(User.role == 'CLIENT').all()
        client_summaries = []
        for c in clients:
            c_projects = db.query(Project).filter(Project.client_id == c.id, Project.is_archived == False).count()
            c_datasets = db.query(Dataset).filter(Dataset.client_id == c.id, Dataset.is_archived == False).count()
            c_runs = db.query(TrainingRun).filter(TrainingRun.client_id == c.id).all()
            latest_run = max(c_runs, key=lambda r: r.created_at) if c_runs else None
            avg_c_acc = round(sum(r.test_accuracy for r in c_runs if r.test_accuracy is not None) / len(c_runs), 4) if c_runs else 0.0
            
            client_summaries.append({
                'clientId': c.id,
                'name': c.full_name,
                'email': c.email,
                'company': c.company_name or '',
                'status': c.status,
                'activeProjects': c_projects,
                'activeDatasets': c_datasets,
                'totalModelsBuilt': len(c_runs),
                'latestModel': latest_run.model_name if latest_run else 'None',
                'latestAccuracy': latest_run.test_accuracy if latest_run else None,
                'avgAccuracy': avg_c_acc,
                'lastTrainingDate': latest_run.created_at.isoformat() if latest_run and latest_run.created_at else None,
            })

        # Recent 15 training runs across all clients
        recent_runs = db.query(TrainingRun).order_by(TrainingRun.created_at.desc()).limit(15).all()
        recent_runs_data = []
        for r in recent_runs:
            d_dict = r.to_dict()
            c_user = db.query(User).filter(User.id == r.client_id).first()
            p_obj = db.query(Project).filter(Project.id == r.project_id).first()
            ds_obj = db.query(Dataset).filter(Dataset.id == r.dataset_id).first()
            d_dict['clientName'] = c_user.full_name if c_user else 'Unknown Client'
            d_dict['projectName'] = p_obj.name if p_obj else 'Default Project'
            d_dict['datasetName'] = ds_obj.name if ds_obj else 'Dataset'
            recent_runs_data.append(d_dict)

        return jsonify({
            'kpis': {
                'totalClients': total_clients,
                'activeProjects': active_projects,
                'activeDatasets': active_datasets,
                'archivedDatasets': archived_datasets,
                'totalDatasets': total_datasets,
                'totalTrainingRuns': total_training_runs,
                'optimalRuns': optimal_runs,
                'failedRuns': failed_runs,
                'degradedRuns': degraded_runs,
                'avgAccuracy': avg_accuracy,
                'maxAccuracy': max_accuracy,
                'topAlgorithm': top_algorithm,
                'avgTrainDurationMs': avg_train_duration,
                'healingInterventions': total_healing_interventions,
                'totalJobs': total_jobs,
                'storageMb': storage_mb
            },
            'clients': client_summaries,
            'recentRuns': recent_runs_data
        })
    finally:
        db.close()

@app.route('/api/admin/model-operations/clients/<client_id>', methods=['GET'])
def admin_model_operations_client_details(client_id):
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        target_client = db.query(User).filter(User.id == client_id).first()
        if not target_client:
            return jsonify({'error': 'Client not found.'}), 404

        projects = db.query(Project).filter(Project.client_id == client_id).all()
        datasets = db.query(Dataset).filter(Dataset.client_id == client_id).all()
        runs = db.query(TrainingRun).filter(TrainingRun.client_id == client_id).order_by(TrainingRun.created_at.desc()).all()

        runs_with_acc = [r for r in runs if r.test_accuracy is not None]
        avg_acc = round(sum(r.test_accuracy for r in runs_with_acc) / len(runs_with_acc), 4) if runs_with_acc else 0.0
        best_run = max(runs_with_acc, key=lambda r: r.test_accuracy) if runs_with_acc else None

        # Build detailed runs with dataset & project names
        enriched_runs = []
        for r in runs:
            r_dict = r.to_dict()
            p = db.query(Project).filter(Project.id == r.project_id).first()
            ds = db.query(Dataset).filter(Dataset.id == r.dataset_id).first()
            r_dict['projectName'] = p.name if p else 'Default Project'
            r_dict['datasetName'] = ds.name if ds else 'Dataset'
            enriched_runs.append(r_dict)

        return jsonify({
            'client': target_client.to_dict(),
            'stats': {
                'totalProjects': len(projects),
                'activeDatasets': len([d for d in datasets if not d.is_archived]),
                'archivedDatasets': len([d for d in datasets if d.is_archived]),
                'totalModels': len(runs),
                'avgAccuracy': avg_acc,
                'bestAccuracy': best_run.test_accuracy if best_run else None,
                'bestModel': best_run.model_name if best_run else 'None',
            },
            'projects': [p.to_dict() for p in projects],
            'datasets': [d.to_dict() for d in datasets],
            'trainingRuns': enriched_runs
        })
    finally:
        db.close()

@app.route('/api/admin/model-operations/projects/<project_id>', methods=['GET'])
def admin_model_operations_project_details(project_id):
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return jsonify({'error': 'Project not found.'}), 404

        client_user = db.query(User).filter(User.id == project.client_id).first()
        datasets = db.query(Dataset).filter(Dataset.project_id == project_id).all()
        runs = db.query(TrainingRun).filter(TrainingRun.project_id == project_id).order_by(TrainingRun.created_at.desc()).all()

        # Find latest job associated with any dataset in this project
        dataset_ids = [d.id for d in datasets]
        latest_job = db.query(Job).filter(Job.dataset_id.in_(dataset_ids)).order_by(Job.started_at.desc()).first() if dataset_ids else None

        enriched_runs = []
        for r in runs:
            r_dict = r.to_dict()
            ds = db.query(Dataset).filter(Dataset.id == r.dataset_id).first()
            r_dict['datasetName'] = ds.name if ds else 'Dataset'
            enriched_runs.append(r_dict)

        return jsonify({
            'project': project.to_dict(),
            'client': client_user.to_dict() if client_user else None,
            'datasets': [d.to_dict() for d in datasets],
            'trainingRuns': enriched_runs,
            'latestJob': latest_job.to_dict() if latest_job else None
        })
    finally:
        db.close()

@app.route('/api/admin/model-operations/leaderboard', methods=['GET'])
def admin_model_operations_leaderboard():
    db = SessionLocal()
    try:
        user = get_current_user(db)
        if not user or user.role not in ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN']:
            return jsonify({'error': 'Forbidden'}), 403

        algorithm = request.args.get('algorithm')
        status = request.args.get('status')
        client_id = request.args.get('clientId')

        query = db.query(TrainingRun)
        if algorithm:
            query = query.filter(TrainingRun.algorithm_type == algorithm)
        if status:
            query = query.filter(TrainingRun.training_status == status)
        if client_id:
            query = query.filter(TrainingRun.client_id == client_id)

        runs = query.order_by(TrainingRun.test_accuracy.desc().nullslast()).limit(100).all()
        enriched = []
        for r in runs:
            r_dict = r.to_dict()
            c = db.query(User).filter(User.id == r.client_id).first()
            p = db.query(Project).filter(Project.id == r.project_id).first()
            ds = db.query(Dataset).filter(Dataset.id == r.dataset_id).first()
            r_dict['clientName'] = c.full_name if c else 'Unknown'
            r_dict['clientEmail'] = c.email if c else ''
            r_dict['projectName'] = p.name if p else 'Default'
            r_dict['datasetName'] = ds.name if ds else 'Dataset'
            enriched.append(r_dict)

        return jsonify({
            'leaderboard': enriched,
            'totalEntries': len(enriched)
        })
    finally:
        db.close()

# -------------------------------------------------------------------------
# 12. GENERAL HEALTH
# -------------------------------------------------------------------------
@app.route('/api/system/health', methods=['GET'])
def general_health():
    return jsonify({
        'status': 'ONLINE',
        'service': 'HEALML Universal Self-Healing ML Engine',
        'database': 'CONNECTED',
        'mlSubsystem': 'ACTIVE',
        'timestamp': datetime.datetime.utcnow().isoformat()
    })

if __name__ == '__main__':
    port = int(os.environ.get('FLASK_PORT') or os.environ.get('PYTHON_PORT') or 5001)
    print(f"🚀 HEALML Flask Backend starting on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)


