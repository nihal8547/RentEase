import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wrench,
  Droplets,
  Zap,
  Plus,
  X,
} from 'lucide-react';
import api from '../lib/api';
import { EmptyState } from '../components/ui/EmptyState';

interface Inspection {
  id: string;
  type: 'MOVE_IN' | 'MOVE_OUT' | 'ROUTINE';
  status: 'DRAFT' | 'IN_REVIEW' | 'COMPLETED' | 'SIGNED';
  conductedBy: string;
  conductedAt: string;
  electricityMeter?: number;
  waterMeter?: number;
  checklist?: Record<string, any>;
  deductionsAmount?: number;
  signatureUrl?: string;
  notes?: string;
  unit?: {
    id: string;
    unitNumber: string;
    property?: { name: string; area: string };
  };
  lease?: {
    id: string;
    tenant?: { name: string; phone: string };
  };
}

interface PropertyWithUnits {
  id: string;
  name: string;
  units: { id: string; unitNumber: string; status: string }[];
}

const TYPE_CONFIG: Record<string, { label: string; labelAr: string; bg: string; text: string; border: string }> = {
  MOVE_IN:  { label: 'Move-In',  labelAr: 'تسليم الوحدة',  bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  MOVE_OUT: { label: 'Move-Out', labelAr: 'استلام الوحدة', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  ROUTINE:  { label: 'Routine',  labelAr: 'فحص دوري',     bg: 'bg-slate-50',  text: 'text-slate-600',  border: 'border-slate-200' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.FC<any> }> = {
  DRAFT:     { label: 'Draft',     bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   icon: Clock },
  IN_REVIEW: { label: 'In Review', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: AlertTriangle },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  SIGNED:    { label: 'Signed',    bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: CheckCircle2 },
};

const formatQAR = (v: number) =>
  new Intl.NumberFormat('en-QA', { style: 'currency', currency: 'QAR', maximumFractionDigits: 0 }).format(v);

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-QA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function InspectionsView() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    unitId: '',
    type: 'MOVE_IN',
    conductedBy: '',
    conductedAt: new Date().toISOString().slice(0, 10),
    electricityMeter: '',
    waterMeter: '',
    deductionsAmount: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');

  // Fetch Inspections
  const { data, isLoading } = useQuery({
    queryKey: ['inspections'],
    queryFn: async () => {
      const res = await api.get('/inspections');
      return res.data as Inspection[];
    },
  });

  // Fetch Properties & Units for modal select
  const { data: propertiesData } = useQuery({
    queryKey: ['properties', 'units-select'],
    queryFn: async () => {
      const res = await api.get('/properties');
      return (res.data?.data || res.data || []) as PropertyWithUnits[];
    },
    enabled: showAddModal,
  });

  // Create Inspection Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/inspections', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      setShowAddModal(false);
      setFormData({
        unitId: '',
        type: 'MOVE_IN',
        conductedBy: '',
        conductedAt: new Date().toISOString().slice(0, 10),
        electricityMeter: '',
        waterMeter: '',
        deductionsAmount: '',
        notes: '',
      });
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to create inspection report.');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unitId) {
      setFormError('Please select a unit.');
      return;
    }
    if (!formData.conductedBy.trim()) {
      setFormError('Inspector name is required.');
      return;
    }

    createMutation.mutate({
      unitId: formData.unitId,
      type: formData.type,
      conductedBy: formData.conductedBy.trim(),
      conductedAt: formData.conductedAt,
      electricityMeter: formData.electricityMeter ? Number(formData.electricityMeter) : undefined,
      waterMeter: formData.waterMeter ? Number(formData.waterMeter) : undefined,
      deductionsAmount: formData.deductionsAmount ? Number(formData.deductionsAmount) : 0,
      notes: formData.notes.trim() || undefined,
    });
  };

  const inspections = (data || []).filter(i =>
    (filterType === 'ALL' || i.type === filterType) &&
    (filterStatus === 'ALL' || i.status === filterStatus)
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#221E1C] tracking-tight flex items-center gap-2.5">
            <ClipboardCheck size={22} className="text-[#B9924A]" />
            Move-In / Move-Out Inspections & Snagging
          </h2>
          <p className="text-xs text-[#5B534C] mt-1">Digital room checklists, Kahramaa meter readings, and deduction reconciliation</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#6E1731] hover:bg-[#8C243E] text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer w-fit"
        >
          <Plus size={15} />
          New Inspection
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Inspections', val: data?.length || 0,                                         color: 'text-[#221E1C]',  bg: 'bg-white' },
          { label: 'Move-In',           val: data?.filter(i => i.type === 'MOVE_IN').length || 0,     color: 'text-blue-700',   bg: 'bg-blue-50' },
          { label: 'Move-Out',          val: data?.filter(i => i.type === 'MOVE_OUT').length || 0,    color: 'text-orange-700', bg: 'bg-orange-50' },
          { label: 'In Review',         val: data?.filter(i => i.status === 'IN_REVIEW').length || 0,  color: 'text-amber-700',  bg: 'bg-amber-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-[#E4DCCB] rounded-xl p-4 shadow-sm`}>
            <p className="text-xs text-[#8B8279] mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inspections List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-white border border-[#E4DCCB] rounded-xl p-1 shadow-sm overflow-x-auto">
              {['ALL', 'MOVE_IN', 'MOVE_OUT', 'ROUTINE'].map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                    filterType === t ? 'bg-[#6E1731] text-white shadow-xs' : 'text-[#5B534C] hover:bg-[#F4EFE4]'
                  }`}
                >
                  {t === 'ALL' ? 'All Types' : TYPE_CONFIG[t]?.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-white border border-[#E4DCCB] rounded-xl p-1 shadow-sm overflow-x-auto">
              {['ALL', 'IN_REVIEW', 'COMPLETED', 'SIGNED', 'DRAFT'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                    filterStatus === s ? 'bg-[#6E1731] text-white shadow-xs' : 'text-[#5B534C] hover:bg-[#F4EFE4]'
                  }`}
                >
                  {s === 'ALL' ? 'All Status' : STATUS_CONFIG[s]?.label || s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-48 text-[#8B8279] text-sm">Loading inspections…</div>
            ) : inspections.length === 0 ? (
              <div className="bg-white border border-[#E4DCCB] rounded-2xl p-8 shadow-sm">
                <EmptyState
                  icon={ClipboardCheck}
                  title="No inspections found"
                  description="Record digital move-in, move-out, or routine snagging inspections with meter readings."
                  actionLabel="New Inspection"
                  onAction={() => setShowAddModal(true)}
                />
              </div>
            ) : (
              inspections.map(inspection => {
                const typeCfg = TYPE_CONFIG[inspection.type] || TYPE_CONFIG['ROUTINE'];
                const statusCfg = STATUS_CONFIG[inspection.status] || STATUS_CONFIG['DRAFT'];
                const StatusIcon = statusCfg?.icon || Clock;
                return (
                  <div
                    key={inspection.id}
                    onClick={() => setSelectedInspection(inspection)}
                    className={`bg-white border rounded-2xl p-4 cursor-pointer hover:bg-[#FBF9F3] transition-all shadow-sm ${
                      selectedInspection?.id === inspection.id
                        ? 'border-[#B9924A] ring-1 ring-[#B9924A] bg-[#FBF9F3]'
                        : 'border-[#E4DCCB]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${typeCfg.bg} ${typeCfg.text} ${typeCfg.border}`}>
                            {typeCfg.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg?.bg} ${statusCfg?.text} ${statusCfg?.border}`}>
                            <StatusIcon size={9} />
                            {statusCfg?.label}
                          </span>
                          {(inspection.deductionsAmount || 0) > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                              <Wrench size={9} />
                              Deductions: {formatQAR(Number(inspection.deductionsAmount))}
                            </span>
                          )}
                        </div>
                        <p className="text-[#221E1C] font-semibold text-sm">
                          {inspection.unit?.property?.name} — Unit {inspection.unit?.unitNumber}
                        </p>
                        <p className="text-[#5B534C] text-xs mt-0.5">
                          {inspection.lease?.tenant?.name || 'Resident'} · Inspector: {inspection.conductedBy}
                        </p>
                        <p className="text-[#8B8279] text-[11px] mt-1">{formatDate(inspection.conductedAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {inspection.electricityMeter && (
                          <div className="flex items-center gap-1 text-xs text-amber-600 mb-1">
                            <Zap size={12} />
                            <span className="font-mono font-medium">{inspection.electricityMeter} kWh</span>
                          </div>
                        )}
                        {inspection.waterMeter && (
                          <div className="flex items-center gap-1 text-xs text-blue-600">
                            <Droplets size={12} />
                            <span className="font-mono font-medium">{inspection.waterMeter} m³</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div>
          {selectedInspection ? (
            <div className="bg-white border border-[#E4DCCB] rounded-2xl p-5 sticky top-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#221E1C] flex items-center gap-2">
                <ClipboardCheck size={16} className="text-[#B9924A]" />
                Inspection Detail
              </h3>

              {/* Kahramaa Meters */}
              <div className="bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl p-3.5">
                <p className="text-xs text-[#5B534C] font-semibold uppercase tracking-wider mb-3">Kahramaa Meter Readings</p>
                <div className="flex gap-4">
                  <div className="flex-1 text-center">
                    <Zap size={16} className="text-amber-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-amber-700 font-mono">
                      {selectedInspection.electricityMeter?.toLocaleString() || '—'}
                    </p>
                    <p className="text-[10px] text-[#8B8279]">kWh (Electricity)</p>
                  </div>
                  <div className="w-px bg-[#E4DCCB]" />
                  <div className="flex-1 text-center">
                    <Droplets size={16} className="text-blue-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-blue-700 font-mono">
                      {selectedInspection.waterMeter?.toLocaleString() || '—'}
                    </p>
                    <p className="text-[10px] text-[#8B8279]">m³ (Water)</p>
                  </div>
                </div>
              </div>

              {/* Checklist */}
              {selectedInspection.checklist && Object.keys(selectedInspection.checklist).length > 0 && (
                <div>
                  <p className="text-xs text-[#5B534C] font-semibold uppercase tracking-wider mb-2">Room Checklist</p>
                  <div className="space-y-2">
                    {Object.entries(selectedInspection.checklist).map(([room, items]) => (
                      <div key={room} className="bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl p-2.5">
                        <p className="text-xs font-semibold text-[#221E1C] capitalize mb-1">{room.replace(/([A-Z])/g, ' $1')}</p>
                        {typeof items === 'object' && Object.entries(items as Record<string, string>).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-[11px] py-0.5">
                            <span className="text-[#8B8279] capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                            <span className={`text-right max-w-[120px] ${
                              String(v).toLowerCase().includes('damage') || String(v).toLowerCase().includes('broken')
                                ? 'text-red-600 font-semibold'
                                : 'text-[#5B534C]'
                            }`}>
                              {String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deductions */}
              {(selectedInspection.deductionsAmount || 0) > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
                  <p className="text-xs text-red-700 font-semibold mb-1">Security Deposit Deductions</p>
                  <p className="text-xl font-bold text-red-700">{formatQAR(Number(selectedInspection.deductionsAmount))}</p>
                </div>
              )}

              {/* Notes */}
              {selectedInspection.notes && (
                <div className="pt-2 border-t border-[#EDE8DE]">
                  <p className="text-xs text-[#5B534C] font-semibold uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-xs text-[#5B534C] leading-relaxed">{selectedInspection.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#E4DCCB] rounded-2xl p-8 text-center text-[#8B8279] shadow-sm">
              <ClipboardCheck size={36} className="mx-auto mb-2 text-[#E4DCCB]" />
              <p className="text-sm font-medium">Select an inspection to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Inspection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#EDE8DE] space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EDE8DE] pb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#6E1731]/10 text-[#6E1731] flex items-center justify-center">
                  <ClipboardCheck size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#221E1C]">Create Inspection Report</h3>
                  <p className="text-xs text-[#706B65]">Move-in, move-out, or routine snagging</p>
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
                <label className="block font-semibold text-[#221E1C] mb-1">Select Property Unit *</label>
                <select
                  value={formData.unitId}
                  onChange={e => setFormData({ ...formData, unitId: e.target.value })}
                  className="w-full bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A]"
                  required
                >
                  <option value="">-- Choose Unit --</option>
                  {(propertiesData || []).map((prop: any) =>
                    (prop.units || []).map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {prop.name} — Unit {u.unitNumber} ({u.status})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#221E1C] mb-1">Inspection Type *</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A]"
                  >
                    <option value="MOVE_IN">Move-In (تسليم الوحدة)</option>
                    <option value="MOVE_OUT">Move-Out (استلام الوحدة)</option>
                    <option value="ROUTINE">Routine (فحص دوري)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#221E1C] mb-1">Inspector / Conducted By *</label>
                  <input
                    type="text"
                    value={formData.conductedBy}
                    onChange={e => setFormData({ ...formData, conductedBy: e.target.value })}
                    placeholder="e.g. Tariq Al-Mansoor"
                    className="w-full bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#221E1C] mb-1">Date Conducted *</label>
                  <input
                    type="date"
                    value={formData.conductedAt}
                    onChange={e => setFormData({ ...formData, conductedAt: e.target.value })}
                    className="w-full bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#221E1C] mb-1">Deductions Amount (QAR)</label>
                  <input
                    type="number"
                    value={formData.deductionsAmount}
                    onChange={e => setFormData({ ...formData, deductionsAmount: e.target.value })}
                    placeholder="0"
                    className="w-full bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#221E1C] mb-1 flex items-center gap-1 text-amber-700">
                    <Zap size={13} /> Electricity Meter (kWh)
                  </label>
                  <input
                    type="number"
                    value={formData.electricityMeter}
                    onChange={e => setFormData({ ...formData, electricityMeter: e.target.value })}
                    placeholder="e.g. 18450"
                    className="w-full bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#221E1C] mb-1 flex items-center gap-1 text-blue-700">
                    <Droplets size={13} /> Water Meter (m³)
                  </label>
                  <input
                    type="number"
                    value={formData.waterMeter}
                    onChange={e => setFormData({ ...formData, waterMeter: e.target.value })}
                    placeholder="e.g. 342"
                    className="w-full bg-[#FBF9F3] border border-[#E4DCCB] rounded-xl px-3 py-2 text-xs text-[#221E1C] focus:outline-none focus:border-[#B9924A]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">Snagging Notes & Condition</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Record paint chips, AC cooling performance, sanitary fixtures condition…"
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
                  {createMutation.isPending ? 'Saving…' : 'Create Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
