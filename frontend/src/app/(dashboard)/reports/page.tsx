'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatKsh } from '@/lib/utils';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  Download,
  Scissors,
  Users,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

export default function ReportsPage() {
  const [period, setPeriod] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDashboardStats(
        period,
        startDate || undefined,
        endDate || undefined,
      );
      setStats(data);
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPeriod('custom');
    fetchReport();
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const blob = await api.downloadExcelReport(startDate || undefined, endDate || undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Essence_Sales_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export Excel report.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const blob = await api.downloadPdfReport(startDate || undefined, endDate || undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Essence_Sales_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export PDF report.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const periods = [
    { id: 'today', label: 'Daily (Today)' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this_week', label: 'Weekly (This Week)' },
    { id: 'this_month', label: 'Monthly (This Month)' },
    { id: 'last_month', label: 'Last Month' },
  ];

  const summary = stats?.summary || {
    totalRevenue: 0,
    successfulTransactions: 0,
    failedPayments: 0,
    averageTransaction: 0,
    servicesSold: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-cream-300 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-obsidian-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-gold-600" />
            <span>Financial & Sales Reports</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Official transaction auditing, revenue accounting, and file export center
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Export Excel (.xlsx) */}
          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="flex-1 sm:flex-none py-2 px-3 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {isExportingExcel ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            )}
            <span>Export Excel (.xlsx)</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex-1 sm:flex-none py-2 px-3 rounded-xl gold-gradient text-white text-xs font-semibold hover:brightness-105 transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-sm space-y-3">
        {/* Preset Period Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                period === p.id
                  ? 'bg-gold-500 text-white shadow-sm'
                  : 'bg-cream-50 text-gray-600 border border-cream-200 hover:bg-cream-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Range Picker */}
        <form onSubmit={handleApplyFilter} className="flex flex-wrap items-center gap-2 pt-2 border-t border-cream-200 text-xs">
          <span className="text-gray-500 font-medium">Or Custom Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-1.5 rounded-lg border border-cream-300 bg-cream-50 text-gray-700 outline-none"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-1.5 rounded-lg border border-cream-300 bg-cream-50 text-gray-700 outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-cream-100 hover:bg-gold-500 hover:text-white font-semibold text-gray-700 transition"
          >
            Filter Range
          </button>
        </form>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-gray-400">
            Total Revenue (PAID)
          </span>
          <p className="text-xl font-bold text-obsidian-900 mt-1 font-mono">
            {formatKsh(summary.totalRevenue)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-gray-400">
            Completed Sales
          </span>
          <p className="text-xl font-bold text-obsidian-900 mt-1">
            {summary.successfulTransactions}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-gray-400">
            Average Ticket Size
          </span>
          <p className="text-xl font-bold text-obsidian-900 mt-1 font-mono">
            {formatKsh(summary.averageTransaction)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-gray-400">
            Total Services Rendered
          </span>
          <p className="text-xl font-bold text-obsidian-900 mt-1">
            {summary.servicesSold}
          </p>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Breakdown */}
        <div className="bg-white rounded-2xl border border-cream-300 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-cream-200">
            <h3 className="font-bold text-sm text-obsidian-900 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-gold-600" />
              <span>Service Sales Breakdown</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100 text-gray-700 font-bold uppercase tracking-wider text-[10px] border-b border-cream-200">
                <tr>
                  <th className="p-3">Service</th>
                  <th className="p-3 text-center">Quantity</th>
                  <th className="p-3 text-right">Gross Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200 text-gray-700">
                {stats?.topServices?.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-gray-400">
                      No records for this interval.
                    </td>
                  </tr>
                ) : (
                  stats?.topServices?.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-cream-50/70 transition">
                      <td className="p-3 font-semibold text-obsidian-900">
                        {item.name}
                      </td>
                      <td className="p-3 text-center font-bold">
                        {item.count}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-obsidian-900">
                        {formatKsh(item.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Staff Breakdown */}
        <div className="bg-white rounded-2xl border border-cream-300 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-cream-200">
            <h3 className="font-bold text-sm text-obsidian-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-gold-600" />
              <span>Staff Sales Breakdown</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100 text-gray-700 font-bold uppercase tracking-wider text-[10px] border-b border-cream-200">
                <tr>
                  <th className="p-3">Stylist / Cashier</th>
                  <th className="p-3 text-center">Sales Count</th>
                  <th className="p-3 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200 text-gray-700">
                {stats?.staffPerformance?.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-gray-400">
                      No records for this interval.
                    </td>
                  </tr>
                ) : (
                  stats?.staffPerformance?.map((staff: any) => (
                    <tr key={staff.id} className="hover:bg-cream-50/70 transition">
                      <td className="p-3 font-semibold text-obsidian-900">
                        {staff.name}
                      </td>
                      <td className="p-3 text-center font-bold">
                        {staff.count}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-obsidian-900">
                        {formatKsh(staff.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
