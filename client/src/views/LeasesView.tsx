import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, RefreshCw, Calendar } from 'lucide-react';
import api from '../lib/api';
import { DataTable, type Column } from '../components/DataTable';
import { PermissionGate } from '../components/PermissionGate';
import StatusPill from '../components/ui/StatusPill';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import type { Lease, PaginatedResponse } from '../types';

export const LeasesView: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('endDate:asc');

  // Renewal Proposal Modal State
  const [selectedLeaseForRenewal, setSelectedLeaseForRenewal] = useState<Lease | null>(null);
  const [proposedRent, setProposedRent] = useState<number>(0);
  const [proposedEndDate, setProposedEndDate] = useState<string>('');
  const [leaseToTerminate, setLeaseToTerminate] = useState<Lease | null>(null);

  // Fetch Leases with server-side query contract
  const { data, isLoading } = useQuery<PaginatedResponse<Lease>>({
    queryKey: ['leases', search, statusFilter, page, sort],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('filter[status]', statusFilter);
      if (sort) params.append('sort', sort);
      params.append('page', String(page));
      params.append('limit', '15');

      const res = await api.get(`/leases?${params.toString()}`);
      return res.data;
    },
  });

  // Mutation to propose renewal
  const proposeMutation = useMutation({
    mutationFn: async ({ leaseId, rent, endDate }: { leaseId: string; rent: number; endDate: string }) => {
      return api.post(`/leases/${leaseId}/renewal-requests`, {
        proposedRentAmount: rent,
        proposedEndDate: endDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      setSelectedLeaseForRenewal(null);
    },
  });

  // Mutation to approve renewal
  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return api.patch(`/renewal-requests/${requestId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
    },
  });

  // Mutation to reject renewal
  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return api.patch(`/renewal-requests/${requestId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
    },
  });

  const openRenewalModal = (lease: Lease) => {
    setSelectedLeaseForRenewal(lease);
    setProposedRent((lease.rentAmount ?? lease.rentQar) || 0);
    const nextYear = new Date(lease.endDate);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setProposedEndDate(nextYear.toISOString().slice(0, 10));
  };

  const handleProposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaseForRenewal) return;
    proposeMutation.mutate({
      leaseId: selectedLeaseForRenewal.id,
      rent: proposedRent,
      endDate: proposedEndDate,
    });
  };

  const columns: Column<Lease>[] = [
    {
      key: 'tenantName',
      header: 'Resident / Tenant',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-[#221E1C] block">{row.tenantName}</span>
          <span className="text-[10px] text-[#8B8279]">{row.phone}</span>
        </div>
      ),
    },
    {
      key: 'unitNumber',
      header: 'Assigned Unit & Property',
      render: (row) => (
        <div>
          <span className="font-medium text-[#221E1C] block">{row.unitNumber}</span>
          <span className="text-[10px] text-[#5B534C]">{row.propertyName}</span>
        </div>
      ),
    },
    {
      key: 'rentAmount',
      header: 'Monthly Rent',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-[#6E1731]">
          {((row.rentAmount ?? row.rentQar) || 0).toLocaleString()} QAR
        </span>
      ),
    },
    {
      key: 'endDate',
      header: 'Contract Expiry',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <Calendar className="w-3.5 h-3.5 text-[#8B8279]" />
          <span>{row.endDate}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <StatusPill status={row.status} />
          {row.latestRenewalRequest?.status === 'PENDING' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F5E7CE] text-[#A9711C] border border-[#B9924A]/30 animate-pulse">
              Renewal Pending ({Number(row.latestRenewalRequest.proposedRentAmount).toLocaleString()} QAR)
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Renewal Actions',
      className: 'text-right',
      render: (row) => {
        const pendingRenewal = row.latestRenewalRequest?.status === 'PENDING' ? row.latestRenewalRequest : null;

        if (pendingRenewal) {
          return (
            <div className="flex items-center justify-end gap-1.5">
              <PermissionGate module="leases" action="approve">
                <Button
                  variant="primary"
                  title="Approve Renewal"
                  isLoading={approveMutation.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    approveMutation.mutate(pendingRenewal.id);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 h-7"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </Button>
                <Button
                  variant="destructive"
                  title="Reject Renewal"
                  isLoading={rejectMutation.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    rejectMutation.mutate(pendingRenewal.id);
                  }}
                  className="h-7"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </Button>
              </PermissionGate>
            </div>
          );
        }

        return (
          <div className="flex items-center justify-end gap-1.5">
            <PermissionGate module="leases" action="create">
              <Button
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  openRenewalModal(row);
                }}
                className="h-7"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Propose Renewal</span>
              </Button>
            </PermissionGate>
            <PermissionGate module="leases" action="delete">
              <Button
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setLeaseToTerminate(row);
                }}
                className="h-7"
              >
                <X className="w-3 h-3" />
                <span>Terminate</span>
              </Button>
            </PermissionGate>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#221E1C] tracking-tight">Leases & Renewal Operations</h2>
          <p className="text-xs text-[#5B534C] mt-1">
            Manage tenancy contracts across Doha properties and review renewal proposals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGate module="leases" action="create">
            <Button
              variant="primary"
              onClick={() => {
                toast.success('New Lease flow placeholder');
              }}
            >
              <span>New Lease</span>
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Leases DataTable with Server-Side Querying */}
      <DataTable
        columns={columns}
        data={data?.data || []}
        total={data?.total || 0}
        page={data?.page || 1}
        limit={data?.limit || 15}
        totalPages={data?.totalPages || 1}
        isLoading={isLoading}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search resident name, unit number, or property..."
        sort={sort}
        onSortChange={setSort}
        onPageChange={setPage}
        emptyState={
          <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-dashed border-[#E4DCCB]">
            <div className="w-12 h-12 rounded-full bg-[#F5F2EB] flex items-center justify-center text-[#5B534C] mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <h4 className="text-sm font-semibold text-[#221E1C]">No Active Leases</h4>
            <p className="text-xs text-[#5B534C] mt-1 max-w-sm mx-auto">
              There are currently no active leases. Create a new lease contract to get started.
            </p>
            <Button
              variant="primary"
              onClick={() => toast.success('New Lease flow placeholder')}
              className="mt-4"
            >
              <span>Create Lease</span>
            </Button>
          </div>
        }
        filters={
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white border border-[#E4DCCB] rounded-[4px] text-[#221E1C] focus:outline-none focus:border-[#6E1731]"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="RENEWAL_PENDING">Renewal Pending</option>
            <option value="EXPIRED">Expired</option>
          </select>
        }
      />

      {/* Modal: Propose Lease Renewal */}
      {selectedLeaseForRenewal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[6px] border border-[#E4DCCB] shadow-2xl max-w-md w-full flex flex-col max-h-[90dvh] overflow-hidden p-6 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4DCCB] shrink-0">
              <h3 className="text-base font-bold text-[#221E1C] flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#B9924A]" />
                Propose Lease Renewal
              </h3>
              <Button
                variant="icon"
                onClick={() => setSelectedLeaseForRenewal(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleProposeSubmit} className="space-y-4 pt-4 text-xs flex-1 overflow-y-auto min-h-0 pr-2">
              <div className="p-3 bg-[#FBF9F3] border border-[#E4DCCB] rounded-[4px] space-y-1">
                <p className="font-semibold text-[#221E1C]">{selectedLeaseForRenewal.tenantName}</p>
                <p className="text-[#5B534C]">
                  {selectedLeaseForRenewal.unitNumber} • {selectedLeaseForRenewal.propertyName}
                </p>
                <p className="text-[#8B8279]">
                  Current Rent: {((selectedLeaseForRenewal.rentAmount ?? selectedLeaseForRenewal.rentQar) || 0).toLocaleString()} QAR
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">Proposed Monthly Rent (QAR)</label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={proposedRent}
                  onChange={(e) => setProposedRent(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-[#E4DCCB] rounded-[4px] focus:outline-none focus:border-[#6E1731] font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">New Extended Expiry Date</label>
                <input
                  type="date"
                  required
                  value={proposedEndDate}
                  onChange={(e) => setProposedEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E4DCCB] rounded-[4px] focus:outline-none focus:border-[#6E1731]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E4DCCB]">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedLeaseForRenewal(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={proposeMutation.isPending}
                >
                  Submit Proposal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!leaseToTerminate}
        onClose={() => setLeaseToTerminate(null)}
        onConfirm={() => {
          if (leaseToTerminate) {
            toast.success('Terminate lease placeholder');
          }
        }}
        title="Terminate Lease"
        message="Are you sure you want to terminate this lease early? This action cannot be undone."
        confirmText="Terminate"
        isDestructive={true}
      />
    </div>
  );
};

export default LeasesView;
