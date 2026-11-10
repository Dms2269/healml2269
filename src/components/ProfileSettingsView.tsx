/**
 * HEALML – Profile Settings View (Option 10: Profile Settings)
 * Account credentials, role status, and password update management.
 */

import React, { useState } from 'react';
import {
  User,
  Mail,
  Lock,
  Shield,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Building,
  Calendar
} from 'lucide-react';
import { UserProfile } from '../types/auth';
import { apiClient } from '../services/apiClient';

interface ProfileSettingsViewProps {
  currentUser: UserProfile;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({ currentUser }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Password strength check
  const pwHasLength = newPassword.length >= 8;
  const pwHasUpper = /[A-Z]/.test(newPassword);
  const pwHasLower = /[a-z]/.test(newPassword);
  const pwHasDigit = /[0-9]/.test(newPassword);
  const pwHasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const strengthScore = [pwHasLength, pwHasUpper, pwHasLower, pwHasDigit, pwHasSpecial].filter(Boolean).length;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatusMsg({ text: 'New password and confirmation do not match.', type: 'error' });
      return;
    }
    if (strengthScore < 5) {
      setStatusMsg({ text: 'Password must satisfy all 5 enterprise security requirements.', type: 'error' });
      return;
    }

    setIsUpdating(true);
    setStatusMsg(null);
    try {
      // Use forgot-password + reset token flow or direct update
      const res = await apiClient.forgotPassword(currentUser.email);
      if (res.resetToken) {
        await apiClient.resetPassword(res.resetToken, newPassword);
        setStatusMsg({ text: 'Password successfully updated.', type: 'success' });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setStatusMsg({ text: 'Password update request processed.', type: 'success' });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Failed to update password.', type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Account & Profile Settings</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage your enterprise credentials, view organizational role permissions, and update security keys.
        </p>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
          statusMsg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="p-6 rounded-2xl bg-[#0F172A] border border-slate-800 space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">{currentUser.fullName}</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase ${
                currentUser.role === 'SUPER_ADMIN'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : currentUser.role === 'ADMIN'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {currentUser.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{currentUser.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-slate-400 flex items-center gap-1.5 mb-1">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Account Status</span>
            </div>
            <div className="font-semibold text-emerald-400 font-mono">{currentUser.status}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-slate-400 flex items-center gap-1.5 mb-1">
              <Building className="w-3.5 h-3.5 text-blue-400" />
              <span>Workspace Tenant</span>
            </div>
            <div className="font-semibold text-slate-200">Isolated Organization</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-slate-400 flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Registered Date</span>
            </div>
            <div className="font-semibold text-slate-200 font-mono">
              {currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'Verified'}
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Form */}
      <div className="p-6 rounded-2xl bg-[#0F172A] border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-xs font-semibold text-slate-200">
          <KeyRound className="w-4 h-4 text-blue-400" />
          <span>Update Account Password</span>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars with mixed case, number, symbol"
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Password strength visualizer */}
            {newPassword.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1 h-1">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <div
                      key={lvl}
                      className={`flex-1 rounded-full transition-colors ${
                        strengthScore >= lvl
                          ? strengthScore >= 5
                            ? 'bg-emerald-500'
                            : strengthScore >= 3
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                          : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-x-2 text-[10px] text-slate-400 mt-1 font-mono">
                  <span className={pwHasLength ? 'text-emerald-400' : ''}>• 8+ characters</span>
                  <span className={pwHasUpper ? 'text-emerald-400' : ''}>• Uppercase (A-Z)</span>
                  <span className={pwHasLower ? 'text-emerald-400' : ''}>• Lowercase (a-z)</span>
                  <span className={pwHasDigit ? 'text-emerald-400' : ''}>• Numeric digit</span>
                  <span className={pwHasSpecial ? 'text-emerald-400' : ''}>• Special character</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Confirm New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <span>{isUpdating ? 'Updating Password...' : 'Save New Password'}</span>
          </button>
        </form>
      </div>

      {/* Resource Quotas & Granted Permissions Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Tenant Resource Quotas & Pipeline Permissions</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Max Datasets</div>
            <div className="text-base font-bold font-mono text-slate-800 dark:text-white mt-1">
              {currentUser.quotas?.maxDatasets ?? 10}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Max File Size</div>
            <div className="text-base font-bold font-mono text-slate-800 dark:text-white mt-1">
              {currentUser.quotas?.maxUploadSizeMb ?? 25} MB
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Storage Allocated</div>
            <div className="text-base font-bold font-mono text-slate-800 dark:text-white mt-1">
              {currentUser.quotas?.maxTotalStorageMb ?? 100} MB
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Daily Uploads</div>
            <div className="text-base font-bold font-mono text-slate-800 dark:text-white mt-1">
              {currentUser.quotas?.maxDailyUploads ?? 20} / day
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Active Feature Entitlements
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {[
              { label: 'Data Ingestion', enabled: currentUser.permissions?.canUpload ?? true },
              { label: 'Problem Profiling', enabled: currentUser.permissions?.canAnalyze ?? true },
              { label: 'Automated Healing', enabled: currentUser.permissions?.canHeal ?? true },
              { label: 'ML Benchmark Training', enabled: currentUser.permissions?.canTrain ?? true },
              { label: 'Model Evaluation Suite', enabled: currentUser.permissions?.canEvaluate ?? true },
              { label: 'Clean Dataset Export', enabled: currentUser.permissions?.canDownloadReports ?? true },
              { label: 'Executive PDF Dossier', enabled: currentUser.permissions?.canExportPdf ?? true },
            ].map((p, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <span className="text-slate-700 dark:text-slate-300 font-medium">{p.label}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  p.enabled
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}>
                  {p.enabled ? 'ACTIVE' : 'LOCKED'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
