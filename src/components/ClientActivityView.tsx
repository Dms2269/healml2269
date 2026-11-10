import React, { useState, useEffect } from 'react';
import {
  Activity,
  Database,
  CheckCircle2,
  Download,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
  FileText,
  LifeBuoy,
  Send,
  MessageSquare
} from 'lucide-react';
import { RecoveryLog, FaultEvent } from '../types/pipeline';
import { apiClient } from '../services/apiClient';

interface ClientActivityViewProps {
  recentRecoveries: RecoveryLog[];
  activeFaults: FaultEvent[];
  datasetName: string;
}

export const ClientActivityView: React.FC<ClientActivityViewProps> = ({
  recentRecoveries,
  activeFaults,
  datasetName,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'recovery' | 'support'>('recovery');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [category, setCategory] = useState('Data Faults');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [ticketActionMsg, setTicketActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Thread reply states
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await apiClient.getMyTickets();
      setTickets(res.tickets || []);
    } catch {
      // Offline fallback
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    setSubmitting(true);
    setTicketActionMsg(null);
    try {
      const res = await apiClient.createSupportTicket({ category, subject, description, priority: 'MEDIUM' });
      setTicketActionMsg({ text: res.message, type: 'success' });
      setSubject('');
      setDescription('');
      setShowNewTicketForm(false);
      loadTickets();
    } catch (err: any) {
      setTicketActionMsg({ text: err.message || 'Failed to submit ticket.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    try {
      await apiClient.replyTicket(ticketId, replyText);
      setReplyText('');
      loadTickets();
    } catch (err: any) {
      setTicketActionMsg({ text: err.message || 'Failed to post reply.', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#0F172A] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Personal Workspace Activity & Support</h1>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Audit Trail
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of operations executed on your datasets and support ticket conversations with the Master Admin team.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
          <button
            onClick={() => setActiveSubTab('recovery')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeSubTab === 'recovery' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Self-Healing Log ({recentRecoveries.length})
          </button>
          <button
            onClick={() => setActiveSubTab('support')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeSubTab === 'support' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            My Support Tickets ({tickets.length})
          </button>
        </div>
      </div>

      {ticketActionMsg && (
        <div className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
          ticketActionMsg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <span>{ticketActionMsg.text}</span>
          <button onClick={() => setTicketActionMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* SUBTAB 1: SELF-HEALING RECOVERY LOG */}
      {activeSubTab === 'recovery' && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0F172A]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Dataset Target</th>
                <th className="py-3 px-4">Action Details</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {recentRecoveries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                    No recovery events recorded yet. Upload a dataset and execute healing to record audit activity.
                  </td>
                </tr>
              ) : (
                recentRecoveries.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-850/50">
                    <td className="py-3 px-4 font-sans font-semibold text-white flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-blue-400" />
                      <span>Self-Healing Repair</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {datasetName}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-300 max-w-md truncate" title={rec.details}>
                      {rec.actionTaken}: {rec.details}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.status === 'VERIFIED_SUCCESS'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{rec.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      {rec.timestamp}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SUBTAB 2: CLIENT SUPPORT TICKETS */}
      {activeSubTab === 'support' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Your Help Desk Tickets</h3>
            <button
              onClick={() => setShowNewTicketForm(!showNewTicketForm)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>{showNewTicketForm ? 'Close Form' : 'Submit New Ticket'}</span>
            </button>
          </div>

          {/* New Ticket Form */}
          {showNewTicketForm && (
            <form onSubmit={handleCreateTicket} className="p-5 rounded-xl bg-[#0F172A] border border-blue-500/30 space-y-3.5 text-xs">
              <div className="font-semibold text-white text-sm">Create Support Request</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Issue Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                  >
                    <option value="Data Faults">Dataset Fault Diagnosis</option>
                    <option value="Self-Healing">Autonomous Self-Healing</option>
                    <option value="ML Models">ML Model Accuracy</option>
                    <option value="Exports & Reports">PDF Reports & Exports</option>
                    <option value="General">General / Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of the problem"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide context, column names, or error messages encountered..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewTicketForm(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit Request'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Tickets List */}
          <div className="space-y-3">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-[#0F172A] border border-slate-800 rounded-xl">
                You have not submitted any support tickets yet. Click "Submit New Ticket" if you need assistance.
              </div>
            ) : (
              tickets.map((t) => (
                <div key={t.id} className="p-4 rounded-xl bg-[#0F172A] border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-blue-400 font-bold">{t.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        t.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {t.status}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">({t.category})</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="font-semibold text-white text-sm">{t.subject}</div>
                  <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                    {t.description}
                  </p>

                  {/* Thread Toggle */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setExpandedTicketId(expandedTicketId === t.id ? null : t.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{t.replies?.length || 0} Administrator Replies</span>
                    </button>
                  </div>

                  {/* Thread Replies & Reply Box */}
                  {expandedTicketId === t.id && (
                    <div className="pt-3 border-t border-slate-800 space-y-3">
                      {(!t.replies || t.replies.length === 0) ? (
                        <p className="text-slate-500 italic text-[11px]">No responses from administration yet. A specialist will reply shortly.</p>
                      ) : (
                        t.replies.map((r: any) => (
                          <div
                            key={r.id}
                            className={`p-3 rounded-lg border text-xs ${
                              r.senderRole === 'CLIENT'
                                ? 'bg-slate-900 border-slate-800 text-slate-300'
                                : 'bg-blue-600/10 border-blue-500/30 text-blue-200'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                              <span className="font-bold text-white">{r.senderName} ({r.senderRole})</span>
                              <span>{new Date(r.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="whitespace-pre-wrap">{r.message}</p>
                          </div>
                        ))
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Reply to administration..."
                          className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleSendReply(t.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Reply</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
