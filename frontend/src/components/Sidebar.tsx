'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, PhoneCall, Megaphone, Settings, Target, BarChart3, CheckSquare, Blocks, Shield, LogOut, UserCircle, MessageSquareText, MessageSquare, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { name: 'Leads', href: '/dashboard/leads', icon: Target },
  { name: 'Calls', href: '/dashboard/calls', icon: PhoneCall },
  { name: 'WhatsApp Chat', href: '/dashboard/whatsapp', icon: MessageSquare },
  { name: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
  { name: 'Templates', href: '/dashboard/templates', icon: MessageSquareText },
  { name: 'Integrations', href: '/dashboard/integrations', icon: Blocks },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Profile', href: '/dashboard/profile', icon: UserCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNav = navigation.filter(item => {
    if (user?.role === 'TELECALLER') {
      return ['Overview', 'Tasks', 'Leads', 'Calls', 'WhatsApp Chat', 'Profile', 'Templates'].includes(item.name);
    }
    if (user?.role === 'TEAM_MANAGER') {
      return !['Integrations', 'Settings'].includes(item.name);
    }
    return true;
  });

  const navContent = (
    <>
      <div className="flex items-center justify-between h-16 px-6 border-b border-slate-700 gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-teal-400" />
          <span className="text-xl font-bold text-white">GlovaCRM</span>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1 text-slate-400 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-3 space-y-1">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <item.icon
                  className={`flex-shrink-0 -ml-1 mr-3 h-5 w-5 transition-colors duration-200 ${
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center px-3 py-2 text-sm rounded-lg justify-between">
          <div className="flex items-center min-w-0">
            <div className="flex-shrink-0">
              <span className="h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold uppercase">
                {user?.firstName?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="ml-3 truncate">
              <p className="text-white font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs truncate text-slate-400">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
        <button 
          onClick={logout} 
          className="mt-4 flex w-full items-center px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Top Float Hamburger Trigger */}
      <div className="md:hidden fixed top-3 left-3 z-30">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 bg-slate-900/90 text-white rounded-lg shadow-md border border-slate-700 backdrop-blur-sm"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-slate-800 text-slate-300 flex-shrink-0">
        {navContent}
      </div>

      {/* Mobile Backdrop Drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-72 bg-slate-800 h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
