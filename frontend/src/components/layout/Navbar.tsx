'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import {
  Sparkles,
  ShoppingBag,
  LayoutDashboard,
  Receipt,
  Scissors,
  BarChart3,
  Users,
  ScrollText,
  Settings,
  LogOut,
  Radio,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const { isConnected } = useSocket();
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-GB', {
          timeZone: 'Africa/Nairobi',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' EAT',
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const navLinks = [
    { href: '/pos', label: 'POS Register', icon: ShoppingBag, adminOnly: false },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
    { href: '/transactions', label: 'Transactions', icon: Receipt, adminOnly: false },
    { href: '/services', label: 'Services', icon: Scissors, adminOnly: true },
    { href: '/reports', label: 'Reports', icon: BarChart3, adminOnly: true },
    { href: '/users', label: 'Staff & Users', icon: Users, adminOnly: true },
    { href: '/logs', label: 'Audit Logs', icon: ScrollText, adminOnly: true },
    { href: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-cream-300 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <Link href={isAdmin ? '/dashboard' : '/pos'} className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-obsidian-900">
                  ESSENCE
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-gold-600 bg-gold-50 px-1.5 py-0.5 rounded border border-gold-200">
                  Salon POS
                </span>
              </Link>
              <p className="text-[11px] text-gray-500 hidden sm:block">
                Nairobi, Kenya • M-Pesa Only
              </p>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              if (link.adminOnly && !isAdmin) return null;
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gold-500 text-white shadow-sm font-semibold'
                      : 'text-gray-600 hover:text-obsidian-900 hover:bg-cream-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Status Badges & User */}
          <div className="flex items-center gap-3">
            {/* Real-time sync badge */}
            <div
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={isConnected ? 'Real-time WebSocket connected' : 'Connecting to real-time server...'}
            >
              <Radio className={`w-3 h-3 ${isConnected ? 'animate-pulse text-emerald-500' : 'text-amber-500'}`} />
              <span>{isConnected ? 'Live Sync' : 'Connecting'}</span>
            </div>

            {/* Live Clock (Africa/Nairobi) */}
            <div className="hidden md:flex items-center gap-1 text-[11px] text-gray-500 font-mono bg-cream-100 px-2 py-1 rounded border border-cream-200">
              <Clock className="w-3 h-3 text-gold-600" />
              <span>{timeStr}</span>
            </div>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-cream-300">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-obsidian-900 leading-tight">
                  {user.name}
                </div>
                <div className="flex items-center justify-end gap-1 text-[10px]">
                  <span
                    className={`font-semibold uppercase tracking-wider ${
                      user.role === 'ADMIN' ? 'text-amber-700' : 'text-blue-700'
                    }`}
                  >
                    {user.role}
                  </span>
                  {user.mfaEnabled && (
                    <span title="MFA Protected">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => logout()}
                className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile secondary navigation bar */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-cream-200">
          {navLinks.map((link) => {
            if (link.adminOnly && !isAdmin) return null;
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs whitespace-nowrap ${
                  isActive
                    ? 'bg-gold-500 text-white font-medium'
                    : 'text-gray-600 hover:bg-cream-100'
                }`}
              >
                <Icon className="w-3 h-3" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
