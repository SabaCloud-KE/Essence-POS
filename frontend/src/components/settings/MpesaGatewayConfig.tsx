'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { validateKenyanPhone } from '@/lib/utils';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sliders,
  Eye,
  EyeOff,
  Zap,
  Send,
  Radio,
  ExternalLink,
  X,
  ShieldCheck,
  Server,
  HelpCircle,
} from 'lucide-react';

interface MpesaGatewayConfigProps {
  settingsData: any;
  onRefresh: () => Promise<void>;
}

export default function MpesaGatewayConfig({ settingsData, onRefresh }: MpesaGatewayConfigProps) {
  const env = settingsData?.environment;
  const isProd = env?.isProduction;
  const isConfigured = Boolean(env?.isConfigured);
  const simulationMode = Boolean(env?.simulationMode);

  // Modal states
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showTestStkModal, setShowTestStkModal] = useState(false);

  // Configuration form state
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [shortcode, setShortcode] = useState('');
  const [transactionType, setTransactionType] = useState('CustomerPayBillOnline');
  const [passkey, setPasskey] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('');
  const [formSimulationMode, setFormSimulationMode] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Connection test state
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    connected?: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  // Test STK push state
  const [testPhone, setTestPhone] = useState('0726697962');
  const [testAmount, setTestAmount] = useState('1');
  const [isSendingStk, setIsSendingStk] = useState(false);
  const [stkResponse, setStkResponse] = useState<any>(null);
  const [stkError, setStkError] = useState<string | null>(null);

  // Phone validation for test push
  const phoneValidation = validateKenyanPhone(testPhone);

  // Initialize form when settings load or modal opens
  const initForm = () => {
    if (env) {
      setEnvironment(env.mpesaEnvironment === 'production' ? 'production' : 'sandbox');
      setShortcode(env.mpesaShortcode || '174379');
      setTransactionType(env.mpesaTransactionType || 'CustomerPayBillOnline');
      setCallbackUrl(env.mpesaCallbackUrl || 'http://localhost:4000/api/payments/mpesa/callback');
      setFormSimulationMode(Boolean(env.simulationMode));
      setPasskey('');
      setConsumerKey('');
      setConsumerSecret('');
    }
  };

  useEffect(() => {
    initForm();
  }, [env]);

  const handleOpenConfigModal = () => {
    initForm();
    setSaveError(null);
    setSaveSuccess(null);
    setShowConfigModal(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await api.updateMpesaSettings({
        environment,
        shortcode: shortcode.trim(),
        transactionType,
        passkey: passkey.trim() || undefined,
        consumerKey: consumerKey.trim() || undefined,
        consumerSecret: consumerSecret.trim() || undefined,
        callbackUrl: callbackUrl.trim() || undefined,
        simulationMode: formSimulationMode,
      });

      setSaveSuccess('M-Pesa Gateway parameters successfully updated!');
      await onRefresh();
      setTimeout(() => {
        setShowConfigModal(false);
        setSaveSuccess(null);
      }, 1200);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save M-Pesa configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const res = await api.testMpesaConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Failed to reach Safaricom Daraja Gateway.',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSendTestStk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneValidation.isValid) return;

    setIsSendingStk(true);
    setStkResponse(null);
    setStkError(null);

    try {
      const res = await api.testMpesaStkPush(phoneValidation.formatted, Number(testAmount) || 1);
      setStkResponse(res);
    } catch (err: any) {
      setStkError(err.message || 'Failed to dispatch test STK push.');
    } finally {
      setIsSendingStk(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-300 shadow-sm p-6 flex flex-col justify-between">
      <div>
        {/* Header with Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-cream-200 mb-4 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-obsidian-900">M-Pesa Daraja Gateway</h2>
              <p className="text-[11px] text-gray-500">Safaricom Express STK Push Integration</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Badge */}
            {simulationMode ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Simulator Mode
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Daraja API
              </span>
            )}

            {/* Env Badge */}
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                isProd ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-gray-100 text-gray-800 border border-gray-200'
              }`}
            >
              {env?.mpesaEnvironment || 'SANDBOX'}
            </span>
          </div>
        </div>

        {/* Credentials Status Callout */}
        {!simulationMode && !isConfigured && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">Safaricom API Credentials Missing</div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                To send real STK push prompts to customer phones, configure your Safaricom Consumer Key & Consumer Secret.
              </p>
              <button
                type="button"
                onClick={handleOpenConfigModal}
                className="text-[11px] font-bold text-amber-900 underline hover:text-black inline-flex items-center gap-1 mt-1"
              >
                <span>Add Credentials Now</span> &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Parameter Details List */}
        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between py-1.5 border-b border-cream-100">
            <span className="text-gray-500">Shortcode / Till:</span>
            <span className="font-mono font-bold text-obsidian-900">
              {env?.mpesaShortcode || '174379'}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-cream-100">
            <span className="text-gray-500">Transaction Type:</span>
            <span className="font-semibold text-obsidian-900">
              {env?.mpesaTransactionType === 'CustomerBuyGoodsOnline' ? 'Buy Goods Till' : 'Paybill (174379 / Paybill)'}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-cream-100">
            <span className="text-gray-500">Gateway Status:</span>
            <span className={`font-semibold flex items-center gap-1 ${isConfigured || simulationMode ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isConfigured ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active & Configured
                </>
              ) : simulationMode ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> Offline Simulator Active
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Credentials Required
                </>
              )}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-cream-100">
            <span className="text-gray-500">Primary Currency:</span>
            <span className="font-bold text-obsidian-900">KSh (KES)</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-cream-100">
            <span className="text-gray-500">Operating Timezone:</span>
            <span className="font-bold text-obsidian-900">Africa/Nairobi (UTC+3)</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-cream-100">
            <span className="text-gray-500">Callback Endpoint:</span>
            <span className="font-mono text-[10px] text-gray-600 truncate max-w-[200px]" title={env?.mpesaCallbackUrl}>
              {env?.mpesaCallbackUrl || '/api/payments/mpesa/callback'}
            </span>
          </div>
        </div>

        {/* Live Test Connection Result Alert */}
        {testResult && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs leading-relaxed ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold mb-0.5">
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{testResult.success ? 'Gateway Verified' : 'Gateway Test Failed'}</span>
            </div>
            <p className="text-[11px] text-gray-700">
              {testResult.message || testResult.error}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons Bar */}
      <div className="mt-5 pt-4 border-t border-cream-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleOpenConfigModal}
          className="py-2 px-3 rounded-xl gold-gradient text-white font-bold text-xs shadow-sm hover:brightness-105 transition flex items-center justify-center gap-1.5"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Configure API</span>
        </button>

        <button
          type="button"
          onClick={handleTestConnection}
          disabled={isTestingConnection}
          className="py-2 px-3 rounded-xl border border-cream-300 bg-white hover:bg-cream-50 text-obsidian-900 font-semibold text-xs shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {isTestingConnection ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-600" />
          ) : (
            <Radio className="w-3.5 h-3.5 text-gold-600" />
          )}
          <span>Test Handshake</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStkResponse(null);
            setStkError(null);
            setShowTestStkModal(true);
          }}
          className="py-2 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition flex items-center justify-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5 text-emerald-600" />
          <span>Test STK Push</span>
        </button>
      </div>

      {/* MODAL 1: Configure M-Pesa Gateway Credentials */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-cream-300 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-600">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-obsidian-900">Configure Safaricom M-Pesa</h3>
                  <p className="text-[11px] text-gray-500">Manage Daraja API keys, till numbers, and operating mode</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-cream-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {saveSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {saveError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              {/* Operating Mode Selector */}
              <div className="p-3.5 rounded-2xl bg-cream-50 border border-cream-200 space-y-2">
                <label className="block font-bold text-obsidian-900">
                  Operating Gateway Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormSimulationMode(false)}
                    className={`p-2.5 rounded-xl border text-left font-semibold transition ${
                      !formSimulationMode
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-400/20'
                        : 'bg-white border-cream-300 text-gray-600 hover:bg-cream-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold mb-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Live Daraja Gateway
                    </div>
                    <div className="text-[10px] text-gray-500 font-normal leading-tight">
                      Dispatches actual STK push to customer's phone
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormSimulationMode(true)}
                    className={`p-2.5 rounded-xl border text-left font-semibold transition ${
                      formSimulationMode
                        ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-400/20'
                        : 'bg-white border-cream-300 text-gray-600 hover:bg-cream-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold mb-0.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Cashier Simulator
                    </div>
                    <div className="text-[10px] text-gray-500 font-normal leading-tight">
                      Offline testing / cashier training without sending SMS
                    </div>
                  </button>
                </div>
              </div>

              {/* Environment & Shortcode Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-obsidian-900 mb-1">
                    API Environment
                  </label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-gold-500"
                  >
                    <option value="sandbox">Sandbox (Testing / 174379)</option>
                    <option value="production">Production (Live Salon)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-obsidian-900 mb-1">
                    Channel / Shortcode Type
                  </label>
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-gold-500"
                  >
                    <option value="CustomerPayBillOnline">Paybill (CustomerPayBillOnline)</option>
                    <option value="CustomerBuyGoodsOnline">Buy Goods Till (CustomerBuyGoodsOnline)</option>
                  </select>
                </div>
              </div>

              {/* Shortcode / Till */}
              <div>
                <label className="block font-bold text-obsidian-900 mb-1">
                  Business Shortcode / Till Number
                </label>
                <input
                  type="text"
                  value={shortcode}
                  onChange={(e) => setShortcode(e.target.value)}
                  placeholder="e.g. 174379 or your Till Number"
                  required
                  className="w-full px-3 py-2 font-mono rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Default sandbox Paybill test shortcode is 174379.
                </p>
              </div>

              {/* Passkey */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-obsidian-900">
                    Lipa Na M-Pesa Passkey
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSecrets(!showSecrets)}
                    className="text-[11px] text-gray-500 hover:text-obsidian-900 flex items-center gap-1"
                  >
                    {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showSecrets ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Enter Passkey (leave blank to keep current)"
                  className="w-full px-3 py-2 font-mono rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              {/* Consumer Key */}
              <div>
                <label className="block font-bold text-obsidian-900 mb-1">
                  Consumer Key
                </label>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  placeholder="Enter Consumer Key from Daraja Portal"
                  className="w-full px-3 py-2 font-mono rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              {/* Consumer Secret */}
              <div>
                <label className="block font-bold text-obsidian-900 mb-1">
                  Consumer Secret
                </label>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  placeholder="Enter Consumer Secret from Daraja Portal"
                  className="w-full px-3 py-2 font-mono rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              {/* Callback URL */}
              <div>
                <label className="block font-bold text-obsidian-900 mb-1">
                  Webhook Callback URL
                </label>
                <input
                  type="text"
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                  placeholder="http://localhost:4000/api/payments/mpesa/callback"
                  className="w-full px-3 py-2 font-mono text-[11px] rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  For automated payment reconciliation over the internet, use a public domain or ngrok tunnel URL.
                </p>
              </div>

              {/* Safaricom Portal Callout */}
              <div className="p-3 bg-cream-50 rounded-xl border border-cream-200 text-[11px] text-gray-600 leading-relaxed flex items-center justify-between">
                <div>
                  <span className="font-bold text-obsidian-900">Need Daraja credentials?</span>
                  <p className="text-gray-500">Create a free developer app on Safaricom's portal.</p>
                </div>
                <a
                  href="https://developer.safaricom.co.ke"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-cream-300 font-bold text-gold-700 hover:text-gold-800 shadow-sm flex items-center gap-1 shrink-0"
                >
                  <span>Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 font-semibold text-gray-600 hover:bg-cream-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 font-bold text-white gold-gradient rounded-xl shadow-sm hover:brightness-105 transition flex items-center gap-1.5"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Send Test STK Push */}
      {showTestStkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-cream-300 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-obsidian-900">Send Test STK Push</h3>
                  <p className="text-[11px] text-gray-500">Trigger a live M-Pesa prompt on your phone</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTestStkModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-cream-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {stkResponse && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>STK Push Successfully Dispatched!</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  {stkResponse.CustomerMessage || 'Please check your phone and enter your M-Pesa PIN.'}
                </p>
                <div className="text-[10px] font-mono bg-white/80 p-2 rounded-lg border border-emerald-200 space-y-0.5">
                  <div>CheckoutRequestID: {stkResponse.CheckoutRequestID}</div>
                  <div>Phone: {stkResponse.phoneNumber}</div>
                  <div>Amount: KSh {stkResponse.amount}</div>
                  {stkResponse.isSimulation && (
                    <div className="text-amber-700 font-bold">Mode: Training Simulator</div>
                  )}
                </div>
              </div>
            )}

            {stkError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Safaricom STK Dispatch Failed</span>
                </div>
                <p className="text-[11px] text-rose-800">{stkError}</p>
              </div>
            )}

            <form onSubmit={handleSendTestStk} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-obsidian-900 mb-1">
                  Recipient Phone Number
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="e.g. 0726697962 or 0712345678"
                  required
                  className={`w-full px-3 py-2 font-mono text-sm font-bold rounded-xl border focus:outline-none focus:ring-2 ${
                    phoneValidation.isValid
                      ? 'border-emerald-400 focus:ring-emerald-400'
                      : 'border-cream-300 focus:ring-gold-500'
                  }`}
                />
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className={phoneValidation.isValid ? 'text-emerald-700 font-medium' : 'text-gray-400'}>
                    {phoneValidation.message}
                  </span>
                  {phoneValidation.isValid && (
                    <span className="font-mono text-gray-500 font-bold">
                      Format: {phoneValidation.formatted}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-obsidian-900 mb-1">
                  Test Transaction Amount (KES)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  className="w-full px-3 py-2 font-mono text-sm font-bold rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Recommendation: KSh 1 for testing.
                </p>
              </div>

              <div className="p-3 bg-cream-50 rounded-xl border border-cream-200 text-[11px] text-gray-600 leading-relaxed">
                📲 If live Daraja credentials are set, Safaricom will send an instant PIN prompt on the entered phone.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTestStkModal(false)}
                  className="px-4 py-2 font-semibold text-gray-600 hover:bg-cream-100 rounded-xl transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSendingStk || !phoneValidation.isValid}
                  className="px-5 py-2 font-bold text-white gold-gradient rounded-xl shadow-sm hover:brightness-105 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSendingStk ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Dispatch STK Prompt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
