import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileSignature,
  Wrench,
  Receipt,
  DollarSign,
  Truck,
  FileBarChart,
  Settings,
  Globe,
  LogOut,
  Building,
  Landmark,
  ScrollText,
  ClipboardCheck,
  MessageSquare,
  TrendingUp,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface SidebarProps {
  mode?: 'full' | 'collapsed';
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mode = 'full',
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}) => {
  const { t } = useTranslation();
  const { user, agency, logout, language, setLanguage } = useAuthStore();
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const [isManuallyCollapsed, setIsManuallyCollapsed] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    queryClient.clear();
    navigate('/login');
  };

  const isCollapsed = (mode === 'collapsed' || isManuallyCollapsed) && !isHoverExpanded;

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const navGroups = [
    {
      label: 'Portfolio',
      items: [
        { to: '/',           label: t('nav.dashboard'), icon: LayoutDashboard },
        { to: '/properties', label: t('nav.properties'), icon: Building2 },
        { to: '/tenants',    label: t('nav.tenants'),    icon: Users },
        { to: '/leases',     label: 'Leases & Renewals', icon: FileSignature },
      ],
    },
    {
      label: 'Finance',
      items: [
        { to: '/payments',      label: t('nav.payments'),  icon: Receipt },
        { to: '/expenses',      label: 'Expenses',          icon: DollarSign },
        { to: '/cheques',       label: 'PDC Vault',          icon: Landmark },
        { to: '/tawtheeq',      label: 'Tawtheeq (MOJ)',     icon: ScrollText },
        { to: '/owner-payouts', label: 'Owner Payouts',      icon: TrendingUp },
      ],
    },
    {
      label: 'Facility',
      items: [
        { to: '/maintenance',    label: t('nav.maintenance'), icon: Wrench },
        { to: '/vendors',        label: 'Vendors',             icon: Truck },
        { to: '/inspections',    label: 'Inspections',         icon: ClipboardCheck },
        { to: '/communications', label: 'WhatsApp / Metrash',  icon: MessageSquare },
      ],
    },
    {
      label: 'Reports',
      items: [
        { to: '/reports',              label: t('nav.reports'),  icon: FileBarChart },
        { to: '/settings/integrations', label: t('nav.settings'), icon: Settings },
      ],
    },
  ];

  const userRoleName =
    typeof user?.role === 'string'
      ? user.role
      : (user?.role as any)?.name || 'Agency Owner';

  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-ink-900/50 backdrop-blur-sm z-30 transition-opacity"
          onClick={() => setIsMobileMenuOpen?.(false)}
        />
      )}

      {/* Spacer for collapsed hover mode */}
      <div
        className={`hidden md:block shrink-0 transition-all duration-300 ${
          mode === 'collapsed' ? 'w-[68px]' : 'hidden'
        }`}
      />

      <aside
        className={`${isCollapsed ? 'w-[68px]' : 'w-[240px]'} min-w-[68px] h-screen flex flex-col
          bg-maroon-900 text-white z-40 select-none
          border-r border-gold-500/20 rtl:border-r-0 rtl:border-l rtl:border-gold-500/20
          transition-[width] duration-300 ease-in-out
          fixed top-0 left-0 md:sticky
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${mode === 'collapsed' ? 'md:fixed md:shadow-2xl' : ''}
        `}
        onMouseEnter={() => (mode === 'collapsed' || isManuallyCollapsed) && setIsHoverExpanded(true)}
        onMouseLeave={() => (mode === 'collapsed' || isManuallyCollapsed) && setIsHoverExpanded(false)}
      >
        {/* ── Brand Header ── */}
        <div className="px-3 py-4 border-b border-white/8 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-maroon-700 border border-gold-500/50 flex items-center justify-center shadow-md shrink-0">
              <span className="font-bold text-gold-300 text-sm leading-none">R</span>
            </div>
            <div className={`transition-all duration-200 overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-bold text-base text-white tracking-tight leading-none">RentEase</span>
                <span className="text-2xs text-gold-400/80 px-1 py-0.5 bg-white/8 rounded font-mono tracking-wider">QA</span>
              </div>
              <p className="text-2xs text-white/40 mt-0.5 whitespace-nowrap">Doha PropTech</p>
            </div>
          </div>

          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsManuallyCollapsed(!isManuallyCollapsed)}
              className="p-1.5 rounded-md hover:bg-white/8 text-white/40 hover:text-white/80 transition-colors shrink-0"
              title={isManuallyCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isManuallyCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            </button>
          )}
        </div>

        {/* ── Agency Pill ── */}
        {!isCollapsed && (
          <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg bg-white/5 border border-white/8 flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-maroon-700/70 flex items-center justify-center text-gold-300 shrink-0">
              <Building size={12} />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white/90 truncate leading-tight">{agency?.name || 'Al Rayyan Real Estate'}</p>
              <p className="text-2xs text-gold-300/70 truncate font-mono">
                {agency?.crNumber || '104829/QA'}
              </p>
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        <nav className="flex-1 px-2 mt-2 pb-2 overflow-y-auto overflow-x-hidden">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-1">
              {!isCollapsed && (
                <p className="text-2xs font-bold text-white/20 uppercase tracking-widest px-2 py-1.5 whitespace-nowrap">
                  {group.label}
                </p>
              )}
              {isCollapsed && <div className="my-1 mx-2 border-t border-white/8" />}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      title={isCollapsed ? item.label : undefined}
                      onClick={() => setIsMobileMenuOpen?.(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors duration-100 group ${
                          isActive
                            ? 'bg-maroon-700 text-white shadow-sm'
                            : 'text-white/55 hover:bg-white/6 hover:text-white/90'
                        } ${isCollapsed ? 'justify-center px-2' : ''}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            size={15}
                            className={`shrink-0 transition-colors ${isActive ? 'text-gold-300' : 'text-white/40 group-hover:text-white/70'}`}
                          />
                          {!isCollapsed && (
                            <>
                              <span className="flex-1 truncate">{item.label}</span>
                              {isActive && (
                                <ChevronRight size={12} className="text-gold-300/50 shrink-0" />
                              )}
                            </>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className={`px-2 pb-3 pt-2 border-t border-white/8 space-y-1 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <button
            type="button"
            onClick={toggleLanguage}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-white/6 text-white/55 hover:text-white/90 text-xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <Globe size={13} className="text-gold-300/60" />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </div>
            <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-white/8 text-gold-300/60">
              {language === 'en' ? 'AR' : 'EN'}
            </span>
          </button>

          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/4">
            <div className="w-6 h-6 rounded-full bg-maroon-700 border border-gold-500/40 flex items-center justify-center text-gold-300 text-2xs font-bold shrink-0">
              {(user?.name || 'T').charAt(0).toUpperCase()}
            </div>
            <div className="truncate flex-1">
              <p className="text-xs font-semibold text-white/85 truncate leading-tight">{user?.name || 'Tariq Al-Mansoor'}</p>
              <p className="text-2xs text-white/35 truncate uppercase tracking-wider">{userRoleName}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title={t('nav.logout')}
              className="p-1.5 rounded-md text-white/35 hover:text-white hover:bg-white/8 transition-colors shrink-0"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
