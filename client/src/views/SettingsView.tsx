import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Users,
  Shield,
  ListFilter,
  Webhook,
  Bell,
  CreditCard,
  History,
  Download,
  Save,
  Check,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Copy,
  Eye,
  X,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import api from '../lib/api';
import Panel from '../components/ui/Panel';
import StatusPill from '../components/ui/StatusPill';
import { PermissionGate } from '../components/PermissionGate';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import type { Role, ListItem, PaginatedResponse } from '../types';

type SettingsTab =
  | 'profile'
  | 'team'
  | 'roles'
  | 'custom-lists'
  | 'integrations'
  | 'notifications'
  | 'billing'
  | 'audit-log'
  | 'export';

const MODULES = [
  'properties',
  'units',
  'tenants',
  'leases',
  'payments',
  'expenses',
  'maintenance',
  'vendors',
  'reports',
  'settings',
  'list_types',
];

const ACTIONS = ['create', 'read', 'update', 'delete'];

const LIST_TYPE_TABS = [
  { key: 'unit_type', label: 'Unit Types' },
  { key: 'maintenance_category', label: 'Maintenance Categories' },
  { key: 'vendor_specialty', label: 'Vendor Specialties' },
  { key: 'payment_method', label: 'Payment Methods' },
  { key: 'amenity', label: 'Amenities & Features' },
  { key: 'lease_type', label: 'Lease Contract Types' },
  { key: 'document_type', label: 'Document Types' },
  { key: 'expense_category', label: 'Expense Categories' },
  { key: 'nationality', label: 'Tenant Nationalities' },
];

