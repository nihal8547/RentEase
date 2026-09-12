import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MessageSquare, Send, Phone, CheckCheck, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { EmptyState } from '../components/ui/EmptyState';

interface CommunicationLog {
  id: string;
  recipientPhone: string;
  recipientName: string;
  channel: 'WHATSAPP' | 'METRASH_SMS' | 'EMAIL';
  templateKey: string;
  messageText: string;
  status: string;
  sentAt: string;
}

interface Template {
  key: string;
  nameEn: string;
  nameAr: string;
  preview: string;
  previewAr: string;
}

const TEMPLATES: Template[] = [
  {
    key: 'rent_due',
    nameEn: 'Rent Due Reminder',
    nameAr: 'تذكير استحقاق الإيجار',
    preview: 'Dear {name}, your rent of {amount} QAR for {unit} is due on {date}. Please arrange payment at your earliest convenience.',
    previewAr: 'السيد/ة {name} المحترم/ة، يُذكركم بأن استحقاق الإيجار بقيمة {amount} ريال قطري للوحدة {unit} يحل بتاريخ {date}.',
  },
  {
    key: 'renewal_60day',
    nameEn: '60-Day Renewal Notice',
    nameAr: 'إشعار التجديد قبل 60 يوماً',
    preview: 'Dear {name}, your lease for {unit} expires on {date}. As per Law No. 4/2008, please confirm renewal intention within 30 days.',
    previewAr: 'السيد/ة {name}، ينتهي عقد إيجار الوحدة {unit} بتاريخ {date}. وفقاً لقانون رقم 4/2008، يرجى إبلاغنا بنيتكم في التجديد.',
  },
  {
    key: 'maintenance_arrival',
    nameEn: 'Maintenance Arrival Notice',
    nameAr: 'إشعار وصول فني الصيانة',
    preview: 'Dear {name}, our technician will visit {unit} today between {time_from} - {time_to}. Reference: {ticket_id}.',
    previewAr: 'السيد/ة {name}، سيقوم فني الصيانة بزيارة الوحدة {unit} اليوم بين {time_from} - {time_to}. المرجع: {ticket_id}.',
  },
  {
    key: 'payment_receipt',
    nameEn: 'Payment Receipt Confirmation',
    nameAr: 'تأكيد استلام الدفعة',
    preview: 'Dear {name}, we confirm receipt of {amount} QAR for {unit}. Receipt No: {receipt_id}. Thank you.',
    previewAr: 'السيد/ة {name}، نؤكد استلام مبلغ {amount} ريال قطري للوحدة {unit}. رقم الإيصال: {receipt_id}. شكراً لكم.',
  },
];

