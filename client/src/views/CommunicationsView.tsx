import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Send, Phone, CheckCheck, Clock } from 'lucide-react';
import api from '../lib/api';

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
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [filterChannel, setFilterChannel] = useState('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['communications'],
    queryFn: async () => {
      const res = await api.get('/communications/logs');
      return res.data as CommunicationLog[];
    },
  });

  const logs = (data || []).filter(l => filterChannel === 'ALL' || l.channel === filterChannel);

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

      <div className="grid grid-cols-3 gap-6">
        {/* Templates Panel */}
        <div>
          <h3 className="text-xs font-semibold text-[#5B534C] uppercase tracking-wider mb-3">Quick Templates</h3>
          <div className="space-y-3">
            {TEMPLATES.map(t => (
              <div
                key={t.key}
                onClick={() => setSelectedTemplate(selectedTemplate?.key === t.key ? null : t)}
                className={`rounded-lg p-4 cursor-pointer border transition-all ${
                  selectedTemplate?.key === t.key
                    ? 'bg-[#FBF9F3] border-[#B9924A]'
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
                      className="mt-2 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded transition-colors"
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
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[#5B534C] uppercase tracking-wider">Message Audit Log</h3>
            <div className="flex items-center gap-1 bg-white border border-[#E4DCCB] rounded-lg p-1">
              {['ALL', 'WHATSAPP', 'METRASH_SMS', 'EMAIL'].map(c => (
                <button
                  key={c}
                  onClick={() => setFilterChannel(c)}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                    filterChannel === c ? 'bg-[#6E1731] text-white' : 'text-[#5B534C] hover:bg-[#F4EFE4]'
                  }`}
                >
                  {c === 'ALL' ? 'All' : CHANNEL_CONFIG[c]?.label || c}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E4DCCB] rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-48 text-[#8B8279] text-sm">Loading messages…</div>
            ) : logs.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-[#8B8279] text-sm">No messages found</div>
            ) : (
              <div className="divide-y divide-[#E4DCCB]">
                {logs.map(log => {
                  const channelCfg = CHANNEL_CONFIG[log.channel];
                  const statusCfg = STATUS_CONFIG[log.status] || STATUS_CONFIG['SENT'];
                  const StatusIcon = statusCfg.icon;
                  return (
                    <div key={log.id} className="p-4 hover:bg-[#FBF9F3] transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${channelCfg?.iconBg}`}>
                          <MessageSquare size={14} className={channelCfg?.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-[#221E1C]">{log.recipientName}</p>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${channelCfg?.bg} ${channelCfg?.text} ${channelCfg?.border}`}>
                                {channelCfg?.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <StatusIcon size={12} className={statusCfg.color} />
                              <span className={`text-[10px] ${statusCfg.color}`}>{statusCfg.label}</span>
                            </div>
                          </div>
                          <p className="text-xs text-[#8B8279] mb-1">{log.recipientPhone} · {formatDate(log.sentAt)}</p>
                          <p className="text-xs text-[#5B534C] leading-relaxed line-clamp-2">{log.messageText}</p>
                          {log.templateKey && (
                            <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded bg-[#F4EFE4] text-[#8B8279] font-mono border border-[#E4DCCB]">
                              {log.templateKey}
                            </span>
                          )}
                        </div>
                        <a
                          href={`https://wa.me/${log.recipientPhone.replace(/\s+/g, '').replace('+', '')}?text=${encodeURIComponent(log.messageText)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 p-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-green-700 transition-colors"
                          title="Resend via WhatsApp"
                        >
                          <Send size={12} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
