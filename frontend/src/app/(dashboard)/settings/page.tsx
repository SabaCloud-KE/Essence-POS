'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import {
  Settings,
  Shield,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Radio,
  Sliders,
  Edit2,
  Copy,
  Check,
  Server,
} from 'lucide-react';
import MpesaGatewayConfig from '@/components/settings/MpesaGatewayConfig';
import SessionTimeoutConfig from '@/components/settings/SessionTimeoutConfig';

export default function SettingsPage() {
  const { user, isAdmin, refreshProfile } = useAuth();

  // Settings data from backend
  const [settingsData, setSettingsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // MFA State
  const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [isSettingUpMfa, setIsSettingUpMfa] = useState(false);
  const [isConfirmingMfa, setIsConfirmingMfa] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccess, setMfaSuccess] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Edit Setting Modal
  const [editingSetting, setEditingSetting] = useState<{ key: string; value: string } | null>(null);
  const [settingValue, setSettingValue] = useState('');
  const [isSavingSetting, setIsSavingSetting] = useState(false);
  const [settingError, setSettingError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSettings();
      setSettingsData(data);
    } catch (err) {
      console.error('Failed to fetch system settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  // Handle MFA Setup Initiation
  const handleStartMfaSetup = async () => {
    setIsSettingUpMfa(true);
    setMfaError(null);
    setMfaSuccess(null);
    try {
      const data = await api.setupMfa();
      setMfaSetupData(data);
    } catch (err: any) {
      setMfaError(err.message || 'Failed to initialize 2FA setup.');
    } finally {
      setIsSettingUpMfa(false);
    }
  };

  // Handle MFA Confirmation
  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaSetupData || !mfaCode.trim()) return;

    setIsConfirmingMfa(true);
    setMfaError(null);
    try {
      await api.confirmMfa({
        secret: mfaSetupData.secret,
        code: mfaCode.trim(),
      });
      setMfaSuccess('Two-Factor Authentication has been successfully enabled on your account.');
      setMfaSetupData(null);
      setMfaCode('');
      await refreshProfile();
    } catch (err: any) {
      setMfaError(err.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setIsConfirmingMfa(false);
    }
  };

  // Handle MFA Disable
  const handleDisableMfa = async () => {
    if (!confirm('Are you sure you want to disable Two-Factor Authentication? Your account security will be lowered.')) {
      return;
    }

    setIsDisablingMfa(true);
    setMfaError(null);
    setMfaSuccess(null);
    try {
      await api.disableMfa();
      setMfaSuccess('Two-Factor Authentication has been disabled.');
      await refreshProfile();
    } catch (err: any) {
      setMfaError(err.message || 'Failed to disable 2FA.');
    } finally {
      setIsDisablingMfa(false);
    }
  };

  // Handle Copy Secret
  const handleCopySecret = () => {
    if (mfaSetupData?.secret) {
      navigator.clipboard.writeText(mfaSetupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2500);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.changePassword({
        currentPassword,
        newPassword,
      });
      setPasswordSuccess('Your password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password. Please verify current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Save Setting
  const handleSaveSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSetting) return;

    setIsSavingSetting(true);
    setSettingError(null);
    try {
      await api.updateSetting(editingSetting.key, settingValue);
      setEditingSetting(null);
      await fetchSettings();
    } catch (err: any) {
      setSettingError(err.message || 'Failed to update configuration parameter.');
    } finally {
      setIsSavingSetting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-cream-300 text-center max-w-md mx-auto my-12">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-obsidian-900">Administrator Access Required</h2>
        <p className="text-xs text-gray-500 mt-1">
          Only administrators have access to system configuration and security settings.
        </p>
      </div>
    );
  }

  const env = settingsData?.environment;
  const isProd = env?.isProduction;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-cream-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-obsidian-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-gold-600" />
            <span>System & Security Settings</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Configure M-Pesa integration parameters, salon metadata, account credentials, and Two-Factor Authentication
          </p>
        </div>

        {/* Live Environment Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border shadow-sm ${
              isProd
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-amber-50 text-amber-700 border-amber-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isProd ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {isProd ? 'Production Environment' : 'Daraja Sandbox Mode'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Safaricom Daraja M-Pesa Gateway */}
        <MpesaGatewayConfig settingsData={settingsData} onRefresh={fetchSettings} />

        {/* Card 2: Session Timeout & Inactivity Protection */}
        <SessionTimeoutConfig settingsData={settingsData} onRefresh={fetchSettings} />

        {/* Card 3: Two-Factor Authentication (TOTP) */}
        <div className="bg-white rounded-2xl border border-cream-300 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-cream-200 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-gold-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-obsidian-900">Two-Factor Authentication (2FA)</h2>
                  <p className="text-[11px] text-gray-500">TOTP Authenticator Protection for Admin</p>
                </div>
              </div>

              {user?.mfaEnabled ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  <AlertCircle className="w-3 h-3 text-amber-600" /> Disabled
                </span>
              )}
            </div>

            {mfaSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{mfaSuccess}</span>
              </div>
            )}

            {mfaError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{mfaError}</span>
              </div>
            )}

            {!user?.mfaEnabled && !mfaSetupData && (
              <div className="space-y-4">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Protect your salon administration account against unauthorized access. When enabled,
                  you will need to provide a 6-digit TOTP code from Google Authenticator, Microsoft
                  Authenticator, or 1Password every time you sign in.
                </p>

                <button
                  onClick={handleStartMfaSetup}
                  disabled={isSettingUpMfa}
                  className="w-full py-2.5 px-4 rounded-xl gold-gradient text-white font-bold text-xs shadow-sm hover:brightness-105 transition flex items-center justify-center gap-2"
                >
                  {isSettingUpMfa ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <QrCode className="w-4 h-4" />
                  )}
                  <span>Configure Two-Factor Authentication</span>
                </button>
              </div>
            )}

            {/* Active Setup Flow Modal / Form */}
            {mfaSetupData && !user?.mfaEnabled && (
              <div className="p-4 rounded-xl bg-cream-50 border border-cream-200 space-y-4">
                <div className="text-xs font-semibold text-obsidian-900">
                  Step 1: Scan QR Code with Authenticator App
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-cream-200">
                  {mfaSetupData.qrCodeDataUrl ? (
                    <img
                      src={mfaSetupData.qrCodeDataUrl}
                      alt="TOTP QR Code"
                      className="w-32 h-32 rounded-lg border border-cream-200"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                      QR Code
                    </div>
                  )}

                  <div className="space-y-1.5 flex-1">
                    <p className="text-[11px] text-gray-600">
                      Or manually enter this secret key in your authenticator app:
                    </p>
                    <div className="flex items-center gap-1.5">
                      <code className="px-2 py-1 bg-cream-100 text-obsidian-900 font-mono text-xs rounded border border-cream-200 font-semibold break-all select-all">
                        {mfaSetupData.secret}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="p-1.5 text-gray-500 hover:text-obsidian-900 rounded bg-cream-100 border border-cream-200"
                        title="Copy Secret"
                      >
                        {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleConfirmMfa} className="space-y-3">
                  <label className="block text-xs font-semibold text-obsidian-900">
                    Step 2: Enter 6-digit verification code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      placeholder="000000"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 px-3 py-2 text-center tracking-widest font-mono text-base font-bold rounded-xl border border-cream-300 focus:ring-2 focus:ring-gold-500 focus:outline-none"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isConfirmingMfa || mfaCode.length !== 6}
                      className="px-4 py-2 rounded-xl gold-gradient text-white font-bold text-xs shadow-sm hover:brightness-105 transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isConfirmingMfa ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Verify & Enable</span>
                    </button>
                  </div>
                </form>

                <button
                  type="button"
                  onClick={() => setMfaSetupData(null)}
                  className="text-xs text-gray-500 hover:underline block text-center w-full pt-1"
                >
                  Cancel setup
                </button>
              </div>
            )}

            {/* MFA Enabled State */}
            {user?.mfaEnabled && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                  <p className="font-semibold flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Two-Factor Authentication is Active
                  </p>
                  Your administrator login requires a one-time passcode generated by your authenticator app
                  upon sign in.
                </div>

                <button
                  onClick={handleDisableMfa}
                  disabled={isDisablingMfa}
                  className="w-full py-2 px-4 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 font-semibold text-xs transition flex items-center justify-center gap-2"
                >
                  {isDisablingMfa ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldAlert className="w-4 h-4" />
                  )}
                  <span>Disable Two-Factor Authentication</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Change Password */}
        <div className="bg-white rounded-2xl border border-cream-300 shadow-sm p-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-cream-200 mb-4">
            <div className="w-9 h-9 rounded-xl bg-cream-100 border border-cream-200 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-gold-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-obsidian-900">Change Account Password</h2>
              <p className="text-[11px] text-gray-500">Update your login authentication passphrase</p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-obsidian-900 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-gold-500 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-obsidian-900 mb-1">
                New Password (minimum 8 characters)
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
                minLength={8}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-obsidian-900 mb-1">
                Confirm New Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                minLength={8}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full py-2.5 px-4 rounded-xl gold-gradient text-white font-bold text-xs shadow-sm hover:brightness-105 transition flex items-center justify-center gap-2 mt-2"
            >
              {isChangingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>Update Password</span>
            </button>
          </form>
        </div>

        {/* Card 4: Salon Business Information & Configuration */}
        <div className="bg-white rounded-2xl border border-cream-300 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-cream-200 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cream-100 border border-cream-200 flex items-center justify-center">
                <Sliders className="w-5 h-5 text-gold-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-obsidian-900">Salon System Parameters</h2>
                <p className="text-[11px] text-gray-500">Business metadata and receipt configurations</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="py-8 flex items-center justify-center text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-cream-100 text-xs">
              {settingsData?.settings?.map((item: any) => (
                <div key={item.key} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-obsidian-900">{item.key}</div>
                    <div className="text-gray-500 font-mono text-[11px] mt-0.5">
                      {item.value}
                    </div>
                  </div>

                  {!item.isSecret && (
                    <button
                      onClick={() => {
                        setEditingSetting({ key: item.key, value: item.value });
                        setSettingValue(item.value);
                        setSettingError(null);
                      }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-gold-700 hover:bg-gold-50 border border-transparent hover:border-gold-200 transition"
                      title="Edit parameter"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Setting Modal */}
      {editingSetting && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-cream-300 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200 mb-4">
              <h3 className="text-sm font-bold text-obsidian-900">
                Edit Setting: <span className="font-mono text-gold-700">{editingSetting.key}</span>
              </h3>
            </div>

            {settingError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {settingError}
              </div>
            )}

            <form onSubmit={handleSaveSetting} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-obsidian-900 mb-1">
                  Parameter Value
                </label>
                <input
                  type="text"
                  value={settingValue}
                  onChange={(e) => setSettingValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSetting(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-cream-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSetting}
                  className="px-4 py-2 text-xs font-bold text-white gold-gradient rounded-xl shadow-sm hover:brightness-105 flex items-center gap-1.5"
                >
                  {isSavingSetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