const CHANNEL_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; iconBg: string }> = {
  WHATSAPP:    { label: 'WhatsApp',    bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  iconBg: 'bg-green-100' },
  METRASH_SMS: { label: 'Metrash SMS', bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   iconBg: 'bg-blue-100' },
  EMAIL:       { label: 'Email',       bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  iconBg: 'bg-amber-100' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.FC<any>; color: string }> = {
  SENT:      { label: 'Sent',      icon: Send,       color: 'text-[#8B8279]' },
  DELIVERED: { label: 'Delivered', icon: CheckCheck, color: 'text-blue-600' },
  READ:      { label: 'Read',      icon: CheckCheck, color: 'text-green-600' },
  FAILED:    { label: 'Failed',    icon: Clock,      color: 'text-red-600' },
};

const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-QA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export default function CommunicationsView() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const filterChannel = searchParams.get('channel') || 'ALL';

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'ALL') newParams.set(key, value);
    else newParams.delete(key);
    if (key !== 'page') newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const { data: logsData, isLoading, isFetching } = useQuery({
    queryKey: ['communications', { page, limit, channel: filterChannel }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (filterChannel !== 'ALL') params.set('channel', filterChannel);
      const res = await api.get(`/communications/logs?${params.toString()}`);
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (logsData?.page < logsData?.totalPages) {
      const params = new URLSearchParams({ page: (page + 1).toString(), limit: limit.toString() });
      if (filterChannel !== 'ALL') params.set('channel', filterChannel);
      queryClient.prefetchQuery({
        queryKey: ['communications', { page: page + 1, limit, channel: filterChannel }],
        queryFn: () => api.get(`/communications/logs?${params.toString()}`).then(r => r.data),
      });
    }
  }, [logsData, page, limit, filterChannel, queryClient]);

  const logs: CommunicationLog[] = logsData?.data || [];

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#221E1C] tracking-tight flex items-center gap-2.5">
          <MessageSquare size={22} className="text-[#B9924A]" />
          WhatsApp & Metrash Communication Center
        </h2>
        <p className="text-xs text-[#5B534C] mt-1">Bilingual tenant messaging with wa.me quick-dispatch and Metrash SMS audit log</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates Panel */}
        <div className="lg:col-span-1">
          <h3 className="text-xs font-semibold text-[#5B534C] uppercase tracking-wider mb-3">Quick Templates</h3>
          <div className="space-y-3">
            {TEMPLATES.map(t => (
              <div
                key={t.key}
                onClick={() => setSelectedTemplate(selectedTemplate?.key === t.key ? null : t)}
                className={`rounded-lg p-4 cursor-pointer border transition-all ${
                  selectedTemplate?.key === t.key
                    ? 'bg-[#FBF9F3] border-[#B9924A] shadow-sm'
                    : 'bg-white border-[#E4DCCB] hover:border-[#B9924A]'
                }`}
              >
                <p className="text-sm font-semibold text-[#221E1C]">{t.nameEn}</p>
                <p className="text-xs text-[#8B8279] text-right mt-0.5">{t.nameAr}</p>
                <p className="text-xs text-[#5B534C] mt-2 line-clamp-2">{t.preview}</p>

                {selectedTemplate?.key === t.key && (
                  <div className="mt-3 pt-3 border-t border-[#E4DCCB]">
                    <p className="text-xs text-[#8B8279] mb-2 text-right leading-relaxed">{t.previewAr}</p>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(t.preview)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                    >
                      <Phone size={12} />
                      Open in WhatsApp
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Message Log */}
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <h3 className="text-xs font-semibold text-[#5B534C] uppercase tracking-wider">Message Audit Log</h3>
            <div className="flex items-center gap-1 bg-white border border-[#E4DCCB] rounded-xl p-1 shadow-sm flex-wrap">
              {['ALL', 'WHATSAPP', 'METRASH_SMS', 'EMAIL'].map(c => (
                <button
                  key={c}
                  onClick={() => updateParam('channel', c)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                    filterChannel === c ? 'bg-[#6E1731] text-white shadow-xs' : 'text-[#5B534C] hover:bg-[#F4EFE4]'
                  }`}
                >
                  {c === 'ALL' ? 'All Channels' : CHANNEL_CONFIG[c]?.label || c}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E4DCCB] rounded-2xl overflow-hidden shadow-sm relative">
            {isFetching && logs.length > 0 && (
              <div className="absolute top-0 left-0 w-full h-1 bg-[#FBF9F3] z-20">
                <div className="h-full bg-[#B9924A] animate-pulse w-1/3"></div>
              </div>
            )}
            
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="w-1/3 h-4 bg-slate-200 rounded animate-pulse"></div>
                      <div className="w-full h-4 bg-slate-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={MessageSquare}
                  title="No communications found"
                  description="No messages match your active filters."
                />
              </div>
            ) : (
              <div ref={parentRef} className="overflow-y-auto max-h-[600px] p-4 custom-scrollbar">
                <div style={{ height: rowVirtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
                  {virtualItems.map((virtualRow) => {
                    const log = logs[virtualRow.index];
                    const cfg = CHANNEL_CONFIG[log.channel] || CHANNEL_CONFIG['WHATSAPP'];
                    const statusCfg = STATUS_CONFIG[log.status] || STATUS_CONFIG['SENT'];
                    const StatusIcon = statusCfg.icon;

                    return (
                      <div
                        key={log.id}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                          paddingBottom: '12px'
                        }}
                      >
                        <div className="bg-white border border-[#E4DCCB] rounded-xl p-4 flex items-start gap-4 hover:bg-[#FBF9F3] transition-colors">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cfg.iconBg} ${cfg.text}`}>
                            <Phone size={18} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <div>
                                <p className="text-sm font-semibold text-[#221E1C]">{log.recipientName}</p>
                                <p className="text-xs font-mono text-[#8B8279]">{log.recipientPhone}</p>
                              </div>
                              <div className="text-right">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                  {cfg.label}
                                </span>
                                <p className="text-[10px] text-[#8B8279] mt-1">{formatDate(log.sentAt)}</p>
                              </div>
                            </div>
                            <p className="text-xs text-[#5B534C] mt-2 line-clamp-2 leading-relaxed bg-[#F4F1EA] p-2 rounded-lg border border-[#EDE8DE]">
                              {log.messageText}
                            </p>
                            <div className="mt-2 flex items-center gap-1">
                              <StatusIcon size={12} className={statusCfg.color} />
                              <span className={`text-[10px] font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
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
            {logsData && logsData.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E4DCCB] bg-[#FBF9F3]">
                <p className="text-xs text-[#5B534C]">
                  Showing <span className="font-semibold text-[#221E1C]">{(page - 1) * limit + 1}</span> to <span className="font-semibold text-[#221E1C]">{Math.min(page * limit, logsData.total)}</span> of <span className="font-semibold text-[#221E1C]">{logsData.total}</span> entries
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
                    disabled={page >= logsData.totalPages}
                    className="p-1.5 rounded-lg border border-[#E4DCCB] bg-white text-[#5B534C] hover:bg-[#F4EFE4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
