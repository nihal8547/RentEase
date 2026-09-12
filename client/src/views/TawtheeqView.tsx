import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ScrollText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Calculator,
  Send,
  Check,
  Ban,
  FileCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '../lib/api';
import { EmptyState } from '../components/ui/EmptyState';

interface TawtheeqRegistration {
  id: string;
  registrationNumber: string;
  status: 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  contractDate: string;
  expiryDate: string;
  municipalityFee: number;
  certificateUrl?: string;
  registeredAt: string;
  lease?: {
    rentAmount: number;
    startDate: string;
    endDate: string;
    tenant?: { name: string; phone: string };
    unit?: { unitNumber: string; property?: { name: string } };
  };
}

const STATUS_CONFIG: Record<string, { label: string; labelAr: string; bg: string; text: string; border: string; icon: React.FC<any> }> = {
  DRAFT:            { label: 'Draft',            labelAr: 'مسودة',          bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   icon: ScrollText },
  SUBMITTED:        { label: 'Submitted',         labelAr: 'مقدّم',          bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: Clock },
  PENDING_APPROVAL: { label: 'Pending Approval',  labelAr: 'قيد الموافقة',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: AlertTriangle },
  APPROVED:         { label: 'Approved',          labelAr: 'معتمد',          bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  REJECTED:         { label: 'Rejected',          labelAr: 'مرفوض',          bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     icon: XCircle },
  EXPIRED:          { label: 'Expired',           labelAr: 'منتهي الصلاحية', bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  icon: XCircle },
};

const formatQAR = (v: number) =>
  new Intl.NumberFormat('en-QA', { style: 'currency', currency: 'QAR', maximumFractionDigits: 0 }).format(v);

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-QA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function TawtheeqView() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [calcRent, setCalcRent] = useState('');
  const [calcMonths, setCalcMonths] = useState('12');

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const filterStatus = searchParams.get('status') || 'ALL';

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'ALL') newParams.set(key, value);
    else newParams.delete(key);
    if (key !== 'page') newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const { data: tawtheeqData, isLoading, isFetching } = useQuery({
    queryKey: ['tawtheeq', { page, limit, status: filterStatus }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      const res = await api.get(`/tawtheeq?${params.toString()}`);
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  const { data: summaryData } = useQuery({
    queryKey: ['tawtheeq', 'summary'],
    queryFn: async () => {
      const res = await api.get('/tawtheeq/summary');
      return res.data;
    },
  });

  useEffect(() => {
    if (tawtheeqData?.page < tawtheeqData?.totalPages) {
      const params = new URLSearchParams({ page: (page + 1).toString(), limit: limit.toString() });
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      queryClient.prefetchQuery({
        queryKey: ['tawtheeq', { page: page + 1, limit, status: filterStatus }],
        queryFn: () => api.get(`/tawtheeq?${params.toString()}`).then(r => r.data),
      });
    }
  }, [tawtheeqData, page, limit, filterStatus, queryClient]);

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.patch(`/tawtheeq/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tawtheeq'] });
    },
  });

  const registrations: TawtheeqRegistration[] = tawtheeqData?.data || [];
  const calculatedFee = calcRent && calcMonths ? parseFloat(calcRent) * parseInt(calcMonths) * 0.005 : 0;

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: registrations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });
  
  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#221E1C] tracking-tight flex items-center gap-2.5">
          <ScrollText size={22} className="text-[#B9924A]" />
          Qatar Tawtheeq Compliance Center
          <span className="text-base font-normal text-[#8B8279]"> — مركز التوثيق</span>
        </h2>
        <p className="text-xs text-[#5B534C] mt-1">Ministry of Justice lease registration & municipality fee management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Table Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-white border border-[#E4DCCB] rounded-xl p-1 w-fit flex-wrap shadow-sm">
            {['ALL', 'APPROVED', 'PENDING_APPROVAL', 'SUBMITTED', 'DRAFT', 'EXPIRED', 'REJECTED'].map(s => (
              <button
                key={s}
                onClick={() => updateParam('status', s)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  filterStatus === s ? 'bg-[#6E1731] text-white shadow-xs' : 'text-[#5B534C] hover:bg-[#F4EFE4]'
                }`}
              >
                {s === 'ALL' ? 'All' : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white border border-[#E4DCCB] rounded-2xl overflow-hidden shadow-sm relative">
            {isFetching && registrations.length > 0 && (
              <div className="absolute top-0 left-0 w-full h-1 bg-[#FBF9F3] z-20">
                <div className="h-full bg-[#B9924A] animate-pulse w-1/3"></div>
              </div>
            )}
            
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <div className="w-24 h-4 bg-slate-200 rounded animate-pulse"></div>
                    <div className="w-32 h-4 bg-slate-200 rounded animate-pulse"></div>
                    <div className="w-24 h-4 bg-slate-200 rounded animate-pulse"></div>
                    <div className="w-20 h-4 bg-slate-200 rounded animate-pulse"></div>
                    <div className="w-16 h-4 bg-slate-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : registrations.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={FileCheck}
                  title="No Tawtheeq registrations"
                  description="No contracts found matching your active filter status. Tawtheeq registrations ensure compliance with Qatar Ministry of Justice regulations."
                />
              </div>
            ) : (
              <div ref={parentRef} className="overflow-x-auto max-h-[600px] relative custom-scrollbar">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-[#FBF9F3] shadow-sm">
                    <tr className="border-b border-[#E4DCCB]">
                      <th className="py-3.5 px-4 text-left text-xs font-semibold text-[#5B534C] uppercase tracking-wider">Tawtheeq #</th>
                      <th className="py-3.5 px-4 text-left text-xs font-semibold text-[#5B534C] uppercase tracking-wider">Property / Unit</th>
                      <th className="py-3.5 px-4 text-left text-xs font-semibold text-[#5B534C] uppercase tracking-wider">Tenant</th>
                      <th className="py-3.5 px-4 text-left text-xs font-semibold text-[#5B534C] uppercase tracking-wider">Period</th>
                      <th className="py-3.5 px-4 text-left text-xs font-semibold text-[#5B534C] uppercase tracking-wider">Mun. Fee</th>
                      <th className="py-3.5 px-4 text-left text-xs font-semibold text-[#5B534C] uppercase tracking-wider">Status</th>
                      <th className="py-3.5 px-4 text-right text-xs font-semibold text-[#5B534C] uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4DCCB]">
                    {virtualItems.length > 0 && (
                      <>
                        <tr style={{ height: virtualItems[0].start }} />
                        {virtualItems.map((virtualRow) => {
                          const r = registrations[virtualRow.index];
                          const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG['DRAFT'];
                          const Icon = cfg.icon;
                          return (
                            <tr key={r.id} ref={rowVirtualizer.measureElement} data-index={virtualRow.index} className="hover:bg-[#FBF9F3]/70 transition-colors">
                              <td className="py-3 px-4">
                                <span className="font-mono text-[#B9924A] text-xs font-bold">{r.registrationNumber}</span>
                                <p className="text-[#8B8279] text-[10px]">Filed: {formatDate(r.registeredAt)}</p>
                              </td>
                              <td className="py-3 px-4">
                                <p className="text-[#221E1C] text-xs font-medium">{r.lease?.unit?.property?.name}</p>
                                <p className="text-[#8B8279] text-[10px]">Unit {r.lease?.unit?.unitNumber}</p>
                              </td>
                              <td className="py-3 px-4">
                                <p className="text-[#221E1C] text-xs">{r.lease?.tenant?.name}</p>
                                <p className="text-[#8B8279] text-[10px]">{r.lease?.tenant?.phone}</p>
                              </td>
                              <td className="py-3 px-4 text-[#5B534C] text-xs">
                                {formatDate(r.contractDate)} → {formatDate(r.expiryDate)}
                              </td>
                              <td className="py-3 px-4 text-emerald-700 font-semibold text-xs">
                                {formatQAR(Number(r.municipalityFee))}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                  <Icon size={10} />
                                  {cfg.label}
                                </span>
                                <p className="text-[#8B8279] text-[10px] mt-0.5">{cfg.labelAr}</p>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {r.status === 'DRAFT' && (
                                    <button
                                      onClick={() => statusMutation.mutate({ id: r.id, status: 'SUBMITTED' })}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                                      title="Submit to Ministry of Justice"
                                    >
                                      <Send size={10} />
                                      Submit
                                    </button>
                                  )}
                                  {(r.status === 'SUBMITTED' || r.status === 'PENDING_APPROVAL') && (
                                    <>
                                      <button
                                        onClick={() => statusMutation.mutate({ id: r.id, status: 'APPROVED' })}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                                        title="Mark Approved by MOJ"
                                      >
                                        <Check size={11} />
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => statusMutation.mutate({ id: r.id, status: 'REJECTED' })}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                                        title="Reject"
                                      >
                                        <Ban size={10} />
                                        Reject
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
            {tawtheeqData && tawtheeqData.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E4DCCB] bg-[#FBF9F3]">
                <p className="text-xs text-[#5B534C]">
                  Showing <span className="font-semibold text-[#221E1C]">{(page - 1) * limit + 1}</span> to <span className="font-semibold text-[#221E1C]">{Math.min(page * limit, tawtheeqData.total)}</span> of <span className="font-semibold text-[#221E1C]">{tawtheeqData.total}</span> entries
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
                    disabled={page >= tawtheeqData.totalPages}
                    className="p-1.5 rounded-lg border border-[#E4DCCB] bg-white text-[#5B534C] hover:bg-[#F4EFE4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Fee Calculator + Stats */}
        <div className="space-y-4">
          {/* Fee Calculator */}
          <div className="bg-white border border-[#E4DCCB] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#B9924A]/10 text-[#B9924A] flex items-center justify-center">
                <Calculator size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#221E1C]">Municipality Fee Calculator</h3>
                <p className="text-[10px] text-[#8B8279]">0.5% of total contract value</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-xs text-[#5B534C] block mb-1 font-medium">Monthly Rent (QAR)</label>
                <input
                  type="number"
                  value={calcRent}
                  onChange={e => setCalcRent(e.target.value)}
                  placeholder="e.g. 14500"
                  className="w-full bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] placeholder-[#8B8279] focus:outline-none focus:border-[#B9924A]"
                />
              </div>
              <div>
                <label className="text-xs text-[#5B534C] block mb-1 font-medium">Contract Duration (months)</label>
                <select
                  value={calcMonths}
                  onChange={e => setCalcMonths(e.target.value)}
                  className="w-full bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A]"
                >
                  <option value="12">12 months (1 year)</option>
                  <option value="24">24 months (2 years)</option>
                  <option value="36">36 months (3 years)</option>
                </select>
              </div>

              {calculatedFee > 0 && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <p className="text-xs text-[#5B534C] mb-1 font-medium">Municipality Fee (0.5%)</p>
                  <p className="text-2xl font-bold text-emerald-700">{formatQAR(calculatedFee)}</p>
                  <p className="text-[10px] text-[#8B8279] mt-1 font-arabic">رسوم البلدية المعتمدة</p>
                  <div className="mt-2 text-[10px] text-[#8B8279] border-t border-emerald-200 pt-2">
                    Contract Value: {formatQAR(parseFloat(calcRent || '0') * parseInt(calcMonths))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bg-white border border-[#E4DCCB] rounded-2xl p-5 space-y-3 shadow-sm">
            <p className="text-xs text-[#5B534C] font-semibold uppercase tracking-wider">Registration Summary</p>
            {[
              { key: 'total', label: 'Total Registrations', icon: ScrollText, color: 'text-slate-600' },
              { key: 'approved', label: 'Approved', icon: CheckCircle2, color: 'text-emerald-700' },
              { key: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-700' },
              { key: 'expired', label: 'Expired', icon: XCircle, color: 'text-red-700' }
            ].map((stat) => {
              const val = summaryData?.[stat.key];
              if (val === undefined) return null;
              const Icon = stat.icon;
              return (
                <div key={stat.key} className="flex items-center justify-between py-1 border-b border-[#EDE8DE] last:border-0">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${stat.color}`}>
                    <Icon size={12} /> {stat.label}
                  </span>
                  <span className="text-[#221E1C] text-xs font-bold px-2 py-0.5 bg-[#F4F1EA] rounded-md">{val}</span>
                </div>
              );
            })}
            {!summaryData && (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                <div className="h-4 bg-slate-200 rounded w-4/6"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
