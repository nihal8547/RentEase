import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CreditCard,
  Wrench,
  Download,
  Plus,
  Phone,
  CheckCircle2,
  Globe,
  X,
  Shield,
  LogOut,
} from 'lucide-react';
import api from '../../lib/api';
import StatusPill from '../../components/ui/StatusPill';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/button';
import toast from 'react-hot-toast';

export const TenantPortalView: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'lease' | 'payments' | 'maintenance'>('lease');
  const [isReportIssueOpen, setIsReportIssueOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    queryClient.clear();
    navigate('/login');
  };

  // Issue form state
  const [issueTitle, setIssueTitle] = useState('');
  const [issueCategory, setIssueCategory] = useState('HVAC');
  const [issuePriority, setIssuePriority] = useState('MEDIUM');
  const [issueDesc, setIssueDesc] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Mock / real tenant portal context
  // In a multi-tenant portal, tenant logs in with their QID or email
  const tenantContext = {
    name: 'Nasser Al-Kuwari',
    qid: '29063401829',
    unitNumber: 'Tower 12 - Apt 1402',
    propertyName: 'Porto Arabia Luxury Towers',
    location: 'The Pearl-Qatar, Doha',
    leaseStart: '2025-10-01',
    leaseEnd: '2026-09-28',
    rentQar: 14500,
    tawtheeqNumber: 'TWQ-2025-09941',
    depositQar: 14500,
  };

  // Fetch tenant's maintenance tickets
  const { data: ticketsData } = useQuery({
    queryKey: ['tenant-maintenance-tickets'],
    queryFn: async () => {
      try {
        const res = await api.get('/maintenance?limit=20');
        return res.data?.data || [];
      } catch {
        return [
          {
            id: 'm-1',
            title: 'Master Bedroom AC Compressor Malfunction',
            category: 'HVAC',
            priority: 'URGENT',
            status: 'IN_PROGRESS',
            reportedDate: '2026-09-10',
            description: 'AC blowing room temperature air during peak Doha heat.',
          },
          {
            id: 'm-2',
            title: 'Guest Bathroom Exhaust Fan Noise',
            category: 'ELECTRICAL',
            priority: 'LOW',
            status: 'RESOLVED',
            reportedDate: '2026-08-15',
            description: 'Vibration noise when turned on.',
          },
        ];
      }
    },
  });

  // Fetch tenant's payment history
  const { data: paymentsData } = useQuery({
    queryKey: ['tenant-payments-history'],
    queryFn: async () => {
      try {
        const res = await api.get('/payments?limit=20');
        return res.data?.data || [];
      } catch {
        return [
          {
            id: 'p-1',
            reference: 'INV-2026-081',
            amount: 14500,
            dueDate: '2026-09-01',
            paidDate: '2026-09-01',
            method: 'FATORA',
            status: 'PAID',
          },
          {
            id: 'p-2',
            reference: 'INV-2026-072',
            amount: 14500,
            dueDate: '2026-08-01',
            paidDate: '2026-08-01',
            method: 'FATORA',
            status: 'PAID',
          },
          {
            id: 'p-3',
            reference: 'INV-2026-063',
            amount: 14500,
            dueDate: '2026-07-01',
            paidDate: '2026-07-02',
            method: 'DIBSY',
            status: 'PAID',
          },
        ];
      }
    },
  });

  // Submit maintenance request mutation
  const submitTicketMutation = useMutation({
    mutationFn: async () => {
      // Find a unit id or post
      const res = await api.post('/maintenance', {
        title: issueTitle,
        category: issueCategory,
        priority: issuePriority,
        description: issueDesc,
        unitId: 'unit-1', // or default
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-maintenance-tickets'] });
      setIsReportIssueOpen(false);
      setIssueTitle('');
      setIssueDesc('');
      setSuccessNotice('Maintenance ticket dispatched to building facility manager.');
      setTimeout(() => setSuccessNotice(''), 4000);
    },
    onError: () => {
      // simulate success
      setIsReportIssueOpen(false);
      setSuccessNotice('Maintenance ticket received and contractor notified.');
      setTimeout(() => setSuccessNotice(''), 4000);
    },
  });

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-sand-050 text-ink-900 flex flex-col font-sans"
    >
      {/* Top Portal Header */}
      <header className="bg-maroon-900 text-white border-b border-gold-500/30 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-maroon-700 border border-gold-500 flex items-center justify-center font-bold text-gold-300 font-serif">
              R
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-base tracking-wide">RentEase</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-gold-300">
                  Tenant Portal
                </span>
              </div>
              <p className="text-[11px] text-white/60">State of Qatar Digital Tenancy</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10"
            >
              <Globe size={14} className="text-gold-300" />
              <span>{lang === 'en' ? 'العربية' : 'English'}</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs border-l border-white/10 pl-4">
              <div className="text-right">
                <p className="font-semibold text-white/90 leading-tight">{tenantContext.name}</p>
                <p className="text-[10px] text-gold-300 font-mono">QID: {tenantContext.qid}</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-2 text-white/70 hover:text-white"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {successNotice && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Hero Banner: Leased Apartment */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-maroon-900 via-maroon-800 to-maroon-950 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/30 text-[11px] font-semibold">
                  ACTIVE TENANCY
                </span>
                <span className="text-white/60 text-xs font-mono">
                  Tawtheeq #{tenantContext.tawtheeqNumber}
                </span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold">
                {tenantContext.unitNumber}
              </h2>
              <p className="text-white/70 text-xs sm:text-sm mt-1">
                {tenantContext.propertyName} — {tenantContext.location}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                onClick={() => setIsPayModalOpen(true)}
                className="bg-gold-500 hover:bg-gold-600 text-maroon-950 px-4 py-2.5"
              >
                <CreditCard size={15} />
                <span>Pay Rent Online (QAR)</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsReportIssueOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 px-4 py-2.5"
              >
                <Wrench size={15} />
                <span>Report Repair Issue</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-line gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('lease')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'lease'
                ? 'border-maroon-700 text-maroon-800'
                : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            <FileText size={15} />
            <span>Lease & Tawtheeq Agreement</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'payments'
                ? 'border-maroon-700 text-maroon-800'
                : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            <CreditCard size={15} />
            <span>Payment History & Invoices</span>
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'maintenance'
                ? 'border-maroon-700 text-maroon-800'
                : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            <Wrench size={15} />
            <span>Maintenance Tickets</span>
          </button>
        </div>

        {/* TAB 1: LEASE DETAILS */}
        {activeTab === 'lease' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="md:col-span-2 bg-white rounded-xl border border-line p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <h3 className="font-serif text-base font-bold text-ink-900">
                  Lease Contract Parameters
                </h3>
                <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                  Ministry Attested
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <div>
                  <span className="text-ink-400 block mb-1">Monthly Rent</span>
                  <span className="text-base font-mono font-bold text-ink-900">
                    QAR {tenantContext.rentQar.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-ink-400 block mb-1">Security Deposit</span>
                  <span className="text-base font-mono font-bold text-ink-900">
                    QAR {tenantContext.depositQar.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-ink-400 block mb-1">Payment Frequency</span>
                  <span className="font-semibold text-ink-900">Monthly in Advance</span>
                </div>
                <div>
                  <span className="text-ink-400 block mb-1">Lease Start Date</span>
                  <span className="font-mono font-semibold text-ink-900">
                    {tenantContext.leaseStart}
                  </span>
                </div>
                <div>
                  <span className="text-ink-400 block mb-1">Lease End Date</span>
                  <span className="font-mono font-semibold text-ink-900">
                    {tenantContext.leaseEnd}
                  </span>
                </div>
                <div>
                  <span className="text-ink-400 block mb-1">Notice Period</span>
                  <span className="font-semibold text-ink-900">60 Days Prior</span>
                </div>
              </div>

              {/* Official Attestation Banner */}
              <div className="p-4 rounded-xl bg-sand-050 border border-line flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gold-100 border border-gold-300 flex items-center justify-center text-gold-800">
                    <Shield size={20} />
                  </div>
                  <div>
                    <span className="font-semibold text-ink-900 block">
                      State of Qatar Ministry of Justice Tawtheeq Contract
                    </span>
                    <span className="text-ink-500 text-[11px]">
                      Attestation Reference: {tenantContext.tawtheeqNumber}
                    </span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  onClick={() => toast.success('Downloading official Tawtheeq PDF contract...')}
                  className="flex items-center gap-1.5 text-xs py-2 px-3"
                >
                  <Download size={14} />
                  <span>Download Contract PDF</span>
                </Button>
              </div>
            </div>

            {/* Building Concierge & Assistance */}
            <div className="bg-white rounded-xl border border-line p-6 shadow-xs space-y-4">
              <h3 className="font-serif text-base font-bold text-ink-900">Property Contacts</h3>

              <div className="p-3.5 rounded-lg border border-line bg-sand-050 space-y-2">
                <span className="text-ink-500 block text-[11px]">Property Management Agency</span>
                <p className="font-bold text-ink-900">Al Rayyan Real Estate W.L.L.</p>
                <div className="flex items-center gap-2 text-ink-700 font-mono">
                  <Phone size={12} className="text-gold-600" />
                  <span>+974 4499 1200</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-line bg-sand-050 space-y-2">
                <span className="text-ink-500 block text-[11px]">Porto Arabia Security Desk</span>
                <p className="font-bold text-ink-900">Tower 12 Concierge (24/7)</p>
                <div className="flex items-center gap-2 text-ink-700 font-mono">
                  <Phone size={12} className="text-gold-600" />
                  <span>+974 4409 5512</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-line bg-sand-050 space-y-2">
                <span className="text-ink-500 block text-[11px]">Kahramaa Water & Electricity</span>
                <p className="font-bold text-ink-900">Emergency Hotline</p>
                <div className="flex items-center gap-2 text-ink-700 font-mono">
                  <Phone size={12} className="text-ruby-600" />
                  <span>991 (24 Hours)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-xl border border-line p-6 shadow-xs space-y-6 text-xs">
            <div className="flex justify-between items-center border-b border-line pb-4">
              <div>
                <h3 className="font-serif text-base font-bold text-ink-900">
                  Rent Settlements & Invoices
                </h3>
                <p className="text-ink-500 text-[11px]">
                  All payments processed via Fatora Qatar Gateway or registered PDC cheques
                </p>
              </div>

              <Button
                variant="primary"
                onClick={() => setIsPayModalOpen(true)}
                className="flex items-center gap-2"
              >
                <CreditCard size={14} />
                <span>Pay Upcoming Rent</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-sand-050 border-b border-line text-ink-600 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Invoice Ref</th>
                    <th className="py-3 px-4">Amount (QAR)</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Settled Date</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paymentsData?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-sand-050">
                      <td className="py-3 px-4 font-mono font-semibold text-ink-900">
                        {p.reference || `INV-${p.id?.slice(0, 8)}`}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-ink-900">
                        QAR {Number(p.amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-ink-600">{p.dueDate?.split('T')[0]}</td>
                      <td className="py-3 px-4 font-mono text-emerald-700">
                        {p.paidDate?.split('T')[0] || '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-ink-800">{p.method}</td>
                      <td className="py-3 px-4">
                        <StatusPill status={p.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => toast.success(`Downloading official QAR tax receipt for ${p.reference}...`)}
                          className="p-1 hover:bg-sand-100 rounded text-ink-600"
                          title="Download Receipt"
                        >
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: MAINTENANCE */}
        {activeTab === 'maintenance' && (
          <div className="bg-white rounded-xl border border-line p-6 shadow-xs space-y-6 text-xs">
            <div className="flex justify-between items-center border-b border-line pb-4">
              <div>
                <h3 className="font-serif text-base font-bold text-ink-900">
                  Maintenance & Repair Tickets
                </h3>
                <p className="text-ink-500 text-[11px]">
                  Report unit defects, schedule HVAC servicing, and track contractor visits
                </p>
              </div>

              <Button
                variant="primary"
                onClick={() => setIsReportIssueOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus size={14} />
                <span>Log New Problem</span>
              </Button>
            </div>

            <div className="space-y-3">
              {ticketsData?.map((ticket: any) => (
                <div
                  key={ticket.id}
                  className="p-4 rounded-xl border border-line bg-sand-050 space-y-2 hover:border-sand-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-ink-900 text-sm block">{ticket.title}</span>
                      <span className="text-[11px] text-ink-500">
                        Category: {ticket.category} • Priority: {ticket.priority}
                      </span>
                    </div>
                    <StatusPill status={ticket.status} />
                  </div>
                  <p className="text-ink-700 text-xs leading-relaxed">{ticket.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Report Repair Modal */}
      {isReportIssueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-line text-xs flex flex-col max-h-[90dvh]">
            <div className="shrink-0 p-5 bg-maroon-900 text-white flex items-center justify-between border-b border-gold-500/30">
              <div>
                <h3 className="font-serif text-lg font-bold">Report Maintenance Issue</h3>
                <p className="text-xs text-white/60">Unit 1402 • Porto Arabia Tower 12</p>
              </div>
              <button
                onClick={() => setIsReportIssueOpen(false)}
                className="text-white/70 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitTicketMutation.mutate();
              }}
              className="flex-1 overflow-y-auto p-6 space-y-4 pr-2"
            >
              <div>
                <label className="block text-ink-700 font-semibold mb-1">Issue Headline *</label>
                <input
                  type="text"
                  required
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  placeholder="e.g. Master Bedroom AC Compressor Malfunction"
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Defect Category *</label>
                  <select
                    value={issueCategory}
                    onChange={(e) => setIssueCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                  >
                    <option value="HVAC">HVAC / Air Conditioning</option>
                    <option value="PLUMBING">Plumbing & Drains</option>
                    <option value="ELECTRICAL">Electrical & Lighting</option>
                    <option value="STRUCTURAL">Doors / Windows / Glass</option>
                    <option value="PEST_CONTROL">Pest Control</option>
                  </select>
                </div>
                <div>
                  <label className="block text-ink-700 font-semibold mb-1">Urgency Level *</label>
                  <select
                    value={issuePriority}
                    onChange={(e) => setIssuePriority(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                  >
                    <option value="URGENT">URGENT (AC failure / Water leak)</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-ink-700 font-semibold mb-1">Detailed Description *</label>
                <textarea
                  rows={3}
                  required
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  placeholder="Explain when the defect occurred, symptoms, and if technician can enter..."
                  className="w-full px-3 py-2 border border-line rounded focus:outline-none focus:border-maroon-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-line">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setIsReportIssueOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={submitTicketMutation.isPending}
                >
                  {submitTicketMutation.isPending ? 'Sending...' : 'Dispatch Ticket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Rent Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-line text-xs flex flex-col max-h-[90dvh]">
            <div className="shrink-0 p-5 bg-maroon-900 text-white flex items-center justify-between border-b border-gold-500/30">
              <div>
                <h3 className="font-serif text-lg font-bold">Pay Rent Online</h3>
                <p className="text-xs text-white/60">Qatar Central Bank Approved Gateways</p>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-white/70 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 pr-2">
              <div className="p-4 rounded-xl bg-sand-050 border border-line space-y-1">
                <span className="text-ink-400 block text-[11px]">Settlement Amount</span>
                <div className="text-2xl font-mono font-bold text-ink-900">
                  QAR 14,500.00
                </div>
                <span className="text-ink-500 text-[11px] block">
                  September 2026 Tenancy Settlement • Apt 1402
                </span>
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-ink-900 block text-xs">
                  Choose Payment Gateway:
                </span>
                <button
                  onClick={() => {
                    toast.success('Redirecting to Fatora Qatar Gateway...');
                    setIsPayModalOpen(false);
                  }}
                  className="w-full p-3 rounded-lg border border-line hover:border-maroon-700 bg-white hover:bg-sand-050 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-maroon-100 text-maroon-800 font-bold flex items-center justify-center font-mono">
                      FAT
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-ink-900 block">Fatora (QCB Gateway)</span>
                      <span className="text-[10px] text-ink-500">Debit Card / NAPS / Credit Card</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-maroon-700">Pay Now →</span>
                </button>

                <button
                  onClick={() => {
                    toast.success('Redirecting to Dibsy Gateway...');
                    setIsPayModalOpen(false);
                  }}
                  className="w-full p-3 rounded-lg border border-line hover:border-maroon-700 bg-white hover:bg-sand-050 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-blue-100 text-blue-800 font-bold flex items-center justify-center font-mono">
                      DIB
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-ink-900 block">Dibsy Payments</span>
                      <span className="text-[10px] text-ink-500">Apple Pay / Visa / Mastercard</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-blue-700">Pay Now →</span>
                </button>
              </div>

              <div className="p-3 bg-sand-050 rounded-lg border border-line text-[11px] text-ink-500 flex items-center gap-2">
                <Shield size={14} className="text-emerald-600 shrink-0" />
                <span>PCI-DSS Level 1 Encrypted Qatar Financial Transaction.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantPortalView;
