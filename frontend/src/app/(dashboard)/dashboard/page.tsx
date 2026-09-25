'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { formatKsh } from '@/lib/utils';
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Scissors,
  Users,
  CreditCard,
  ArrowUpRight,
  Download,
  Calendar,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { onPaymentUpdate, joinAdmin } = useSocket();

  const [period, setPeriod] = useState<string>('today');
  const [stats, setStats] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async (selectedPeriod = period) => {
    try {
      const data = await api.getDashboardStats(selectedPeriod);
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(period);
    joinAdmin();
  }, [period]);

  // Real-time listener: refresh metrics when payment occurs
  useEffect(() => {
    const cleanup = onPaymentUpdate(() => {
      fetchStats(period);
    });
    return () => cleanup();
  }, [period, onPaymentUpdate]);

  const periods = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
  ];

  if (isLoading && !stats) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    );
  }

  const summary = stats?.summary || {
    totalRevenue: 0,
    successfulTransactions: 0,
    failedPayments: 0,
    pendingPayments: 0,
    averageTransaction: 0,
    servicesSold: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Period Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-cream-300 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-obsidian-900">Executive Dashboard</h1>
            <span className="bg-gold-50 text-gold-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-gold-300">
              Live M-Pesa Telemetry
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time financial sales, transaction velocity, and staff performance
          </p>
        </div>

        {/* Period Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-cream-100 p-1 rounded-xl border border-cream-200 overflow-x-auto w-full sm:w-auto">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPeriod(p.id);
                fetchStats(p.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                period === p.id
                  ? 'bg-white text-obsidian-900 shadow-sm border border-cream-300'
                  : 'text-gray-600 hover:text-obsidian-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Total Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-sm hover:border-gold-400 transition">
          <div className="flex items-center justify-between text-gold-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Total Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-gold-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-gold-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-obsidian-900">
            {formatKsh(summary.totalRevenue)}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-1">
            <ArrowUpRight className="w-3 h-3" /> M-Pesa Settled
          </span>
        </div>

        {/* Successful Txns */}
        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-sm hover:border-emerald-300 transition">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Successful
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-obsidian-900">
            {summary.successfulTransactions}
          </p>
          <span className="text-[10px] text-gray-400 mt-1 block">Completed sales</span>
        </div>

        {/* Failed Payments */}
        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-sm hover:border-rose-300 transition">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Failed / Cancelled
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-obsidian-900">
            {summary.failedPayments}
          </p>
          <span className="text-[10px] text-rose-500 mt-1 block">Unsuccessful PINs</span>
        </div>

        {/* Pending Payments */}
        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-sm hover:border-amber-300 transition">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Pending
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-obsidian-900">
            {summary.pendingPayments}
          </p>
          <span className="text-[10px] text-amber-600 mt-1 block">Awaiting confirmation</span>
        </div>

        {/* Average Transaction */}
        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-sm hover:border-purple-300 transition">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Average Sale
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-obsidian-900">
            {formatKsh(summary.averageTransaction)}
          </p>
          <span className="text-[10px] text-gray-400 mt-1 block">Per customer ticket</span>
        </div>

        {/* Services Sold */}
        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-sm hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Services Done
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-obsidian-900">
            {summary.servicesSold}
          </p>
          <span className="text-[10px] text-gray-400 mt-1 block">Client treatments</span>
        </div>
      </div>

      {/* Visual Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services by Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-cream-300 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-sm text-obsidian-900 flex items-center gap-1.5">
                <Scissors className="w-4 h-4 text-gold-600" />
                <span>Top Performing Services</span>
              </h2>
              <p className="text-xs text-gray-500">Ranked by gross sales volume</p>
            </div>
            <Link
              href="/reports"
              className="text-xs text-gold-600 hover:text-gold-700 font-semibold"
            >
              View Full Report →
            </Link>
          </div>

          <div className="space-y-3">
            {stats?.topServices?.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">
                No services sold in this period.
              </p>
            ) : (
              stats?.topServices?.map((item: any, idx: number) => {
                const maxRev = stats.topServices[0]?.revenue || 1;
                const percentage = Math.min(100, Math.round((item.revenue / maxRev) * 100));

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-obsidian-900">
                        {item.name}{' '}
                        <span className="text-gray-400 font-normal">
                          (x{item.count})
                        </span>
                      </span>
                      <span className="text-gold-700 font-mono">
                        {formatKsh(item.revenue)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-cream-100 rounded-full overflow-hidden">
                      <div
                        className="h-full gold-gradient rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Staff Sales Performance */}
        <div className="bg-white p-5 rounded-2xl border border-cream-300 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-sm text-obsidian-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-gold-600" />
                <span>Staff Sales Breakdown</span>
              </h2>
              <p className="text-xs text-gray-500">Sales volume per stylist / cashier</p>
            </div>
            <Link
              href="/reports"
              className="text-xs text-gold-600 hover:text-gold-700 font-semibold"
            >
              Export Report →
            </Link>
          </div>

          <div className="space-y-3">
            {stats?.staffPerformance?.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">
                No staff sales recorded for this period.
              </p>
            ) : (
              stats?.staffPerformance?.map((staff: any) => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-cream-50 border border-cream-200"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full gold-gradient text-white font-bold text-xs flex items-center justify-center shadow-sm">
                      {staff.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-obsidian-900">{staff.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {staff.count} completed ticket(s)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-obsidian-900 font-mono">
                      {formatKsh(staff.revenue)}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      Paid in Full
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-2xl border border-cream-300 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-cream-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-obsidian-900">Recent M-Pesa Sales</h2>
            <p className="text-xs text-gray-500">Real-time payment audit log</p>
          </div>
          <Link
            href="/transactions"
            className="text-xs font-semibold text-gold-600 hover:text-gold-700"
          >
            View All Transactions →
          </Link>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[300px] custom-scrollbar">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="sticky top-0 z-10 bg-cream-100 text-gray-700 font-bold uppercase tracking-wider text-[10px] border-b border-cream-200 shadow-sm">
              <tr>
                <th className="p-3.5 whitespace-nowrap">Receipt No</th>
                <th className="p-3.5 whitespace-nowrap">Date & Time</th>
                <th className="p-3.5 whitespace-nowrap">Staff</th>
                <th className="p-3.5 whitespace-nowrap">Phone</th>
                <th className="p-3.5 whitespace-nowrap">M-Pesa Ref</th>
                <th className="p-3.5 text-right whitespace-nowrap">Amount</th>
                <th className="p-3.5 text-center whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200 text-gray-700">
              {stats?.recentSales?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                stats?.recentSales?.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-cream-50/60 transition">
                    <td className="p-3.5 font-bold font-mono text-obsidian-900 whitespace-nowrap">
                      {sale.receiptNumber}
                    </td>
                    <td className="p-3.5 text-gray-500 whitespace-nowrap">
                      {format(new Date(sale.createdAt), 'dd MMM, HH:mm')}
                    </td>
                    <td className="p-3.5 font-medium whitespace-nowrap">{sale.staff}</td>
                    <td className="p-3.5 font-mono whitespace-nowrap">{sale.customerPhone}</td>
                    <td className="p-3.5 font-mono font-semibold text-obsidian-900 whitespace-nowrap">
                      {sale.mpesaReceipt}
                    </td>
                    <td className="p-3.5 text-right font-bold text-obsidian-900 font-mono whitespace-nowrap">
                      {formatKsh(sale.amount)}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          sale.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : sale.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {sale.status}
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
}
