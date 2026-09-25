'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { SessionTimeoutProvider } from '@/components/auth/SessionTimeoutProvider';
import { ForcePasswordChangeModal } from '@/components/auth/ForcePasswordChangeModal';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-gold-500 mx-auto" />
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
            Loading Essence POS...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <SessionTimeoutProvider>
      <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <ForcePasswordChangeModal />
      </div>
    </SessionTimeoutProvider>
  );
}
