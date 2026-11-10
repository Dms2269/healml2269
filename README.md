# HEALML – Universal Self-Healing Machine Learning Platform

HEALML is a production-grade, enterprise MLOps platform engineered to diagnose data corruptions, execute automated statistical healing, and train resilient machine learning models with rigorous holdout test validation and verifiable recovery logging.

---

## 🚀 Key Features

### 1. Enterprise Architecture & Public Landing Page
- **Secure Public Entry Point:** Pre-login experience showcases the platform value proposition, interactive architecture cards, and public contact desk without exposing sensitive client data, internal models, or pipeline metrics.
- **Role-Based Access Control (RBAC):** Strict separation between **Standard Clients** and **Master Administrators**.
- **Pending Registration Gatekeeping:** New client registrations require approval from the Master Administrator before platform access is granted.

### 2. Client Self-Healing Workstation
- **Universal Tabular Dataset Ingestion:** Ingest CSV, TSV, and Excel files with automated schema inference (numerical, categorical, datetime, identifier, and target features).
- **Multi-Method Anomaly Detection:**
  - Dynamic IQR (Interquartile Range) boundary scanning.
  - Z-Score standardization (|z| > 3.0).
  - Unsupervised Isolation Forest outlier scoring with calibrated contamination.
  - Categorical inconsistency and high-cardinality detection.
  - Target/feature data leakage auditing.
- **Autonomous Verified Healing:**
  - KNN and iterative median/mode imputation.
  - Capped winsorization preserving data integrity.
  - One-Hot and frequency encoding for categorical stability.
  - Dual dataset storage (unaltered raw vs. certified repaired).
- **Client Help Desk:** Built-in support ticket management with conversation threads and live status updates.

### 3. Master Admin Control Portal
- **12 Dedicated Modules:**
  1. **Executive Overview:** Real-time platform KPI telemetry.
  2. **Client Management:** Manage user profiles, active sessions, and permissions.
  3. **Pending Registrations:** Approve or reject registrations with feedback.
  4. **Help Desk & Ticketing:** Live queue with real-time polling (every 6 seconds), audio chime alerts, and threaded responses.
  5. **ML Model Monitoring:** Multi-model comparative leaderboard evaluating true 80/20 holdout test performance, confusion matrices, and ROC curves across Random Forest, Gradient Boosting, Ridge/Logistic Regression, and Baseline heuristics.
  6. **Dataset Repository:** Centralized oversight of uploaded datasets and versioned repairs.
  7. **System Health:** CPU, memory, SQLite database metrics, and subsystem process monitoring.
  8. **Critical Alerts Ledger:** Alert dispatch to `2269dms@gmail.com` with automatic fallback to persistent database logging.
  9. **Certified Reports:** Audit-ready compliance summaries.
  10. **Email Notifications:** Live SMTP delivery diagnostics and test triggers.
  11. **Audit Logs:** Immutable chronological ledger of all platform events.
  12. **Settings & Maintenance:** Database backups, recovery restores, and system parameters.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas-based interactive charts.
- **Proxy Server:** Node.js Express (`server.ts`) proxying API traffic to Flask while serving the compiled Vite application.
- **ML Subsystem:** Python 3, Flask, Scikit-Learn, Pandas, NumPy, ReportLab (PDF reporting).
- **Database:** SQLite with SQLAlchemy ORM (`backend/data/healml.db`).
- **Alert Dispatch:** Python TLS SMTP client with automatic database audit logging fallback.

---

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python 3.9+ with `pip`

### Step 1: Install Dependencies
```bash
# Install Node dependencies
npm install

# Install Python ML dependencies
pip3 install -r backend/requirements.txt
```

### Step 2: Environment Configuration
Copy `.env.example` to `.env` and configure your settings:
```bash
cp .env.example .env
```

Key environment variables:
- `PORT=3000` (Web server port)
- `MASTER_ADMIN_ALERT_EMAIL=2269dms@gmail.com` (Critical alert recipient)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (Optional: SMTP credentials for outbound email)

### Step 3: Run the Application
```bash
npm run dev
# Or start the unified server
npm start
```
The server will bind to `http://0.0.0.0:3000` and automatically spawn the Python Flask ML backend on port `5001`.

---

## 🛡️ Default Master Admin Credentials

When the database is initialized, a default Master Admin account is created if one does not already exist:
- **Email:** `mahadevshinde2269@gmail.com`
- **Password:** `Admin@HealML2026`
- **Role:** `ADMIN` (Status: `ACTIVE`)

---

## 🧪 Comprehensive Verification Checklist

1. **Public Landing Page:** Confirmed no model metrics, dataset rows, or internal statistics are visible prior to signing in.
2. **Registration Approval Flow:** Registering a new account flags it as `PENDING_APPROVAL`, blocks login until approved, and alerts the Master Admin.
3. **Master Admin Workbench:** Live polling audio alerts trigger on incoming tickets and pending accounts.
4. **Holdout ML Evaluation:** Verification ensures that reported model accuracy uses strict 80/20 holdout test sets and 5-fold cross-validation.
5. **Critical Alert Dispatch:** System failure logs and manual tests are sent to `2269dms@gmail.com` or captured in the audit ledger if SMTP is unconfigured.
