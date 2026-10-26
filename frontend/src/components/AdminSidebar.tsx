'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, CreditCard, BarChart3, Settings, LogOut, Shield, UserCircle, ArrowUpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Companies', href: '/admin/companies', icon: Building2 },
  { name: 'Upgrade Requests', href: '/admin/upgrade-requests', icon: ArrowUpCircle },
  { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
  { name: 'Profile', href: '/admin/profile', icon: UserCircle },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex flex-col w-64 bg-slate-800 h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-700 gap-2">
        <Shield className="w-6 h-6 text-white" />
        <Link href="/admin" className="text-xl font-bold text-white">
          GlovaCRM
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <Link key={item.name} href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive(item.href)
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}>
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center px-3 py-2 text-sm rounded-lg justify-between">
          <div className="flex items-center min-w-0">
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.firstName?.charAt(0) || 'U'}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.firstName}</p>
              <p className="text-xs text-slate-400">Super Admin</p>
            </div>
          </div>
        </div>
        <button 
          onClick={logout} 
          className="mt-4 flex w-full items-center px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
