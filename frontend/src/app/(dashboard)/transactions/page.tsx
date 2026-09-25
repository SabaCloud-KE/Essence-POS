'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatKsh } from '@/lib/utils';
import {
  Receipt,
  Search,
  Filter,
  Eye,
  RotateCcw,
  FileDown,
  Printer,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

export default function TransactionsPage() {
  const { user, isAdmin } = useAuth();

  const [sales, setSales] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Transaction Drawer / Modal
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Admin Refund Modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const res = await api.getSales({
        page,
        limit,
        status: statusFilter || undefined,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setSales(res.data);
      setTotalRecords(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      console.error('Failed to fetch sales:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSales();
  };

  const openSaleDetails = async (id: number) => {
    setIsDetailLoading(true);
    try {
      const sale = await api.getSale(id);
      setSelectedSale(sale);
    } catch (err) {
      console.error('Failed to load sale details:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleDownloadReceipt = async (saleId: number, receiptNum: string) => {
    try {
      const blob = await api.downloadReceiptPdf(saleId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt_${receiptNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download receipt PDF.');
    }
  };

  const handleRefund = async () => {
    if (!selectedSale || !selectedSale.payments[0]) return;
    if (!refundReason.trim()) {
      setRefundError('Please provide a mandatory reason for this refund.');
      return;
    }

    setIsRefunding(true);
    setRefundError(null);

    try {
      await api.refundPayment(selectedSale.payments[0].id, refundReason);
      setShowRefundModal(false);
      setRefundReason('');
      // Refresh current sale & ledger
      await openSaleDetails(selectedSale.id);
      fetchSales();
    } catch (err: any) {
      setRefundError(err.message || 'Failed to refund transaction.');
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-cream-300 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-obsidian-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-gold-600" />
            <span>Transaction Ledger</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Complete, immutable audit records of all salon transactions and M-Pesa payments
          </p>
        </div>

        <div className="text-xs font-semibold text-gray-500 bg-cream-100 px-3 py-1.5 rounded-xl border border-cream-200">
          Total Records: <span className="text-obsidian-900 font-bold">{totalRecords}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search receipt no, M-Pesa ref, or phone..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-cream-300 outline-none focus:border-gold-500 bg-cream-50 focus:bg-white transition"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-cream-300 outline-none bg-cream-50 focus:bg-white text-gray-700 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {/* Date Start */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-cream-300 outline-none bg-cream-50 focus:bg-white text-gray-700"
            />
          </div>

          {/* Apply Filter Button */}
          <div>
            <button
              type="submit"
              className="w-full py-2 px-3 rounded-xl gold-gradient text-white font-semibold text-xs shadow-sm hover:brightness-105 transition flex items-center justify-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Apply Filters</span>
            </button>
          </div>
        </form>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-cream-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] min-h-[300px] custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-cream-100 text-gray-700 font-bold uppercase tracking-wider text-[10px] border-b border-cream-200 shadow-sm">
              <tr>
                <th className="p-3.5">Receipt No</th>
                <th className="p-3.5">Date & Time</th>
                <th className="p-3.5">Customer Phone</th>
                <th className="p-3.5">Staff</th>
                <th className="p-3.5">Services</th>
                <th className="p-3.5 text-right">Amount (KSh)</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200 text-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gold-500 mx-auto" />
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-gray-400">
                    No transactions match the selected criteria.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => {
                  const mpesaPayment = sale.payments?.find(
                    (p: any) => p.status === 'PAID' || p.mpesaReceiptNumber,
                  );

                  return (
                    <tr key={sale.id} className="hover:bg-cream-50/70 transition">
                      <td className="p-3.5 font-bold font-mono text-obsidian-900">
                        {sale.receiptNumber}
                      </td>
                      <td className="p-3.5 text-gray-500 whitespace-nowrap">
                        {format(new Date(sale.createdAt), 'dd MMM yyyy, HH:mm')}
                      </td>
                      <td className="p-3.5 font-mono">{sale.customerPhone}</td>
                      <td className="p-3.5 font-medium">{sale.user?.name}</td>
                      <td className="p-3.5 max-w-[200px] truncate" title={sale.items?.map((i: any) => i.serviceName).join(', ')}>
                        {sale.items?.map((i: any) => i.serviceName).join(', ')}
                      </td>
                      <td className="p-3.5 text-right font-bold text-obsidian-900 font-mono">
                        {formatKsh(sale.totalAmount)}
                      </td>
                      <td className="p-3.5 text-center">
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
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => openSaleDetails(sale.id)}
                          className="px-2.5 py-1 rounded-lg bg-cream-100 hover:bg-gold-500 hover:text-white text-gray-700 text-xs font-semibold transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-cream-200 flex items-center justify-between text-xs text-gray-600">
          <span>
            Showing page <span className="font-bold">{page}</span> of{' '}
            <span className="font-bold">{totalPages}</span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-cream-300 hover:bg-cream-100 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-cream-300 hover:bg-cream-100 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* TRANSACTION DETAIL MODAL */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-cream-300 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div>
                <h3 className="font-bold text-base text-obsidian-900">
                  Transaction Details
                </h3>
                <p className="text-xs font-mono text-gray-500">
                  {selectedSale.receiptNumber}
                </p>
              </div>

              <button
                onClick={() => setSelectedSale(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-2 bg-cream-50 p-3 rounded-xl border border-cream-200">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">
                    Date & Time
                  </span>
                  <span className="font-semibold text-gray-800">
                    {format(new Date(selectedSale.createdAt), 'dd MMMM yyyy, HH:mm')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">
                    Stylist / Cashier
                  </span>
                  <span className="font-semibold text-gray-800">
                    {selectedSale.user?.name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">
                    Customer Phone
                  </span>
                  <span className="font-mono font-semibold text-gray-800">
                    {selectedSale.customerPhone}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">
                    Sale Status
                  </span>
                  <span
                    className={`font-bold uppercase ${
                      selectedSale.status === 'PAID'
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {selectedSale.status}
                  </span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div>
                <h4 className="font-bold text-xs text-obsidian-900 mb-2 uppercase tracking-wider">
                  Services Delivered
                </h4>
                <div className="space-y-1.5">
                  {selectedSale.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-2 rounded-lg bg-cream-100/60"
                    >
                      <div>
                        <span className="font-semibold text-gray-800 block">
                          {item.serviceName}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatKsh(item.unitPrice)} x {item.quantity}
                        </span>
                      </div>
                      <span className="font-bold font-mono text-obsidian-900">
                        {formatKsh(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-2 border-t border-cream-200 flex justify-between font-bold text-sm text-obsidian-900">
                  <span>Total Amount</span>
                  <span className="text-base text-gold-700 font-mono">
                    {formatKsh(selectedSale.totalAmount)}
                  </span>
                </div>
              </div>

              {/* M-Pesa Payment Details */}
              <div>
                <h4 className="font-bold text-xs text-obsidian-900 mb-2 uppercase tracking-wider">
                  M-Pesa Gateway Records
                </h4>
                {selectedSale.payments?.length === 0 ? (
                  <p className="text-gray-400 italic">No M-Pesa record initiated.</p>
                ) : (
                  selectedSale.payments.map((payment: any) => (
                    <div
                      key={payment.id}
                      className="p-3 rounded-xl border border-cream-300 bg-cream-50 space-y-1 font-mono text-[11px]"
                    >
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-sans">Payment Status:</span>
                        <span className="font-bold uppercase text-emerald-700">
                          {payment.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-sans">M-Pesa Receipt:</span>
                        <span className="font-bold text-obsidian-900">
                          {payment.mpesaReceiptNumber || 'PENDING'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-sans">Checkout ID:</span>
                        <span className="text-gray-600 truncate max-w-[200px]" title={payment.checkoutRequestId}>
                          {payment.checkoutRequestId}
                        </span>
                      </div>
                      {payment.resultDescription && (
                        <div className="pt-1 text-gray-500 font-sans text-[10px]">
                          Result: {payment.resultDescription}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-cream-200 flex flex-wrap gap-2">
              <button
                onClick={() =>
                  handleDownloadReceipt(selectedSale.id, selectedSale.receiptNumber)
                }
                className="flex-1 py-2 px-3 rounded-xl bg-gold-500 text-white font-semibold text-xs hover:bg-gold-600 transition flex items-center justify-center gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Download PDF Receipt</span>
              </button>

              {isAdmin && selectedSale.status === 'PAID' && (
                <button
                  onClick={() => setShowRefundModal(true)}
                  className="py-2 px-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-semibold text-xs transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reverse / Refund</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADMIN REFUND / REVERSAL MODAL */}
      {showRefundModal && selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <AlertCircle className="w-5 h-5" />
              <span>Admin Payment Refund / Reversal</span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              You are about to mark transaction{' '}
              <strong className="font-mono">{selectedSale.receiptNumber}</strong> (
              {formatKsh(selectedSale.totalAmount)}) as <strong>REFUNDED</strong>. This action will update the financial ledger and record an audit log.
            </p>

            {refundError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium">
                {refundError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mandatory Reversal Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Client dissatisfied with service; manager approved full reversal."
                className="w-full p-2.5 text-xs rounded-xl border border-gray-300 outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRefund}
                disabled={isRefunding}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isRefunding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Refund & Record Audit'}
              </button>
              <button
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
