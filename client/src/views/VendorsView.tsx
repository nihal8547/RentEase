import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Star, Phone, X, Wrench } from 'lucide-react';
import api from '../lib/api';
import { DataTable, type Column } from '../components/DataTable';
import { ComboBoxWithAddNew } from '../components/ComboBoxWithAddNew';
import { PermissionGate } from '../components/PermissionGate';
import { Button } from '../components/ui/button';
import type { Vendor, PaginatedResponse } from '../types';

export const VendorsView: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('+974 ');
  const [newVendorSpecialtyId, setNewVendorSpecialtyId] = useState('');

  // Fetch Vendors
  const { data, isLoading } = useQuery<PaginatedResponse<Vendor>>({
    queryKey: ['vendors', search, specialtyFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (specialtyFilter) params.append('filter[specialtyListItemId]', specialtyFilter);
      params.append('page', String(page));
      params.append('limit', '15');

      const res = await api.get(`/vendors?${params.toString()}`);
      return res.data;
    },
  });

  // Mutation to add vendor
  const createMutation = useMutation({
    mutationFn: async (vendorData: { name: string; phone: string; specialtyListItemId: string }) => {
      return api.post('/vendors', vendorData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setIsAddModalOpen(false);
      setNewVendorName('');
      setNewVendorPhone('+974 ');
      setNewVendorSpecialtyId('');
    },
  });

  // Mutation to toggle active status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return api.patch(`/vendors/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim() || !newVendorSpecialtyId) return;
    createMutation.mutate({
      name: newVendorName.trim(),
      phone: newVendorPhone.trim(),
      specialtyListItemId: newVendorSpecialtyId,
    });
  };

  const columns: Column<Vendor>[] = [
    {
      key: 'name',
      header: 'Contractor Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#F4EFE4] border border-[#E4DCCB] flex items-center justify-center text-[#6E1731] shrink-0 font-bold">
            <Wrench className="w-4 h-4 text-[#6E1731]" />
          </div>
          <div>
            <span className="font-semibold text-[#221E1C] block">{row.name}</span>
            <span className="text-[10px] text-[#8B8279] flex items-center gap-1">
              <Phone className="w-3 h-3 text-[#5B534C]" />
              {row.phone}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'specialty',
      header: 'Trade Specialty',
      render: (row) => (
        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-[#F4EFE4] text-[#4A0F22] border border-[#E4DCCB]">
          {row.specialty}
        </span>
      ),
    },
    {
      key: 'rating',
      header: 'Performance Rating',
      render: (row) => (
        <div className="flex items-center gap-1 font-mono text-xs">
          <Star className="w-3.5 h-3.5 fill-[#B9924A] text-[#B9924A]" />
          <span className="font-bold text-[#221E1C]">{(row.rating ?? 5.0).toFixed(1)}</span>
          <span className="text-[#8B8279] text-[10px]">/ 5.0</span>
        </div>
      ),
    },
    {
      key: 'activeJobsCount',
      header: 'Assigned Work Orders',
      render: (row) => (
        <span className="font-semibold text-xs text-[#5B534C]">
          {row.activeJobsCount || 0} active tickets
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Contract Status',
      render: (row) => (
        <Button
          variant="secondary"
          onClick={() => toggleStatusMutation.mutate({ id: row.id, isActive: !row.isActive })}
          className={`h-6 rounded-full text-[11px] px-2 py-0 ${
            row.isActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
              : 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-200'
          }`}
        >
          {row.isActive ? 'Active Vendor' : 'Inactive'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#221E1C] tracking-tight">Contractors & Vendors</h2>
          <p className="text-xs text-[#5B534C] mt-1">
            Certified facility contractors, trade technicians, and maintenance partners in Qatar.
          </p>
        </div>
        <PermissionGate module="vendors" action="create">
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span>Add Contractor</span>
          </Button>
        </PermissionGate>
      </div>

      {/* Specialty Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <ComboBoxWithAddNew
            listKey="vendor_specialty"
            value={specialtyFilter}
            onChange={(val) => {
              setSpecialtyFilter(val);
              setPage(1);
            }}
            placeholder="Filter by trade specialty..."
          />
        </div>
        {specialtyFilter && (
          <Button
            variant="ghost"
            onClick={() => {
              setSpecialtyFilter('');
              setPage(1);
            }}
          >
            Clear Filter
          </Button>
        )}
      </div>

      {/* Vendors DataTable with Server-Side Querying */}
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
        searchPlaceholder="Search contractor name or phone number..."
        onPageChange={setPage}
      />

      {/* Modal: Add Contractor */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[6px] border border-[#E4DCCB] shadow-2xl max-w-md w-full flex flex-col max-h-[90dvh] overflow-hidden p-6 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4DCCB] shrink-0">
              <h3 className="text-base font-bold text-[#221E1C] flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#6E1731]" />
                Register New Contractor
              </h3>
              <Button
                variant="icon"
                onClick={() => setIsAddModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 pt-4 text-xs flex-1 overflow-y-auto min-h-0 pr-2">
              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">Company / Contractor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Doha Climatech W.L.L."
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E4DCCB] rounded-[4px] focus:outline-none focus:border-[#6E1731]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">Contact Phone (Qatar)</label>
                <input
                  type="text"
                  required
                  placeholder="+974 4488 2211"
                  value={newVendorPhone}
                  onChange={(e) => setNewVendorPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E4DCCB] rounded-[4px] focus:outline-none focus:border-[#6E1731] font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">Trade Specialty</label>
                <ComboBoxWithAddNew
                  listKey="vendor_specialty"
                  value={newVendorSpecialtyId}
                  onChange={(id) => setNewVendorSpecialtyId(id)}
                  placeholder="Select or type new specialty..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E4DCCB]">
                <Button
                  variant="secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={createMutation.isPending}
                >
                  Save Contractor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorsView;
