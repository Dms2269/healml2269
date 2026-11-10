"""
HEALML - Enterprise Authentication & Role-Based Access Control (RBAC)
Features:
- Cryptographically secure PBKDF2-SHA256 password hashing with salt
- Token generation & expiring session management
- Account status checks (PENDING_APPROVAL, ACTIVE, REJECTED, SUSPENDED)
- Password strength validation
- Super Admin bootstrap seeding
"""

import os
import re
import hmac
import hashlib
import secrets
import datetime
from typing import Tuple, Optional, Dict, Any

from backend.models import SessionLocal, User, AuditLog, Project, Dataset

SECRET_KEY = os.environ.get('HEALML_SECRET_KEY', 'healml-enterprise-prod-secret-key-9938472910')

def hash_password(password: str) -> str:
    """Hashes password using PBKDF2-HMAC-SHA256 with a random 16-byte salt (100,000 iterations)."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}:{key.hex()}"

def verify_password(stored_hash: str, password_attempt: str) -> bool:
    """Verifies a password attempt against stored PBKDF2 hash using constant-time comparison."""
    try:
        salt, key_hex = stored_hash.split(':')
        key_attempt = hashlib.pbkdf2_hmac('sha256', password_attempt.encode('utf-8'), salt.encode('utf-8'), 100000)
        return hmac.compare_digest(key_hex, key_attempt.hex())
    except Exception:
        return False

def validate_password_strength(password: str) -> Tuple[bool, str]:
    """Ensures enterprise password hygiene."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number."
    return True, "Password meets strength policy."