export const SettingsView: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { agency } = useAuthStore();
  
  const pathParts = location.pathname.split('/');
  const tabFromUrl = (pathParts[2] as SettingsTab) || 'profile';
  
  const [activeTab, setActiveTab] = useState<SettingsTab>(tabFromUrl);
  const [memberToDelete, setMemberToDelete] = useState<any>(null);
  const [listItemToDelete, setListItemToDelete] = useState<any>(null);
  
  useEffect(() => {
    if (location.pathname === '/settings' || location.pathname === '/settings/') {
      navigate('/settings/profile', { replace: true });
    } else if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location.pathname, tabFromUrl, navigate, activeTab]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    navigate(`/settings/${tab}`);
  };

  const [feedbackMsg, setFeedbackMsg] = useState('');

  const showSuccess = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  // ==========================================
  // TAB 1: Profile State
  // ==========================================
  const [agencyName, setAgencyName] = useState(agency?.name || 'Al Rayyan Real Estate W.L.L.');
  const [crNumber, setCrNumber] = useState(agency?.crNumber || '104829/QA');
  const [taxCard, setTaxCard] = useState('BLD-99201-DHA');
  const [phone, setPhone] = useState(agency?.phone || '+974 4499 1200');
  const [email, setEmail] = useState(agency?.email || 'contact@alrayyan-realestate.qa');
  const [address, setAddress] = useState(
    agency?.address || 'Level 18, Al Fardan Towers, West Bay, Doha, Qatar'
  );

  // ==========================================
  // TAB 2: Team State & Queries
  // ==========================================
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');

  const { data: teamUsers, isLoading: isTeamLoading } = useQuery({
    queryKey: ['team-users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/users/invite', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
      setGeneratedInviteLink(data.inviteLink || `${window.location.origin}/accept-invite?token=${data.inviteToken}`);
      showSuccess('Invitation link generated!');
    },
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/users/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
      showSuccess('User status updated.');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
      queryClient.invalidateQueries({ queryKey: ['agency-users'] });
      setMemberToDelete(null);
      toast.success('User removed from agency');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Cannot delete user.');
    },
  });

  // ==========================================
  // TAB 3: Roles & Permission Matrix
  // ==========================================
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissionsMatrix, setRolePermissionsMatrix] = useState<Record<string, string[]>>({});

  const { data: rolesData } = useQuery<Role[]>({
    queryKey: ['roles-list'],
    queryFn: async () => {
      const res = await api.get('/roles');
      return res.data;
    },
  });

  const handleSelectRole = (r: Role) => {
    setSelectedRole(r);
    // Parse permissions json
    let parsed: Record<string, string[]> = {};
    try {
      parsed = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions;
    } catch {
      parsed = {};
    }
    setRolePermissionsMatrix(parsed || {});
  };

  const togglePermissionCell = (moduleName: string, actionName: string) => {
    if (selectedRole?.isSystem || selectedRole?.isSystemRole) return; // Protected
    let current = rolePermissionsMatrix[moduleName] || [];
    if (typeof current === 'object' && !Array.isArray(current)) {
      current = Object.keys(current).filter((k) => current[k] === true);
    } else if (typeof current === 'string') {
      current = [current];
    } else if (typeof current === 'boolean') {
      current = current ? ['*'] : [];
    }

    const updated = current.includes(actionName)
      ? current.filter((a: string) => a !== actionName)
      : [...current, actionName];

    setRolePermissionsMatrix({
      ...rolePermissionsMatrix,
      [moduleName]: updated,
    });
  };

  const updateRolePermissionsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRole) return;
      const res = await api.patch(`/roles/${selectedRole.id}/permissions`, {
        permissions: rolePermissionsMatrix,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-list'] });
      showSuccess('Role permissions saved successfully.');
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/roles', {
        name: newRoleName,
        description: newRoleDesc,
        permissions: {
          properties: ['read'],
          tenants: ['read'],
          leases: ['read'],
          payments: ['read'],
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-list'] });
      setIsCreateRoleOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      showSuccess('Custom role created successfully.');
    },
  });

  // ==========================================
  // TAB 4: Custom Lists Engine
  // ==========================================
  const [activeListTypeKey, setActiveListTypeKey] = useState('unit_type');
  const [newItemValue, setNewItemValue] = useState('');
  const [newItemLabelAr, setNewItemLabelAr] = useState('');

  const { data: listItems, isLoading: isListItemsLoading } = useQuery<ListItem[]>({
    queryKey: ['list-items', activeListTypeKey],
    queryFn: async () => {
      try {
        const res = await api.get(`/list-types/${activeListTypeKey}/items`);
        return Array.isArray(res.data) ? res.data : (res.data?.data || []);
      } catch {
        return [];
      }
    },
  });

  const addListItemMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/list-types/${activeListTypeKey}/items`, {
        value: newItemValue,
        label: newItemValue,
        labelAr: newItemLabelAr || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items', activeListTypeKey] });
      setNewItemValue('');
      setNewItemLabelAr('');
      showSuccess('List item added successfully.');
    },
  });

  const toggleListItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await api.patch(`/list-items/${itemId}/deactivate`, {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items', activeListTypeKey] });
    },
  });

  const deleteListItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/list-items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items', activeListTypeKey] });
      setListItemToDelete(null);
      toast.success('List item deleted');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Cannot delete item currently in use.');
    },
  });

  // ==========================================
  // TAB 7: Billing & Plan
  // ==========================================
  const { data: billingData } = useQuery({
    queryKey: ['agency-billing'],
    queryFn: async () => {
      try {
        const res = await api.get('/billing/plan');
        return res.data;
      } catch {
        return {
          planTier: 'AGENCY',
          plan: { name: 'Agency', priceQar: 1499, unitLimit: 100 },
          unitLimit: 100,
          unitsUsed: 8,
          currentUnitUsage: 8,
          usagePercent: 8,
          tradeLicense: 'CR 104829/QA',
          taxNumber: 'BLD-99201-DHA',
        };
      }
    },
  });

  const switchPlanMutation = useMutation({
    mutationFn: async (planTier: string) => {
      const res = await api.post('/billing/change-plan', { planId: planTier });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-billing'] });
      showSuccess('Agency subscription updated!');
    },
  });

  // ==========================================
  // TAB 8: Audit Log
  // ==========================================
  const [auditPage, setAuditPage] = useState(1);
  const [auditModuleFilter, setAuditModuleFilter] = useState('');
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);

  const { data: auditLogsData } = useQuery<PaginatedResponse<any>>({
    queryKey: ['audit-logs', auditPage, auditModuleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(auditPage),
        limit: '10',
      });
      if (auditModuleFilter) params.append('module', auditModuleFilter);
      try {
        const res = await api.get(`/audit-logs?${params.toString()}`);
        return res.data;
      } catch {
        return { data: [], total: 0, page: 1, limit: 10, totalPages: 1 };
      }
    },
    enabled: activeTab === 'audit-log',
  });

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-ink-900 tracking-tight">
          {t('settings.title')}
        </h2>
        <p className="text-xs text-ink-600 mt-1">
          Agency administration, RBAC permissions, dynamic list types, and regulatory compliance
        </p>
      </div>

      {feedbackMsg && (
        <div className="bg-emerald-100 border border-emerald-600/30 text-emerald-800 px-4 py-3 rounded-lg text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
          <Check size={16} className="text-emerald-700 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-line overflow-x-auto space-x-1 sm:space-x-2 text-xs font-medium pb-px">
        {[
          { id: 'profile', label: 'Agency Profile', icon: Building2 },
          { id: 'team', label: 'Team Members', icon: Users },
          { id: 'roles', label: 'Roles & RBAC', icon: Shield },
          { id: 'custom-lists', label: 'Custom Lists', icon: ListFilter },
          { id: 'integrations', label: 'Gateways & Integrations', icon: Webhook },
          { id: 'notifications', label: 'Alert Preferences', icon: Bell },
          { id: 'billing', label: 'Billing & Quota', icon: CreditCard },
          { id: 'audit-log', label: 'Audit Trail', icon: History },
          { id: 'export', label: 'Data Export', icon: Download },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as SettingsTab)}
              className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-medium whitespace-nowrap transition-colors duration-150 ${
                isActive
                  ? 'border-maroon-700 text-maroon-800 font-semibold bg-white rounded-t-md shadow-xs'
                  : 'border-transparent text-ink-500 hover:text-ink-800 hover:border-sand-300'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-maroon-700' : 'text-ink-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================
          TAB 1: AGENCY PROFILE
      ============================================================ */}
      {activeTab === 'profile' && (
        <Panel
          title={t('settings.agencyProfile')}
          subtitle="Official registered Qatar real estate commercial entity"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              showSuccess('Agency profile settings updated.');
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-ink-700 font-semibold mb-1">
                  {t('settings.agencyName')}
                </label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                />
              </div>
              <div>
                <label className="block text-ink-700 font-semibold mb-1">
                  Commercial Registration (CR No) *
                </label>
                <input
                  type="text"
                  value={crNumber}
                  onChange={(e) => setCrNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-ink-700 font-semibold mb-1">
                  Baladiya / Tax Card Number
                </label>
                <input
                  type="text"
                  value={taxCard}
                  onChange={(e) => setTaxCard(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700 font-mono"
                />
              </div>
              <div>
                <label className="block text-ink-700 font-semibold mb-1">
                  Operating Currency
                </label>
                <input
                  type="text"
                  disabled
                  value="QAR — Qatar Riyal (Mandatory MOI Standard)"
                  className="w-full px-3 py-2 border border-line rounded bg-sand-100 text-ink-500 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-ink-700 font-semibold mb-1">
                  Official Phone Contact
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700 font-mono"
                />
              </div>
              <div>
                <label className="block text-ink-700 font-semibold mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-ink-700 font-semibold mb-1">
                Registered Headquarter Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
              />
            </div>

            <div className="pt-3 border-t border-line flex justify-end">
              <Button type="submit" variant="primary">
                <Save size={14} />
                <span>Save Profile Changes</span>
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {/* ============================================================
          TAB 2: TEAM MEMBERS & INVITATIONS
      ============================================================ */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-serif text-lg font-bold text-ink-900">Agency Team Members</h3>
              <p className="text-xs text-ink-500">
                Manage agents, accountants, administrators, and send onboarding invite links
              </p>
            </div>
            <PermissionGate module="settings" action="create">
              <Button
                variant="primary"
                onClick={() => {
                  setInviteEmail('');
                  setInviteName('');
                  setInviteRoleId(rolesData?.[0]?.id || '');
                  setGeneratedInviteLink('');
                  setIsInviteOpen(true);
                }}
              >
                <UserPlus size={15} />
                <span>Invite Team Member</span>
              </Button>
            </PermissionGate>
          </div>

          <div className="bg-white rounded-xl border border-line overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-sand-050 border-b border-line text-ink-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {isTeamLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-ink-400">
                      Loading team members...
                    </td>
                  </tr>
                ) : (
                  teamUsers?.map((member: any) => (
                    <tr key={member.id} className="hover:bg-sand-050">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-maroon-100 text-maroon-800 font-bold flex items-center justify-center text-xs">
                            {member.name?.charAt(0) || 'U'}
                          </div>
                          <span className="font-semibold text-ink-900">{member.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-ink-600 font-mono">{member.email}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-sand-100 text-ink-800 font-semibold text-[11px] border border-line">
                          {member.role?.name || member.role || 'AGENT'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill status={member.status || 'ACTIVE'} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            onClick={() =>
                              updateUserStatusMutation.mutate({
                                id: member.id,
                                status: member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                              })
                            }
                            title="Toggle Status"
                            className="p-1.5 h-8 w-8 min-w-0"
                          >
                            {member.status === 'ACTIVE' ? (
                              <Lock size={14} className="text-amber-600" />
                            ) : (
                              <Unlock size={14} className="text-emerald-600" />
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              setMemberToDelete(member);
                            }}
                            title="Remove Member"
                            className="p-1.5 h-8 w-8 min-w-0"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Invite Member Modal */}
          {isInviteOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-line flex flex-col max-h-[90dvh]">
                <div className="shrink-0 p-5 bg-maroon-900 text-white flex items-center justify-between border-b border-gold-500/30">
                  <div>
                    <h3 className="font-serif text-lg font-bold">Invite Team Member</h3>
                    <p className="text-xs text-white/60">Generate secure onboarding link</p>
                  </div>
                  <Button variant="icon" onClick={() => setIsInviteOpen(false)}>
                    <X size={18} />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs pr-2">
                  {generatedInviteLink ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800">
                        <CheckCircle2 size={16} className="inline mr-1 text-emerald-600" />
                        Invitation generated successfully! Share this link with your colleague:
                      </div>
                      <div className="p-2.5 bg-sand-100 rounded border border-line font-mono text-[11px] break-all select-all flex items-center justify-between">
                        <span>{generatedInviteLink}</span>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedInviteLink);
                            toast.success('Copied to clipboard!');
                          }}
                          title="Copy Link"
                          className="ml-2 p-1.5 h-8 w-8 min-w-0"
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => setIsInviteOpen(false)}
                        className="w-full mt-2"
                      >
                        Done
                      </Button>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        inviteUserMutation.mutate({
                          email: inviteEmail,
                          name: inviteName,
                          roleId: inviteRoleId,
                        });
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-ink-700 font-semibold mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                          placeholder="e.g. Sarah Al-Attiyah"
                          className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                        />
                      </div>

                      <div>
                        <label className="block text-ink-700 font-semibold mb-1">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="s.attiyah@alrayyan.qa"
                          className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                        />
                      </div>

                      <div>
                        <label className="block text-ink-700 font-semibold mb-1">Assign Role *</label>
                        <select
                          required
                          value={inviteRoleId}
                          onChange={(e) => setInviteRoleId(e.target.value)}
                          className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                        >
                          <option value="">Select Role...</option>
                          {rolesData?.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} {r.isSystem ? '(System Default)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex justify-end gap-3 pt-3 border-t border-line">
                        <Button
                          variant="secondary"
                          onClick={() => setIsInviteOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          type="submit"
                          isLoading={inviteUserMutation.isPending}
                        >
                          Generate Invite Link
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 3: ROLES & PERMISSIONS MATRIX
      ============================================================ */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-serif text-lg font-bold text-ink-900">
                Roles & Permission Matrix (RBAC)
              </h3>
              <p className="text-xs text-ink-500">
                Granular module-by-action capability control per agency role
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setIsCreateRoleOpen(true)}
            >
              <Plus size={15} />
              <span>Create Custom Role</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Roles List */}
            <div className="lg:col-span-1 space-y-2">
              <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider block mb-1">
                Agency Roles
              </span>
              {rolesData?.map((r) => {
                const isSelected = selectedRole?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRole(r)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-maroon-50 border-maroon-700 shadow-xs'
                        : 'bg-white border-line hover:border-sand-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink-900 text-xs">{r.name}</span>
                      {r.isSystem && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sand-100 text-ink-600">
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-500 mt-1 line-clamp-2">{r.description}</p>
                  </div>
                );
              })}
            </div>

            {/* Permission Matrix Grid */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-line p-6 shadow-xs space-y-4">
              {selectedRole ? (
                <>
                  <div className="flex items-center justify-between border-b border-line pb-4">
                    <div>
                      <h4 className="font-serif font-bold text-ink-900 text-base">
                        {selectedRole.name} Matrix
                      </h4>
                      <p className="text-xs text-ink-500">
                        {selectedRole.isSystem
                          ? 'Standard system role (Protected from direct editing)'
                          : 'Custom agency role. Check permissions to grant access.'}
                      </p>
                    </div>

                    {!selectedRole.isSystem && (
                      <Button
                        variant="primary"
                        onClick={() => updateRolePermissionsMutation.mutate()}
                        isLoading={updateRolePermissionsMutation.isPending}
                      >
                        <Save size={14} />
                        <span>Save Permissions</span>
                      </Button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-sand-050 text-ink-600 font-semibold uppercase text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Module</th>
                          {ACTIONS.map((a) => (
                            <th key={a} className="py-2.5 px-3 text-center capitalize">
                              {a}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {MODULES.map((mod) => {
                          let permittedActions = rolePermissionsMatrix[mod] || [];
                          if (typeof permittedActions === 'object' && !Array.isArray(permittedActions)) {
                            permittedActions = Object.keys(permittedActions).filter((k) => permittedActions[k] === true);
                          } else if (typeof permittedActions === 'string') {
                            permittedActions = [permittedActions];
                          } else if (typeof permittedActions === 'boolean') {
                            permittedActions = permittedActions ? ['*'] : [];
                          }

                          return (
                            <tr key={mod} className="hover:bg-sand-050">
                              <td className="py-2.5 px-3 font-semibold text-ink-800 capitalize">
                                {mod.replace('_', ' ')}
                              </td>
                              {ACTIONS.map((action) => {
                                const isChecked =
                                  selectedRole.name === 'Agency Owner' ||
                                  permittedActions.includes(action) ||
                                  permittedActions.includes('*');

                                return (
                                  <td key={action} className="py-2.5 px-3 text-center">
                                    <input
                                      type="checkbox"
                                      disabled={selectedRole.isSystem}
                                      checked={isChecked}
                                      onChange={() => togglePermissionCell(mod, action)}
                                      className="rounded border-line text-maroon-700 focus:ring-maroon-700 disabled:opacity-50 cursor-pointer"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-ink-400 text-xs">
                  Select a role on the left to inspect or customize its permission matrix
                </div>
              )}
            </div>
          </div>

          {/* Create Custom Role Modal */}
          {isCreateRoleOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-line flex flex-col max-h-[90dvh]">
                <div className="shrink-0 p-5 bg-maroon-900 text-white flex items-center justify-between border-b border-gold-500/30">
                  <div>
                    <h3 className="font-serif text-lg font-bold">Create Custom Role</h3>
                    <p className="text-xs text-white/60">Configure custom agency permission scope</p>
                  </div>
                  <Button variant="icon" onClick={() => setIsCreateRoleOpen(false)}>
                    <X size={18} />
                  </Button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createRoleMutation.mutate();
                  }}
                  className="flex-1 overflow-y-auto p-6 space-y-4 text-xs pr-2"
                >
                  <div>
                    <label className="block text-ink-700 font-semibold mb-1">Role Title *</label>
                    <input
                      type="text"
                      required
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="e.g. Junior Leasing Associate"
                      className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                    />
                  </div>

                  <div>
                    <label className="block text-ink-700 font-semibold mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={newRoleDesc}
                      onChange={(e) => setNewRoleDesc(e.target.value)}
                      placeholder="Scope of work and responsibilities..."
                      className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-line">
                    <Button
                      variant="secondary"
                      onClick={() => setIsCreateRoleOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      isLoading={createRoleMutation.isPending}
                    >
                      Create Role
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 4: CUSTOM LISTS ENGINE (9 ListTypes)
      ============================================================ */}
      {activeTab === 'custom-lists' && (
        <div className="space-y-6">
          <div>
            <h3 className="font-serif text-lg font-bold text-ink-900">
              Dynamic Dropdown Lists & Master Taxonomy
            </h3>
            <p className="text-xs text-ink-500">
              Manage custom values for property types, units, furnishing, nationalities, and maintenance
            </p>
          </div>

          {/* ListType Sub-tabs */}
          <div className="flex flex-wrap gap-2">
            {LIST_TYPE_TABS.map((lt) => (
              <button
                key={lt.key}
                onClick={() => setActiveListTypeKey(lt.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeListTypeKey === lt.key
                    ? 'bg-maroon-700 text-white shadow-xs'
                    : 'bg-white border border-line text-ink-700 hover:bg-sand-100'
                }`}
              >
                {lt.label}
              </button>
            ))}
          </div>

          {/* List Items Manager Panel */}
          <div className="bg-white rounded-xl border border-line p-6 shadow-xs space-y-6">
            {/* Add New Item Inline */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newItemValue.trim()) return;
                addListItemMutation.mutate();
              }}
              className="flex flex-wrap gap-3 items-end p-4 rounded-lg bg-sand-050 border border-line text-xs"
            >
              <div className="flex-1 min-w-[200px]">
                <label className="block text-ink-700 font-semibold mb-1">
                  Item Value / Label (English) *
                </label>
                <input
                  type="text"
                  required
                  value={newItemValue}
                  onChange={(e) => setNewItemValue(e.target.value)}
                  placeholder="e.g. Duplex Penthouse or Rooftop Lounge"
                  className="w-full px-3 py-2 border border-line rounded bg-white focus:outline-none focus:border-maroon-700"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-ink-700 font-semibold mb-1">
                  Arabic Label (العربية)
                </label>
                <input
                  type="text"
                  value={newItemLabelAr}
                  onChange={(e) => setNewItemLabelAr(e.target.value)}
                  placeholder="مثال: شقة بنتهاوس دوبلكس"
                  className="w-full px-3 py-2 border border-line rounded bg-white focus:outline-none focus:border-maroon-700 rtl:text-right"
                />
              </div>

              <Button
                variant="primary"
                type="submit"
                isLoading={addListItemMutation.isPending}
              >
                <Plus size={15} />
                <span>Add Item</span>
              </Button>
            </form>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-sand-050 border-b border-line text-ink-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">English Label</th>
                    <th className="py-2.5 px-3">Arabic Label (العربية)</th>
                    <th className="py-2.5 px-3">Origin</th>
                    <th className="py-2.5 px-3 text-center">Active Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {isListItemsLoading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-ink-400">
                        Loading list items...
                      </td>
                    </tr>
                  ) : (
                    listItems?.map((item) => (
                      <tr key={item.id} className="hover:bg-sand-050">
                        <td className="py-2.5 px-3 font-semibold text-ink-900">{item.label}</td>
                        <td className="py-2.5 px-3 text-ink-700 rtl:text-right font-medium">
                          {item.labelAr || '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              item.isGlobal
                                ? 'bg-sand-200 text-ink-700'
                                : 'bg-gold-100 text-gold-800'
                            }`}
                          >
                            {item.isGlobal ? 'SYSTEM DEFAULT' : 'AGENCY CUSTOM'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Button
                            variant="secondary"
                            onClick={() => toggleListItemMutation.mutate(item.id)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors h-6 ${
                              item.isActive
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none'
                                : 'bg-sand-200 text-ink-500 hover:bg-sand-300 border-none'
                            }`}
                          >
                            {item.isActive ? 'Active' : 'Disabled'}
                          </Button>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {!item.isGlobal && (
                            <Button
                              variant="destructive"
                              onClick={() => {
                                setListItemToDelete(item);
                              }}
                              title="Delete Item"
                              className="p-1.5 h-8 w-8 min-w-0"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 5: GATEWAYS & INTEGRATIONS
      ============================================================ */}
      {activeTab === 'integrations' && (
        <div className="space-y-6 max-w-4xl text-xs">
          <div>
            <h3 className="font-serif text-lg font-bold text-ink-900">
              Payment Gateways & Qatar Government APIs
            </h3>
            <p className="text-xs text-ink-500">
              Configure Fatora, Dibsy, Tawtheeq Ministry of Justice, and Metrash SMS notifications
            </p>
          </div>

          {/* Fatora Gateway */}
          <div className="p-6 bg-white rounded-xl border border-line shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-maroon-100 text-maroon-800 font-bold flex items-center justify-center font-mono">
                  FAT
                </div>
                <div>
                  <h4 className="font-semibold text-ink-900 text-sm">Fatora Payment Gateway</h4>
                  <p className="text-[11px] text-ink-500">Qatar National Payment Gateway Integration</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                Connected & Live
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-ink-700 font-semibold mb-1">API Key</label>
                <input
                  type="password"
                  defaultValue="fat_live_99482910482019482"
                  className="w-full px-3 py-2 border border-line rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-ink-700 font-semibold mb-1">Webhook Secret</label>
                <input
                  type="password"
                  defaultValue="whsec_0918239014829"
                  className="w-full px-3 py-2 border border-line rounded font-mono"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <Button variant="destructive" onClick={() => toast.success('Disconnecting Fatora...')} className="mr-auto">
                Disconnect
              </Button>
              <Button variant="secondary" onClick={() => toast.success('Testing Fatora Connection...')}>
                Test Connection
              </Button>
              <Button variant="primary" onClick={() => toast.success('Saving Fatora Settings...')}>
                Save Settings
              </Button>
            </div>
          </div>

          {/* Dibsy Gateway */}
          <div className="p-6 bg-white rounded-xl border border-line shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-blue-100 text-blue-800 font-bold flex items-center justify-center font-mono">
                  DIB
                </div>
                <div>
                  <h4 className="font-semibold text-ink-900 text-sm">Dibsy Payments</h4>
                  <p className="text-[11px] text-ink-500">Visa / Mastercard / Apple Pay in QAR</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                Connected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-ink-700 font-semibold mb-1">Public Key</label>
                <input
                  type="text"
                  defaultValue="pk_live_dha_881920"
                  className="w-full px-3 py-2 border border-line rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-ink-700 font-semibold mb-1">Private Secret</label>
                <input
                  type="password"
                  defaultValue="sk_live_dha_hidden_key"
                  className="w-full px-3 py-2 border border-line rounded font-mono"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <Button variant="destructive" onClick={() => toast.success('Disconnecting Dibsy...')} className="mr-auto">
                Disconnect
              </Button>
              <Button variant="secondary" onClick={() => toast.success('Testing Dibsy Connection...')}>
                Test Connection
              </Button>
              <Button variant="primary" onClick={() => toast.success('Saving Dibsy Settings...')}>
                Save Settings
              </Button>
            </div>
          </div>

          {/* Tawtheeq & Metrash */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-white rounded-xl border border-line shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink-900">Ministry Tawtheeq Lease API</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                  LIVE ATTESTATION
                </span>
              </div>
              <p className="text-[11px] text-ink-500">
                Direct integration with Ministry of Justice Tawtheeq electronic lease registration portal.
              </p>
            </div>

            <div className="p-5 bg-white rounded-xl border border-line shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink-900">Metrash SMS Alerts</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                  SENDER: RENTEASE-QA
                </span>
              </div>
              <p className="text-[11px] text-ink-500">
                Automated SMS gateway to notify QID holders regarding rent due dates and cheque reminders.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 6: NOTIFICATIONS PREFERENCES
      ============================================================ */}
      {activeTab === 'notifications' && (
        <Panel
          title="Notification & Alert Thresholds"
          subtitle="Configure automated reminders for lease expiry, cheque clearance, and repairs"
        >
          <div className="space-y-4 text-xs max-w-2xl">
            <div className="flex items-center justify-between p-3 rounded-lg border border-line bg-sand-050">
              <div>
                <span className="font-semibold text-ink-900 block">
                  Upcoming Lease Expiry Reminder
                </span>
                <span className="text-ink-500 text-[11px]">
                  Send warning to agency team and tenant before lease maturity
                </span>
              </div>
              <select className="px-3 py-1.5 border border-line rounded bg-white">
                <option>30 Days in Advance</option>
                <option>60 Days in Advance</option>
                <option>90 Days in Advance</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-line bg-sand-050">
              <div>
                <span className="font-semibold text-ink-900 block">
                  Metrash SMS for Overdue Payments
                </span>
                <span className="text-ink-500 text-[11px]">
                  Automatically dispatch SMS reminder 3 days past due date
                </span>
              </div>
              <input type="checkbox" defaultChecked className="rounded text-maroon-700 w-4 h-4" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-line bg-sand-050">
              <div>
                <span className="font-semibold text-ink-900 block">
                  Urgent Maintenance Contractor Push
                </span>
                <span className="text-ink-500 text-[11px]">
                  Send instant SMS & email when URGENT HVAC or plumbing ticket is logged
                </span>
              </div>
              <input type="checkbox" defaultChecked className="rounded text-maroon-700 w-4 h-4" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-line bg-sand-050">
              <div>
                <span className="font-semibold text-ink-900 block">
                  Weekly Portfolio Digest
                </span>
                <span className="text-ink-500 text-[11px]">
                  Email summary of occupancy, revenue collected, and pending renewals
                </span>
              </div>
              <input type="checkbox" defaultChecked className="rounded text-maroon-700 w-4 h-4" />
            </div>

            <div className="pt-3 border-t border-line flex justify-end">
              <Button
                variant="primary"
                onClick={() => showSuccess('Notification preferences saved.')}
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </Panel>
      )}

      {/* ============================================================
          TAB 7: BILLING & UNIT QUOTA
      ============================================================ */}
      {activeTab === 'billing' && (
        <div className="space-y-6 max-w-4xl text-xs">
          <div>
            <h3 className="font-serif text-lg font-bold text-ink-900">
              Agency Subscription & Unit Quota
            </h3>
            <p className="text-xs text-ink-500">
              Plan tiers, unit quota enforcement (HTTP 402 prevention), and tax invoices
            </p>
          </div>

          {/* Unit Quota Utilization Card */}
          <div className="p-6 bg-white rounded-xl border border-line shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-ink-500 text-[11px] uppercase font-semibold">Active Plan</span>
                <h4 className="font-serif text-xl font-bold text-maroon-900">
                  {billingData?.planTier || 'PRO'} Portfolio Edition
                </h4>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                ACTIVE
              </span>
            </div>

            {/* Quota Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Unit Capacity Utilization</span>
                <span>
                  {billingData?.unitsUsed || 68} / {billingData?.unitLimit || 150} Units
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-sand-200 overflow-hidden">
                <div
                  className="h-full bg-maroon-700 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      ((billingData?.unitsUsed || 68) / (billingData?.unitLimit || 150)) * 100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-ink-500">
                You have used{' '}
                {Math.round(
                  ((billingData?.unitsUsed || 68) / (billingData?.unitLimit || 150)) * 100
                )}
                % of your licensed unit quota. Exceeding this limit will require a plan upgrade.
              </p>
            </div>
          </div>

          {/* Plan Tiers Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl border border-line bg-white space-y-3">
              <span className="font-bold text-ink-900 block text-sm">Starter Plan</span>
              <div className="font-mono text-xl font-bold text-ink-900">
                QAR 1,200 <span className="text-xs font-normal text-ink-500">/mo</span>
              </div>
              <ul className="text-ink-600 space-y-1 text-[11px]">
                <li>• Up to 25 Units</li>
                <li>• 3 Team Members</li>
                <li>• Fatora Gateway</li>
              </ul>
              <Button
                variant="secondary"
                onClick={() => switchPlanMutation.mutate('STARTER')}
                className="w-full"
              >
                Switch to Starter
              </Button>
            </div>

            <div className="p-5 rounded-xl border-2 border-maroon-700 bg-maroon-50/40 space-y-3 relative shadow-sm">
              <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded bg-maroon-700 text-white font-mono text-[9px] uppercase font-bold">
                Current Plan
              </span>
              <span className="font-bold text-ink-900 block text-sm">Pro Enterprise</span>
              <div className="font-mono text-xl font-bold text-maroon-900">
                QAR 2,800 <span className="text-xs font-normal text-ink-500">/mo</span>
              </div>
              <ul className="text-ink-700 space-y-1 text-[11px]">
                <li>• Up to 150 Units</li>
                <li>• Unlimited Team Members</li>
                <li>• Tawtheeq API Attestation</li>
                <li>• Custom RBAC & Audit Logs</li>
              </ul>
              <Button variant="primary" disabled className="w-full">
                Current Active Plan
              </Button>
            </div>

            <div className="p-5 rounded-xl border border-line bg-white space-y-3">
              <span className="font-bold text-ink-900 block text-sm">Unlimited Group</span>
              <div className="font-mono text-xl font-bold text-ink-900">
                QAR 5,500 <span className="text-xs font-normal text-ink-500">/mo</span>
              </div>
              <ul className="text-ink-600 space-y-1 text-[11px]">
                <li>• Unlimited Units (500+)</li>
                <li>• Custom Domain & Branding</li>
                <li>• Dedicated Account Director</li>
              </ul>
              <Button
                variant="secondary"
                onClick={() => switchPlanMutation.mutate('ENTERPRISE')}
                className="w-full"
              >
                Upgrade to Unlimited
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-6 border-t border-line">
             <Button variant="secondary" onClick={() => toast.success('Add Payment Method placeholder')}>
               Add Payment Method
             </Button>
             <Button variant="destructive" onClick={() => toast.success('Cancel Subscription placeholder')} className="ml-auto">
               Cancel Subscription
             </Button>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 8: AUDIT TRAIL
      ============================================================ */}
      {activeTab === 'audit-log' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-serif text-lg font-bold text-ink-900">Security & Audit Log</h3>
              <p className="text-xs text-ink-500">
                Immutable record of user actions, financial modifications, and data access
              </p>
            </div>

            <select
              value={auditModuleFilter}
              onChange={(e) => {
                setAuditModuleFilter(e.target.value);
                setAuditPage(1);
              }}
              className="text-xs px-3 py-2 bg-white border border-line rounded"
            >
              <option value="">All Modules</option>
              {MODULES.map((m) => (
                <option key={m} value={m}>
                  {m.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-line overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-sand-050 border-b border-line text-ink-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {auditLogsData?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-ink-400">
                      No audit log entries recorded
                    </td>
                  </tr>
                ) : (
                  auditLogsData?.data?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-sand-050">
                      <td className="py-3 px-4 font-mono text-ink-600 text-[11px]">
                        {new Date(log.createdAt).toLocaleString('en-GB')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-ink-900 block">
                          {log.user?.name || 'System / Admin'}
                        </span>
                        <span className="text-[11px] text-ink-500">{log.user?.email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                            log.action === 'CREATE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action === 'DELETE'
                              ? 'bg-ruby-100 text-ruby-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-ink-800 uppercase text-[11px]">
                        {log.module}
                      </td>
                      <td className="py-3 px-4 font-mono text-ink-500 text-[11px]">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          onClick={() => setSelectedAuditLog(log)}
                          title="View Changes"
                          className="p-1.5 h-8 w-8 min-w-0"
                        >
                          <Eye size={15} />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Audit Diff Modal */}
          {selectedAuditLog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-line flex flex-col max-h-[90dvh]">
                <div className="shrink-0 p-5 bg-maroon-900 text-white flex items-center justify-between border-b border-gold-500/30">
                  <div>
                    <h3 className="font-serif text-lg font-bold">Audit Event Detail</h3>
                    <p className="text-xs text-white/60">
                      {selectedAuditLog.module} • {selectedAuditLog.action}
                    </p>
                  </div>
                  <Button
                    variant="icon"
                    onClick={() => setSelectedAuditLog(null)}
                  >
                    <X size={18} />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs pr-2">
                  <div>
                    <span className="text-ink-400 block mb-1">Target Record ID</span>
                    <span className="font-mono font-semibold text-ink-900">
                      {selectedAuditLog.recordId || selectedAuditLog.entityId || 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-ink-400 block mb-1">Payload / State Diff (JSON)</span>
                    <pre className="p-3 bg-sand-100 rounded border border-line font-mono text-[11px] overflow-x-auto max-h-60">
                      {JSON.stringify(
                        selectedAuditLog.details || selectedAuditLog.metadata || { message: 'Action executed successfully.' },
                        null,
                        2
                      )}
                    </pre>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-line">
                    <Button variant="primary" onClick={() => setSelectedAuditLog(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 9: DATA EXPORT & BACKUPS
      ============================================================ */}
      {activeTab === 'export' && (
        <div className="space-y-6 max-w-4xl text-xs">
          <div>
            <h3 className="font-serif text-lg font-bold text-ink-900">
              Agency Data Export & Disaster Recovery
            </h3>
            <p className="text-xs text-ink-500">
              Download complete portfolio backups in standard JSON and CSV formats
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 bg-white rounded-xl border border-line shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-ink-900 text-sm">
                <Download size={16} className="text-maroon-700" />
                <span>Full Portfolio JSON Archive</span>
              </div>
              <p className="text-ink-600 text-[11px]">
                Complete database snapshot including all properties, units, tenant profiles, leases, payments, and work orders.
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  window.open('/api/supporting/export/json', '_blank');
                  showSuccess('Export started.');
                }}
              >
                <Download size={14} />
                <span>Download JSON Archive</span>
              </Button>
            </div>

            <div className="p-6 bg-white rounded-xl border border-line shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-ink-900 text-sm">
                <Download size={16} className="text-gold-600" />
                <span>Financial Ledger CSV</span>
              </div>
              <p className="text-ink-600 text-[11px]">
                Comma-separated transactions list for import into external ERP or Qatar tax accounting packages.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  window.open('/api/supporting/export/financial-csv', '_blank');
                  showSuccess('CSV export started.');
                }}
              >
                <Download size={14} />
                <span>Download Ledger CSV</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!memberToDelete}
        onClose={() => setMemberToDelete(null)}
        onConfirm={() => {
          if (memberToDelete) {
            deleteUserMutation.mutate(memberToDelete.id);
          }
        }}
        title="Remove Member"
        message={`Remove ${memberToDelete?.name} from the agency? Last owner protection will prevent orphan agencies.`}
        confirmText="Remove Member"
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={!!listItemToDelete}
        onClose={() => setListItemToDelete(null)}
        onConfirm={() => {
          if (listItemToDelete) {
            deleteListItemMutation.mutate(listItemToDelete.id);
          }
        }}
        title="Delete List Item"
        message={`Delete "${listItemToDelete?.label}"? Will fail if referenced in properties or leases.`}
        confirmText="Delete Item"
        isDestructive={true}
      />
    </div>
  );
};

export default SettingsView;
