/**
 * HEALML - Project Exporter & Running Guides View
 * Code explorer for Python/Flask/SQLite codebase,
 * 1-Click ZIP Downloader, and step-by-step setup guides for Windows and Android Termux.
 */

import React, { useState } from 'react';
import {
  FileCode2,
  Download,
  Copy,
  Check,
  Terminal,
  Smartphone,
  Laptop,
  GraduationCap,
  FolderArchive,
  BookOpen,
} from 'lucide-react';
import { getProjectCodeFiles, downloadProjectZip, CodeFile } from '../services/projectExporter';

export const ProjectExporterView: React.FC = () => {
  const codeFiles = getProjectCodeFiles();
  const [selectedFile, setSelectedFile] = useState<CodeFile>(codeFiles[0]);
  const [copied, setCopied] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'windows' | 'termux' | 'viva'>('windows');
  const [isZipping, setIsZipping] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadProjectZip();
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & 1-Click Download Action */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-blue-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              Project Deliverables & Setup Guides
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete Python Flask backend, SQLite database, sample datasets, and cross-platform runners
          </p>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isZipping}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{isZipping ? 'Bundling ZIP...' : 'Download Full Project (.ZIP)'}</span>
        </button>
      </div>

      {/* Guide Tabs: Windows / Android Termux / Viva Cheat Sheet */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveGuideTab('windows')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeGuideTab === 'windows'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Windows Setup Guide</span>
            </button>
            <button
              onClick={() => setActiveGuideTab('termux')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeGuideTab === 'termux'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android (Termux & Acode)</span>
            </button>
            <button
              onClick={() => setActiveGuideTab('viva')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeGuideTab === 'viva'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>B.Tech AI & DS Viva Q&A</span>
            </button>
          </div>
        </div>

        {/* Windows Guide */}
        {activeGuideTab === 'windows' && (
          <div className="space-y-3 font-mono text-xs">
            <p className="text-slate-300 text-[13px] font-sans">
              Run locally on Windows with Command Prompt or PowerShell:
            </p>
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-slate-300">
              <div className="text-slate-500 font-semibold">// Method 1: Instant 1-Click Runner</div>
              <div className="text-blue-400">1. Extract the downloaded HEALML_Self_Healing_ML_Pipeline_Project.zip</div>
              <div className="text-blue-400">2. Double-click run_windows.bat (auto-installs venv and starts server)</div>
              <div className="text-slate-500 font-semibold mt-3">// Method 2: Manual PowerShell Commands</div>
              <div className="text-slate-200">cd HEALML_Project</div>
              <div className="text-slate-200">python -m venv venv</div>
              <div className="text-slate-200">venv\Scripts\activate</div>
              <div className="text-slate-200">pip install -r requirements.txt</div>
              <div className="text-emerald-400">python app.py</div>
              <div className="text-slate-400 mt-2 font-sans">
                &rarr; Navigate to <strong className="text-blue-400">http://127.0.0.1:5000</strong> in your browser.
              </div>
            </div>
          </div>
        )}

        {/* Termux Android Guide */}
        {activeGuideTab === 'termux' && (
          <div className="space-y-3 font-mono text-xs">
            <p className="text-slate-300 text-[13px] font-sans">
              Run directly on Android smartphone using Termux terminal & Acode editor:
            </p>
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-slate-300">
              <div className="text-slate-500 font-semibold">// 1. Install Termux from F-Droid & update repositories</div>
              <div className="text-slate-200">pkg update -y</div>
              <div className="text-slate-200">pkg install -y python python-pip git clang libjpeg-turbo freetype</div>
              <div className="text-slate-500 font-semibold mt-3">// 2. Unpack project zip and install dependencies</div>
              <div className="text-slate-200">pip install --upgrade pip</div>
              <div className="text-slate-200">pip install -r requirements.txt</div>
              <div className="text-slate-500 font-semibold mt-3">// 3. Make runner executable & launch</div>
              <div className="text-slate-200">chmod +x run_termux.sh</div>
              <div className="text-emerald-400">./run_termux.sh</div>
              <div className="text-slate-400 mt-2 font-sans">
                &rarr; Switch to Chrome on Android and navigate to <strong className="text-blue-400">http://localhost:5000</strong>.
              </div>
            </div>
          </div>
        )}

        {/* Viva Q&A */}
        {activeGuideTab === 'viva' && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="font-semibold text-blue-400 text-[13px]">
                Q1: How does the Self-Healing Engine verify recovery before replacing a model?
              </div>
              <p className="text-slate-300 mt-1 leading-relaxed">
                HEALML enforces mathematical invariant checking. After applying an automated remedy (e.g., dynamic median imputation or IQR winzorization), the pipeline evaluates the healed data on a holdout test split. Only if post-recovery accuracy exceeds the safety threshold ($\tau \ge 0.70$) is status marked as <code>VERIFIED_SUCCESS</code> and committed to the SQLite ledger.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="font-semibold text-emerald-400 text-[13px]">
                Q2: How does Isolation Forest differ from Random Forest in this pipeline?
              </div>
              <p className="text-slate-300 mt-1 leading-relaxed">
                Random Forest is a <em>supervised</em> ensemble classifier that optimizes Gini impurity splits to predict target classes. Isolation Forest is an <em>unsupervised</em> anomaly detector that recursively isolates multivariate outliers. Outliers require significantly fewer random splits ($h(x) \ll c(n)$), resulting in anomaly scores $s(x, n) \ge 0.62$.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="font-semibold text-purple-400 text-[13px]">
                Q3: Why persist models with Joblib instead of standard Pickle?
              </div>
              <p className="text-slate-300 mt-1 leading-relaxed">
                Scikit-learn tree estimators store large NumPy arrays (split thresholds, leaf values, and feature indices). Joblib implements optimized disk serialization with zero-copy memory mapping for large numerical arrays, making it up to 10x faster and significantly more memory-efficient than standard pickle.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Code Explorer & Viewer */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-blue-400" />
              <span>Project Codebase Explorer</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedFile.description}
            </p>
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors self-start lg:self-auto"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy File Code</span>
              </>
            )}
          </button>
        </div>

        {/* File Tabs Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 mb-3">
          {codeFiles.map((file) => (
            <button
              key={file.path}
              onClick={() => setSelectedFile(file)}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all whitespace-nowrap shrink-0 ${
                selectedFile.path === file.path
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {file.filename}
            </button>
          ))}
        </div>

        {/* Code Block with Line Numbers */}
        <div className="p-4 rounded-lg bg-[#070D18] border border-slate-800 max-h-[500px] overflow-y-auto font-mono text-xs text-slate-300">
          <pre className="leading-relaxed whitespace-pre font-mono">
            <code>{selectedFile.content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
