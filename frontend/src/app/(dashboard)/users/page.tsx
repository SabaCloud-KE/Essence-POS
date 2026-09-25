'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Users,
  Plus,
  KeyRound,
  Power,
  Search,
  ShieldCheck,
  Shield,
  Loader2,
  Lock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

function generateClientTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';

  const parts = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  const all = upper + lower + digits + symbols;
  for (let i = 0; i < 8; i++) {
    parts.push(all[Math.floor(Math.random() * all.length)]);
  }

  return parts.sort(() => Math.random() - 0.5).join('');
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'STAFF',
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showTempPassword, setShowTempPassword] = useState(true);
  const [copiedTempPassword, setCopiedTempPassword] = useState(false);

  // Success Created Account Card Modal
  const [createdAccount, setCreatedAccount] = useState<{
    name: string;
    email: string;
    phone?: string;
    role: string;
    temporaryPassword: string;
  } | null>(null);
  const [copiedAllCredentials, setCopiedAllCredentials] = useState(false);

  // Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Real-time validations for Create User
  const nameError = !createForm.name
    ? null
    : !/^[A-Za-z\s]+$/.test(createForm.name)
    ? 'Name must only contain letters and spaces.'
    : createForm.name.trim().length < 3
    ? 'Name must be at least 3 characters long.'
    : null;

  const isNameValid = createForm.name.trim().length >= 3 && /^[A-Za-z\s]+$/.test(createForm.name);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const emailError = !createForm.email
    ? null
    : !emailRegex.test(createForm.email.trim())
    ? 'Please enter a valid email address.'
    : null;

  const isEmailValid = emailRegex.test(createForm.email.trim());

  const phoneError = !createForm.phone
    ? null
    : !/^\d+$/.test(createForm.phone)
    ? 'Phone number must only contain integers.'
    : createForm.phone.length < 9 || createForm.phone.length > 12
    ? 'Phone number must be between 9 and 12 digits.'
    : null;

  const isPhoneValid = !createForm.phone || (!phoneError);

  const isFormValid =
    isNameValid &&
    isEmailValid &&
    isPhoneValid &&
    createForm.password.length >= 8;

  // Real-time strength checks for Reset Password Modal
  const resetChecks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    digit: /\d/.test(newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
  };
  const isResetPasswordValid =
    resetChecks.length &&
    resetChecks.upper &&
    resetChecks.lower &&
    resetChecks.digit &&
    resetChecks.special;

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getUsers({
        role: roleFilter || undefined,
        search: search || undefined,
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleOpenCreateModal = () => {
    setCreateError(null);
    const tempPass = generateClientTempPassword();
    setCreateForm({
      name: '',
      email: '',
      phone: '',
      password: tempPass,
      role: 'STAFF',
    });
    setShowTempPassword(true);
    setCopiedTempPassword(false);
    setShowCreateModal(true);
  };

  const handleRegenerateTempPassword = () => {
    const tempPass = generateClientTempPassword();
    setCreateForm((prev) => ({ ...prev, password: tempPass }));
    setCopiedTempPassword(false);
  };

  const handleCopyTempPassword = () => {
    navigator.clipboard.writeText(createForm.password);
    setCopiedTempPassword(true);
    setTimeout(() => setCopiedTempPassword(false), 2000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      const result = await api.createUser({
        name: createForm.name.trim(),
        email: createForm.email.toLowerCase().trim(),
        phone: createForm.phone ? createForm.phone.trim() : undefined,
        password: createForm.password,
        role: createForm.role,
      });

      setShowCreateModal(false);
      setCreatedAccount({
        name: createForm.name.trim(),
        email: createForm.email.toLowerCase().trim(),
        phone: createForm.phone || undefined,
        role: createForm.role,
        temporaryPassword: createForm.password,
      });

      fetchUsers();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create user account.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdAccount) return;
    const text = `Essence Salon POS Login Credentials\nName: ${createdAccount.name}\nEmail: ${createdAccount.email}\nTemporary Password: ${createdAccount.temporaryPassword}\nLogin URL: http://localhost:3000/login\n(Note: You will be prompted to set a new password on your first login)`;
    navigator.clipboard.writeText(text);
    setCopiedAllCredentials(true);
    setTimeout(() => setCopiedAllCredentials(false), 2500);
  };

  const handleToggleActive = async (user: any) => {
    try {
      await api.updateUser(user.id, { isActive: !user.isActive });
      fetchUsers();
    } catch (err) {
      alert('Failed to update user status.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !isResetPasswordValid) return;

    setIsResetting(true);
    setResetError(null);

    try {
      await api.resetUserPassword(resetModalUser.id, newPassword);
      setResetModalUser(null);
      setNewPassword('');
      alert(
        `Password successfully updated for ${resetModalUser.name}. They will be prompted to change it upon next login.`,
      );
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      search === '' ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search);
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-cream-300 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-obsidian-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-gold-600" />
            <span>Staff & User Administration</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage salon team accounts, roles, access permissions, and authentication credentials
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="py-2.5 px-4 rounded-xl gold-gradient text-white font-bold text-xs shadow-sm hover:brightness-105 transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-cream-300 bg-cream-50 focus:bg-white text-gray-700 font-medium outline-none"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Administrators</option>
            <option value="STAFF">Salon Staff / Stylists</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-cream-300 bg-cream-50 focus:bg-white outline-none"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-cream-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)] min-h-[300px] custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-cream-100 text-gray-700 font-bold uppercase tracking-wider text-[10px] border-b border-cream-200 shadow-sm">
              <tr>
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Email Address</th>
                <th className="p-3.5">Phone</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Security / 2FA</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200 text-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gold-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-cream-50/70 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-obsidian-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gold-100 text-gold-800 font-bold flex items-center justify-center text-[11px]">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <span>{u.name}</span>
                          {u.mustChangePassword && (
                            <span className="block text-[10px] text-amber-600 font-normal">
                              Password change required
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-gray-600">{u.email}</td>
                    <td className="p-3.5 text-gray-500 font-mono">
                      {u.phone || '—'}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {u.mfaEnabled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5" /> 2FA Active
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">Standard</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setResetModalUser(u);
                            setNewPassword(generateClientTempPassword());
                            setResetError(null);
                          }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gold-700 hover:bg-gold-50 transition"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`p-1.5 rounded-lg transition ${
                            u.isActive
                              ? 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={u.isActive ? 'Deactivate User' : 'Reactivate User'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL WITH REAL-TIME VALIDATION */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-cream-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200 mb-4">
              <div>
                <h3 className="font-bold text-base text-obsidian-900">Add Salon Staff Member</h3>
                <p className="text-[11px] text-gray-500">Create login credentials with real-time validation</p>
              </div>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              {/* Full Name */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-gray-700">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  {isNameValid && (
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Jane Doe"
                  className={`w-full p-2.5 rounded-xl border outline-none transition ${
                    !createForm.name
                      ? 'border-cream-300 bg-cream-50 focus:bg-white'
                      : isNameValid
                      ? 'border-emerald-400 bg-emerald-50/20'
                      : 'border-rose-300 bg-rose-50/20'
                  }`}
                />
                {nameError && (
                  <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{nameError}</span>
                  </p>
                )}
                {!createForm.name && (
                  <p className="text-[10px] text-gray-400 mt-1">Letters and spaces only, min 3 characters.</p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-gray-700">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  {isEmailValid && (
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                    </span>
                  )}
                </div>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="e.g. jane@essence.co.ke"
                  className={`w-full p-2.5 rounded-xl border outline-none transition ${
                    !createForm.email
                      ? 'border-cream-300 bg-cream-50 focus:bg-white'
                      : isEmailValid
                      ? 'border-emerald-400 bg-emerald-50/20'
                      : 'border-rose-300 bg-rose-50/20'
                  }`}
                />
                {emailError && (
                  <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{emailError}</span>
                  </p>
                )}
              </div>

              {/* Phone & Role */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-gray-700">Phone</label>
                    {createForm.phone && isPhoneValid && (
                      <span className="text-[10px] text-emerald-600 font-medium">Integers only</span>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={createForm.phone}
                    onChange={(e) => {
                      // Filter non-integers in real time
                      const digits = e.target.value.replace(/\D/g, '');
                      setCreateForm({ ...createForm, phone: digits });
                    }}
                    placeholder="0712345678"
                    className={`w-full p-2.5 rounded-xl border outline-none font-mono transition ${
                      !createForm.phone
                        ? 'border-cream-300 bg-cream-50 focus:bg-white'
                        : isPhoneValid
                        ? 'border-emerald-400 bg-emerald-50/20'
                        : 'border-rose-300 bg-rose-50/20'
                    }`}
                  />
                  {phoneError && (
                    <p className="text-[10px] text-rose-500 mt-1">{phoneError}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, role: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-cream-300 outline-none focus:border-gold-500 bg-white"
                  >
                    <option value="STAFF">STAFF (Cashier / Stylist)</option>
                    <option value="ADMIN">ADMINISTRATOR</option>
                  </select>
                </div>
              </div>

              {/* Auto-Generated Temporary Password */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-gray-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                    <span>Auto-Generated Temporary Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateTempPassword}
                    className="text-[11px] text-gold-700 hover:text-gold-900 font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Regenerate</span>
                  </button>
                </div>

                <div className="relative flex items-center bg-cream-100 p-2.5 rounded-xl border border-cream-300 font-mono text-xs">
                  <input
                    type={showTempPassword ? 'text' : 'password'}
                    readOnly
                    value={createForm.password}
                    className="bg-transparent flex-1 font-bold text-obsidian-900 outline-none select-all"
                  />
                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      type="button"
                      onClick={() => setShowTempPassword(!showTempPassword)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title={showTempPassword ? 'Hide' : 'Show'}
                    >
                      {showTempPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyTempPassword}
                      className="px-2 py-1 bg-white hover:bg-gold-50 text-gold-800 rounded-lg border border-cream-300 flex items-center gap-1 font-sans text-[11px] font-semibold"
                    >
                      {copiedTempPassword ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>The user will be required to set a new strong password upon first login.</span>
                </p>
              </div>

              <div className="pt-3 border-t border-cream-200 flex gap-2">
                <button
                  type="submit"
                  disabled={isCreating || !isFormValid}
                  className="flex-1 py-2.5 rounded-xl gold-gradient text-white font-bold text-xs shadow-md hover:brightness-105 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-cream-300 text-gray-600 text-xs font-semibold hover:bg-cream-100 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST-CREATION CREDENTIAL SUMMARY CARD MODAL */}
      {createdAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-cream-300 space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-2.5 text-emerald-600">
                <UserCheck className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-lg text-obsidian-900">Account Created Successfully!</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Share these temporary credentials with the staff member
              </p>
            </div>

            <div className="p-4 bg-cream-50 rounded-2xl border border-cream-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Name:</span>
                <span className="font-bold text-obsidian-900">{createdAccount.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="font-mono font-semibold text-obsidian-900">{createdAccount.email}</span>
              </div>
              {createdAccount.phone && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone:</span>
                  <span className="font-mono text-obsidian-900">{createdAccount.phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Role:</span>
                <span className="font-bold text-gold-700">{createdAccount.role}</span>
              </div>
              <div className="pt-2 border-t border-cream-200 flex justify-between items-center">
                <span className="text-gray-500">Temporary Password:</span>
                <code className="bg-white px-2 py-0.5 rounded border border-cream-300 font-mono font-bold text-xs text-amber-800">
                  {createdAccount.temporaryPassword}
                </code>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
              🔒 <strong>Security Policy:</strong> When {createdAccount.name} signs in with this temporary password, the system will immediately prompt them to configure a strong permanent password.
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="flex-1 py-2.5 px-3 rounded-xl gold-gradient text-white font-bold text-xs shadow-md hover:brightness-105 transition flex items-center justify-center gap-1.5"
              >
                {copiedAllCredentials ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Credentials Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy All Credentials</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCreatedAccount(null)}
                className="px-4 py-2.5 rounded-xl border border-cream-300 text-gray-700 text-xs font-semibold hover:bg-cream-100 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL WITH STRONG PASSWORD ENFORCEMENT */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-cream-300 space-y-4">
            <div className="flex items-center gap-2 text-obsidian-900 font-bold text-base pb-2 border-b border-cream-200">
              <KeyRound className="w-5 h-5 text-gold-600" />
              <span>Reset Password for {resetModalUser.name}</span>
            </div>

            {resetError && (
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium">
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-gray-700">
                    New Temporary Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateClientTempPassword())}
                    className="text-[11px] text-gold-700 hover:text-gold-900 font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters with upper, lower, digit, symbol"
                  className="w-full p-2.5 rounded-xl border border-cream-300 font-mono text-xs outline-none focus:border-gold-500 bg-cream-50 focus:bg-white"
                />
              </div>

              {/* Real-time Checklist for Reset */}
              <div className="p-3 bg-cream-50 rounded-xl border border-cream-200 space-y-1.5 text-[11px]">
                <p className="font-semibold text-gray-700 mb-1">Strong Password Requirements:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <span className={resetChecks.length ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                    {resetChecks.length ? '✓' : '○'} 8+ characters
                  </span>
                  <span className={resetChecks.upper ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                    {resetChecks.upper ? '✓' : '○'} 1 uppercase (A-Z)
                  </span>
                  <span className={resetChecks.lower ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                    {resetChecks.lower ? '✓' : '○'} 1 lowercase (a-z)
                  </span>
                  <span className={resetChecks.digit ? 'text-emerald-700 font-medium' : 'text-gray-500'}>
                    {resetChecks.digit ? '✓' : '○'} 1 number (0-9)
                  </span>
                  <span className={`col-span-2 ${resetChecks.special ? 'text-emerald-700 font-medium' : 'text-gray-500'}`}>
                    {resetChecks.special ? '✓' : '○'} 1 special symbol (!@#$%^&*...)
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                The user will be required to change this password immediately upon their next login.
              </p>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={isResetting || !isResetPasswordValid}
                  className="flex-1 py-2.5 rounded-xl gold-gradient text-white font-bold text-xs shadow-md hover:brightness-105 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set Password & Enforce Change'}
                </button>
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2.5 rounded-xl border border-cream-300 text-gray-600 text-xs font-semibold hover:bg-cream-100 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
