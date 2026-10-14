import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from './Sidebar.js';
import {
  Bell,
  Search,
  CheckCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import api from '../../lib/api';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isSettingsMode = location.pathname.startsWith('/settings');

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications-live'],
    queryFn: async () => {
      try {
        const res = await api.get('/notifications?unread=true');
        return res.data;
      } catch {
        return { data: [], unreadCount: 0 };
      }
    },
    refetchInterval: 15000,
  });

  const notifications = notificationsData?.data || [];
  const unreadCount = notificationsData?.unreadCount ?? notifications.filter((n: any) => !n.isRead).length;

  const markAllReadMutation = useMutation({
    mutationFn: async () => { await api.patch('/supporting/notifications/read-all', {}); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-live'] }),
  });

  const markSingleReadMutation = useMutation({
    mutationFn: async (id: string) => { await api.patch(`/supporting/notifications/${id}/read`, {}); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-live'] }),
  });

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickSearch.trim()) {
      navigate(`/properties?search=${encodeURIComponent(quickSearch)}`);
    }
  };

  const notifIcon = (type: string) => {
    if (type === 'ALERT' || type === 'URGENT')
      return <AlertTriangle size={14} className="text-ruby-600" />;
    if (type === 'SUCCESS')
      return <CheckCircle2 size={14} className="text-emerald-600" />;
    return <Info size={14} className="text-sky-600" />;
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-sand-050 flex flex-row">
      <Sidebar
        mode={isSettingsMode ? 'collapsed' : 'full'}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* ── Top Header ── */}
        <header className="h-[56px] bg-white border-b border-line px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs shrink-0">
          {/* Left: mobile hamburger + breadcrumb context */}
          <div className="flex items-center gap-3 text-xs">
            <button
              className="md:hidden p-1.5 -ml-1 rounded hover:bg-sand-100 text-ink-600 hover:text-ink-900 transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-ink-400">
              <span className="font-semibold text-ink-600">RentEase</span>
              <span className="text-line">·</span>
              <span>Doha Agency</span>
              <span className="hidden md:inline text-line">·</span>
              <span className="hidden md:inline font-medium text-ink-600">QAR</span>
            </div>
          </div>

          {/* Right: search + bell */}
          <div className="flex items-center gap-2">
            {/* Quick Search */}
            <div className="relative hidden md:flex items-center">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none rtl:left-auto rtl:right-2.5" />
              <input
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search units, tenants… (Enter)"
                className="w-56 pl-8 pr-3 py-1.5 text-xs bg-sand-050 border border-line rounded-lg focus:outline-none focus:border-maroon-700 focus:bg-white rtl:pl-3 rtl:pr-8 transition-all placeholder:text-ink-400"
              />
            </div>

            {/* Quick Links Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsQuickMenuOpen(!isQuickMenuOpen);
                  setIsNotificationsOpen(false);
                }}
                className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-sand-100 text-ink-600 hover:text-ink-900 transition-colors"
                title="Quick Links"
              >
                <Zap size={16} />
              </button>

              {isQuickMenuOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-line z-50 overflow-hidden animate-fade-in">
                  <div className="p-3.5 bg-maroon-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap size={15} className="text-gold-300" />
                      <span className="font-semibold text-xs">All Pages</span>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-line text-xs flex flex-col p-2">
                    <Link to="/" onClick={() => setIsQuickMenuOpen(false)} className="px-3 py-2 hover:bg-sand-050 rounded transition-colors font-medium text-ink-900">Dashboard</Link>
                    <Link to="/properties" onClick={() => setIsQuickMenuOpen(false)} className="px-3 py-2 hover:bg-sand-050 rounded transition-colors font-medium text-ink-900">Properties</Link>
                    <Link to="/tenants" onClick={() => setIsQuickMenuOpen(false)} className="px-3 py-2 hover:bg-sand-050 rounded transition-colors font-medium text-ink-900">Tenants</Link>
                    <Link to="/leases" onClick={() => setIsQuickMenuOpen(false)} className="px-3 py-2 hover:bg-sand-050 rounded transition-colors font-medium text-ink-900">Leases & Renewals</Link>
                    <Link to="/payments" onClick={() => setIsQuickMenuOpen(false)} className="px-3 py-2 hover:bg-sand-050 rounded transition-colors font-medium text-ink-900">Payments</Link>
                    <Link to="/expenses" onClick={() => setIsQuickMenuOpen(false)} className="px-3 py-2 hover:bg-sand-050 rounded transition-colors font-medium text-ink-900">Expenses & Opex</Link>
                    <Link to="/maintenance" onClick={() => setIsQuickMenuOpen(false)} className="px-3 py-2 hover:bg-sand-050 rounded transition-colors font-medium text-ink-900">Maintenance</Link>
                    <Link to="/vendors" onClick={() => setIsQuickMenuOpen(false)} className="px-3 py-2 hover:bg-sand-050 rounded transition-colors font-medium text-ink-900">Vendors</Link>
                    <Link to="/reports" onClick={() => setIsQuickMenuOpen(false)} className="px-3 py-2 hover:bg-sand-050 rounded transition-colors font-medium text-ink-900">Reports</Link>
                    <Link to="/settings/integrations" onClick={() => setIsQuickMenuOpen(false)} className="px-3 py-2 hover:bg-sand-050 rounded transition-colors font-medium text-ink-900">Settings</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsQuickMenuOpen(false);
                }}
                className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-sand-100 text-ink-600 hover:text-ink-900 transition-colors"
                title="Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-ruby-600 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsNotificationsOpen(false)}
                  />
                  {/* Panel */}
                  <div className="absolute right-0 rtl:right-auto rtl:left-0 top-10 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-line z-50 overflow-hidden animate-fade-in">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                      <div className="flex items-center gap-2">
                        <Bell size={14} className="text-maroon-700" />
                        <span className="font-semibold text-sm text-ink-900">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-ruby-100 text-ruby-700 text-2xs font-bold">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                          <button
                            onClick={() => markAllReadMutation.mutate()}
                            className="text-2xs text-ink-400 hover:text-maroon-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-sand-100 transition-colors"
                          >
                            <CheckCheck size={12} />
                            Mark all read
                          </button>
                        )}
                        <button
                          onClick={() => setIsNotificationsOpen(false)}
                          className="p-1 rounded hover:bg-sand-100 text-ink-400 hover:text-ink-900 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[360px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center text-xs text-ink-400 flex flex-col items-center gap-2">
                          <Bell size={24} className="text-ink-200" />
                          <span>You're all caught up</span>
                        </div>
                      ) : (
                        <div className="divide-y divide-line">
                          {notifications.map((notif: any) => (
                            <div
                              key={notif.id}
                              onClick={() => { if (!notif.isRead) markSingleReadMutation.mutate(notif.id); }}
                              className={`px-4 py-3 hover:bg-sand-050 transition-colors cursor-pointer flex items-start gap-3 ${!notif.isRead ? 'bg-amber-100/20' : ''}`}
                            >
                              <div className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center bg-sand-100 shrink-0">
                                {notifIcon(notif.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-ink-900 leading-snug">{notif.title}</p>
                                <p className="text-2xs text-ink-400 mt-0.5 line-clamp-2 leading-relaxed">{notif.message}</p>
                                <span className="text-2xs text-ink-200 mt-1 block">
                                  {new Date(notif.createdAt).toLocaleString('en-GB')}
                                </span>
                              </div>
                              {!notif.isRead && (
                                <span className="w-2 h-2 rounded-full bg-maroon-700 mt-1.5 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
