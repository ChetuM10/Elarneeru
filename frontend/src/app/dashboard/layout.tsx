'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, dbUser, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user || !dbUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-4 border-green-deep border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <header className="bg-[rgba(242,244,230,0.88)] backdrop-blur-md border-b border-line sticky top-0 z-40">
        <nav className="flex items-center justify-between py-4 px-8 max-w-[1180px] mx-auto">
          <Link href="/" className="font-serif text-2xl font-semibold text-green-deep flex items-center gap-2">
            <svg className="w-[26px] h-[26px] shrink-0" viewBox="0 0 26 26" fill="none">
              <circle cx="13" cy="14" r="10" fill="#E3A23A"/>
              <path d="M13 4C13 4 9 6 9 9" stroke="#123A2C" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M13 4C13 4 17 6 17 9" stroke="#123A2C" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            elaneeru
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-[0.94rem] font-medium text-ink-soft hover:text-green-deep transition-colors">
              Home
            </Link>
            <button 
              onClick={logout}
              className="text-[0.94rem] font-medium text-ink-soft hover:text-red-500 transition-colors"
            >
              Logout
            </button>
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-[1180px] w-full mx-auto px-8 py-12 max-sm:px-5">
        {children}
      </main>
    </div>
  );
}
