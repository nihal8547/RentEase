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
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface SidebarProps {
  mode?: 'full' | 'collapsed';
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mode = 'full', isMobileMenuOpen, setIsMobileMenuOpen }) => {
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
      label: 'Core Portfolio',
      items: [
        { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
        { to: '/properties', label: t('nav.properties'), icon: Building2 },
        { to: '/tenants', label: t('nav.tenants'), icon: Users },
        { to: '/leases', label: 'Leases & Renewals', icon: FileSignature },
      ],
    },
    {
      label: 'Financial & Legal',
      items: [
        { to: '/payments', label: t('nav.payments'), icon: Receipt },
        { to: '/expenses', label: 'Expenses & Opex', icon: DollarSign },
        { to: '/cheques', label: 'PDC Vault', icon: Landmark },
        { to: '/tawtheeq', label: 'Tawtheeq (MOJ)', icon: ScrollText },
        { to: '/owner-payouts', label: 'Owner Payouts', icon: TrendingUp },
      ],
    },
    {
      label: 'Facility & Residents',
      items: [
        { to: '/maintenance', label: t('nav.maintenance'), icon: Wrench },
        { to: '/vendors', label: 'Vendors', icon: Truck },
        { to: '/inspections', label: 'Inspections', icon: ClipboardCheck },
        { to: '/communications', label: 'WhatsApp / Metrash', icon: MessageSquare },
      ],
    },
    {
      label: 'Reports & Settings',
      items: [
        { to: '/reports', label: t('nav.reports'), icon: FileBarChart },
        { to: '/settings/integrations', label: t('nav.settings'), icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-ink-900/40 z-30 transition-opacity"
          onClick={() => setIsMobileMenuOpen?.(false)}
        />
      )}

      {/* Spacer div when absolutely positioned in collapsed hover state (desktop only) */}
      <div className={`hidden md:block ${mode === 'collapsed' ? 'w-[72px] min-w-[72px] shrink-0' : 'hidden'}`} />
      
      <aside
        className={`${
          isCollapsed ? 'w-[72px]' : 'w-[248px]'
        } min-w-[72px] h-screen flex flex-col justify-between bg-maroon-900 text-white z-40 select-none border-r border-gold-500/30 rtl:border-r-0 rtl:border-l rtl:border-gold-500/30 transition-all duration-300 ease-in-out
        fixed top-0 left-0 md:sticky ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${
          mode === 'collapsed' ? 'md:fixed md:shadow-2xl' : ''
        }`}
        style={{
          boxShadow: 'inset -1px 0 0 0 rgba(185, 146, 74, 0.25)',
        }}
        onMouseEnter={() => (mode === 'collapsed' || isManuallyCollapsed) && setIsHoverExpanded(true)}
        onMouseLeave={() => (mode === 'collapsed' || isManuallyCollapsed) && setIsHoverExpanded(false)}
      >
        <div className="overflow-y-auto flex-1 overflow-x-hidden">
          {/* Brand Header */}
          <div className="px-4 py-5 border-b border-white/10 flex items-center justify-between transition-all duration-150 relative">
            <div className="flex items-center gap-3 w-full">
              <div className="w-9 h-9 rounded bg-maroon-700 border border-gold-500/60 flex items-center justify-center shadow-inner shrink-0 ml-1">
                <span className="font-serif font-bold text-gold-300 text-lg tracking-wider">R</span>
              </div>
              <div className={`transition-opacity duration-150 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <h1 className="font-serif text-lg font-bold tracking-wide text-white">RentEase</h1>
                  <span className="text-[10px] font-mono tracking-widest text-gold-300 px-1 bg-white/10 rounded">QA</span>
                </div>
                <p className="text-[11px] text-white/50 tracking-tight whitespace-nowrap">Doha PropTech SaaS</p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setIsManuallyCollapsed(!isManuallyCollapsed)}
              className={`absolute right-3 top-6 p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-opacity ${
                isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
              title={isManuallyCollapsed ? 'Pin Sidebar' : 'Collapse Sidebar'}
            >
              {isManuallyCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>

          {/* Agency Pill */}
          <div className={`px-4 py-2.5 mx-3 mt-3 mb-1 rounded bg-white/5 border border-white/10 flex items-center gap-2.5 transition-opacity duration-150 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
            <div className="w-7 h-7 rounded bg-maroon-700/60 flex items-center justify-center text-gold-300 shrink-0">
              <Building size={14} />
            </div>
            <div className="truncate flex-1">
              <p className="text-xs font-semibold text-white/90 truncate">{agency?.name || 'Al Rayyan Real Estate'}</p>
              <p className="text-[10px] text-gold-300/80 uppercase tracking-wider truncate">
                CR: {agency?.crNumber || '104829/QA'}
              </p>
            </div>
          </div>

          {/* Navigation Groups */}
          <nav className="px-3 mt-2 pb-4">
            {navGroups.map((group) => (
              <div key={group.label} className="mb-2">
                {!isCollapsed && (
                  <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest px-3 py-1.5 whitespace-nowrap">{group.label}</p>
                )}
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
                          `flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-colors duration-150 ${
                            isActive
                              ? 'bg-maroon-700 text-white font-semibold shadow-sm border border-gold-500/40'
                              : 'text-white/65 hover:bg-maroon-600 hover:text-white'
                          } ${isCollapsed ? 'justify-center px-0' : ''}`
                        }
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon size={16} className="text-gold-300 shrink-0" />
                          <span
                            className={`transition-opacity duration-150 whitespace-nowrap ${
                              isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className={`p-3 border-t border-white/10 space-y-2 bg-maroon-900/60 transition-opacity duration-150 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
          <button
            type="button"
            onClick={toggleLanguage}
            className="w-full flex items-center justify-between px-3 py-2 rounded bg-white/5 hover:bg-maroon-600 text-white/80 hover:text-white text-xs transition-colors duration-150 border border-white/5"
          >
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-gold-300" />
              <span>{language === 'en' ? 'العربية' : 'English'}</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-gold-300">
              {language === 'en' ? 'RTL' : 'LTR'}
            </span>
          </button>

          <div className="flex items-center justify-between px-3 py-2 rounded bg-white/5 border border-white/5">
            <div className="truncate">
              <p className="text-xs font-semibold text-white/90 truncate">{user?.name || 'Tariq Al-Mansoor'}</p>
              <p className="text-[10px] text-white/50 truncate">
                {(typeof user?.role === 'string' ? user?.role : (user?.role as any)?.name) || 'AGENCY OWNER'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title={t('nav.logout')}
              className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
