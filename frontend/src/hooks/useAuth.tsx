'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';

export interface User {
  id: number;
  uuid: string;
  name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'STAFF';
  mfaEnabled: boolean;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ requireMfa: boolean; mfaToken?: string }>;
  verifyMfa: (mfaToken: string, code: string) => Promise<void>;
  logout: (redirectPath?: string | React.MouseEvent | unknown) => void;
  refreshProfile: () => Promise<void>;
  updateUser: (updatedFields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('essence_pos_token');
    const savedUser = localStorage.getItem('essence_pos_user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        // Verify token in background
        api
          .getProfile()
          .then((res) => {
            if (res.user) {
              setUser(res.user);
              localStorage.setItem('essence_pos_user', JSON.stringify(res.user));
            }
          })
          .catch(() => {
            // If token invalid, clear
            logout();
          })
          .finally(() => setIsLoading(false));
      } catch {
        logout();
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });

    if (res.requireMfa) {
      return { requireMfa: true, mfaToken: res.mfaToken };
    }

    localStorage.setItem('essence_pos_token', res.accessToken);
    localStorage.setItem('essence_pos_user', JSON.stringify(res.user));
    localStorage.setItem('essence_pos_last_activity', String(Date.now()));
    setUser(res.user);

    if (res.user.role === 'ADMIN') {
      router.push('/dashboard');
    } else {
      router.push('/pos');
    }

    return { requireMfa: false };
  };

  const verifyMfa = async (mfaToken: string, code: string) => {
    const res = await api.verifyMfa({ mfaToken, code });
    localStorage.setItem('essence_pos_token', res.accessToken);
    localStorage.setItem('essence_pos_user', JSON.stringify(res.user));
    localStorage.setItem('essence_pos_last_activity', String(Date.now()));
    setUser(res.user);

    if (res.user.role === 'ADMIN') {
      router.push('/dashboard');
    } else {
      router.push('/pos');
    }
  };

  const logout = (redirectPath?: string | React.MouseEvent | unknown) => {
    localStorage.removeItem('essence_pos_token');
    localStorage.removeItem('essence_pos_user');
    localStorage.removeItem('essence_pos_last_activity');
    setUser(null);
    const target = typeof redirectPath === 'string' ? redirectPath : '/login';
    router.push(target);
  };

  const refreshProfile = async () => {
    try {
      const res = await api.getProfile();
      if (res.user) {
        setUser(res.user);
        localStorage.setItem('essence_pos_user', JSON.stringify(res.user));
      }
    } catch {}
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('essence_pos_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        login,
        verifyMfa,
        logout,
        refreshProfile,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
