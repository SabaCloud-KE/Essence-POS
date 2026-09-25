const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('essence_pos_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle binary downloads (e.g. excel, pdf)
  const contentType = response.headers.get('content-type') || '';
  if (
    contentType.includes('application/pdf') ||
    contentType.includes('application/vnd.openxmlformats')
  ) {
    if (!response.ok) {
      throw new ApiError('Failed to download file', response.status);
    }
    return (await response.blob()) as unknown as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data?.message ||
      (Array.isArray(data?.message) ? data.message.join(', ') : null) ||
      'An unexpected server error occurred.';
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (dto: { email: string; password: string }) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(dto) }),
  verifyMfa: (dto: { mfaToken: string; code: string }) =>
    apiRequest('/auth/mfa/verify', { method: 'POST', body: JSON.stringify(dto) }),
  getProfile: () => apiRequest('/auth/me'),
  setupMfa: () => apiRequest('/auth/mfa/setup', { method: 'POST' }),
  confirmMfa: (dto: { secret: string; code: string }) =>
    apiRequest('/auth/mfa/confirm', { method: 'POST', body: JSON.stringify(dto) }),
  disableMfa: () => apiRequest('/auth/mfa/disable', { method: 'POST' }),
  changePassword: (dto: { currentPassword: string; newPassword: string }) =>
    apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify(dto) }),

  // Services
  getServices: (params?: { category?: string; isActive?: boolean; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.append('category', params.category);
    if (params?.isActive !== undefined) q.append('isActive', String(params.isActive));
    if (params?.search) q.append('search', params.search);
    return apiRequest(`/services?${q.toString()}`);
  },
  getCategories: () => apiRequest('/services/categories'),
  createService: (dto: any) =>
    apiRequest('/services', { method: 'POST', body: JSON.stringify(dto) }),
  updateService: (id: number, dto: any) =>
    apiRequest(`/services/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  toggleServiceActive: (id: number) =>
    apiRequest(`/services/${id}/toggle-active`, { method: 'PATCH' }),

  // Sales
  createSale: (dto: {
    customerPhone: string;
    customerName?: string;
    items: Array<{ serviceId: number; quantity: number }>;
    discount?: number;
    notes?: string;
  }) => apiRequest('/sales', { method: 'POST', body: JSON.stringify(dto) }),
  getSales: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.status) q.append('status', params.status);
    if (params?.userId) q.append('userId', String(params.userId));
    if (params?.search) q.append('search', params.search);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    return apiRequest(`/sales?${q.toString()}`);
  },
  getSale: (id: number) => apiRequest(`/sales/${id}`),
  cancelSale: (id: number) => apiRequest(`/sales/${id}/cancel`, { method: 'POST' }),

  // Payments
  initiateStkPush: (dto: { saleId: number; phoneNumber: string }) =>
    apiRequest('/payments/mpesa/stk-push', { method: 'POST', body: JSON.stringify(dto) }),
  getPayment: (id: number) => apiRequest(`/payments/${id}`),
  simulateCallback: (dto: { checkoutRequestId: string; resultCode: number; resultDesc?: string }) =>
    apiRequest('/payments/mpesa/simulate-callback', { method: 'POST', body: JSON.stringify(dto) }),
  refundPayment: (id: number, reason: string) =>
    apiRequest(`/payments/${id}/refund`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Reports
  getDashboardStats: (period = 'today', startDate?: string, endDate?: string) => {
    const q = new URLSearchParams({ period });
    if (startDate) q.append('startDate', startDate);
    if (endDate) q.append('endDate', endDate);
    return apiRequest(`/reports/dashboard-stats?${q.toString()}`);
  },
  downloadExcelReport: async (startDate?: string, endDate?: string, status?: string) => {
    const q = new URLSearchParams();
    if (startDate) q.append('startDate', startDate);
    if (endDate) q.append('endDate', endDate);
    if (status) q.append('status', status);
    return apiRequest(`/reports/export/excel?${q.toString()}`);
  },
  downloadPdfReport: async (startDate?: string, endDate?: string, status?: string) => {
    const q = new URLSearchParams();
    if (startDate) q.append('startDate', startDate);
    if (endDate) q.append('endDate', endDate);
    if (status) q.append('status', status);
    return apiRequest(`/reports/export/pdf?${q.toString()}`);
  },
  downloadReceiptPdf: async (saleId: number) => {
    return apiRequest(`/reports/receipt/pdf/${saleId}`);
  },

  // Users
  getUsers: (params?: { page?: number; limit?: number; role?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.role) q.append('role', params.role);
    if (params?.search) q.append('search', params.search);
    return apiRequest(`/users?${q.toString()}`);
  },
  createUser: (dto: any) => apiRequest('/users', { method: 'POST', body: JSON.stringify(dto) }),
  updateUser: (id: number, dto: any) =>
    apiRequest(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  resetUserPassword: (id: number, newPassword: string) =>
    apiRequest(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  // Logs
  getAuditLogs: (params?: any) => {
    const q = new URLSearchParams(params);
    return apiRequest(`/logs/audit?${q.toString()}`);
  },
  getSystemLogs: (params?: any) => {
    const q = new URLSearchParams(params);
    return apiRequest(`/logs/system?${q.toString()}`);
  },

  // Settings
  getSettings: () => apiRequest('/settings'),
  updateSetting: (key: string, value: string) =>
    apiRequest(`/settings/${key}`, { method: 'PATCH', body: JSON.stringify({ value }) }),
  updateMpesaSettings: (dto: {
    environment?: string;
    shortcode?: string;
    transactionType?: string;
    passkey?: string;
    consumerKey?: string;
    consumerSecret?: string;
    callbackUrl?: string;
    simulationMode?: boolean;
  }) => apiRequest('/settings/mpesa', { method: 'POST', body: JSON.stringify(dto) }),
  testMpesaConnection: () => apiRequest('/settings/mpesa/test-connection', { method: 'POST' }),
  testMpesaStkPush: (phoneNumber: string, amount: number = 1) =>
    apiRequest('/settings/mpesa/test-stk', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, amount }),
    }),
  getSessionTimeoutConfig: () => apiRequest('/auth/session-config'),
  updateSessionTimeoutConfig: (dto: { adminTimeoutMinutes: number; staffTimeoutMinutes: number }) =>
    apiRequest('/settings/session-timeout', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
};
