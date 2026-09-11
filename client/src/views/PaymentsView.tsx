import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import api from '../lib/api';
import KpiCard from '../components/ui/KpiCard';
import StatusPill from '../components/ui/StatusPill';
import { DataTable, type Column } from '../components/DataTable';
import { ComboBoxWithAddNew } from '../components/ComboBoxWithAddNew';
import { PermissionGate } from '../components/PermissionGate';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import type { PaginatedResponse } from '../types';

export const PaymentsView: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  // Modals & States
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [leaseId, setLeaseId] = useState('');
  const [amountQar, setAmountQar] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('FATORA');
  const [reference, setReference] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('PAID');

  // Fetch summary KPI cards
  const { data: summary } = useQuery({
    queryKey: ['payments-summary'],
    queryFn: async () => {
      const res = await api.get('/payments/summary');
      return res.data;
    },
  });

  // Fetch leases for lease dropdown
  const { data: leasesData } = useQuery({
    queryKey: ['leases-all-active'],
    queryFn: async () => {
      const res = await api.get('/leases?limit=100&status=ACTIVE');
      return res.data?.data || [];
    },
  });

  // Fetch payments table
  const { data, isLoading } = useQuery<PaginatedResponse<any>>({
    queryKey: ['payments-ledger', page, limit, searchTerm, statusFilter, methodFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: searchTerm,
      });
      if (statusFilter) params.append('status', statusFilter);
      if (methodFilter) params.append('method', methodFilter);

      const res = await api.get(`/payments?${params.toString()}`);
      return res.data;
    },
  });

  // Record payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/payments', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['payments-summary'] });
      setIsRecordPaymentOpen(false);
      resetForm();
      toast.success('Payment recorded successfully');
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to record payment.');
    },
  });

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/payments/${id}`, {
        status: 'PAID',
        paidDate: new Date().toISOString(),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['payments-summary'] });
      toast.success('Payment marked as paid');
    },
  });

  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['payments-summary'] });
      setPaymentToDelete(null);
      toast.success('Payment deleted successfully');
    },
  });

  const resetForm = () => {
    setLeaseId('');
    setAmountQar('');
    setPaymentMethod('FATORA');
    setReference('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setPaidDate(new Date().toISOString().split('T')[0]);
    setStatus('PAID');
    setErrorMessage('');
  };

  const handleLeaseChange = (selectedId: string) => {
    setLeaseId(selectedId);
    const lease = leasesData?.find((l: any) => l.id === selectedId);
    if (lease) {
      setAmountQar(String(lease.rentAmount));
    }
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaseId) {
      setErrorMessage('Please select a lease agreement.');
      return;
    }
    createPaymentMutation.mutate({
      leaseId,
      amount: parseFloat(amountQar),
      dueDate: new Date(dueDate).toISOString(),
      paidDate: status === 'PAID' ? new Date(paidDate).toISOString() : undefined,
      method: paymentMethod,
      reference: reference || `INV-${Date.now().toString().slice(-6)}`,
      status,
    });
  };

  const columns: Column<any>[] = [
    {
      key: 'invoice',
      header: 'Invoice & Gateway Ref',
      render: (row: any) => (
        <div className="space-y-0.5">
          <span className="font-semibold text-ink-900 block text-xs font-mono">
            {row.reference || `INV-${row.id.slice(0, 8)}`}
          </span>
          <span className="text-[11px] font-mono text-gold-700">
            {row.method}
          </span>
        </div>
      ),
    },
    {
      key: 'tenant',
      header: 'Tenant & Unit',
      render: (row: any) => (
        <div>
          <span className="font-semibold text-ink-900 block text-xs">
            {row.lease?.tenant?.fullName || 'Tenant'}
          </span>
          <span className="text-[11px] text-ink-500">
            {row.lease?.unit?.unitNumber} — {row.lease?.unit?.property?.name}
          </span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount (QAR)',
      render: (row: any) => (
        <span className="font-mono font-bold text-xs text-ink-900">
          QAR {Number(row.amount).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Payment Method',
      render: (row: any) => (
        <span className="px-2 py-0.5 rounded bg-sand-100 text-ink-800 text-[11px] font-medium border border-line">
          {row.method}
        </span>
      ),
    },
    {
      key: 'dates',
      header: 'Due / Paid Date',
      render: (row: any) => (
        <div className="text-xs">
          <div className="text-ink-700">Due: {row.dueDate?.split('T')[0]}</div>
          {row.paidDate && (
            <div className="text-emerald-700 text-[11px]">
              Paid: {row.paidDate?.split('T')[0]}
            </div>
          )}
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
          {row.status !== 'PAID' && (
            <PermissionGate module="payments" action="update">
              <Button
                variant="ghost"
                onClick={() => markAsPaidMutation.mutate(row.id)}
                className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                title="Mark Paid"
              >
                Mark Paid
              </Button>
            </PermissionGate>
          )}
            <PermissionGate module="payments" action="read">
              <Button
                variant="icon"
                onClick={() => toast.success('Download receipt functionality placeholder')}
                title="Download Receipt"
                className="p-1.5 h-8 w-8 min-w-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              </Button>
            </PermissionGate>
            <PermissionGate module="payments" action="delete">
              <Button
                variant="destructive"
                onClick={() => {
                  setPaymentToDelete(row);
                }}
                title="Delete Payment"
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
            {t('nav.payments')}
          </h2>
          <p className="text-xs text-ink-600 mt-1">
            Rent collection ledger, Fatora & Dibsy payment gateway integration, and QAR reconciliation
          </p>
        </div>

        <PermissionGate module="payments" action="create">
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setIsRecordPaymentOpen(true);
            }}
          >
            <Plus size={15} />
            <span>Record Rent Payment</span>
          </Button>
        </PermissionGate>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Total Collected (QAR)"
          value={`QAR ${Number(summary?.collectedQar || 0).toLocaleString()}`}
          subtext="Cleared this accounting cycle"
          variant="positive"
        />
        <KpiCard
          label="Outstanding Receivables"
          value={`QAR ${Number(summary?.outstandingQar || 0).toLocaleString()}`}
          subtext="Pending tenant settlement"
        />
        <KpiCard
          label="Overdue / Bounced"
          value={`QAR ${Number(summary?.overdueQar || 0).toLocaleString()}`}
          subtext="Requires automated Metrash reminder"
          variant="negative"
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-line flex flex-wrap gap-4 items-center justify-between shadow-xs">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div className="w-48">
            <ComboBoxWithAddNew
              listTypeKey="payment_methods"
              value={methodFilter}
              onChange={setMethodFilter}
              placeholder="Filter Method..."
              allowAddNew={false}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-sand-050 border border-line rounded focus:outline-none focus:border-maroon-700"
          >
            <option value="">All Statuses</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="BOUNCED">BOUNCED CHEQUE</option>
          </select>

          {(methodFilter || statusFilter) && (
            <Button
              variant="ghost"
              onClick={() => {
                setMethodFilter('');
                setStatusFilter('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Payments Table */}
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
        searchPlaceholder="Search by invoice reference, tenant, or unit..."
        onSearchChange={(q: string) => {
          setSearchTerm(q);
          setPage(1);
        }}
        isLoading={isLoading}
        emptyState={
          <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-dashed border-[#E4DCCB]">
            <div className="w-12 h-12 rounded-full bg-[#F5F2EB] flex items-center justify-center text-[#5B534C] mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            </div>
            <h4 className="text-sm font-semibold text-[#221E1C]">No Payment Records</h4>
            <p className="text-xs text-[#5B534C] mt-1 max-w-sm mx-auto">
              There are no payment records in the ledger yet. Record a payment to see it here.
            </p>
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setIsRecordPaymentOpen(true);
              }}
              className="mt-4"
            >
              <span>Record Rent Payment</span>
            </Button>
          </div>
        }
      />

      {/* Record Payment Modal */}
      {isRecordPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-line flex flex-col max-h-[90dvh]">
            <div className="shrink-0 p-5 bg-maroon-900 text-white flex items-center justify-between border-b border-gold-500/30">
              <div>
                <h3 className="font-serif text-lg font-bold">Record Rent Payment</h3>
                <p className="text-xs text-white/60">Generate invoice or record cleared settlement</p>
              </div>
              <Button
                variant="icon"
                onClick={() => setIsRecordPaymentOpen(false)}
              >
                <X size={18} />
              </Button>
            </div>

            <form onSubmit={handleSubmitPayment} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 rounded bg-ruby-50 border border-ruby-200 text-ruby-700">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-ink-700 font-semibold mb-1">Active Tenancy / Unit *</label>
                <select
                  required
                  value={leaseId}
                  onChange={(e) => handleLeaseChange(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                >
                  <option value="">Select Tenant & Unit...</option>
                  {leasesData?.map((l: any) => (
                    <option key={l.id} value={l.id}>
                      {l.tenant?.fullName} — {l.unit?.unitNumber} ({l.unit?.property?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Amount (QAR) *</label>
                  <input
                    type="number"
                    required
                    value={amountQar}
                    onChange={(e) => setAmountQar(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Payment Method *</label>
                  <ComboBoxWithAddNew
                    listTypeKey="payment_methods"
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                  />
                </div>
              </div>

              <div>
                <label className="block text-ink-700 font-semibold mb-1">Reference / Cheque Number</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. CHQ-99104 or FAT-2026-90"
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                  />
                </div>
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Status *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                  >
                    <option value="PAID">PAID (Cleared)</option>
                    <option value="PENDING">PENDING</option>
                    <option value="OVERDUE">OVERDUE</option>
                    <option value="BOUNCED">BOUNCED CHEQUE</option>
                  </select>
                </div>
              </div>

              {status === 'PAID' && (
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Settlement / Paid Date</label>
                  <input
                    type="date"
                    value={paidDate}
                    onChange={(e) => setPaidDate(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-line">
                <Button
                  variant="secondary"
                  onClick={() => setIsRecordPaymentOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={createPaymentMutation.isPending}
                >
                  Save Payment Record
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!paymentToDelete}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={() => {
          if (paymentToDelete) {
            deletePaymentMutation.mutate(paymentToDelete.id);
          }
        }}
        title="Delete Payment"
        message="Are you sure you want to delete this payment transaction record? This action cannot be undone."
        confirmText="Delete Payment"
        isDestructive={true}
      />
    </div>
  );
};

export default PaymentsView;
