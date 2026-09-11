import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  User, 
  Users, 
  Shield, 
  List, 
  CreditCard, 
  Bell, 
  Link as LinkIcon, 
  History, 
  Download,
  ArrowLeft
} from 'lucide-react';

export const SettingsSidebar: React.FC = () => {
  const navigate = useNavigate();

  const settingsNav = [
    { to: '/settings/profile', label: 'Profile', icon: User },
    { to: '/settings/team', label: 'Team', icon: Users },
    { to: '/settings/roles', label: 'Roles & Permissions', icon: Shield },
    { to: '/settings/lists', label: 'Custom Lists', icon: List },
    { to: '/settings/integrations', label: 'Integrations', icon: LinkIcon },
    { to: '/settings/notifications', label: 'Notifications', icon: Bell },
    { to: '/settings/billing', label: 'Billing', icon: CreditCard },
    { to: '/settings/audit', label: 'Audit Log', icon: History },
    { to: '/settings/export', label: 'Data Export', icon: Download },
  ];

  return (
    <aside className="w-[240px] min-w-[240px] h-screen sticky top-0 flex flex-col bg-[#F9F9F8] border-r border-gray-200 z-20">
      <div className="p-4 border-b border-gray-200">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to App</span>
        </button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Settings</h2>
        <nav className="space-y-1">
          {settingsNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white text-maroon-600 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={16} className={isActive ? 'text-maroon-600' : 'text-gray-400'} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default SettingsSidebar;
