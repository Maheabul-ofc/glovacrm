'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, PhoneCall, Megaphone, Settings, Target, BarChart3, CheckSquare, Blocks, Shield, LogOut, UserCircle, MessageSquareText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { name: 'Leads', href: '/dashboard/leads', icon: Target },
  { name: 'Calls', href: '/dashboard/calls', icon: PhoneCall },
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

  return (
    <div className="flex flex-col w-64 bg-slate-800 text-slate-300">
      <div className="flex items-center h-16 px-6 border-b border-slate-700 gap-2">
        <Shield className="w-6 h-6 text-white" />
        <span className="text-xl font-bold text-white">
          GlovaCRM
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-3 space-y-1">
          {navigation.filter(item => {
            if (user?.role === 'TELECALLER') {
              return ['Overview', 'Tasks', 'Leads', 'Calls', 'Profile', 'Templates'].includes(item.name);
            }
            if (user?.role === 'TEAM_MANAGER') {
              return !['Integrations', 'Settings'].includes(item.name);
            }
            return true;
          }).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.name}
                href={item.href}
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
          className="mt-4 flex w-full items-center px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