def generate_session_token(user_id: str, role: str) -> str:
    """Generates a secure HMAC-signed session token containing expiry timestamp."""
    expiry = int(datetime.datetime.utcnow().timestamp()) + 86400 # 24 hours
    payload = f"{user_id}:{role}:{expiry}"
    signature = hmac.new(SECRET_KEY.encode('utf-8'), payload.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{payload}:{signature}"

def verify_session_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifies HMAC signature and expiration of session token."""
    try:
        parts = token.split(':')
        if len(parts) != 4:
            return None
        user_id, role, expiry_str, signature = parts
        expiry = int(expiry_str)

        # Check expiration
        if datetime.datetime.utcnow().timestamp() > expiry:
            return None

        expected_payload = f"{user_id}:{role}:{expiry_str}"
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), expected_payload.encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None

        return {'userId': user_id, 'role': role, 'expiry': expiry}
    except Exception:
        return None

def bootstrap_initial_admin():
    """Initializes primary MASTER_ADMIN and 3 separate test clients with 6 datasets."""
    db = SessionLocal()
    try:
        now = datetime.datetime.utcnow()

        # 1. Master Admin (mahadevshinde2269@gmail.com and admin@healml.com)
        master_email = 'mahadevshinde2269@gmail.com'
        master_pass = 'Admin@HealML2026'
        existing_master = db.query(User).filter((User.email == master_email) | (User.id == 'ADMIN-MASTER-001')).first()
        if not existing_master:
            master_admin = User(
                id='ADMIN-MASTER-001',
                email=master_email,
                password_hash=hash_password(master_pass),
                full_name='Master Administrator',
                company_name='HEALML HQ',
                phone_number='+1 (555) 019-2831',
                role='MASTER_ADMIN',
                status='ACTIVE',
                email_verified=True,
                created_at=now
            )
            db.add(master_admin)
            print(f"[AUTH BOOTSTRAP] Created primary Master Admin: {master_email} (ID: ADMIN-MASTER-001)")
        else:
            existing_master.id = 'ADMIN-MASTER-001'
            existing_master.role = 'MASTER_ADMIN'
            existing_master.status = 'ACTIVE'
            existing_master.password_hash = hash_password(master_pass)

        # Also support admin@healml.com alias
        admin_alias = db.query(User).filter(User.email == 'admin@healml.com').first()
        if not admin_alias:
            db.add(User(
                id='ADMIN-MASTER-002',
                email='admin@healml.com',
                password_hash=hash_password(master_pass),
                full_name='System Administrator',
                company_name='HEALML Operations',
                role='MASTER_ADMIN',
                status='ACTIVE',
                email_verified=True,
                created_at=now
            ))

        # 2. Three Dedicated Test Clients & Projects & Datasets
        test_clients_config = [
            {
                'clientId': 'CL-TEST-001',
                'email': 'client1@healml.com',
                'password': 'Client1@HealML2026',
                'fullName': 'Alpha Robotics & Automation',
                'company': 'Alpha Robotics Corp',
                'projectId': 'prj_cl_test_001',
                'projectName': 'Machine A Reliability & Vibration Monitoring',
                'projectDesc': 'Predictive maintenance for multi-axis industrial articulated arms.',
                'datasets': [
                    {
                        'id': 'ds_cl1_vibration_telemetry',
                        'name': 'Bearing Vibration Telemetry (Machine A)',
                        'filename': 'machine_a_bearing_vibration.csv',
                        'targetCol': 'failure_flag',
                        'rows': 400,
                        'cols': 9,
                        'qualityScore': 94.5,
                    },
                    {
                        'id': 'ds_cl1_hydraulic_pressure',
                        'name': 'Hydraulic Pressure & Fluid Dynamics (Machine A)',
                        'filename': 'machine_a_hydraulic_telemetry.csv',
                        'targetCol': 'pressure_bar',
                        'rows': 350,
                        'cols': 8,
                        'qualityScore': 92.8,
                    }
                ]
            },
            {
                'clientId': 'CL-TEST-002',
                'email': 'client2@healml.com',
                'password': 'Client2@HealML2026',
                'fullName': 'Beta Thermal Power Generation',
                'company': 'Beta Energy Systems',
                'projectId': 'prj_cl_test_002',
                'projectName': 'Turbine B Exhaust & Thermal Prediction',
                'projectDesc': 'Gas turbine exhaust temperature profiling and flame detection.',
                'datasets': [
                    {
                        'id': 'ds_cl2_steam_temperature',
                        'name': 'Turbine Thermal Exhaust Profile (Turbine B)',
                        'filename': 'turbine_b_exhaust_thermal.csv',
                        'targetCol': 'temperature_c',
                        'rows': 520,
                        'cols': 9,
                        'qualityScore': 95.1,
                    },
                    {
                        'id': 'ds_cl2_rpm_frequency',
                        'name': 'Rotational Velocity & Harmonic Resonance (Turbine B)',
                        'filename': 'turbine_b_rpm_resonance.csv',
                        'targetCol': 'rpm',
                        'rows': 480,
                        'cols': 7,
                        'qualityScore': 93.4,
                    }
                ]
            },
            {
                'clientId': 'CL-TEST-003',
                'email': 'client3@healml.com',
                'password': 'Client3@HealML2026',
                'fullName': 'Gamma Semiconductor Fab',
                'company': 'Gamma Nano-Circuits Ltd',
                'projectId': 'prj_cl_test_003',
                'projectName': 'Fab C Cleanroom & Power Telemetry',
                'projectDesc': 'Cleanroom air particulate density and lithography power quality.',
                'datasets': [
                    {
                        'id': 'ds_cl3_cleanroom_particulates',
                        'name': 'Cleanroom Atmospheric Sensors (Fab C)',
                        'filename': 'fab_c_cleanroom_atmospheric.csv',
                        'targetCol': 'failure_flag',
                        'rows': 600,
                        'cols': 8,
                        'qualityScore': 96.8,
                    },
                    {
                        'id': 'ds_cl3_voltage_fluctuations',
                        'name': 'Lithography Power Grid & Fluctuations (Fab C)',
                        'filename': 'fab_c_power_grid_telemetry.csv',
                        'targetCol': 'vibration_mm_s',
                        'rows': 420,
                        'cols': 7,
                        'qualityScore': 91.2,
                    }
                ]
            }
        ]

        for tc in test_clients_config:
            # Seed client user
            client_user = db.query(User).filter((User.id == tc['clientId']) | (User.email == tc['email'])).first()
            if not client_user:
                client_user = User(
                    id=tc['clientId'],
                    email=tc['email'],
                    password_hash=hash_password(tc['password']),
                    full_name=tc['fullName'],
                    company_name=tc['company'],
                    role='CLIENT',
                    status='ACTIVE',
                    email_verified=True,
                    can_upload=True,
                    can_analyze=True,
                    can_heal=True,
                    can_train=True,
                    can_evaluate=True,
                    can_download_reports=True,
                    can_export_pdf=True,
                    max_datasets=10,
                    created_at=now
                )
                db.add(client_user)
                db.flush()
                print(f"[AUTH BOOTSTRAP] Created Test Client {tc['clientId']}: {tc['email']}")
            else:
                client_user.id = tc['clientId']
                client_user.role = 'CLIENT'
                client_user.status = 'ACTIVE'
                client_user.password_hash = hash_password(tc['password'])

            # Seed project
            prj = db.query(Project).filter(Project.id == tc['projectId']).first()
            if not prj:
                prj = Project(
                    id=tc['projectId'],
                    client_id=tc['clientId'],
                    name=tc['projectName'],
                    description=tc['projectDesc'],
                    is_archived=False,
                    created_at=now
                )
                db.add(prj)
                db.flush()

            # Seed datasets
            for ds_info in tc['datasets']:
                existing_ds = db.query(Dataset).filter(Dataset.id == ds_info['id']).first()
                if not existing_ds:
                    ds = Dataset(
                        id=ds_info['id'],
                        client_id=tc['clientId'],
                        project_id=tc['projectId'],
                        name=ds_info['name'],
                        filename=ds_info['filename'],
                        original_filename=ds_info['filename'],
                        filepath=f"uploads/{ds_info['filename']}",
                        file_size_bytes=1024 * 1024,
                        row_count=ds_info['rows'],
                        col_count=ds_info['cols'],
                        target_col=ds_info['targetCol'],
                        quality_score=ds_info['qualityScore'],
                        is_archived=False,
                        created_at=now
                    )
                    db.add(ds)

        db.commit()
        print("[AUTH BOOTSTRAP] All 3 Test Clients and 6 Test Datasets seeded successfully.")
    except Exception as e:
        db.rollback()
        print(f"[AUTH BOOTSTRAP ERROR]: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    bootstrap_initial_admin()
