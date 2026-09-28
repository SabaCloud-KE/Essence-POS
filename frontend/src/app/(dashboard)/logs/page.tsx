'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  ScrollText,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  Copy,
  Check,
  FileText,
  Terminal,
  Table as TableIcon,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState<'audit' | 'system'>('audit');
  const [viewMode, setViewMode] = useState<'table' | 'plaintext'>('table');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPages, setAuditPages] = useState(1);

  // System Logs State
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [systemTotal, setSystemTotal] = useState(0);
  const [systemPage, setSystemPage] = useState(1);
  const [systemPages, setSystemPages] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [modalViewMode, setModalViewMode] = useState<'plain' | 'json'>('plain');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'audit') {
        const res = await api.getAuditLogs({
          page: auditPage,
          limit: 25,
          search: search || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        setAuditLogs(res.data);
        setAuditTotal(res.meta.total);
        setAuditPages(res.meta.totalPages);
      } else {
        const res = await api.getSystemLogs({
          page: systemPage,
          limit: 25,
          search: search || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        setSystemLogs(res.data);
        setSystemTotal(res.meta.total);
        setSystemPages(res.meta.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeTab, auditPage, systemPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'audit') setAuditPage(1);
    else setSystemPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    if (activeTab === 'audit') setAuditPage(1);
    else setSystemPage(1);
  };

  /**
   * Format visible logs into plain text stream
   */
  const generatePlainTextOutput = () => {
    const logs = activeTab === 'audit' ? auditLogs : systemLogs;
    if (!logs || logs.length === 0) return 'No log records available.';

    let output = `================================================================================\n`;
    output += `ESSENCE HAIR & BEAUTY SALON - ${activeTab === 'audit' ? 'AUDIT TRAIL' : 'SYSTEM TELEMETRY'} LOG (PLAIN TEXT)\n`;
    output += `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')} (Africa/Nairobi) | Visible Entries: ${logs.length}\n`;
    output += `Powered by SabaCloud (www.sabacloud.co.ke)\n`;
    output += `================================================================================\n\n`;

    for (const log of logs) {
      const time = format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss');
      if (activeTab === 'audit') {
        const userName = log.user ? `${log.user.name} (${log.user.role})` : 'System';
        output += `[${time}] [${log.action}] User: ${userName} | Entity: ${log.entity}${log.entityId ? ` (#${log.entityId})` : ''}\n`;
        output += `  Description: ${log.description}\n`;
        if (log.ipAddress) output += `  IP Address: ${log.ipAddress}\n`;
        if (log.metadata) {
          try {
            const parsed = JSON.parse(log.metadata);
            const metaStr = Object.entries(parsed)
              .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
              .join(' | ');
            output += `  Details: ${metaStr}\n`;
          } catch {
            output += `  Details: ${log.metadata}\n`;
          }
        }
      } else {
        output += `[${time}] [${log.level}] [${log.context}]\n`;
        output += `  Message: ${log.message}\n`;
        if (log.metadata) output += `  Metadata: ${log.metadata}\n`;
      }
      output += `--------------------------------------------------------------------------------\n`;
    }
    return output;
  };

  /**
   * Copy plain text logs to clipboard
   */
  const handleCopyPlainText = () => {
    const text = generatePlainTextOutput();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  /**
   * Download full plain text audit log file (.txt)
   */
  const handleDownloadTxt = async () => {
    setIsExporting(true);
    try {
      if (activeTab === 'audit') {
        const blob = await api.downloadAuditLogsTxt(
          search || undefined,
          startDate || undefined,
          endDate || undefined,
        );
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Essence_Audit_Logs_${format(new Date(), 'yyyyMMdd_HHmm')}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Fallback for system tab
        const text = generatePlainTextOutput();
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Essence_System_Logs_${format(new Date(), 'yyyyMMdd_HHmm')}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('Failed to download plain text logs. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-cream-300 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-obsidian-900 flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-gold-600" />
            <span>Audit Trail & Activity Logs</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Forensic tracking of user actions, sales, reversals, authentication events, and system telemetry in plain text
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Plain Text Export Button */}
          <button
            onClick={handleDownloadTxt}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-500 text-white font-semibold text-xs hover:bg-gold-600 transition shadow-sm disabled:opacity-50"
            title="Download audit logs as a plain text file (.txt)"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Export Plain Text (.txt)</span>
          </button>

          {/* Copy Plain Text Button */}
          <button
            onClick={handleCopyPlainText}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cream-300 bg-cream-50 hover:bg-cream-100 text-gray-700 font-semibold text-xs transition shadow-sm"
            title="Copy plain text logs to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied Plain Text!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-600" />
                <span>Copy Plain Text</span>
              </>
            )}
          </button>

          {/* View Mode Switcher: Table vs Plain Text Stream */}
          <div className="flex items-center bg-cream-100 p-0.5 rounded-xl border border-cream-200">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-white text-obsidian-900 shadow-sm border border-cream-300'
                  : 'text-gray-600 hover:text-obsidian-900'
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('plaintext')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'plaintext'
                  ? 'bg-obsidian-900 text-gold-400 shadow-sm'
                  : 'text-gray-600 hover:text-obsidian-900'
              }`}
              title="Plain Text Console Stream"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Plain Text</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs and Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-cream-200">
          {/* Tab Buttons */}
          <div className="flex items-center gap-1 bg-cream-100 p-1 rounded-xl border border-cream-200">
            <button
              onClick={() => {
                setActiveTab('audit');
                setAuditPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'audit'
                  ? 'bg-white text-obsidian-900 shadow-sm border border-cream-300'
                  : 'text-gray-600 hover:text-obsidian-900'
              }`}
            >
              User Audit Trail
            </button>
            <button
              onClick={() => {
                setActiveTab('system');
                setSystemPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'system'
                  ? 'bg-white text-obsidian-900 shadow-sm border border-cream-300'
                  : 'text-gray-600 hover:text-obsidian-900'
              }`}
            >
              System & Gateway Logs
            </button>
          </div>

          <div className="text-xs text-gray-500 font-mono">
            {activeTab === 'audit' ? (
              <span>Total Audit Records: <strong className="text-obsidian-900">{auditTotal}</strong></span>
            ) : (
              <span>Total System Events: <strong className="text-obsidian-900">{systemTotal}</strong></span>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search plain text: actions, users, descriptions, receipts...`}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-cream-300 bg-cream-50 focus:bg-white outline-none focus:border-gold-500 transition"
            />
          </div>

          <div className="sm:col-span-2.5 flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-gray-500 whitespace-nowrap">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-xl border border-cream-300 bg-cream-50 focus:bg-white outline-none"
            />
          </div>

          <div className="sm:col-span-2.5 flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-gray-500 whitespace-nowrap">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-xl border border-cream-300 bg-cream-50 focus:bg-white outline-none"
            />
          </div>

          <div className="sm:col-span-1 flex items-center gap-1">
            <button
              type="submit"
              className="w-full py-2 rounded-xl gold-gradient text-white text-xs font-semibold shadow-sm hover:opacity-95 transition"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Main Logs View Area */}
      <div className="bg-white rounded-2xl border border-cream-300 shadow-sm overflow-hidden">
        {viewMode === 'plaintext' ? (
          /* PLAIN TEXT STREAM VIEW */
          <div className="p-4 bg-obsidian-950 text-gray-200 font-mono text-xs rounded-2xl overflow-x-auto min-h-[420px] max-h-[calc(100vh-320px)] overflow-y-auto leading-relaxed border border-obsidian-800">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800 text-[11px] text-gold-400">
              <span className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>LIVE PLAIN TEXT AUDIT STREAM (RFC/PLAIN FORMAT)</span>
              </span>
              <button
                onClick={fetchLogs}
                className="flex items-center gap-1 text-gray-400 hover:text-white transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {isLoading ? (
              <div className="py-20 text-center text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-gold-500" />
                <span>Streaming logs in plain text...</span>
              </div>
            ) : (activeTab === 'audit' ? auditLogs : systemLogs).length === 0 ? (
              <div className="py-20 text-center text-gray-500">
                [NO LOG RECORDS FOUND MATCHING QUERY]
              </div>
            ) : (
              <div className="space-y-3 font-mono text-[11px]">
                {(activeTab === 'audit' ? auditLogs : systemLogs).map((log) => {
                  const time = format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss');
                  if (activeTab === 'audit') {
                    const userName = log.user ? `${log.user.name} (${log.user.role})` : 'System';
                    let metaText = '';
                    if (log.metadata) {
                      try {
                        const parsed = JSON.parse(log.metadata);
                        metaText = Object.entries(parsed)
                          .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
                          .join(' | ');
                      } catch {
                        metaText = log.metadata;
                      }
                    }

                    return (
                      <div key={log.id} className="p-2.5 rounded-lg bg-obsidian-900/80 border border-obsidian-800 hover:border-gold-500/40 transition">
                        <div className="text-gold-400 font-semibold flex flex-wrap items-center gap-2">
                          <span className="text-gray-400">[{time}]</span>
                          <span className="bg-gold-950 text-gold-300 px-1.5 py-0.5 rounded border border-gold-800 text-[10px]">
                            {log.action}
                          </span>
                          <span className="text-gray-300">User: <span className="text-white">{userName}</span></span>
                          <span className="text-gray-500">Entity: {log.entity}{log.entityId && `(#${log.entityId})`}</span>
                        </div>
                        <div className="mt-1 text-gray-200 pl-4 border-l-2 border-gold-600/40">
                          {log.description}
                        </div>
                        {(log.ipAddress || metaText) && (
                          <div className="mt-1 text-[10px] text-gray-400 pl-4 flex flex-wrap gap-3">
                            {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                            {metaText && <span className="text-emerald-400/80">Details: {metaText}</span>}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div key={log.id} className="p-2.5 rounded-lg bg-obsidian-900/80 border border-obsidian-800">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">[{time}]</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                            log.level === 'ERROR' ? 'bg-rose-950 text-rose-300' : 'bg-blue-950 text-blue-300'
                          }`}>
                            {log.level}
                          </span>
                          <span className="text-gold-300">[{log.context}]</span>
                        </div>
                        <div className="mt-1 text-gray-200 pl-4 border-l-2 border-blue-500/40">
                          {log.message}
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        ) : (
          /* TABLE VIEW WITH PLAIN TEXT COLUMNS */
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] min-h-[350px] custom-scrollbar">
            {activeTab === 'audit' ? (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-cream-100 text-gray-700 font-bold uppercase tracking-wider text-[10px] border-b border-cream-200 shadow-sm">
                  <tr>
                    <th className="p-3.5 whitespace-nowrap">Timestamp</th>
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Entity</th>
                    <th className="p-3.5">Plain Text Description</th>
                    <th className="p-3.5 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200 text-gray-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-gold-500 mx-auto" />
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-gray-400">
                        No audit records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-cream-50/70 transition">
                        <td className="p-3.5 font-mono text-gray-500 whitespace-nowrap">
                          {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm:ss')}
                        </td>
                        <td className="p-3.5 font-semibold text-obsidian-900 whitespace-nowrap">
                          {log.user?.name || 'System'}
                        </td>
                        <td className="p-3.5 font-mono whitespace-nowrap">
                          <span className="bg-gold-50 text-gold-800 font-bold text-[10px] px-2 py-0.5 rounded border border-gold-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 text-gray-500 font-medium whitespace-nowrap">
                          {log.entity} {log.entityId && `(#${log.entityId})`}
                        </td>
                        <td className="p-3.5 text-gray-800 font-normal leading-relaxed">
                          {log.description}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1.5 rounded-lg bg-cream-100 hover:bg-gold-500 hover:text-white text-gray-600 transition"
                            title="Inspect Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-cream-100 text-gray-700 font-bold uppercase tracking-wider text-[10px] border-b border-cream-200 shadow-sm">
                  <tr>
                    <th className="p-3.5 whitespace-nowrap">Timestamp</th>
                    <th className="p-3.5">Level</th>
                    <th className="p-3.5">Context</th>
                    <th className="p-3.5">Plain Text Message</th>
                    <th className="p-3.5 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200 text-gray-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-gold-500 mx-auto" />
                      </td>
                    </tr>
                  ) : systemLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-gray-400">
                        No system events found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    systemLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-cream-50/70 transition">
                        <td className="p-3.5 font-mono text-gray-500 whitespace-nowrap">
                          {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm:ss')}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              log.level === 'SECURITY'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : log.level === 'PAYMENT'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : log.level === 'ERROR'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : log.level === 'WARNING'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {log.level}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-semibold text-obsidian-900 whitespace-nowrap">
                          {log.context}
                        </td>
                        <td className="p-3.5 text-gray-800 font-normal leading-relaxed">
                          {log.message}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1.5 rounded-lg bg-cream-100 hover:bg-gold-500 hover:text-white text-gray-600 transition"
                            title="Inspect Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-cream-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <span>
            Total Visible Entries:{' '}
            <strong className="text-obsidian-900 font-mono">
              {activeTab === 'audit' ? auditTotal : systemTotal}
            </strong>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                activeTab === 'audit'
                  ? setAuditPage((p) => Math.max(1, p - 1))
                  : setSystemPage((p) => Math.max(1, p - 1))
              }
              disabled={activeTab === 'audit' ? auditPage <= 1 : systemPage <= 1}
              className="p-1.5 rounded-lg border border-cream-300 hover:bg-cream-100 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-xs px-2">
              Page {activeTab === 'audit' ? auditPage : systemPage} of{' '}
              {activeTab === 'audit' ? auditPages : systemPages}
            </span>
            <button
              onClick={() =>
                activeTab === 'audit'
                  ? setAuditPage((p) => Math.min(auditPages, p + 1))
                  : setSystemPage((p) => Math.min(systemPages, p + 1))
              }
              disabled={
                activeTab === 'audit'
                  ? auditPage >= auditPages
                  : systemPage >= systemPages
              }
              className="p-1.5 rounded-lg border border-cream-300 hover:bg-cream-100 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* METADATA INSPECTOR MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-cream-300 relative space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <h3 className="font-bold text-base text-obsidian-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gold-600" />
                <span>Audit Event Inspector</span>
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-cream-50 p-3.5 rounded-xl border border-cream-200 space-y-1.5">
                <div className="flex justify-between font-mono">
                  <span className="text-gray-500 font-sans">Timestamp:</span>
                  <span className="font-semibold">{format(new Date(selectedLog.createdAt), 'yyyy-MM-dd HH:mm:ss')}</span>
                </div>
                {selectedLog.action && (
                  <div className="flex justify-between font-mono">
                    <span className="text-gray-500 font-sans">Action:</span>
                    <span className="font-bold text-gold-700">{selectedLog.action}</span>
                  </div>
                )}
                {selectedLog.user && (
                  <div className="flex justify-between font-mono">
                    <span className="text-gray-500 font-sans">Triggered By:</span>
                    <span className="font-semibold text-obsidian-900">{selectedLog.user.name} ({selectedLog.user.role})</span>
                  </div>
                )}
                {selectedLog.level && (
                  <div className="flex justify-between font-mono">
                    <span className="text-gray-500 font-sans">Severity:</span>
                    <span className="font-bold uppercase">{selectedLog.level}</span>
                  </div>
                )}
                {selectedLog.ipAddress && (
                  <div className="flex justify-between font-mono">
                    <span className="text-gray-500 font-sans">Client IP:</span>
                    <span>{selectedLog.ipAddress}</span>
                  </div>
                )}
                {selectedLog.userAgent && (
                  <div className="flex flex-col pt-1 border-t border-cream-200">
                    <span className="text-gray-500 font-sans">User Agent:</span>
                    <span className="text-[10px] text-gray-700 break-all">{selectedLog.userAgent}</span>
                  </div>
                )}
              </div>

              {/* Plain Text Description */}
              <div>
                <span className="font-bold text-gray-700 block mb-1">
                  Plain Text Description
                </span>
                <p className="p-3 bg-cream-100 rounded-xl font-mono text-[11px] text-gray-900 leading-relaxed break-words border border-cream-200">
                  {selectedLog.description || selectedLog.message}
                </p>
              </div>

              {/* Details & Metadata in Plain Text Key-Values or Raw JSON */}
              {selectedLog.metadata && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-gray-700">Event Details & Metadata</span>
                    <div className="flex gap-1 bg-cream-100 p-0.5 rounded-lg border border-cream-200 text-[10px]">
                      <button
                        onClick={() => setModalViewMode('plain')}
                        className={`px-2 py-0.5 rounded font-semibold transition ${
                          modalViewMode === 'plain' ? 'bg-white text-obsidian-900 shadow-xs' : 'text-gray-500'
                        }`}
                      >
                        Plain Text
                      </button>
                      <button
                        onClick={() => setModalViewMode('json')}
                        className={`px-2 py-0.5 rounded font-semibold transition ${
                          modalViewMode === 'json' ? 'bg-white text-obsidian-900 shadow-xs' : 'text-gray-500'
                        }`}
                      >
                        Raw JSON
                      </button>
                    </div>
                  </div>

                  {modalViewMode === 'plain' ? (
                    <div className="p-3 bg-cream-50 rounded-xl border border-cream-200 font-mono text-[11px] space-y-1.5">
                      {(() => {
                        try {
                          const parsed = typeof selectedLog.metadata === 'string'
                            ? JSON.parse(selectedLog.metadata)
                            : selectedLog.metadata;

                          if (typeof parsed !== 'object' || !parsed) {
                            return <span>{String(selectedLog.metadata)}</span>;
                          }

                          return Object.entries(parsed).map(([key, val]) => (
                            <div key={key} className="flex justify-between py-1 border-b border-cream-200 last:border-0">
                              <span className="text-gray-500 uppercase text-[10px] tracking-wider">{key}:</span>
                              <span className="font-semibold text-obsidian-900 break-all">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </span>
                            </div>
                          ));
                        } catch {
                          return <span>{selectedLog.metadata}</span>;
                        }
                      })()}
                    </div>
                  ) : (
                    <pre className="p-3 bg-obsidian-900 text-gold-300 rounded-xl font-mono text-[10px] overflow-x-auto max-h-48 border border-obsidian-800">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedLog.metadata), null, 2);
                        } catch {
                          return selectedLog.metadata;
                        }
                      })()}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
