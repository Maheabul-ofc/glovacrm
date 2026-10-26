'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { Bell, LogOut, CheckCircle, Info, PhoneCall, MessageSquare, Trash2 } from 'lucide-react';
import api from '@/lib/api';

export default function Topbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      const allNotifs = res.data;
      
      const deletedIds = JSON.parse(localStorage.getItem('deletedNotifications') || '[]');
      const lastReadAt = localStorage.getItem('notificationsLastReadAt');
      
      const visibleNotifs = allNotifs.filter((n: any) => !deletedIds.includes(n.id));
      
      let unread = visibleNotifs.length;
      if (lastReadAt) {
        const readTime = new Date(lastReadAt).getTime();
        unread = visibleNotifs.filter((n: any) => new Date(n.createdAt).getTime() > readTime).length;
      }
      
      setNotifications(visibleNotifs);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  const markAllAsRead = () => {
    localStorage.setItem('notificationsLastReadAt', new Date().toISOString());
    setUnreadCount(0);
    setShowDropdown(false);
  };

  const deleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const deletedIds = JSON.parse(localStorage.getItem('deletedNotifications') || '[]');
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('deletedNotifications', JSON.stringify(deletedIds));
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'CALL': return <PhoneCall className="w-4 h-4 text-emerald-500" />;
      case 'WHATSAPP': return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'STATUS_CHANGE': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default: return <Info className="w-4 h-4 text-teal-500" />;
    }
  };

  return (
    <header className="flex-shrink-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 relative">
      <div className="flex-1 flex items-center">
      </div>
      <div className="ml-4 flex items-center space-x-4">
        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 relative transition-colors"
          >
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 rounded-full bg-red-500 ring-2 ring-white items-center justify-center text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <Bell className="h-6 w-6" />
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900">Notifications</h3>
                <button onClick={markAllAsRead} className="text-xs text-teal-600 font-medium hover:underline">
                  Mark all as read
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">
                    No new notifications
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {notifications.map((notif) => (
                      <li key={notif.id} className="p-4 hover:bg-gray-50 transition-colors flex gap-3 group relative">
                        <div className="mt-1 flex-shrink-0 bg-gray-100 p-2 rounded-full h-8 w-8 flex items-center justify-center">
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 pr-6">
                          <p className="text-sm font-medium text-gray-900 leading-snug">
                            {notif.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button 
                          onClick={(e) => deleteNotification(e, notif.id)}
                          className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* User Profile */}
        <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ').toLowerCase()}</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold uppercase text-sm">
            {user?.firstName?.charAt(0) || 'U'}
          </div>
          <button 
            onClick={logout}
            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors ml-2"
            title="Log out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
