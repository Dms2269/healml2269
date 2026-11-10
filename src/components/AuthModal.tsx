/**
 * HEALML Enterprise - Authentication & Registration Modal
 * Multi-client authentication with role badges and lifecycle state notifications.
 */

import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, User, AlertCircle, CheckCircle2, KeyRound, ArrowRight, X, Sparkles, Building, Phone } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { UserProfile } from '../types/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [issuedResetToken, setIssuedResetToken] = useState<string | null>(null);

  if (!isOpen) return null;

  // Password strength check
  const pwHasLength = password.length >= 8;
  const pwHasUpper = /[A-Z]/.test(password);
  const pwHasLower = /[a-z]/.test(password);
  const pwHasDigit = /[0-9]/.test(password);
  const pwHasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const strengthScore = [pwHasLength, pwHasUpper, pwHasLower, pwHasDigit, pwHasSpecial].filter(Boolean).length;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await apiClient.login(email, password);
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      if (err.accountStatus === 'PENDING_APPROVAL') {
        setErrorMsg('Your registration has been submitted and is PENDING MASTER ADMIN APPROVAL. You will be able to sign in once an administrator approves your account.');
      } else if (err.accountStatus === 'REJECTED') {
        setErrorMsg('Your registration application was rejected by the Master Admin.');
      } else if (err.accountStatus === 'SUSPENDED') {
        setErrorMsg('Your account has been suspended by an administrator. Please contact support.');
      } else {
        setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Password and confirm password do not match.');
      return;
    }

    if (strengthScore < 5) {
      setErrorMsg('Password must satisfy all 5 enterprise security criteria.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.register(fullName, email, password, confirmPassword, companyName, phoneNumber);
      setSuccessMsg(res.message);
      setTab('login');
      // Pre-fill email
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await apiClient.forgotPassword(email);
      setSuccessMsg(res.message);
      if (res.resetToken) {
        setIssuedResetToken(res.resetToken);
        setResetToken(res.resetToken);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Password reset request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await apiClient.resetPassword(resetToken, newPassword);
      setSuccessMsg(res.message);
      setIssuedResetToken(null);
      setTab('login');
    } catch (err: any) {
      setErrorMsg(err.message || 'Password reset confirmation failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0F172A] border border-slate-700/80 rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">HEALML Enterprise Portal</h3>
              <p className="text-[11px] text-slate-400">Secure Access Control & Tenant Isolation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs font-semibold">
          <button
            onClick={() => { setTab('login'); setErrorMsg(null); }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              tab === 'login'
                ? 'text-blue-400 border-blue-500 bg-blue-500/5'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('register'); setErrorMsg(null); }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              tab === 'register'
                ? 'text-blue-400 border-blue-500 bg-blue-500/5'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Client Registration
          </button>
          <button
            onClick={() => { setTab('forgot'); setErrorMsg(null); }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              tab === 'forgot'
                ? 'text-blue-400 border-blue-500 bg-blue-500/5'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Reset Key
          </button>
        </div>

        {/* Feedback Notifications */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6">
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Client ID or Corporate Email</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="CL-TEST-001 or admin@healml.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-400">Password</label>
                  <button
                    type="button"
                    onClick={() => setTab('forgot')}
                    className="text-[11px] text-blue-400 hover:text-blue-300"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Enterprise Quick-Fill Demo Credentials */}
              <div className="mt-4 pt-3.5 border-t border-slate-800">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Verified Test Accounts (Click to Fill)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('CL-TEST-001', 'Client1@HealML2026')}
                    className="p-2 text-[11px] bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded text-left transition-colors"
                  >
                    <span className="font-semibold text-emerald-400 block truncate">Client 1 (Apex)</span>
                    <span className="text-[10px] text-slate-400 font-mono block">CL-TEST-001</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('CL-TEST-002', 'Client2@HealML2026')}
                    className="p-2 text-[11px] bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded text-left transition-colors"
                  >
                    <span className="font-semibold text-emerald-400 block truncate">Client 2 (Vortex)</span>
                    <span className="text-[10px] text-slate-400 font-mono block">CL-TEST-002</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('CL-TEST-003', 'Client3@HealML2026')}
                    className="p-2 text-[11px] bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded text-left transition-colors"
                  >
                    <span className="font-semibold text-emerald-400 block truncate">Client 3 (Zenith)</span>
                    <span className="text-[10px] text-slate-400 font-mono block">CL-TEST-003</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('admin@healml.com', 'Admin@HealML2026')}
                    className="p-2 text-[11px] bg-slate-800/80 hover:bg-slate-750 border border-blue-500/40 rounded text-left transition-colors"
                  >
                    <span className="font-semibold text-blue-400 block truncate">Master Admin</span>
                    <span className="text-[10px] text-slate-400 font-mono block">admin@healml.com</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Full Legal Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Alex Rivera"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@enterprise.org"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Company / Organization Name</label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Analytics Corp"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Business Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars, mixed case, number, symbol"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Password strength visualizer */}
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
                  <div className="grid grid-cols-2 gap-x-2 text-[10px] text-slate-400 mt-1">
                    <span className={pwHasLength ? 'text-emerald-400' : ''}>• 8+ characters</span>
                    <span className={pwHasUpper ? 'text-emerald-400' : ''}>• Uppercase (A-Z)</span>
                    <span className={pwHasLower ? 'text-emerald-400' : ''}>• Lowercase (a-z)</span>
                    <span className={pwHasDigit ? 'text-emerald-400' : ''}>• Numeric digit</span>
                    <span className={pwHasSpecial ? 'text-emerald-400' : ''}>• Special character</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[11px] text-blue-300">
                Notice: All new client accounts are initialized in <strong className="text-white font-mono">PENDING_APPROVAL</strong> status. A Master Admin will review and approve your registration before dashboard access is unlocked.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Submitting Application...' : 'Submit Registration for Approval'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {tab === 'forgot' && (
            <div className="space-y-4">
              {!issuedResetToken ? (
                <form onSubmit={handleForgotPassword} className="space-y-3.5">
                  <p className="text-xs text-slate-400">
                    Enter your registered email address to generate a 1-hour secure password reset token.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Account Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@organization.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Request Reset Token'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded font-mono text-[10px] text-amber-300 break-all">
                    Reset Token: {issuedResetToken}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Verification Token</label>
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 chars with mixed case, number, symbol"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all disabled:opacity-50"
                  >
                    {loading ? 'Updating Password...' : 'Save New Password & Log In'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
