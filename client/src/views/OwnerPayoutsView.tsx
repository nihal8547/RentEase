import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TrendingUp, CheckCircle2, Clock, Printer, Building2, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { EmptyState } from '../components/ui/EmptyState';

interface OwnerPayout {
  id: string;
  periodMonth: string;
  grossRent: number;
  expensesDeducted: number;
  managementCommission: number;
  netPayout: number;
  status: 'DRAFT' | 'PROCESSING' | 'PAID';
  paymentReference?: string;
  paidAt?: string;
  breakdown?: {
    collectedRentUnits?: string[];
    deductedExpenses?: string[];
    agencyFeeRate?: string;
  };
  property?: {
    id: string;
    name: string;
    area: string;
    ownerName?: string;
    ownerIban?: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.FC<any> }> = {
  DRAFT:      { label: 'Draft',      bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   icon: Clock },
  PROCESSING: { label: 'Processing', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: Clock },
  PAID:       { label: 'Paid',       bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
};

const formatQAR = (v: number) => new Intl.NumberFormat('en-QA', { style: 'currency', currency: 'QAR', maximumFractionDigits: 0 }).format(v);
const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-QA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function OwnerPayoutsView() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPayout, setSelectedPayout] = useState<OwnerPayout | null>(null);

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

  const { data: payoutsData, isLoading, isFetching } = useQuery({
    queryKey: ['owner-payouts', { page, limit, status: filterStatus }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      const res = await api.get(`/owner-payouts?${params.toString()}`);
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  const { data: summaryData } = useQuery({
    queryKey: ['owner-payouts', 'summary'],
    queryFn: async () => {
      const res = await api.get('/owner-payouts/summary');
      return res.data;
    },
  });

  useEffect(() => {
    if (payoutsData?.page < payoutsData?.totalPages) {
      const params = new URLSearchParams({ page: (page + 1).toString(), limit: limit.toString() });
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      queryClient.prefetchQuery({
        queryKey: ['owner-payouts', { page: page + 1, limit, status: filterStatus }],
        queryFn: () => api.get(`/owner-payouts?${params.toString()}`).then(r => r.data),
      });
    }
  }, [payoutsData, page, limit, filterStatus, queryClient]);

  const payouts: OwnerPayout[] = payoutsData?.data || [];

  const parentRef = useRef<HTMLDivElement>(null);
  const listVirtualizer = useVirtualizer({
    count: payouts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 148,
    overscan: 5,
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#221E1C] tracking-tight flex items-center gap-2.5">
          <TrendingUp size={22} className="text-[#B9924A]" />
          Landlord / Owner Remittance Statements
        </h2>
        <p className="text-xs text-[#5B534C] mt-1">Gross-to-net payout calculations with management commission deductions</p>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Gross Collected',    val: summaryData?.totalGross || 0,      color: 'text-[#221E1C]',  bg: 'bg-white' },
          { label: 'Expenses Deducted',  val: summaryData?.totalDeductions || 0, color: 'text-orange-700', bg: 'bg-orange-50' },
          { label: 'Management Fee',     val: summaryData?.totalCommission || 0, color: 'text-amber-700',  bg: 'bg-amber-50' },
          { label: 'Net to Owners',      val: summaryData?.totalNet || 0,        color: 'text-[#6E1731]',  bg: 'bg-[#FBF9F3]' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-[#E4DCCB] rounded-lg p-4`}>
            <p className="text-xs text-[#8B8279] mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>
              {summaryData ? formatQAR(s.val) : <span className="text-transparent bg-slate-200 animate-pulse rounded">QAR 00,000</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payouts List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-1 bg-white border border-[#E4DCCB] rounded-lg p-1 w-fit">
            {['ALL', 'PAID', 'PROCESSING', 'DRAFT'].map(s => (
              <button
                key={s}
                onClick={() => updateParam('status', s)}
                className={`px-3 py-1.5 text-xs rounded font-medium transition-colors cursor-pointer ${
                  filterStatus === s ? 'bg-[#6E1731] text-white' : 'text-[#5B534C] hover:bg-[#F4EFE4]'
                }`}
              >
                {s === 'ALL' ? 'All' : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>

          <div className="bg-white border border-[#E4DCCB] rounded-2xl overflow-hidden shadow-sm relative">
            {isFetching && payouts.length > 0 && (
              <div className="absolute top-0 left-0 w-full h-1 bg-[#FBF9F3] z-20">
                <div className="h-full bg-[#B9924A] animate-pulse w-1/3"></div>
              </div>
            )}
            
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg p-4 border border-[#E4DCCB] animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="h-8 bg-slate-200 rounded"></div>
                      <div className="h-8 bg-slate-200 rounded"></div>
                      <div className="h-8 bg-slate-200 rounded"></div>
                      <div className="h-8 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : payouts.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={TrendingUp}
                  title="No payouts found"
                  description="No owner payouts matching your active filters."
                />
              </div>
            ) : (
              <div ref={parentRef} className="overflow-y-auto max-h-[600px] p-4 custom-scrollbar">
                <div style={{ height: listVirtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
                  {listVirtualizer.getVirtualItems().map(virtualRow => {
                    const payout = payouts[virtualRow.index];
                    const cfg = STATUS_CONFIG[payout.status];
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={payout.id}
                        data-index={virtualRow.index}
                        ref={listVirtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                          paddingBottom: '12px'
                        }}
                      >
                        <div
                          onClick={() => setSelectedPayout(selectedPayout?.id === payout.id ? null : payout)}
                          className={`rounded-lg p-4 cursor-pointer border transition-all ${
                            selectedPayout?.id === payout.id
                              ? 'bg-[#FBF9F3] border-[#B9924A] shadow-md z-10 relative'
                              : 'bg-white border-[#E4DCCB] hover:border-[#B9924A]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <Building2 size={14} className="text-[#B9924A] shrink-0" />
                                <p className="text-sm font-semibold text-[#221E1C]">{payout.property?.name}</p>
                                <span className="text-xs text-[#8B8279]">{payout.property?.area}</span>
                                <span className={`ml-auto rtl:mr-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                  <Icon size={9} />
                                  {cfg.label}
                                </span>
                              </div>
                              <p className="text-xs text-[#5B534C]">
                                Period: <span className="text-[#221E1C] font-medium">{payout.periodMonth}</span>
                                {payout.paymentReference && <> · Ref: <span className="font-mono text-[#B9924A]">{payout.paymentReference}</span></>}
                                {payout.paidAt && <> · Paid: <span className="text-emerald-700">{formatDate(payout.paidAt)}</span></>}
                              </p>
                            </div>
                          </div>

                          {/* Gross → Net waterfall */}
                          <div className="mt-3 pt-3 border-t border-[#E4DCCB] grid grid-cols-4 gap-2 text-center">
                            <div>
                              <p className="text-[10px] text-[#8B8279] mb-0.5">Gross Rent</p>
                              <p className="text-sm font-bold text-[#221E1C]">{formatQAR(Number(payout.grossRent))}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-[#8B8279] mb-0.5">− Expenses</p>
                              <p className="text-sm font-bold text-orange-600">{formatQAR(Number(payout.expensesDeducted))}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-[#8B8279] mb-0.5">− Mgmt Fee</p>
                              <p className="text-sm font-bold text-amber-600">{formatQAR(Number(payout.managementCommission))}</p>
                            </div>
                            <div className="bg-[#FBF9F3] border border-[#E4DCCB] rounded-lg p-1">
                              <p className="text-[10px] text-[#B9924A] mb-0.5">Net Payout</p>
                              <p className="text-sm font-bold text-[#6E1731]">{formatQAR(Number(payout.netPayout))}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Pagination Footer */}
            {payoutsData && payoutsData.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E4DCCB] bg-[#FBF9F3]">
                <p className="text-xs text-[#5B534C]">
                  Showing <span className="font-semibold text-[#221E1C]">{(page - 1) * limit + 1}</span> to <span className="font-semibold text-[#221E1C]">{Math.min(page * limit, payoutsData.total)}</span> of <span className="font-semibold text-[#221E1C]">{payoutsData.total}</span> entries
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
                    disabled={page >= payoutsData.totalPages}
                    className="p-1.5 rounded-lg border border-[#E4DCCB] bg-white text-[#5B534C] hover:bg-[#F4EFE4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detail / Statement Panel */}
        <div className="lg:col-span-1">
          {selectedPayout ? (
            <div className="bg-white border border-[#E4DCCB] rounded-lg p-5 sticky top-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#221E1C]">Investor Statement</h3>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#6E1731] hover:bg-[#4A0F22] text-white text-xs rounded font-medium transition-colors cursor-pointer"
                >
                  <Printer size={12} />
                  Print
                </button>
              </div>

              {/* Owner Info */}
              <div className="bg-[#FBF9F3] border border-[#E4DCCB] rounded-lg p-3 mb-4">
                <p className="text-xs text-[#5B534C] mb-2 font-semibold uppercase tracking-wider">Owner Details</p>
                <p className="text-sm font-semibold text-[#221E1C]">{selectedPayout.property?.ownerName || 'Owner on file'}</p>
                {selectedPayout.property?.ownerIban && (
                  <p className="text-xs font-mono text-[#B9924A] mt-1">{selectedPayout.property.ownerIban}</p>
                )}
              </div>

              {/* Collected Rent */}
              {selectedPayout.breakdown?.collectedRentUnits && (
                <div className="mb-4">
                  <p className="text-xs text-[#5B534C] mb-2 font-semibold uppercase tracking-wider">Collected Rent by Unit</p>
                  <div className="space-y-1">
                    {selectedPayout.breakdown.collectedRentUnits.map((u, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Wallet size={10} className="text-emerald-600 shrink-0" />
                        <span className="text-[#5B534C]">{u}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deducted Expenses */}
              {selectedPayout.breakdown?.deductedExpenses && selectedPayout.breakdown.deductedExpenses.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-[#5B534C] mb-2 font-semibold uppercase tracking-wider">Deducted Expenses</p>
                  <div className="space-y-1">
                    {selectedPayout.breakdown.deductedExpenses.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-orange-600 font-bold">−</span>
                        <span className="text-[#5B534C]">{e}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agency Fee Rate */}
              {selectedPayout.breakdown?.agencyFeeRate && (
                <div className="mb-4">
                  <p className="text-xs text-[#5B534C] mb-1 font-semibold uppercase tracking-wider">Agency Fee Rate</p>
                  <p className="text-lg font-bold text-amber-700">{selectedPayout.breakdown.agencyFeeRate}</p>
                </div>
              )}

              {/* Net Total */}
              <div className="bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl p-4 text-center mt-4">
                <p className="text-xs text-[#8B8279] mb-1 uppercase tracking-wider">NET OWNER PAYOUT</p>
                <p className="text-2xl font-bold text-[#6E1731]">{formatQAR(Number(selectedPayout.netPayout))}</p>
                {selectedPayout.paymentReference && (
                  <p className="text-[10px] text-[#8B8279] mt-1 font-mono">Ref: {selectedPayout.paymentReference}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E4DCCB] rounded-lg p-8 text-center text-[#8B8279] sticky top-6 shadow-sm">
              <TrendingUp size={32} className="mx-auto mb-2 text-[#E4DCCB]" />
              <p className="text-sm">Select a payout to view investor statement</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
