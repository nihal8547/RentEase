import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, CheckCircle2, Clock, Printer, Building2, Wallet } from 'lucide-react';
import api from '../lib/api';

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
  const [selectedPayout, setSelectedPayout] = useState<OwnerPayout | null>(null);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['owner-payouts'],
    queryFn: async () => {
      const res = await api.get('/owner-payouts');
      return res.data as OwnerPayout[];
    },
  });

  const payouts = (data || []).filter(p => filterStatus === 'ALL' || p.status === filterStatus);

  const totalGross      = payouts.reduce((s, p) => s + Number(p.grossRent), 0);
  const totalDeductions = payouts.reduce((s, p) => s + Number(p.expensesDeducted), 0);
  const totalCommission = payouts.reduce((s, p) => s + Number(p.managementCommission), 0);
  const totalNet        = payouts.reduce((s, p) => s + Number(p.netPayout), 0);

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
          { label: 'Gross Collected',    val: totalGross,      color: 'text-[#221E1C]',  bg: 'bg-white' },
          { label: 'Expenses Deducted',  val: totalDeductions, color: 'text-orange-700', bg: 'bg-orange-50' },
          { label: 'Management Fee',     val: totalCommission, color: 'text-amber-700',  bg: 'bg-amber-50' },
          { label: 'Net to Owners',      val: totalNet,        color: 'text-[#6E1731]',  bg: 'bg-[#FBF9F3]' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-[#E4DCCB] rounded-lg p-4`}>
            <p className="text-xs text-[#8B8279] mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{formatQAR(s.val)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Payouts List */}
        <div className="col-span-2 space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-1 bg-white border border-[#E4DCCB] rounded-lg p-1 w-fit">
            {['ALL', 'PAID', 'PROCESSING', 'DRAFT'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
                  filterStatus === s ? 'bg-[#6E1731] text-white' : 'text-[#5B534C] hover:bg-[#F4EFE4]'
                }`}
              >
                {s === 'ALL' ? 'All' : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-48 text-[#8B8279] text-sm">Loading payouts…</div>
            ) : payouts.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-[#8B8279] text-sm">No payouts found</div>
            ) : payouts.map(payout => {
              const cfg = STATUS_CONFIG[payout.status];
              const Icon = cfg.icon;
              return (
                <div
                  key={payout.id}
                  onClick={() => setSelectedPayout(selectedPayout?.id === payout.id ? null : payout)}
                  className={`rounded-lg p-4 cursor-pointer border transition-all ${
                    selectedPayout?.id === payout.id
                      ? 'bg-[#FBF9F3] border-[#B9924A]'
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
              );
            })}
          </div>
        </div>

        {/* Detail / Statement Panel */}
        <div>
          {selectedPayout ? (
            <div className="bg-white border border-[#E4DCCB] rounded-lg p-5 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#221E1C]">Investor Statement</h3>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#6E1731] hover:bg-[#4A0F22] text-white text-xs rounded font-medium transition-colors"
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
            <div className="bg-white border border-[#E4DCCB] rounded-lg p-8 text-center text-[#8B8279]">
              <TrendingUp size={32} className="mx-auto mb-2 text-[#E4DCCB]" />
              <p className="text-sm">Select a payout to view investor statement</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
