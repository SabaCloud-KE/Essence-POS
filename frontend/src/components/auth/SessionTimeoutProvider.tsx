'use client';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { usePathname } from 'next/navigation';
import { Clock, LogOut, CheckCircle2 } from 'lucide-react';

interface SessionTimeoutContextType {
  adminTimeoutMinutes: number;
  staffTimeoutMinutes: number;
  activeTimeoutMinutes: number;
  resetTimer: () => void;
  refreshConfig: () => Promise<void>;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined);

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const { user, logout, refreshProfile } = useAuth();
  const pathname = usePathname();

  const [adminTimeoutMinutes, setAdminTimeoutMinutes] = useState(30);
  const [staffTimeoutMinutes, setStaffTimeoutMinutes] = useState(15);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Reference timestamp of last recorded user activity
  const lastActivityRef = useRef<number>(Date.now());
  const isWarningOpenRef = useRef<boolean>(false);

  // Check if current context is Staff POS Register (route /pos or STAFF role)
  const isPosRoute = pathname?.startsWith('/pos');
  const isStaffSession = isPosRoute || user?.role === 'STAFF';

  // Active timeout based on whether user is on the Staff POS Register or Admin Dashboard
  const activeTimeoutMinutes = isStaffSession ? staffTimeoutMinutes : adminTimeoutMinutes;

  // Keep ref in sync with warning modal state
  useEffect(() => {
    isWarningOpenRef.current = showWarning;
  }, [showWarning]);

  // Fetch timeout configuration from server
  const fetchTimeoutConfig = useCallback(async () => {
    try {
      const config = await api.getSessionTimeoutConfig();
      if (config) {
        if (config.adminTimeoutMinutes) setAdminTimeoutMinutes(Number(config.adminTimeoutMinutes));
        if (config.staffTimeoutMinutes) setStaffTimeoutMinutes(Number(config.staffTimeoutMinutes));
      }
    } catch {
      // Fallback to defaults (30m admin, 15m staff)
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchTimeoutConfig();
  }, [fetchTimeoutConfig]);

  // Sync with configuration updates (across tabs and within current tab)
  useEffect(() => {
    const handleConfigUpdate = () => {
      fetchTimeoutConfig();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'essence_pos_session_timeout_updated') {
        fetchTimeoutConfig();
      }
      if (e.key === 'essence_pos_last_activity' && e.newValue) {
        const parsed = parseInt(e.newValue, 10);
        if (!isNaN(parsed) && parsed > lastActivityRef.current) {
          lastActivityRef.current = parsed;
          setShowWarning(false);
        }
      }
    };

    window.addEventListener('essence_pos_session_timeout_updated', handleConfigUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('essence_pos_session_timeout_updated', handleConfigUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchTimeoutConfig]);

  // Initialize or restore lastActivity on mount / when user changes
  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    try {
      const stored = localStorage.getItem('essence_pos_last_activity');
      if (stored) {
        const parsed = parseInt(stored, 10);
        // Valid if within reasonable bounds (not in future, not older than 24h)
        if (!isNaN(parsed) && parsed <= now && now - parsed < 24 * 3600 * 1000) {
          lastActivityRef.current = parsed;
          return;
        }
      }
      lastActivityRef.current = now;
      localStorage.setItem('essence_pos_last_activity', String(now));
    } catch {
      lastActivityRef.current = now;
    }
  }, [user]);

  // Reset activity timestamp on user interaction
  const handleUserActivity = useCallback(() => {
    // Only update if warning modal is NOT active
    // If warning modal is open, user must explicitly click "Keep Me Signed In"
    if (!isWarningOpenRef.current) {
      const now = Date.now();
      lastActivityRef.current = now;
      try {
        localStorage.setItem('essence_pos_last_activity', String(now));
      } catch {}
    }
  }, []);

  // Set up interaction listeners (throttled)
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    let lastThrottled = 0;

    const throttledHandler = () => {
      const now = Date.now();
      if (now - lastThrottled > 2000) {
        lastThrottled = now;
        handleUserActivity();
      }
    };

    events.forEach((evt) => {
      window.addEventListener(evt, throttledHandler, { passive: true });
    });

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, throttledHandler);
      });
    };
  }, [user, handleUserActivity]);

  // Heartbeat check interval
  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      return;
    }

    // Notice: We do NOT reset lastActivityRef.current here!
    // That prevents resetting the idle elapsed time on re-renders.

    const interval = setInterval(() => {
      const now = Date.now();

      // Check if another tab recorded activity
      try {
        const stored = localStorage.getItem('essence_pos_last_activity');
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed > lastActivityRef.current) {
            lastActivityRef.current = parsed;
          }
        }
      } catch {}

      const timeoutMs = activeTimeoutMinutes * 60 * 1000;
      const elapsed = now - lastActivityRef.current;
      const remainingMs = timeoutMs - elapsed;
      const remainingSec = Math.ceil(remainingMs / 1000);

      // Warning duration is 60s for standard timeouts, or 33% (min 15s) for short test timeouts (< 3 mins)
      const warningDurationSec = Math.min(60, Math.max(15, Math.floor((activeTimeoutMinutes * 60) * 0.33)));

      if (remainingSec <= 0) {
        // Session expired
        clearInterval(interval);
        setShowWarning(false);
        try {
          localStorage.removeItem('essence_pos_token');
          localStorage.removeItem('essence_pos_user');
          localStorage.removeItem('essence_pos_last_activity');
        } catch {}
        window.location.href = '/login?reason=timeout';
      } else if (remainingSec <= warningDurationSec) {
        setShowWarning(true);
        setCountdown(remainingSec);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, activeTimeoutMinutes]);

  // User explicitly clicks "Stay Signed In"
  const handleStaySignedIn = async () => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem('essence_pos_last_activity', String(now));
    } catch {}
    setShowWarning(false);
    try {
      await refreshProfile();
    } catch {
      // Ignore background refresh errors
    }
  };

  // User clicks "Sign Out Now"
  const handleManualLogout = () => {
    setShowWarning(false);
    logout();
  };

  return (
    <SessionTimeoutContext.Provider
      value={{
        adminTimeoutMinutes,
        staffTimeoutMinutes,
        activeTimeoutMinutes,
        resetTimer: handleStaySignedIn,
        refreshConfig: fetchTimeoutConfig,
      }}
    >
      {children}

      {/* Inactivity Warning Dialog */}
      {showWarning && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-cream-300 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
            {/* Warning Icon with Pulsing Halo */}
            <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-300 text-amber-600 flex items-center justify-center mx-auto relative">
              <Clock className="w-8 h-8 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-obsidian-900">
                Session Inactivity Warning
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                You have been inactive on the{' '}
                <span className="font-semibold text-obsidian-900">
                  {isStaffSession ? 'Staff POS Register' : 'Admin Dashboard'}
                </span>
                . For security reasons, your session will automatically lock in:
              </p>
            </div>

            {/* Countdown Display */}
            <div className="py-2">
              <div className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-amber-50 border border-amber-300 font-mono text-2xl font-black text-amber-900 tracking-wider">
                {countdown}s
              </div>
            </div>

            <p className="text-[11px] text-gray-400">
              {isStaffSession ? 'Staff POS Register' : 'Admin Dashboard'} timeout configured to {activeTimeoutMinutes} {activeTimeoutMinutes === 1 ? 'minute' : 'minutes'} by administrator.
            </p>

            {/* Modal Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleStaySignedIn}
                className="w-full py-2.5 px-4 rounded-xl gold-gradient text-white font-bold text-xs shadow-sm hover:brightness-105 transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Keep Me Signed In</span>
              </button>

              <button
                type="button"
                onClick={handleManualLogout}
                className="w-full py-2 px-4 rounded-xl border border-cream-300 text-gray-600 hover:text-obsidian-900 hover:bg-cream-100 font-semibold text-xs transition flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </SessionTimeoutContext.Provider>
  );
}

export function useSessionTimeout() {
  const context = useContext(SessionTimeoutContext);
  if (!context) {
    throw new Error('useSessionTimeout must be used within a SessionTimeoutProvider');
  }
  return context;
}
