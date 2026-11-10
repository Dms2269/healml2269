/**
 * HEALML – SQLite Recovery Logs View
 * Displays persistent relational audit records of all fault detections,
 * self-healing operations, and post-recovery verification status.
 * 
 * Note: PDF downloads and generation exist strictly within the "PDF Reports" tab.
 */

import React, { useState } from 'react';
import {
  History,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCode,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { RecoveryLog } from '../types/pipeline';
import { sqliteStorage } from '../services/sqliteStorage';

interface RecoveryLogsViewProps {
  logs: RecoveryLog[];
  onClearLogs: () => void;
}

export const RecoveryLogsView: React.FC<RecoveryLogsViewProps> = ({
  logs,
  onClearLogs,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED_SUCCESS' | 'ESCALATED'>('ALL');

  const filteredLogs = logs.filter((log) => {
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      log.actionTaken.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.stage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      'recovery_id',
      'fault_id',
      'pipeline_stage',
      'action_taken',
      'details',
      'pre_recovery_metric',
      'post_recovery_metric',
      'verification_delta',
      'verification_status',
      'executed_at',
    ];
    const rows = logs.map((l) => [
      l.id,
      l.faultId,
      l.stage,
      l.actionTaken,
      `"${l.details.replace(/"/g, '""')}"`,
      l.preRecoveryMetric,
      l.postRecoveryMetric,
      l.verificationDelta,
      l.status,
      l.timestamp,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'healml_sqlite_recovery_logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export SQL dump
  const handleExportSql = () => {
    const dump = sqliteStorage.generateSqlDump();
    const blob = new Blob([dump], { type: 'application/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'healml_audit_ledger.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              SQLite Recovery Logs & Audit Ledger
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident relational audit trail storing verified self-healing actions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportSql}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download .SQL Dump</span>
          </button>
          <button
            onClick={onClearLogs}
            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
            title="Clear all logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SQL Query Explainer Box */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs">
        <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">
          Active SQLite Query
        </div>
        <div className="text-slate-300">
          <span className="text-blue-400">SELECT</span> recovery_id, fault_id, pipeline_stage, action_taken, pre_recovery_metric, post_recovery_metric, verification_delta, verification_status, executed_at <span className="text-blue-400">FROM</span> recovery_logs <span className="text-blue-400">ORDER BY</span> executed_at <span className="text-blue-400">DESC</span>;
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0F172A] border border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              statusFilter === 'ALL'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Logs ({logs.length})
          </button>
          <button
            onClick={() => setStatusFilter('VERIFIED_SUCCESS')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              statusFilter === 'VERIFIED_SUCCESS'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Verified Success
          </button>
          <button
            onClick={() => setStatusFilter('ESCALATED')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              statusFilter === 'ESCALATED'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Escalated
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by action, stage, details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 w-64 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
      </div>

      {/* Recovery Logs Table */}
      <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-mono">
                <th className="py-2.5 px-3">Recovery ID</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Stage</th>
                <th className="py-2.5 px-3">Action Taken</th>
                <th className="py-2.5 px-3">Remediation Details</th>
                <th className="py-2.5 px-3 text-right">Pre-Metric</th>
                <th className="py-2.5 px-3 text-right">Post-Metric</th>
                <th className="py-2.5 px-3 text-right">Verification Δ</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    No recovery log entries match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {log.id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 tabular-nums">
                      {log.timestamp}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {log.stage}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">
                      {log.actionTaken}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-sm truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-400">
                      {(log.preRecoveryMetric * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-slate-200">
                      {(log.postRecoveryMetric * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-emerald-400">
                      +{(log.verificationDelta * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        log.status === 'VERIFIED_SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
