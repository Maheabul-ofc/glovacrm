'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, trialInfo } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user?.role === 'SUPER_ADMIN') {
      router.push('/admin');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Sign-In Required</h2>
        <p className="text-gray-500 text-sm mb-6">Please log in to access your CRM workspace.</p>
        <a
          href="/login"
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all"
        >
          Go to Sign In
        </a>
      </div>
    );
  }

  if (user.role === 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Super Admin Workspace</h2>
        <p className="text-gray-500 text-sm mb-6">Your super-admin role has access to the platform overview.</p>
        <a
          href="/admin"
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all"
        >
          Open Admin Panel
        </a>
      </div>
    );
  }

  const showTrialBanner = trialInfo?.isTrialActive;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        {showTrialBanner && (
          <div className="bg-gradient-to-r from-teal-500 to-orange-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
            🚀 You have {trialInfo.daysLeft} days left in your free trial! 
            <button 
              onClick={() => router.push('/dashboard/settings/billing')}
              className="bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-full text-xs font-bold ml-2 cursor-pointer"
            >
              Upgrade Now
            </button>
          </div>
        )}
        <Topbar />
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-8 px-6 sm:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
