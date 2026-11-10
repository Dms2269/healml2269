/**
 * HEALML – Public Landing Page
 * Rendered strictly for unauthenticated visitors.
 * Features clean enterprise SaaS design, interactive healing explainer,
 * core platform benefits, and support inquiry without exposing any model or client data.
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Database,
  Sparkles,
  CheckCircle2,
  Lock,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Mail,
  Send,
  Layers,
  Activity,
  Check,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface LandingPageViewProps {
  onOpenSignIn: () => void;
  onOpenRegister: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onOpenSignIn,
  onOpenRegister,
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryCategory, setInquiryCategory] = useState('General');
  const [inquirySubject, setInquirySubject] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquirySent, setInquirySent] = useState(false);
  const [generatedTicketId, setGeneratedTicketId] = useState<string | null>(null);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [inquiryError, setInquiryError] = useState<string | null>(null);

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryEmail.trim() || !inquiryMessage.trim()) return;
    setInquiryLoading(true);
    setInquiryError(null);

    try {
      const subject = inquirySubject.trim() || `Inquiry from ${inquiryName || inquiryEmail}`;
      const res = await apiClient.createSupportTicket({
        category: inquiryCategory,
        subject,
        description: inquiryMessage,
        name: inquiryName,
        email: inquiryEmail,
        priority: 'MEDIUM',
      });
      setGeneratedTicketId(res.ticket.id);
      setInquirySent(true);
    } catch (err: any) {
      setInquiryError(err.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setInquiryLoading(false);
    }
  };

  const steps = [
    {
      id: 1,
      title: '01. All-Column Ingestion & Diagnostic Scanning',
      summary: 'Upload any valid CSV or Excel workbook. The platform automatically scans every column for missingness spikes, extreme statistical outliers, categorical drift, and invalid types.',
      details: [
        'Multi-signal anomaly fusion (IQR Tukey fences combined with Z-score boundaries)',
        'Automatic data type inference (numeric, categorical, datetime, identifier)',
        'Zero schema assumptions — works automatically with any tabular domain'
      ]
    },
    {
      id: 2,
      title: '02. Context-Aware Autonomous Self-Healing',
      summary: 'When data quality issues are detected, the autonomous engine applies mathematically verified healing operations on a separate working copy, preserving original raw data.',
      details: [
        'Skewness-calibrated imputation (median for skewed distributions, mean for normal)',
        'Robust statistical boundary Winsorization to suppress extreme sensor noise',
        'Automatic deduplication and categorical label normalization'
      ]
    },
    {
      id: 3,
      title: '03. Mandatory Verification & Repaired Export',
      summary: 'A second verification scan verifies that data quality improved and no synthetic distortions were introduced. Verified datasets can be immediately exported in CSV or Excel format.',
      details: [
        'Strict 3-status verification: Verified Success, Manual Review, or Rollback',
        'Version-controlled dataset snapshot creation with rollback guarantee',
        'Generation of a certified, technical-only audit report'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans selection:bg-blue-600/30">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          {/* Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">HEALML</span>
              <span className="hidden sm:inline-block text-xs text-slate-400 ml-2 font-mono">
                Enterprise Platform
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-400">
            <a href="#overview" className="hover:text-white transition-colors">Overview</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How Healing Works</a>
            <a href="#benefits" className="hover:text-white transition-colors">Platform Benefits</a>
            <a href="#contact" className="hover:text-white transition-colors">Help & Contact</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenSignIn}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors border border-slate-700/80"
            >
              Sign In
            </button>
            <button
              onClick={onOpenRegister}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* HERO SECTION */}
        <section id="overview" className="relative pt-20 pb-16 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))]" />
          
          <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Universal Self-Healing Machine Learning Platform</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Autonomous Data Quality Diagnosis & Verified Dataset Recovery
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              HEALML inspects all columns in any user-uploaded CSV or Excel dataset, automatically diagnoses missingness, statistical drift, and corruptions, and performs verified self-healing repairs without requiring manual ML configuration.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onOpenSignIn}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
              >
                <span>Launch Client Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenRegister}
                className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Register Client Account</span>
              </button>
            </div>

            {/* Trust Metrics Bar */}
            <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-slate-800/80 text-left">
              <div className="p-3">
                <div className="text-xs text-slate-400">Dataset Formats</div>
                <div className="text-sm font-bold text-white font-mono mt-0.5">CSV · XLSX · XLS</div>
              </div>
              <div className="p-3">
                <div className="text-xs text-slate-400">Quality Framework</div>
                <div className="text-sm font-bold text-white font-mono mt-0.5">5-Dimension ISO</div>
              </div>
              <div className="p-3">
                <div className="text-xs text-slate-400">Data Preservation</div>
                <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">100% Raw Snapshot</div>
              </div>
              <div className="p-3">
                <div className="text-xs text-slate-400">Recovery Verification</div>
                <div className="text-sm font-bold text-blue-400 font-mono mt-0.5">2-Pass Validation</div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW DATASET HEALING WORKS (Interactive Step Showcase) */}
        <section id="how-it-works" className="py-16 px-6 bg-[#0F172A]/50 border-y border-slate-800">
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                How Autonomous Dataset Self-Healing Works
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                HEALML abstracts complex algorithmic plumbing. Clients see verified outcomes instead of manual hyperparameters.
              </p>
            </div>

            {/* Interactive Step Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {steps.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveStep(s.id)}
                  className={`p-4 rounded-xl text-left transition-all border ${
                    activeStep === s.id
                      ? 'bg-blue-600/15 border-blue-500/40 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-mono font-bold ${activeStep === s.id ? 'text-blue-400' : 'text-slate-400'}`}>
                      Stage 0{s.id}
                    </span>
                    {activeStep === s.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <div className="text-sm font-semibold text-white">{s.title.split('. ')[1]}</div>
                </button>
              ))}
            </div>

            {/* Active Step Explainer Card */}
            <div className="p-6 rounded-2xl bg-[#0F172A] border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-blue-400 uppercase tracking-wider">
                <Layers className="w-4 h-4" />
                <span>Operational Phase</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                {steps[activeStep - 1].title}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {steps[activeStep - 1].summary}
              </p>

              <div className="pt-2 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3">
                {steps[activeStep - 1].details.map((detail, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PLATFORM BENEFITS GRID */}
        <section id="benefits" className="py-16 px-6">
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Enterprise Data Quality Without Machine Learning Complexity
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                Purpose-built for business analysts, operations managers, and research teams who need clean tabular data.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-6 rounded-xl bg-[#0F172A] border border-slate-800 space-y-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">100% Raw Data Preservation</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your uploaded datasets are never overwritten. HEALML creates a version-controlled working copy, records all transformations in an immutable audit ledger, and enables one-click rollback at any time.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-[#0F172A] border border-slate-800 space-y-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Universal All-Column Scanning</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every eligible column is evaluated regardless of dataset domain. Detects null values, sensor drift, categorical anomalies, and duplicate records across healthcare, financial, housing, and IoT datasets.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-[#0F172A] border border-slate-800 space-y-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Dual-Format Repaired Exports</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Export healed data immediately in standard CSV or Microsoft Excel (XLSX) format. Review before-and-after change summaries detailing exact record modifications.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-[#0F172A] border border-slate-800 space-y-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Certified Technical PDF Reports</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generates comprehensive, technical-only PDF recovery reports containing ISO composite scores, root cause analysis, and post-repair verification certificates without personal or extraneous branding.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* HELP & CONTACT SECTION */}
        <section id="contact" className="py-16 px-6 bg-[#0F172A]/40 border-t border-slate-800">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>Support & Assistance</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Questions or Technical Inquiries?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
                Need assistance with custom dataset formats, organizational role configuration, or account approvals? Send our operations team an inquiry below.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0F172A] border border-slate-800 max-w-xl mx-auto">
              {inquirySent ? (
                <div className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-white">Support Ticket Created</h4>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-blue-400">
                    Ticket Reference: <strong className="text-white">{generatedTicketId}</strong>
                  </div>
                  <p className="text-xs text-slate-300">
                    Your request has been routed to the Master Admin alert feed. A specialist will follow up at <span className="text-white font-mono">{inquiryEmail}</span>.
                  </p>
                  <button
                    onClick={() => {
                      setInquirySent(false);
                      setInquirySubject('');
                      setInquiryMessage('');
                      setGeneratedTicketId(null);
                    }}
                    className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    Submit another inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendInquiry} className="space-y-4 text-xs">
                  {inquiryError && (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded text-rose-300 text-xs">
                      {inquiryError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Your Name</label>
                      <input
                        type="text"
                        required
                        value={inquiryName}
                        onChange={(e) => setInquiryName(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Corporate Email</label>
                      <input
                        type="email"
                        required
                        value={inquiryEmail}
                        onChange={(e) => setInquiryEmail(e.target.value)}
                        placeholder="jane@organization.com"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Inquiry Category</label>
                      <select
                        value={inquiryCategory}
                        onChange={(e) => setInquiryCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-sans"
                      >
                        <option value="General">General Inquiry</option>
                        <option value="Data Faults">Dataset Fault Diagnosis</option>
                        <option value="Self-Healing">Self-Healing Pipelines</option>
                        <option value="Account">Account Approval</option>
                        <option value="Enterprise">Enterprise License</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Subject</label>
                      <input
                        type="text"
                        required
                        value={inquirySubject}
                        onChange={(e) => setInquirySubject(e.target.value)}
                        placeholder="e.g. Ingestion question for sensor data"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Message / Support Details</label>
                    <textarea
                      required
                      rows={3}
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                      placeholder="Describe your dataset requirements or organizational query..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={inquiryLoading}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{inquiryLoading ? 'Submitting Ticket...' : 'Send Support Request'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="py-8 px-6 border-t border-slate-800 text-xs text-slate-500 bg-[#0B1120]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-bold text-slate-200">HEALML</span>
            <span>·</span>
            <span>Universal Self-Healing Machine Learning Platform</span>
          </div>

          <div className="flex items-center gap-6 text-slate-400 text-[11px]">
            <span>Privacy Guaranteed</span>
            <span>·</span>
            <span>ISO 5-Dimension Quality</span>
            <span>·</span>
            <span>SQLite Audit Ledger</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
