import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Landmark,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Filter,
  Download,
  RefreshCw,
  Plus,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import api from '../lib/api';
import { EmptyState } from '../components/ui/EmptyState';
import { useDebounce } from '../hooks/useDebounce';

interface Cheque {
  id: string;
  chequeNumber: string;
  bankName: string;
  drawerName: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'IN_VAULT' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED' | 'HELD' | 'REPLACED' | 'RETURNED';
  vaultLocation?: string;
  depositDate?: string;
  clearedDate?: string;
  bouncedDate?: string;
  bounceReason?: string;
  notes?: string;
  lease?: {
    id: string;
    unit?: { unitNumber: string; property?: { name: string } };
    tenant?: { name: string; phone?: string };
  };
}

interface LeaseOption {
  id: string;
  leaseNumber?: string;
  unit?: { unitNumber: string; property?: { name: string } };
  tenant?: { name: string };
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.FC<any> }> = {
  PENDING:   { label: 'Pending',   bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   icon: Clock },
  IN_VAULT:  { label: 'In Vault',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  icon: Landmark },
  DEPOSITED: { label: 'Deposited', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', icon: RefreshCw },
  CLEARED:   { label: 'Cleared',   bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',icon: CheckCircle2 },
  BOUNCED:   { label: 'Bounced',   bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: XCircle },
  HELD:      { label: 'Held',      bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: AlertTriangle },
  REPLACED:  { label: 'Replaced',  bg: 'bg-slate-50',  text: 'text-slate-600',  border: 'border-slate-200',  icon: RefreshCw },
  RETURNED:  { label: 'Returned',  bg: 'bg-slate-50',  text: 'text-slate-600',  border: 'border-slate-200',  icon: XCircle },
};

const QATAR_BANKS = [
  'Qatar National Bank (QNB)',
  'Commercial Bank of Qatar (CBQ)',
  'Doha Bank',
  'Masraf Al Rayyan',
  'Qatar Islamic Bank (QIB)',
  'QIIB',
  'Dukhan Bank',
  'Ahlibank',
];

const formatQAR = (v: number) =>
  new Intl.NumberFormat('en-QA', { style: 'currency', currency: 'QAR', maximumFractionDigits: 0 }).format(v);

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-QA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function ChequesView() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const filterStatus = searchParams.get('status') || 'ALL';
  const filterBank = searchParams.get('bankName') || 'All Banks';
  const sort = searchParams.get('sort') || 'dueDate:asc';
  
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchInput, 300);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    leaseId: '',
    chequeNumber: '',
    bankName: 'Qatar National Bank (QNB)',
    drawerName: '',
    amount: '',
    dueDate: '',
    vaultLocation: 'Safe Box A-1',
    status: 'IN_VAULT',
    notes: '',
  });
  const [formError, setFormError] = useState('');

  // Sync Search URL Param
  useEffect(() => {
    if (debouncedSearch !== (searchParams.get('search') || '')) {
      const newParams = new URLSearchParams(searchParams);
      if (debouncedSearch) newParams.set('search', debouncedSearch);
      else newParams.delete('search');
      newParams.set('page', '1');
      setSearchParams(newParams);
    }
  }, [debouncedSearch, searchParams, setSearchParams]);

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'ALL' && value !== 'All Banks') newParams.set(key, value);
    else newParams.delete(key);
    if (key !== 'page') newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleSort = (field: string) => {
    const [currentField, currentDir] = sort.split(':');
    if (currentField === field) {
      updateParam('sort', `${field}:${currentDir === 'asc' ? 'desc' : 'asc'}`);
    } else {
      updateParam('sort', `${field}:asc`);
    }
  };

  // Fetch Cheques List
  const { data: chequesData, isLoading, isFetching } = useQuery({
    queryKey: ['cheques', { page, limit, search: debouncedSearch, status: filterStatus, bankName: filterBank, sort }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      if (filterBank !== 'All Banks') params.set('bankName', filterBank);
      if (sort) params.set('sort', sort);

      const res = await api.get(`/cheques?${params.toString()}`);
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  // Fetch Summary Stats
  const { data: summaryData } = useQuery({
    queryKey: ['cheques', 'summary'],
    queryFn: async () => {
      const res = await api.get('/cheques/summary');
      return res.data;
    },
  });

  // Fetch Leases for selection dropdown
  const { data: leasesData } = useQuery({
    queryKey: ['leases', 'active-list'],
    queryFn: async () => {
      const res = await api.get('/leases?limit=100');
      return (res.data?.data || res.data || []) as LeaseOption[];
    },
    enabled: showAddModal,
  });

  // Prefetch next page
  useEffect(() => {
    if (chequesData?.page < chequesData?.totalPages) {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: limit.toString(),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      if (filterBank !== 'All Banks') params.set('bankName', filterBank);
      if (sort) params.set('sort', sort);

      queryClient.prefetchQuery({
        queryKey: ['cheques', { page: page + 1, limit, search: debouncedSearch, status: filterStatus, bankName: filterBank, sort }],
        queryFn: () => api.get(`/cheques?${params.toString()}`).then(r => r.data),
      });
    }
  }, [chequesData, page, limit, debouncedSearch, filterStatus, filterBank, sort, queryClient]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/cheques', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques'] });
      setShowAddModal(false);
      setFormData({
        leaseId: '', chequeNumber: '', bankName: 'Qatar National Bank (QNB)', drawerName: '',
        amount: '', dueDate: '', vaultLocation: 'Safe Box A-1', status: 'IN_VAULT', notes: '',
      });
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to create cheque.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, bounceReason }: { id: string; status: string; bounceReason?: string }) => {
      return api.patch(`/cheques/${id}/status`, { status, bounceReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques'] });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.leaseId) { setFormError('Please select an active lease.'); return; }
    if (!formData.chequeNumber.trim()) { setFormError('Cheque number is required.'); return; }
    if (!formData.amount || Number(formData.amount) <= 0) { setFormError('Please enter a valid amount.'); return; }
    if (!formData.dueDate) { setFormError('Due date is required.'); return; }

    createMutation.mutate({
      ...formData,
      amount: Number(formData.amount),
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const cheques: Cheque[] = chequesData?.data || [];
  
  // Virtualizer setup
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: cheques.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#221E1C] tracking-tight flex items-center gap-2.5">
            <Landmark size={22} className="text-[#B9924A]" />
            PDC Vault & Banking Operations
          </h2>
          <p className="text-xs text-[#5B534C] mt-1">Post-dated cheque lifecycle management across Qatar banks</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {selectedIds.length > 0 && (
            <button className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#6E1731] hover:bg-[#8C243E] text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer">
              <Download size={14} />
              Batch Deposit Slip ({selectedIds.length})
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#6E1731] hover:bg-[#8C243E] text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            Add Cheque
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Cheques',      val: summaryData?.total || 0,   color: 'text-[#221E1C]',  bg: 'bg-white' },
          { label: 'Cleared',            val: summaryData?.cleared || 0, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Pending / In Vault', val: summaryData?.pending || 0, color: 'text-amber-700',  bg: 'bg-amber-50' },
          { label: 'Bounced',            val: summaryData?.bounced || 0, color: 'text-red-700',    bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-[#E4DCCB] rounded-xl p-4 shadow-sm`}>
            <p className="text-xs text-[#8B8279] mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>
              {summaryData ? s.val : <span className="text-transparent bg-slate-200 animate-pulse rounded">000</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Vault Value Banner */}
      <div className="bg-[#FAF6EE] border border-[#E4DCCB] rounded-xl p-4 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-amber-100/60 text-amber-700 flex items-center justify-center shrink-0">
          <Landmark size={18} />
        </div>
        <div>
          <p className="text-sm text-[#221E1C] font-semibold">Upcoming Vault Value</p>
          <p className="text-xs text-[#706B65]">Pending + In Vault cheques ready for deposit</p>
        </div>
        <span className="ml-auto rtl:mr-auto text-xl font-bold text-[#6E1731]">
          {summaryData ? formatQAR(summaryData.totalVal || 0) : <span className="text-transparent bg-slate-200 animate-pulse rounded">QAR 00,000</span>}
        </span>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-white border border-[#E4DCCB] rounded-xl p-1 shadow-sm overflow-x-auto">
            {['ALL', 'PENDING', 'IN_VAULT', 'DEPOSITED', 'CLEARED', 'BOUNCED', 'HELD'].map(s => (
              <button
                key={s}
                onClick={() => updateParam('status', s)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  filterStatus === s
                    ? 'bg-[#6E1731] text-white shadow-xs'
                    : 'text-[#5B534C] hover:bg-[#F4EFE4]'
                }`}
              >
                {s === 'ALL' ? 'All' : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[#8B8279]">
            <Filter size={14} />
          </div>
          <select
            value={filterBank}
            onChange={e => updateParam('bankName', e.target.value)}
            className="bg-white border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A] shadow-sm"
          >
            <option value="All Banks">All Banks</option>
            {QATAR_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-[#8B8279]" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search cheque # or drawer..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#E4DCCB] rounded-xl text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A] shadow-sm transition-colors"
          />
        </div>
      </div>

      {/* Table / Empty State */}
      <div className="bg-white border border-[#E4DCCB] rounded-2xl overflow-hidden shadow-sm relative">
        {isFetching && cheques.length > 0 && (
          <div className="absolute top-0 left-0 w-full h-1 bg-[#FBF9F3] z-20">
            <div className="h-full bg-[#B9924A] animate-pulse w-1/3"></div>
          </div>
        )}
        
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="w-4 h-4 bg-slate-200 rounded animate-pulse"></div>
                <div className="w-24 h-4 bg-slate-200 rounded animate-pulse"></div>
                <div className="w-32 h-4 bg-slate-200 rounded animate-pulse"></div>
                <div className="w-20 h-4 bg-slate-200 rounded animate-pulse"></div>
                <div className="w-16 h-4 bg-slate-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : cheques.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Landmark}
              title={debouncedSearch ? "No matches found" : "No cheques found"}
              description="No post-dated cheques matching your active filters. Register a new PDC to track its vault status and clearing."
              actionLabel="Add Cheque"
              onAction={() => setShowAddModal(true)}
            />
          </div>
        ) : (
          <div ref={parentRef} className="overflow-x-auto max-h-[600px] relative custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[#FBF9F3] shadow-sm">
                <tr className="border-b border-[#E4DCCB]">
                  <th className="w-10 py-3.5 px-3 text-left">
                    <input type="checkbox" className="rounded text-[#6E1731] focus:ring-[#6E1731]" />
                  </th>
                  <th className="py-3.5 px-4 text-left text-xs font-semibold text-[#5B534C] uppercase tracking-wider cursor-pointer hover:bg-[#F4EFE4]" onClick={() => handleSort('chequeNumber')}>
                    <div className="flex items-center gap-1">Cheque # {sort.startsWith('chequeNumber') && (sort.endsWith('desc') ? <ChevronDown size={12}/> : <ChevronUp size={12}/>)}</div>
                  </th>
                  <th className="py-3.5 px-4 text-left text-xs font-semibold text-[#5B534C] uppercase tracking-wider cursor-pointer hover:bg-[#F4EFE4]" onClick={() => handleSort('drawerName')}>
                    <div className="flex items-center gap-1">Tenant / Drawer {sort.startsWith('drawerName') && (sort.endsWith('desc') ? <ChevronDown size={12}/> : <ChevronUp size={12}/>)}</div>
                  </th>
                  <th className="py-3.5 px-4 text-left text-xs font-semibold text-[#5B534C] uppercase tracking-wider cursor-pointer hover:bg-[#F4EFE4]" onClick={() => handleSort('bankName')}>
                    <div className="flex items-center gap-1">Bank {sort.startsWith('bankName') && (sort.endsWith('desc') ? <ChevronDown size={12}/> : <ChevronUp size={12}/>)}</div>
                  </th>
                  <th className="py-3.5 px-4 text-left text-xs font-semibold text-[#5B534C] uppercase tracking-wider cursor-pointer hover:bg-[#F4EFE4]" onClick={() => handleSort('amount')}>
                    <div className="flex items-center gap-1">Amount {sort.startsWith('amount') && (sort.endsWith('desc') ? <ChevronDown size={12}/> : <ChevronUp size={12}/>)}</div>
                  </th>
                  <th className="py-3.5 px-4 text-left text-xs font-semibold text-[#5B534C] uppercase tracking-wider cursor-pointer hover:bg-[#F4EFE4]" onClick={() => handleSort('dueDate')}>
                    <div className="flex items-center gap-1">Due Date {sort.startsWith('dueDate') && (sort.endsWith('desc') ? <ChevronDown size={12}/> : <ChevronUp size={12}/>)}</div>
                  </th>
                  <th className="py-3.5 px-4 text-left text-xs font-semibold text-[#5B534C] uppercase tracking-wider">Status</th>
                  <th className="py-3.5 px-4 text-left text-xs font-semibold text-[#5B534C] uppercase tracking-wider">Vault</th>
                  <th className="py-3.5 px-4 text-right text-xs font-semibold text-[#5B534C] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DCCB]">
                {virtualItems.length > 0 && (
                  <>
                    <tr style={{ height: virtualItems[0].start }} />
                    {virtualItems.map((virtualRow) => {
                      const c = cheques[virtualRow.index];
                      const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG['PENDING'];
                      const Icon = cfg.icon;
                      return (
                        <tr key={c.id} ref={rowVirtualizer.measureElement} data-index={virtualRow.index} className="hover:bg-[#FBF9F3]/70 transition-colors">
                          <td className="py-3 px-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(c.id)}
                              onChange={() => toggleSelect(c.id)}
                              className="rounded text-[#6E1731] focus:ring-[#6E1731]"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-[#B9924A] text-xs font-bold">{c.chequeNumber}</span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-[#221E1C] text-xs font-medium">{c.drawerName}</p>
                            <p className="text-[#8B8279] text-[10px]">{c.lease?.unit?.property?.name} — {c.lease?.unit?.unitNumber}</p>
                          </td>
                          <td className="py-3 px-4 text-[#5B534C] text-xs">{c.bankName}</td>
                          <td className="py-3 px-4 text-[#221E1C] font-semibold text-xs">{formatQAR(Number(c.amount))}</td>
                          <td className="py-3 px-4 text-[#5B534C] text-xs">{formatDate(c.dueDate)}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                              <Icon size={10} />
                              {cfg.label}
                            </span>
                            {c.bounceReason && (
                              <p className="text-red-600 text-[10px] mt-0.5 truncate max-w-[140px]" title={c.bounceReason}>{c.bounceReason}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[#8B8279] text-xs">{c.vaultLocation || '—'}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {(c.status === 'IN_VAULT' || c.status === 'PENDING') && (
                                <button
                                  onClick={() => statusMutation.mutate({ id: c.id, status: 'DEPOSITED' })}
                                  className="px-2.5 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                                  title="Mark as deposited in bank"
                                >
                                  Deposit
                                </button>
                              )}
                              {c.status === 'DEPOSITED' && (
                                <>
                                  <button
                                    onClick={() => statusMutation.mutate({ id: c.id, status: 'CLEARED' })}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                                  >
                                    Clear
                                  </button>
                                  <button
                                    onClick={() => {
                                      const reason = window.prompt('Enter bounce reason:', 'Insufficient funds');
                                      if (reason) statusMutation.mutate({ id: c.id, status: 'BOUNCED', bounceReason: reason });
                                    }}
                                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                                  >
                                    Bounce
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ height: rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end }} />
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination Footer */}
        {chequesData && chequesData.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E4DCCB] bg-[#FBF9F3]">
            <p className="text-xs text-[#5B534C]">
              Showing <span className="font-semibold text-[#221E1C]">{(page - 1) * limit + 1}</span> to <span className="font-semibold text-[#221E1C]">{Math.min(page * limit, chequesData.total)}</span> of <span className="font-semibold text-[#221E1C]">{chequesData.total}</span> entries
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateParam('page', String(page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-[#E4DCCB] bg-white text-[#5B534C] hover:bg-[#F4EFE4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => updateParam('page', String(page + 1))}
                disabled={page >= chequesData.totalPages}
                className="p-1.5 rounded-lg border border-[#E4DCCB] bg-white text-[#5B534C] hover:bg-[#F4EFE4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Cheque Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#EDE8DE] space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EDE8DE] pb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#6E1731]/10 text-[#6E1731] flex items-center justify-center">
                  <Landmark size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#221E1C]">Register New Cheque</h3>
                  <p className="text-xs text-[#706B65]">Add PDC to vault storage</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#706B65] hover:text-[#221E1C] p-1 rounded-lg hover:bg-[#F4F1EA] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">Select Lease *</label>
                <select
                  value={formData.leaseId}
                  onChange={e => {
                    const lId = e.target.value;
                    const lease = (leasesData || []).find((l: any) => l.id === lId);
                    setFormData({
                      ...formData,
                      leaseId: lId,
                      drawerName: lease?.tenant?.name || formData.drawerName,
                    });
                  }}
                  className="w-full bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A]"
                  required
                >
                  <option value="">-- Choose Active Lease / Tenant --</option>
                  {(leasesData || []).map((l: any) => (
                    <option key={l.id} value={l.id}>
                      {l.unit?.property?.name ? `${l.unit.property.name} - Unit ${l.unit.unitNumber}` : 'Lease'} | Tenant: {l.tenant?.name || 'Resident'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#221E1C] mb-1">Cheque Number *</label>
                  <input
                    type="text"
                    value={formData.chequeNumber}
                    onChange={e => setFormData({ ...formData, chequeNumber: e.target.value })}
                    placeholder="e.g. 0004521"
                    className="w-full bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#221E1C] mb-1">Amount (QAR) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g. 7500"
                    className="w-full bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#221E1C] mb-1">Bank Name</label>
                  <select
                    value={formData.bankName}
                    onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A]"
                  >
                    {QATAR_BANKS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#221E1C] mb-1">Drawer Name</label>
                  <input
                    type="text"
                    value={formData.drawerName}
                    onChange={e => setFormData({ ...formData, drawerName: e.target.value })}
                    placeholder="Signer / Tenant name"
                    className="w-full bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#221E1C] mb-1">Due Date *</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#221E1C] mb-1">Vault Storage Location</label>
                  <input
                    type="text"
                    value={formData.vaultLocation}
                    onChange={e => setFormData({ ...formData, vaultLocation: e.target.value })}
                    placeholder="e.g. Safe Box B-3"
                    className="w-full bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">Notes / Memo</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional memo (e.g. Rent cheque month 3)"
                  className="w-full bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EDE8DE]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-[#F4F1EA] hover:bg-[#EAE4D7] text-[#221E1C] rounded-xl font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-[#6E1731] hover:bg-[#8C243E] text-white rounded-xl font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {createMutation.isPending ? 'Saving…' : 'Register Cheque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
