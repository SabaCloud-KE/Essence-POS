'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { formatKsh, validateKenyanPhone } from '@/lib/utils';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  FileDown,
  RefreshCw,
  Sparkles,
  Scissors,
  AlertCircle,
  Send,
  Loader2,
  Receipt as ReceiptIcon,
  LayoutGrid,
  Table as TableIcon,
  ArrowRight,
  ArrowLeft,
  X,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface ServiceItem {
  id: number;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
  description?: string;
  isActive: boolean;
}

interface CartItem {
  service: ServiceItem;
  quantity: number;
}

export default function PosPage() {
  const { user } = useAuth();
  const { joinSale, leaveSale, onPaymentUpdate } = useSocket();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  // View state: Grid vs Table view
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Mobile navigation tab state: Catalog vs Cart
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('0712345678');
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount] = useState<number>(0);

  // Active Transaction & Payment state
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSale, setActiveSale] = useState<any | null>(null);
  const [activePayment, setActivePayment] = useState<any | null>(null);
  const [paymentStep, setPaymentStep] = useState<
    'idle' | 'initiating' | 'awaiting_pin' | 'paid' | 'failed'
  >('idle');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [isSimulatorMode, setIsSimulatorMode] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Load active services and categories on mount
  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setIsLoadingServices(true);
    try {
      const [servicesData, categoriesData] = await Promise.all([
        api.getServices({ isActive: true }),
        api.getCategories(),
      ]);
      setServices(servicesData);
      setCategories(['All', ...categoriesData]);
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setIsLoadingServices(false);
    }
  };

  // Real-time WebSocket listener for payment status updates
  useEffect(() => {
    const cleanup = onPaymentUpdate((data: any) => {
      console.log('Real-time payment update received:', data);
      if (activeSale && data.saleId === activeSale.id) {
        if (data.isSimulation !== undefined) {
          setIsSimulatorMode(Boolean(data.isSimulation));
        }
        if (data.status === 'PAID') {
          setPaymentStep('paid');
          setPaymentMessage('M-Pesa Payment Confirmed! Printing receipt...');
          setActivePayment((prev: any) => ({
            ...prev,
            status: 'PAID',
            mpesaReceiptNumber: data.mpesaReceiptNumber,
          }));
          setActiveSale((prev: any) => ({ ...prev, status: 'PAID' }));
          setShowReceiptModal(true);
        } else if (['FAILED', 'CANCELLED', 'TIMEOUT'].includes(data.status)) {
          setPaymentStep('failed');
          setPaymentMessage(
            data.resultDescription ||
              (data.status === 'CANCELLED'
                ? 'Payment cancelled by customer on their phone.'
                : 'M-Pesa payment failed. Please retry.'),
          );
        }
      }
    });

    return () => cleanup();
  }, [activeSale, onPaymentUpdate]);

  // Cart operations
  const addToCart = (service: ServiceItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.service.id === service.id);
      if (existing) {
        return prev.map((item) =>
          item.service.id === service.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { service, quantity: 1 }];
    });
  };

  const updateQuantity = (serviceId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.service.id === serviceId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const removeFromCart = (serviceId: number) => {
    setCart((prev) => prev.filter((item) => item.service.id !== serviceId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setActiveSale(null);
    setActivePayment(null);
    setPaymentStep('idle');
    setPaymentMessage('');
    setShowReceiptModal(false);
  };

  // Computations
  const subtotal = cart.reduce(
    (sum, item) => sum + item.service.price * item.quantity,
    0,
  );
  const totalAmount = Math.max(0, subtotal - discount);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Phone validation (Kenyan Safaricom/Airtel format)
  const phoneValidation = validateKenyanPhone(customerPhone);

  // Filter services by category and search term
  const filteredServices = services.filter((s) => {
    const matchesCategory =
      selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description &&
        s.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Handle M-Pesa STK Push Checkout
  const handlePayWithMpesa = async () => {
    if (!phoneValidation.isValid) {
      alert('Please enter a valid Kenyan phone number (e.g. 0712345678).');
      return;
    }

    if (cart.length === 0) {
      alert('Your register is empty. Please select services before checking out.');
      return;
    }

    setIsProcessing(true);
    setPaymentStep('initiating');
    setPaymentMessage('Connecting to Safaricom Daraja Gateway...');

    try {
      // 1. Create Sale record in database
      const sale = await api.createSale({
        customerPhone: phoneValidation.formatted,
        customerName: customerName.trim() || undefined,
        discount: discount > 0 ? discount : undefined,
        items: cart.map((item) => ({
          serviceId: item.service.id,
          quantity: item.quantity,
        })),
      });

      setActiveSale(sale);

      // Join real-time WebSocket room for this specific sale
      joinSale(sale.id);

      // 2. Initiate STK Push via Backend M-Pesa Service
      setPaymentMessage('Connecting to Safaricom Daraja Gateway...');
      const stkResponse = await api.initiateStkPush({
        saleId: sale.id,
        phoneNumber: phoneValidation.formatted,
      });

      setActivePayment(stkResponse.payment || stkResponse);
      setIsSimulatorMode(Boolean(stkResponse.isSimulation));
      setPaymentStep('awaiting_pin');
      setPaymentMessage(stkResponse.customerMessage || 'Awaiting customer to enter M-Pesa PIN...');
    } catch (err: any) {
      console.error('Payment checkout failure:', err);
      setPaymentStep('failed');
      setPaymentMessage(
        err.message || 'Failed to initiate M-Pesa STK Push. Please verify details and retry.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Dev simulation helpers for testing Safaricom responses locally
  const handleSimulatePinEntry = async (resultCode: number) => {
    if (!activePayment?.checkoutRequestId) return;
    try {
      await api.simulateCallback({
        checkoutRequestId: activePayment.checkoutRequestId,
        resultCode,
      });
    } catch (err: any) {
      console.error('Simulation error:', err);
    }
  };

  const handleDownloadReceiptPdf = async () => {
    if (!activeSale) return;
    setIsDownloadingPdf(true);
    try {
      const blob = await api.downloadReceiptPdf(activeSale.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt_${activeSale.receiptNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* MOBILE SEGMENTED VIEW SWITCHER: Catalog vs Cart */}
      <div className="lg:hidden flex rounded-2xl bg-cream-200/80 p-1 shadow-inner no-print">
        <button
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
            mobileTab === 'catalog'
              ? 'bg-white text-obsidian-900 shadow-sm'
              : 'text-gray-600 hover:text-obsidian-900'
          }`}
        >
          <Scissors className="w-3.5 h-3.5 text-gold-600" />
          <span>Services Catalog ({filteredServices.length})</span>
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
            mobileTab === 'cart'
              ? 'bg-gold-500 text-white shadow-sm'
              : 'text-gray-600 hover:text-obsidian-900'
          }`}
        >
          <ReceiptIcon className="w-3.5 h-3.5" />
          <span>Current Sale ({totalItemCount})</span>
          {cart.length > 0 && (
            <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full font-mono">
              {formatKsh(totalAmount)}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ======================================================== */}
        {/* LEFT / CENTER: Service Catalog Area                      */}
        {/* ======================================================== */}
        <div
          className={`flex-1 w-full space-y-4 ${
            mobileTab === 'cart' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* UPPER PART: STICKY TITLE, SEARCH, VIEW TOGGLE, CATEGORIES */}
          <div className="sticky top-16 z-20 bg-[#FAF7F2]/95 backdrop-blur-md pb-3 pt-1 space-y-3 border-b border-cream-300/80 -mx-1 px-1">
            {/* Header & Search */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-cream-300 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-obsidian-900 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-gold-600 hidden sm:inline" />
                  <span>Salon Services Register</span>
                  <span className="text-xs bg-gold-100 text-gold-800 font-semibold px-2 py-0.5 rounded-full border border-gold-300">
                    {filteredServices.length} available
                  </span>
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Tap services to add to current client register
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Search Bar */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search braids, styling, cuts..."
                    className="w-full pl-9 pr-7 py-2 bg-cream-50 rounded-xl border border-cream-300 text-xs sm:text-sm focus:border-gold-500 focus:bg-white outline-none transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* View Mode Switcher (Grid vs Table) */}
                <div className="flex items-center bg-cream-100 p-1 rounded-xl border border-cream-200 shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition ${
                      viewMode === 'grid'
                        ? 'bg-white text-gold-700 shadow-sm font-semibold'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                    title="Grid Cards View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg transition ${
                      viewMode === 'table'
                        ? 'bg-white text-gold-700 shadow-sm font-semibold'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                    title="Compact Table View"
                  >
                    <TableIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Category Filter Pills (Scrollable horizontally) */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex-shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-gold-500 text-white font-semibold shadow-sm'
                      : 'bg-white text-gray-600 border border-cream-300 hover:bg-cream-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SCROLLABLE CATALOG AREA: GRID VIEW OR TABLE VIEW         */}
          {/* ======================================================== */}
          <div className="overflow-y-auto max-h-[calc(100vh-270px)] sm:max-h-[calc(100vh-250px)] pr-1 custom-scrollbar">
            {isLoadingServices ? (
              <div className="h-64 flex items-center justify-center bg-white rounded-2xl border border-cream-300">
                <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-cream-300 text-center p-6">
                <Scissors className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-600">No services found</p>
                <p className="text-xs text-gray-400">Try adjusting your search query</p>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID CARDS VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 pb-24 lg:pb-4 pt-1">
                {filteredServices.map((service) => {
                  const inCart = cart.find((i) => i.service.id === service.id);

                  return (
                    <div
                      key={service.id}
                      onClick={() => addToCart(service)}
                      className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer select-none flex flex-col justify-between hover:shadow-md hover:border-gold-400 relative overflow-hidden group ${
                        inCart
                          ? 'border-gold-500 bg-gold-50/20 ring-1 ring-gold-400'
                          : 'border-cream-300'
                      }`}
                    >
                      {inCart && (
                        <div className="absolute top-2 right-2 bg-gold-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          {inCart.quantity} in cart
                        </div>
                      )}

                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-700 bg-gold-50 px-2 py-0.5 rounded border border-gold-200">
                          {service.category}
                        </span>
                        <h3 className="font-bold text-sm text-obsidian-900 mt-2 line-clamp-1 group-hover:text-gold-700 transition">
                          {service.name}
                        </h3>
                        {service.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                            {service.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-cream-100">
                        <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>{service.durationMinutes}m</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-obsidian-900">
                            {formatKsh(service.price)}
                          </span>
                          <div className="w-7 h-7 rounded-lg bg-gold-50 border border-gold-200 text-gold-700 flex items-center justify-center group-hover:bg-gold-500 group-hover:text-white transition shadow-sm">
                            <Plus className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* COMPACT TABLE VIEW WITH STICKY HEADER */
              <div className="bg-white rounded-2xl border border-cream-300 shadow-sm overflow-hidden pb-24 lg:pb-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-cream-100 text-gray-700 font-bold uppercase tracking-wider text-[10px] border-b border-cream-200 shadow-sm">
                      <tr>
                        <th className="p-3">Service Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-200">
                      {filteredServices.map((service) => {
                        const inCart = cart.find((i) => i.service.id === service.id);

                        return (
                          <tr
                            key={service.id}
                            onClick={() => addToCart(service)}
                            className={`hover:bg-gold-50/40 cursor-pointer transition select-none ${
                              inCart ? 'bg-gold-50/25' : ''
                            }`}
                          >
                            <td className="p-3">
                              <div className="font-bold text-obsidian-900 text-xs sm:text-sm">
                                {service.name}
                              </div>
                              {service.description && (
                                <div className="text-[11px] text-gray-500 line-clamp-1 max-w-xs sm:max-w-md">
                                  {service.description}
                                </div>
                              )}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-700 bg-gold-50 px-2 py-0.5 rounded border border-gold-200">
                                {service.category}
                              </span>
                            </td>
                            <td className="p-3 text-gray-500 whitespace-nowrap">
                              <span className="flex items-center gap-1 font-mono text-[11px]">
                                <Clock className="w-3 h-3 text-gray-400" />
                                {service.durationMinutes}m
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-obsidian-900 whitespace-nowrap font-mono text-xs sm:text-sm">
                              {formatKsh(service.price)}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(service);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 mx-auto ${
                                  inCart
                                    ? 'bg-gold-500 text-white shadow-sm'
                                    : 'bg-gold-50 text-gold-700 border border-gold-200 hover:bg-gold-500 hover:text-white'
                                }`}
                              >
                                <Plus className="w-3 h-3" />
                                <span>{inCart ? `${inCart.quantity} in cart` : 'Add'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT: Cart & M-Pesa Checkout Panel                      */}
        {/* ======================================================== */}
        <div
          className={`w-full lg:w-96 flex flex-col ${
            mobileTab === 'catalog' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Back to Catalog button on mobile */}
          <button
            onClick={() => setMobileTab('catalog')}
            className="lg:hidden flex items-center gap-1.5 text-xs font-semibold text-gold-700 bg-gold-50 border border-gold-200 px-3 py-2 rounded-xl mb-3 hover:bg-gold-100 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Back to Services Catalog</span>
          </button>

          <div className="bg-white rounded-2xl border border-cream-300 shadow-md p-4 sm:p-5 flex flex-col sticky top-20">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div>
                <h2 className="font-bold text-base text-obsidian-900 flex items-center gap-2">
                  <span>Current Sale</span>
                  {totalItemCount > 0 && (
                    <span className="text-xs bg-gold-100 text-gold-800 font-bold px-2 py-0.5 rounded-full">
                      {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-500">
                  Cashier: <span className="font-semibold text-gray-700">{user?.name}</span>
                </p>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Cart Items List (Scrollable) */}
            <div className="py-3 flex-1 overflow-y-auto max-h-[260px] sm:max-h-[300px] space-y-2.5 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="text-center py-10">
                  <ReceiptIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-600">Register is empty</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Select services from the catalog to proceed
                  </p>
                </div>
              ) : (
                cart.map(({ service, quantity }) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-cream-50 border border-cream-200"
                  >
                    <div className="flex-1 pr-2">
                      <p className="text-xs font-bold text-obsidian-900 leading-snug">
                        {service.name}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {formatKsh(service.price)} each
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-white rounded-lg border border-cream-300 shadow-sm">
                        <button
                          onClick={() => updateQuantity(service.id, -1)}
                          className="p-1 hover:text-rose-600 transition"
                          title="Decrease"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-6 text-center">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(service.id, 1)}
                          className="p-1 hover:text-gold-600 transition"
                          title="Increase"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs font-bold text-obsidian-900 w-16 text-right">
                        {formatKsh(service.price * quantity)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer Phone & Checkout Details */}
            {cart.length > 0 && (
              <div className="pt-3 border-t border-cream-200 space-y-3">
                {/* Customer Phone Input (Required for M-Pesa) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Customer M-Pesa Phone <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0712345678"
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border outline-none font-mono transition ${
                        phoneValidation.isValid
                          ? 'border-emerald-400 bg-emerald-50/20'
                          : 'border-cream-300 bg-white'
                      }`}
                    />
                  </div>
                  <p
                    className={`text-[11px] mt-1 font-medium ${
                      phoneValidation.isValid ? 'text-emerald-600' : 'text-gray-400'
                    }`}
                  >
                    {phoneValidation.message}
                  </p>
                </div>

                {/* Customer Name (Optional) */}
                <div>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name (Optional)"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-cream-300 bg-cream-50 focus:bg-white outline-none transition"
                  />
                </div>

                {/* Discount Input */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Discount (KSh)</span>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    value={discount || ''}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-20 px-2 py-1 text-right text-xs rounded-lg border border-cream-300 outline-none"
                  />
                </div>

                {/* Summary Totals */}
                <div className="bg-cream-100 p-3 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-semibold">{formatKsh(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount</span>
                      <span className="font-semibold">-{formatKsh(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-obsidian-900 pt-1.5 border-t border-cream-300">
                    <span>Total (KSh)</span>
                    <span className="text-base text-gold-700 font-mono">
                      {formatKsh(totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Notice: M-Pesa Only */}
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>M-Pesa Only:</strong> Cash or card payments are disabled. Sale is confirmed upon webhook PIN verification.
                  </span>
                </div>

                {/* Big "Pay with M-Pesa" Button */}
                <button
                  onClick={handlePayWithMpesa}
                  disabled={isProcessing || !phoneValidation.isValid || cart.length === 0}
                  className="w-full py-3.5 px-4 rounded-xl gold-gradient text-white font-bold text-sm shadow-md hover:brightness-105 active:brightness-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing M-Pesa...</span>
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-5 h-5" />
                      <span>Pay with M-Pesa • {formatKsh(totalAmount)}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FLOATING ACTION BAR FOR MOBILE (When items in cart and browsing catalog) */}
      {mobileTab === 'catalog' && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-30 animate-in slide-in-from-bottom-3 duration-200 no-print">
          <button
            onClick={() => setMobileTab('cart')}
            className="w-full py-3.5 px-5 rounded-2xl gold-gradient text-white shadow-2xl flex items-center justify-between font-bold text-sm border border-gold-300/40"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-mono font-bold">
                {totalItemCount}
              </span>
              <span>View Current Sale</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base">{formatKsh(totalAmount)}</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-lg flex items-center gap-1 font-semibold">
                Pay <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>
        </div>
      )}

      {/* MODAL: M-Pesa STK Push Progress & Awaiting PIN */}
      {paymentStep !== 'idle' && !showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-cream-300 relative text-center max-h-[90vh] overflow-y-auto custom-scrollbar">
            {paymentStep === 'initiating' && (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-gold-50 border-2 border-gold-300 flex items-center justify-center mx-auto text-gold-600">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <h3 className="text-lg font-bold text-obsidian-900">
                  Initiating Safaricom STK Push
                </h3>
                <p className="text-xs text-gray-500">{paymentMessage}</p>
              </div>
            )}

            {paymentStep === 'awaiting_pin' && (
              <div className="space-y-5">
                <div
                  className={`w-20 h-20 rounded-full border-2 flex items-center justify-center mx-auto relative ${
                    isSimulatorMode
                      ? 'bg-amber-50 border-amber-300 text-amber-600'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-600'
                  }`}
                >
                  <Smartphone className="w-10 h-10 animate-bounce" />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isSimulatorMode ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-4 w-4 ${
                        isSimulatorMode ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    ></span>
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-obsidian-900">
                    {isSimulatorMode ? 'Simulated STK Push Sent' : 'STK Push Dispatched to Phone!'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Customer phone: <span className="font-mono font-bold text-obsidian-900">{customerPhone}</span>
                  </p>
                  <p className="text-sm font-bold text-gold-700 mt-1">
                    Amount: {formatKsh(totalAmount)}
                  </p>
                </div>

                {isSimulatorMode ? (
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 text-left leading-relaxed">
                    <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      Offline Training Simulator Mode
                    </div>
                    STK push was not sent to the customer's physical phone because Simulator Mode is active. Use the simulation buttons below to test payment completion.
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 text-left leading-relaxed">
                    <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Live Safaricom Daraja Dispatch
                    </div>
                    📲 Safaricom PIN dialog is now active on the customer handset (<strong>{customerPhone}</strong>). Please ask the client to enter their M-Pesa PIN.
                  </div>
                )}

                {/* Simulation Control Bar */}
                <div className="pt-3 border-t border-cream-200 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      🛠️ {isSimulatorMode ? 'Simulator Actions' : 'Testing / Fallback Actions'}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Simulate client phone response
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSimulatePinEntry(0)}
                      className="py-2 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>PIN Entered (Paid)</span>
                    </button>
                    <button
                      onClick={() => handleSimulatePinEntry(1032)}
                      className="py-2 px-3 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel PIN</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setPaymentStep('idle')}
                  className="text-xs text-gray-400 hover:text-gray-600 transition"
                >
                  Dismiss prompt window (Payment continues waiting in background)
                </button>
              </div>
            )}

            {paymentStep === 'failed' && (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-rose-50 border-2 border-rose-300 flex items-center justify-center mx-auto text-rose-600">
                  <XCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-obsidian-900">
                  Payment Unsuccessful
                </h3>
                <div className="text-xs text-rose-700 font-medium bg-rose-50 p-3.5 rounded-xl border border-rose-200 text-left space-y-2">
                  <p>{paymentMessage}</p>

                  {(paymentMessage.toLowerCase().includes('credentials') ||
                    paymentMessage.toLowerCase().includes('consumer key') ||
                    paymentMessage.toLowerCase().includes('safaricom') ||
                    paymentMessage.toLowerCase().includes('settings')) && (
                    <div className="pt-2 border-t border-rose-200">
                      <Link
                        href="/settings"
                        className="inline-flex items-center gap-1.5 font-bold text-rose-800 underline hover:text-rose-950"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Configure Safaricom Daraja in Settings &rarr;</span>
                      </Link>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePayWithMpesa}
                    className="flex-1 py-2.5 rounded-xl gold-gradient text-white font-semibold text-xs transition"
                  >
                    Retry M-Pesa Payment
                  </button>
                  <button
                    onClick={() => setPaymentStep('idle')}
                    className="px-4 py-2.5 rounded-xl border border-cream-300 text-gray-700 text-xs font-semibold hover:bg-cream-100 transition"
                  >
                    Back to Cart
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Digital Receipt (Printable / PDF) */}
      {showReceiptModal && activeSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 no-print-backdrop">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-cream-300 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Header Controls */}
            <div className="flex items-center justify-between pb-3 border-b border-cream-200 no-print">
              <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Payment Confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadReceiptPdf}
                  disabled={isDownloadingPdf}
                  className="p-2 rounded-lg bg-cream-100 hover:bg-cream-200 text-obsidian-900 text-xs flex items-center gap-1 font-semibold transition"
                  title="Download Receipt PDF"
                >
                  <FileDown className="w-4 h-4" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="p-2 rounded-lg bg-gold-500 hover:bg-gold-600 text-white text-xs flex items-center gap-1 font-semibold transition"
                  title="Print Thermal Receipt"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {/* Thermal Printable Receipt Content */}
            <div className="py-4 text-center font-mono print-only" id="printable-receipt">
              <h2 className="font-bold text-base text-obsidian-900 tracking-wider">
                ESSENCE HAIR & BEAUTY
              </h2>
              <p className="text-xs font-medium text-gray-600">SALON & SPA</p>
              <p className="text-[11px] text-gray-500">Corner Plaza, Suite 4B, Nairobi, Kenya</p>
              <p className="text-[11px] text-gray-500">Tel: +254 700 123 456</p>

              <div className="my-3 border-b border-dashed border-gray-300" />

              <div className="text-left text-xs space-y-1 text-gray-700">
                <div className="flex justify-between">
                  <span>Receipt No:</span>
                  <span className="font-bold">{activeSale.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{format(new Date(), 'dd MMM yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span>{format(new Date(), 'HH:mm:ss')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Served By:</span>
                  <span>{user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{activeSale.customerPhone}</span>
                </div>
              </div>

              <div className="my-3 border-b border-dashed border-gray-300" />

              {/* Itemized Table */}
              <div className="text-left text-xs space-y-2">
                <div className="flex justify-between font-bold text-obsidian-900 pb-1 border-b border-gray-200">
                  <span>Services</span>
                  <span>Amount</span>
                </div>
                {activeSale.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-gray-800">
                    <span>
                      {item.serviceName} x{item.quantity}
                    </span>
                    <span>{formatKsh(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="my-3 border-b border-dashed border-gray-300" />

              {/* Totals */}
              <div className="text-left text-xs space-y-1.5">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatKsh(activeSale.subtotal)}</span>
                </div>
                {activeSale.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount</span>
                    <span>-{formatKsh(activeSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-obsidian-900 pt-1 border-t border-gray-300">
                  <span>TOTAL</span>
                  <span className="text-base font-mono">{formatKsh(activeSale.totalAmount)}</span>
                </div>
              </div>

              <div className="my-3 border-b border-dashed border-gray-300" />

              {/* M-Pesa Record */}
              <div className="text-left text-xs space-y-1 text-gray-700">
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-bold text-emerald-700">M-PESA</span>
                </div>
                <div className="flex justify-between">
                  <span>M-Pesa Receipt:</span>
                  <span className="font-bold text-obsidian-900 font-mono">
                    {activePayment?.mpesaReceiptNumber || 'CONFIRMED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span className="font-mono">{activeSale.customerPhone}</span>
                </div>
              </div>

              <div className="my-4 border-b border-dashed border-gray-300" />

              <p className="text-xs italic text-gray-600">
                Thank you for choosing Essence Hair & Beauty Salon.
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                We look forward to serving you again!
              </p>
            </div>

            {/* Bottom New Sale Button */}
            <div className="pt-3 border-t border-cream-200 no-print">
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  clearCart();
                }}
                className="w-full py-3 rounded-xl gold-gradient text-white font-bold text-sm shadow-md hover:brightness-105 transition"
              >
                Start Next Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
