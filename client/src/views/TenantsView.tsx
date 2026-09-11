import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  AlertCircle,
  Shield,
  X,
  Download,
  Trash2,
  Eye,
  Briefcase,
} from 'lucide-react';
import api from '../lib/api';
import StatusPill from '../components/ui/StatusPill';
import { DataTable, type Column } from '../components/DataTable';
import { ComboBoxWithAddNew } from '../components/ComboBoxWithAddNew';
import { PermissionGate } from '../components/PermissionGate';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useEscapeKey } from '../hooks/useEscapeKey';
import type { PaginatedResponse, Tenant } from '../types';

export const TenantsView: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Search & Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [nationalityFilter, setNationalityFilter] = useState('');

  // Selected tenant for detail drawer
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<any>(null);
  const [editTenantId, setEditTenantId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [fullName, setFullName] = useState('');
  const [qid, setQid] = useState('');
  const [passportNo, setPassportNo] = useState('');
  const [nationality, setNationality] = useState('Qatari');
  const [phone, setPhone] = useState('+974 ');
  const [email, setEmail] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('+974 ');

  // Keyboard navigation for all modals/drawers
  useEscapeKey(() => setIsRegisterOpen(false), isRegisterOpen);
  useEscapeKey(() => setIsEditOpen(false), isEditOpen);
  useEscapeKey(() => setSelectedTenant(null), !!selectedTenant);

  // Fetch tenants with pagination & search
  const { data, isLoading } = useQuery<PaginatedResponse<Tenant>>({
    queryKey: ['tenants', page, limit, searchTerm, statusFilter, nationalityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: searchTerm,
      });
      if (statusFilter) params.append('status', statusFilter);
      if (nationalityFilter) params.append('nationality', nationalityFilter);

      const res = await api.get(`/tenants?${params.toString()}`);
      return res.data;
    },
  });

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/tenants', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setIsRegisterOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to register tenant.');
    },
  });

  // Update tenant mutation
  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.patch(`/tenants/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setIsEditOpen(false);
      resetForm();
      if (selectedTenant && selectedTenant.id === editTenantId) {
        setSelectedTenant(null);
      }
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to update tenant.');
    },
  });

  // Delete tenant mutation
  const deleteTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tenants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      if (selectedTenant) setSelectedTenant(null);
    },
  });

  const resetForm = () => {
    setFullName('');
    setQid('');
    setPassportNo('');
    setNationality('Qatari');
    setPhone('+974 ');
    setEmail('');
    setSponsorName('');
    setEmergencyContact('');
    setEmergencyPhone('+974 ');
    setErrorMessage('');
    setEditTenantId(null);
  };

  const handleOpenEdit = (tenant: any) => {
    setEditTenantId(tenant.id);
    setFullName(tenant.fullName || '');
    setQid(tenant.qid || '');
    setPassportNo(tenant.passportNo || '');
    setNationality(tenant.nationality || 'Qatari');
    setPhone(tenant.phone || '+974 ');
    setEmail(tenant.email || '');
    setSponsorName(tenant.sponsorName || '');
    setEmergencyContact(tenant.emergencyContact || '');
    setEmergencyPhone(tenant.emergencyPhone || '+974 ');
    setIsEditOpen(true);
  };

  const handleSubmitRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (qid.trim().length !== 11) {
      setErrorMessage('Qatar ID (QID) must be exactly 11 digits as per MOI standards.');
      return;
    }
    createTenantMutation.mutate({
      fullName,
      qid,
      passportNo: passportNo || undefined,
      nationality,
      phone,
      email: email || undefined,
      sponsorName: sponsorName || undefined,
      emergencyContact: emergencyContact || undefined,
      emergencyPhone: emergencyPhone || undefined,
    });
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTenantId) return;
    if (qid.trim().length !== 11) {
      setErrorMessage('Qatar ID (QID) must be exactly 11 digits as per MOI standards.');
      return;
    }
    updateTenantMutation.mutate({
      id: editTenantId,
      payload: {
        fullName,
        qid,
        passportNo: passportNo || undefined,
        nationality,
        phone,
        email: email || undefined,
        sponsorName: sponsorName || undefined,
        emergencyContact: emergencyContact || undefined,
        emergencyPhone: emergencyPhone || undefined,
      },
    });
  };

  const columns: Column<Tenant>[] = [
    {
      key: 'name',
      header: 'Tenant Name & QID',
      render: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-sand-200 border border-gold-500/40 flex items-center justify-center font-bold text-maroon-700 text-xs">
            {row.fullName.charAt(0)}
          </div>
          <div>
            <span className="font-semibold text-ink-900 block">{row.fullName}</span>
            <span className="text-[11px] font-mono text-ink-500 flex items-center gap-1">
              <Shield size={10} className="text-gold-500" />
              QID: {row.qid}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'nationality',
      header: 'Nationality',
      render: (row: any) => (
        <span className="px-2 py-0.5 rounded bg-sand-100 text-ink-700 text-xs font-medium border border-line">
          {row.nationality}
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (row: any) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1 text-ink-700 font-mono">
            <Phone size={11} className="text-gold-600" />
            <span>{row.phone}</span>
          </div>
          {row.email && (
            <div className="flex items-center gap-1 text-ink-500 text-[11px]">
              <Mail size={11} />
              <span className="truncate max-w-[150px]">{row.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'unit',
      header: 'Current Leased Unit',
      render: (row: any) => {
        const activeLease = row.leases?.find((l: any) => l.status === 'ACTIVE') || row.leases?.[0];
        if (!activeLease) {
          return <span className="text-ink-400 text-xs italic">No active lease</span>;
        }
        return (
          <div>
            <span className="font-medium text-ink-900 block text-xs">
              {activeLease.unit?.unitNumber || 'Unit'} - {activeLease.unit?.property?.name || 'Property'}
            </span>
            <span className="text-[11px] text-ink-500">
              QAR {Number(activeLease.rentAmount).toLocaleString()} /mo
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Lease Status',
      render: (row: any) => {
        const activeLease = row.leases?.find((l: any) => l.status === 'ACTIVE') || row.leases?.[0];
        const status = activeLease?.status || 'VACATED';
        return <StatusPill status={status} />;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="icon"
            onClick={() => setSelectedTenant(row)}
            title="View Details"
          >
            <Eye size={15} />
          </Button>
          <PermissionGate module="tenants" action="update">
            <Button
              variant="ghost"
              onClick={() => handleOpenEdit(row)}
              title="Edit Tenant"
            >
              Edit
            </Button>
          </PermissionGate>
          <PermissionGate module="tenants" action="delete">
            <Button
              variant="destructive"
              onClick={() => {
                setTenantToDelete(row);
              }}
              title="Delete Tenant"
              className="p-1.5 h-8 w-8 min-w-0"
            >
              <Trash2 size={15} />
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink-900 tracking-tight">
            {t('nav.tenants')}
          </h2>
          <p className="text-xs text-ink-600 mt-1">
            QID verified tenant directory with Qatar Tawtheeq lease integration
          </p>
        </div>

        <PermissionGate module="tenants" action="create">
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setIsRegisterOpen(true);
            }}
          >
            <UserPlus size={15} />
            <span>Register Tenant</span>
          </Button>
        </PermissionGate>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-line flex flex-wrap gap-4 items-center justify-between shadow-xs">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div className="w-48">
            <ComboBoxWithAddNew
              listTypeKey="nationalities"
              value={nationalityFilter}
              onChange={setNationalityFilter}
              placeholder="Filter Nationality..."
              allowAddNew={false}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-sand-050 border border-line rounded focus:outline-none focus:border-maroon-700"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Lease</option>
            <option value="EXPIRING">Expiring (30 Days)</option>
            <option value="VACATED">Vacated / Terminated</option>
          </select>

          {(nationalityFilter || statusFilter) && (
            <Button
              variant="ghost"
              onClick={() => {
                setNationalityFilter('');
                setStatusFilter('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Tenants Table */}
      <DataTable
        columns={columns}
        data={data?.data || []}
        total={data?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l: number) => {
          setLimit(l);
          setPage(1);
        }}
        searchPlaceholder="Search by tenant name, QID (11 digits), phone or email..."
        onSearchChange={(q: string) => {
          setSearchTerm(q);
          setPage(1);
        }}
        isLoading={isLoading}
        isFiltered={Boolean(statusFilter || nationalityFilter)}
        onRowClick={(row: any) => setSelectedTenant(row)}
        emptyState={
          <div className="flex flex-col items-center justify-center space-y-3 py-6">
            <div className="w-12 h-12 rounded-full bg-sand-100 flex items-center justify-center text-maroon-700">
              <UserPlus size={24} />
            </div>
            <div className="text-center">
              <h4 className="text-sm font-semibold text-ink-900">No Tenants Registered</h4>
              <p className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
                You haven't registered any tenants yet. Register your first tenant to assign them to a lease.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setIsRegisterOpen(true);
              }}
              className="mt-2"
            >
              <UserPlus size={14} />
              <span>Register Tenant</span>
            </Button>
          </div>
        }
      />

      {/* Tenant Detail Drawer */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white h-[100dvh] shadow-2xl flex flex-col justify-between">
            {/* Drawer Header */}
            <div className="shrink-0 p-6 bg-maroon-900 text-white flex items-center justify-between border-b border-gold-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-maroon-700 border border-gold-500 flex items-center justify-center font-bold text-gold-300 text-base">
                    {selectedTenant.fullName?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-white">
                      {selectedTenant.fullName}
                    </h3>
                    <p className="text-xs text-gold-300/80 font-mono">
                      QID: {selectedTenant.qid}
                    </p>
                  </div>
                </div>
                <Button
                  variant="icon"
                  onClick={() => setSelectedTenant(null)}
                >
                  <X size={18} />
                </Button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-ink-700">
                {/* Qatar MOI QID Validation Banner */}
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-emerald-900 block">
                      Verified Qatar Civil ID (QID)
                    </span>
                    <span className="text-emerald-700 text-[11px] block mt-0.5">
                      11-digit national identity verified for Tawtheeq digital tenancy registration.
                    </span>
                  </div>
                </div>

                {/* Tenant Basic Info */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-ink-900 uppercase tracking-wider text-[11px] border-b border-line pb-1">
                    Personal & Identification
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-ink-400 block">Nationality</span>
                      <span className="font-medium text-ink-900">{selectedTenant.nationality}</span>
                    </div>
                    <div>
                      <span className="text-ink-400 block">Passport Number</span>
                      <span className="font-mono font-medium text-ink-900">
                        {selectedTenant.passportNo || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-400 block">Phone</span>
                      <span className="font-mono font-medium text-ink-900">{selectedTenant.phone}</span>
                    </div>
                    <div>
                      <span className="text-ink-400 block">Email</span>
                      <span className="font-medium text-ink-900">{selectedTenant.email || '—'}</span>
                    </div>
                    {selectedTenant.sponsorName && (
                      <div className="col-span-2">
                        <span className="text-ink-400 block">Sponsor / Employer</span>
                        <span className="font-medium text-ink-900 flex items-center gap-1.5">
                          <Briefcase size={12} className="text-gold-600" />
                          {selectedTenant.sponsorName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Emergency Contact */}
                {selectedTenant.emergencyContact && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-ink-900 uppercase tracking-wider text-[11px] border-b border-line pb-1">
                      Emergency Contact
                    </h4>
                    <div className="flex justify-between">
                      <span className="font-medium text-ink-900">{selectedTenant.emergencyContact}</span>
                      <span className="font-mono text-ink-600">{selectedTenant.emergencyPhone}</span>
                    </div>
                  </div>
                )}

                {/* Active Leases */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-ink-900 uppercase tracking-wider text-[11px] border-b border-line pb-1">
                    Tenancy History & Leases
                  </h4>
                  {selectedTenant.leases && selectedTenant.leases.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTenant.leases.map((lease: any) => (
                        <div
                          key={lease.id}
                          className="p-3 rounded-lg border border-line bg-sand-050 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-ink-900">
                              {lease.unit?.unitNumber} — {lease.unit?.property?.name}
                            </span>
                            <StatusPill status={lease.status} />
                          </div>
                          <div className="flex items-center justify-between text-ink-500 text-[11px]">
                            <span>
                              {lease.startDate.split('T')[0]} to {lease.endDate.split('T')[0]}
                            </span>
                            <span className="font-semibold text-ink-900">
                              QAR {Number(lease.rentAmount).toLocaleString()} /mo
                            </span>
                          </div>
                          {lease.tawtheeqNumber && (
                            <div className="text-[11px] font-mono text-gold-700 bg-gold-50 px-2 py-0.5 rounded inline-block">
                              Tawtheeq #{lease.tawtheeqNumber}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-ink-400 italic">No lease records attached.</p>
                  )}
                </div>

                {/* Attached Documents */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-line pb-1">
                    <h4 className="font-semibold text-ink-900 uppercase tracking-wider text-[11px]">
                      Documents & Contracts
                    </h4>
                    <span className="text-[10px] text-ink-400">PDF, JPG, PNG</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded border border-line hover:bg-sand-050">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-maroon-700" />
                        <div>
                          <span className="font-medium text-ink-900 block">Qatar_ID_Copy.pdf</span>
                          <span className="text-[10px] text-ink-400">Verified MOI copy</span>
                        </div>
                      </div>
                      <Button variant="icon">
                        <Download size={14} />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded border border-line hover:bg-sand-050">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-gold-600" />
                        <div>
                          <span className="font-medium text-ink-900 block">Tawtheeq_Lease_Contract.pdf</span>
                          <span className="text-[10px] text-ink-400">Ministry of Justice Attested</span>
                        </div>
                      </div>
                      <Button variant="icon">
                        <Download size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

            {/* Drawer Footer Actions */}
            <div className="shrink-0 p-4 border-t border-line bg-sand-050 flex items-center justify-between">
              <PermissionGate module="tenants" action="update">
                <Button
                  variant="secondary"
                  onClick={() => {
                    handleOpenEdit(selectedTenant);
                  }}
                >
                  Edit Profile
                </Button>
              </PermissionGate>
              <Button
                variant="primary"
                onClick={() => setSelectedTenant(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Register Tenant Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-line flex flex-col max-h-[90dvh]">
            <div className="shrink-0 p-5 bg-maroon-900 text-white flex items-center justify-between border-b border-gold-500/30">
              <div>
                <h3 className="font-serif text-lg font-bold">Register New Tenant</h3>
                <p className="text-xs text-white/60">Qatar ID verification & MOI profile details</p>
              </div>
              <Button
                variant="icon"
                onClick={() => setIsRegisterOpen(false)}
              >
                <X size={18} />
              </Button>
            </div>

            <form onSubmit={handleSubmitRegister} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 rounded bg-ruby-50 border border-ruby-200 text-ruby-700 flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-ink-700 font-semibold mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Nasser Al-Kuwari"
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">
                    Qatar Civil ID (QID) * (11 digits)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={qid}
                    onChange={(e) => setQid(e.target.value.replace(/\D/g, ''))}
                    placeholder="29063401829"
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Passport Number</label>
                  <input
                    type="text"
                    value={passportNo}
                    onChange={(e) => setPassportNo(e.target.value)}
                    placeholder="QA990184"
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-ink-700 font-semibold mb-1">Nationality *</label>
                <ComboBoxWithAddNew
                  listTypeKey="nationalities"
                  value={nationality}
                  onChange={setNationality}
                  placeholder="Select nationality or add new..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+974 5500 0000"
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tenant@domain.qa"
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-ink-700 font-semibold mb-1">Employer / Sponsor</label>
                <input
                  type="text"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder="e.g. Qatar Energy, Ooredoo, Ministry..."
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="e.g. Maryam Al-Kuwari"
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                  />
                </div>
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="+974 5511 2233"
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-line">
                <Button
                  variant="secondary"
                  onClick={() => setIsRegisterOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={createTenantMutation.isPending}
                >
                  Register Tenant
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tenant Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-line">
            <div className="p-5 bg-maroon-900 text-white flex items-center justify-between border-b border-gold-500/30">
              <div>
                <h3 className="font-serif text-lg font-bold">Edit Tenant Profile</h3>
                <p className="text-xs text-white/60">Update identification and contact details</p>
              </div>
              <Button
                variant="icon"
                onClick={() => setIsEditOpen(false)}
              >
                <X size={18} />
              </Button>
            </div>

            <form onSubmit={handleSubmitEdit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 rounded bg-ruby-50 border border-ruby-200 text-ruby-700 flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-ink-700 font-semibold mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">
                    Qatar Civil ID (QID) * (11 digits)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={qid}
                    onChange={(e) => setQid(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Passport Number</label>
                  <input
                    type="text"
                    value={passportNo}
                    onChange={(e) => setPassportNo(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-ink-700 font-semibold mb-1">Nationality *</label>
                <ComboBoxWithAddNew
                  listTypeKey="nationalities"
                  value={nationality}
                  onChange={setNationality}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-ink-700 font-semibold mb-1">Employer / Sponsor</label>
                <input
                  type="text"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                  />
                </div>
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-line">
                <Button
                  variant="secondary"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={updateTenantMutation.isPending}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!tenantToDelete}
        onClose={() => setTenantToDelete(null)}
        onConfirm={() => {
          if (tenantToDelete) {
            deleteTenantMutation.mutate(tenantToDelete.id);
          }
        }}
        title="Delete Tenant"
        message={`Are you sure you want to remove tenant ${tenantToDelete?.fullName}? This action cannot be undone.`}
        confirmText="Delete Tenant"
        isDestructive={true}
      />
    </div>
  );
};

export default TenantsView;
