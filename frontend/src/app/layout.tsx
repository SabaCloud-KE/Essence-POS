import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';

export const metadata: Metadata = {
  title: 'Essence Hair & Beauty Salon POS',
  description: 'Production POS & M-Pesa Payment Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAF7F2] text-obsidian-850">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
