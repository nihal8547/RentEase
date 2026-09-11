import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  Plus,
  X,
  Flame,
  AlertTriangle,
  Truck,
  Trash2,
  Eye,
} from 'lucide-react';
import api from '../lib/api';
import StatusPill from '../components/ui/StatusPill';
import { DataTable, type Column } from '../components/DataTable';
import { ComboBoxWithAddNew } from '../components/ComboBoxWithAddNew';
import { PermissionGate } from '../components/PermissionGate';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import type { PaginatedResponse } from '../types';

export const MaintenanceView: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals & Drawers
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [unitId, setUnitId] = useState('');
  const [category, setCategory] = useState('HVAC');
  const [priority, setPriority] = useState('HIGH');
  const [description, setDescription] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [costQar, setCostQar] = useState('');

  // Fetch properties and units for unit picker
  const { data: propertiesData } = useQuery({
    queryKey: ['properties-list-all'],
    queryFn: async () => {
      const res = await api.get('/properties?limit=100');
      return res.data?.data || [];
    },
  });

  // Fetch vendors for vendor picker
  const { data: vendorsData } = useQuery({
    queryKey: ['vendors-list-all'],
    queryFn: async () => {
      const res = await api.get('/vendors?limit=100');
      return res.data?.data || [];
    },
  });

  // Fetch maintenance tickets
  const { data, isLoading } = useQuery<PaginatedResponse<any>>({
    queryKey: ['maintenance-tickets', page, limit, searchTerm, statusFilter, categoryFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: searchTerm,
      });
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (priorityFilter) params.append('priority', priorityFilter);

      const res = await api.get(`/maintenance?${params.toString()}`);
      return res.data;
    },
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/maintenance', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      setIsNewTicketOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to dispatch ticket.');
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const res = await api.patch(`/maintenance/${id}`, { status, resolutionNotes: notes });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      if (selectedTicket) {
        setSelectedTicket(null);
      }
    },
  });

  // Delete ticket mutation
  const deleteTicketMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/maintenance/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      if (selectedTicket) setSelectedTicket(null);
    },
  });

  const resetForm = () => {
    setTitle('');
    setUnitId('');
    setCategory('HVAC');
    setPriority('HIGH');
    setDescription('');
    setVendorId('');
    setCostQar('');
    setErrorMessage('');
  };

  const handleSubmitNewTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitId) {
      setErrorMessage('Please select a unit.');
      return;
    }
    createTicketMutation.mutate({
      title,
      unitId,
      category,
      priority,
      description,
      vendorId: vendorId || undefined,
      costEstimate: costQar ? parseFloat(costQar) : undefined,
    });
  };

  // Flatten all units for select
  const allUnits: { id: string; label: string }[] = [];
  if (propertiesData) {
    for (const prop of propertiesData) {
      if (prop.units) {
        for (const u of prop.units) {
          allUnits.push({
            id: u.id,
            label: `${u.unitNumber} — ${prop.name} (${prop.location})`,
          });
        }
      }
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'details',
      header: 'Ticket Details',
      render: (row: any) => (
        <div className="space-y-0.5">
          <span className="font-semibold text-ink-900 block text-xs">{row.title}</span>
          <span className="text-[11px] text-ink-500 line-clamp-1">{row.description}</span>
        </div>
      ),
    },
    {
      key: 'unit',
      header: 'Property & Unit',
      render: (row: any) => (
        <div>
          <span className="font-medium text-ink-900 block text-xs">
            {row.unit?.unitNumber || 'Unit'}
          </span>
          <span className="text-[11px] text-ink-500">
            {row.unit?.property?.name || 'Property'}
          </span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row: any) => (
        <span className="px-2 py-0.5 rounded bg-sand-100 text-ink-700 text-xs font-medium border border-line">
          {row.category}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row: any) => {
        const p = row.priority;
        let badgeColor = 'bg-sand-100 text-ink-700';
        let icon = null;
        if (p === 'URGENT') {
          badgeColor = 'bg-ruby-50 text-ruby-700 border border-ruby-200 animate-pulse';
          icon = <Flame size={12} className="inline mr-1 text-ruby-600" />;
        } else if (p === 'HIGH') {
          badgeColor = 'bg-amber-50 text-amber-700 border border-amber-200';
          icon = <AlertTriangle size={12} className="inline mr-1 text-amber-600" />;
        }
        return (
          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${badgeColor}`}>
            {icon}
            {p}
          </span>
        );
      },
    },
    {
      key: 'vendor',
      header: 'Contractor / Vendor',
      render: (row: any) => (
        <div className="flex items-center gap-1.5 text-xs text-ink-800">
          <Truck size={13} className="text-gold-600 shrink-0" />
          <span className="truncate max-w-[150px]">
            {row.vendor?.name || 'Unassigned'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => <StatusPill status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="icon"
            onClick={() => setSelectedTicket(row)}
            title="View Details"
          >
            <Eye size={15} />
          </Button>
          <PermissionGate module="maintenance" action="delete">
            <Button
              variant="destructive"
              onClick={() => {
                setTicketToDelete(row);
              }}
              title="Delete Ticket"
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink-900 tracking-tight">
            {t('nav.maintenance')}
          </h2>
          <p className="text-xs text-ink-600 mt-1">
            Dispatch, contractor coordination, and maintenance work orders in Doha
          </p>
        </div>

        <PermissionGate module="maintenance" action="create">
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setIsNewTicketOpen(true);
            }}
          >
            <Plus size={15} />
            <span>Dispatch Work Order</span>
          </Button>
        </PermissionGate>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-line flex flex-wrap gap-4 items-center justify-between shadow-xs">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div className="w-48">
            <ComboBoxWithAddNew
              listTypeKey="maintenance_categories"
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder="Filter Category..."
              allowAddNew={false}
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-sand-050 border border-line rounded focus:outline-none focus:border-maroon-700"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">URGENT</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-sand-050 border border-line rounded focus:outline-none focus:border-maroon-700"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          {(categoryFilter || priorityFilter || statusFilter) && (
            <Button
              variant="ghost"
              onClick={() => {
                setCategoryFilter('');
                setPriorityFilter('');
                setStatusFilter('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Maintenance Table */}
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
        searchPlaceholder="Search by issue title, description, or unit..."
        onSearchChange={(q: string) => {
          setSearchTerm(q);
          setPage(1);
        }}
        isLoading={isLoading}
        onRowClick={(row: any) => setSelectedTicket(row)}
        emptyState={
          <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-dashed border-[#E4DCCB]">
            <div className="w-12 h-12 rounded-full bg-[#F5F2EB] flex items-center justify-center text-[#5B534C] mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </div>
            <h4 className="text-sm font-semibold text-[#221E1C]">No Maintenance Tickets</h4>
            <p className="text-xs text-[#5B534C] mt-1 max-w-sm mx-auto">
              You have no active or past maintenance tickets. Dispatch a work order if an issue arises.
            </p>
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setIsNewTicketOpen(true);
              }}
              className="mt-4"
            >
              <span>Dispatch Work Order</span>
            </Button>
          </div>
        }
      />

      {/* Ticket Details Drawer */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white h-[100dvh] shadow-2xl flex flex-col justify-between">
            {/* Header */}
            <div className="shrink-0 p-6 bg-maroon-900 text-white flex items-center justify-between border-b border-gold-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-maroon-700 border border-gold-500 flex items-center justify-center font-bold text-gold-300">
                    <Wrench size={18} />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-white line-clamp-1">
                      {selectedTicket.title}
                    </h3>
                    <p className="text-xs text-gold-300/80">
                      Ticket #{selectedTicket.id?.slice(0, 8)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="icon"
                  onClick={() => setSelectedTicket(null)}
                >
                  <X size={18} />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-ink-700">
                {/* Status & Priority Ribbon */}
                <div className="flex items-center justify-between p-3 rounded bg-sand-100 border border-line">
                  <div className="flex items-center gap-2">
                    <span className="text-ink-500">Current Status:</span>
                    <StatusPill status={selectedTicket.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-ink-500">Priority:</span>
                    <span className="font-bold text-maroon-800">{selectedTicket.priority}</span>
                  </div>
                </div>

                {/* Quick Status Workflow Changer */}
                <PermissionGate module="maintenance" action="update">
                  <div className="space-y-2 p-3 rounded-lg border border-gold-500/30 bg-gold-50/50">
                    <span className="font-semibold text-ink-900 block text-[11px] uppercase tracking-wider">
                      Update Ticket Workflow
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant={selectedTicket.status === 'OPEN' ? 'primary' : 'secondary'}
                        onClick={() =>
                          updateStatusMutation.mutate({ id: selectedTicket.id, status: 'OPEN' })
                        }
                        className={selectedTicket.status === 'OPEN' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                      >
                        Mark Open
                      </Button>
                      <Button
                        variant={selectedTicket.status === 'IN_PROGRESS' ? 'primary' : 'secondary'}
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: selectedTicket.id,
                            status: 'IN_PROGRESS',
                          })
                        }
                        className={selectedTicket.status === 'IN_PROGRESS' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                      >
                        In Progress
                      </Button>
                      <Button
                        variant={selectedTicket.status === 'RESOLVED' ? 'primary' : 'secondary'}
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: selectedTicket.id,
                            status: 'RESOLVED',
                          })
                        }
                        className={selectedTicket.status === 'RESOLVED' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                      >
                        Mark Resolved
                      </Button>
                    </div>
                  </div>
                </PermissionGate>

                {/* Property & Tenant Location */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-ink-900 uppercase tracking-wider text-[11px] border-b border-line pb-1">
                    Location & Unit Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-ink-400 block">Unit Number</span>
                      <span className="font-semibold text-ink-900">
                        {selectedTicket.unit?.unitNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-400 block">Property / Tower</span>
                      <span className="font-semibold text-ink-900">
                        {selectedTicket.unit?.property?.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-ink-900 uppercase tracking-wider text-[11px] border-b border-line pb-1">
                    Problem Description
                  </h4>
                  <div className="p-3 rounded bg-sand-050 border border-line text-ink-800 leading-relaxed">
                    {selectedTicket.description}
                  </div>
                </div>

                {/* Contractor Assignment */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-line pb-1">
                    <h4 className="font-semibold text-ink-900 uppercase tracking-wider text-[11px]">
                      Assigned Contractor / Vendor
                    </h4>
                    <Button variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => toast.success('Assign vendor functionality placeholder')}>
                      {selectedTicket.vendor ? 'Change Vendor' : 'Assign Vendor'}
                    </Button>
                  </div>
                  {selectedTicket.vendor ? (
                    <div className="p-3 rounded border border-line bg-sand-050 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink-900">{selectedTicket.vendor.name}</span>
                        <span className="text-[11px] font-mono text-gold-700 bg-gold-50 px-2 py-0.5 rounded">
                          CR: {selectedTicket.vendor.crNumber || 'Verified'}
                        </span>
                      </div>
                      <div className="text-ink-600 text-[11px]">
                        Phone: {selectedTicket.vendor.phone} | Specialty: {selectedTicket.vendor.specialty}
                      </div>
                    </div>
                  ) : (
                    <p className="text-ink-400 italic">No contractor assigned yet.</p>
                  )}
                </div>

                {/* Attachments & Photos */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-line pb-1">
                    <h4 className="font-semibold text-ink-900 uppercase tracking-wider text-[11px]">
                      Photos & Attachments
                    </h4>
                    <Button variant="secondary" className="h-6 px-2 text-[10px]" onClick={() => toast.success('Attach photo functionality placeholder')}>
                      Attach Photo
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                     <p className="col-span-4 text-ink-400 italic text-[11px]">No photos attached.</p>
                  </div>
                </div>

                {/* Cost Estimate */}
                {selectedTicket.costEstimate && (
                  <div className="p-3 rounded bg-sand-100 border border-line flex items-center justify-between">
                    <span className="font-semibold text-ink-700">Estimated Cost</span>
                    <span className="font-mono font-bold text-sm text-ink-900">
                      QAR {Number(selectedTicket.costEstimate).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

            <div className="shrink-0 p-4 border-t border-line bg-sand-050 flex justify-end">
              <Button
                variant="primary"
                onClick={() => setSelectedTicket(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-line flex flex-col max-h-[90dvh]">
            <div className="shrink-0 p-5 bg-maroon-900 text-white flex items-center justify-between border-b border-gold-500/30">
              <div>
                <h3 className="font-serif text-lg font-bold">Dispatch Maintenance Work Order</h3>
                <p className="text-xs text-white/60">Log urgent repairs and notify certified contractors</p>
              </div>
              <Button
                variant="icon"
                onClick={() => setIsNewTicketOpen(false)}
              >
                <X size={18} />
              </Button>
            </div>

            <form onSubmit={handleSubmitNewTicket} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 rounded bg-ruby-50 border border-ruby-200 text-ruby-700">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-ink-700 font-semibold mb-1">Issue Headline *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master Bedroom AC Compressor Malfunction"
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                />
              </div>

              <div>
                <label className="block text-ink-700 font-semibold mb-1">Affected Unit *</label>
                <select
                  required
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                >
                  <option value="">Select Unit...</option>
                  {allUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Category *</label>
                  <ComboBoxWithAddNew
                    listTypeKey="maintenance_categories"
                    value={category}
                    onChange={setCategory}
                  />
                </div>
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Priority *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                  >
                    <option value="URGENT">URGENT (AC/Gas/Water Leak)</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Assign Vendor</label>
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                  >
                    <option value="">Select contractor...</option>
                    {vendorsData?.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.specialty})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Estimated Cost (QAR)</label>
                  <input
                    type="number"
                    value={costQar}
                    onChange={(e) => setCostQar(e.target.value)}
                    placeholder="e.g. 1200"
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-ink-700 font-semibold mb-1">Detailed Description *</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the defect, location inside unit, and any immediate hazard..."
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-line">
                <Button
                  variant="secondary"
                  onClick={() => setIsNewTicketOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={createTicketMutation.isPending}
                >
                  Dispatch Ticket
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!ticketToDelete}
        onClose={() => setTicketToDelete(null)}
        onConfirm={() => {
          if (ticketToDelete) {
            deleteTicketMutation.mutate(ticketToDelete.id);
          }
        }}
        title="Delete Ticket"
        message={`Are you sure you want to delete the ticket "${ticketToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Ticket"
        isDestructive={true}
      />
    </div>
  );
};

export default MaintenanceView;
