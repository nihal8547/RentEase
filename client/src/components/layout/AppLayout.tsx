import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from './Sidebar.js';
import {
  Bell,
  Search,
  ShieldCheck,
  CheckCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Menu,
} from 'lucide-react';
import api from '../../lib/api';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isSettingsMode = location.pathname.startsWith('/settings');

  // Fetch notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications-live'],
    queryFn: async () => {
      try {
        const res = await api.get('/supporting/notifications');
        return res.data;
      } catch {
        return { data: [], unreadCount: 0 };
      }
    },
    refetchInterval: 15000,
  });

  const notifications = notificationsData?.data || [];
  const unreadCount = notificationsData?.unreadCount ?? notifications.filter((n: any) => !n.isRead).length;

  // Mark all read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/supporting/notifications/read-all', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-live'] });
    },
  });

  // Mark single notification read
  const markSingleReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/supporting/notifications/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-live'] });
    },
  });

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickSearch.trim()) {
      navigate(`/properties?search=${encodeURIComponent(quickSearch)}`);
    }
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-sand-050 flex flex-row">
      <Sidebar 
        mode={isSettingsMode ? 'collapsed' : 'full'} 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
      />

      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Header Bar */}
        <header className="h-14 bg-white border-b border-line px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3 md:gap-4 text-xs text-ink-600">
            {/* Mobile Hamburger Menu */}
            <button
              className="md:hidden p-1 -ml-1 text-ink-600 hover:text-ink-900 focus:outline-none"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-sand-100 font-medium text-ink-900 border border-line">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Doha Agency Environment</span>
            </span>
            <span className="hidden sm:inline text-ink-400">|</span>
            <span className="hidden sm:inline">
              Currency: <strong className="text-ink-900 font-semibold">QAR (Qatar Riyal)</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Global Search */}
            <div className="relative hidden md:block">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400 rtl:left-auto rtl:right-2.5"
              />
              <input
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search units, leases, QID... (Press Enter)"
                className="w-64 pl-8 pr-3 py-1.5 text-xs bg-sand-050 border border-line rounded focus:outline-none focus:border-maroon-700 rtl:pl-3 rtl:pr-8 transition-colors"
              />
            </div>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 rounded hover:bg-sand-100 text-ink-600 hover:text-ink-900 transition-colors"
                title="Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 px-1 min-w-[16px] h-4 rounded-full bg-ruby-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-line z-50 overflow-hidden animate-fade-in">
                  <div className="p-3.5 bg-maroon-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell size={15} className="text-gold-300" />
                      <span className="font-semibold text-xs">Notifications & Alerts</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-ruby-600 text-[10px] font-bold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllReadMutation.mutate()}
                        className="text-[11px] text-gold-300 hover:underline flex items-center gap-1"
                      >
                        <CheckCheck size={13} />
                        Mark read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-line text-xs">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-ink-400">
                        No notifications at this time
                      </div>
                    ) : (
                      notifications.map((notif: any) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            if (!notif.isRead) markSingleReadMutation.mutate(notif.id);
                          }}
                          className={`p-3.5 hover:bg-sand-050 transition-colors cursor-pointer flex items-start gap-3 ${
                            !notif.isRead ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <div className="mt-0.5">
                            {notif.type === 'ALERT' || notif.type === 'URGENT' ? (
                              <AlertTriangle size={15} className="text-ruby-600" />
                            ) : notif.type === 'SUCCESS' ? (
                              <CheckCircle2 size={15} className="text-emerald-600" />
                            ) : (
                              <Info size={15} className="text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-ink-900 leading-snug">
                              {notif.title}
                            </p>
                            <p className="text-ink-600 text-[11px] mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                            <span className="text-[10px] text-ink-400 mt-1 block">
                              {new Date(notif.createdAt).toLocaleString('en-GB')}
                            </span>
                          </div>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-ruby-600 mt-1.5 shrink-0" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
