import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Building2,
  AlertCircle,
  Clock,
  MessageSquare,
  RefreshCw,
  ArrowUpRight,
  Wrench,
  CalendarDays,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../lib/api';
import KpiCard from '../components/ui/KpiCard';
import Panel from '../components/ui/Panel';
import StatusPill from '../components/ui/StatusPill';

/* ── Skeleton shimmer block ── */
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-sand-200 rounded-lg animate-pulse ${className}`} />
);

/* ── KPI skeleton card ── */
const KpiSkeleton: React.FC = () => (
  <div className="bg-white border border-line rounded-xl shadow-sm overflow-hidden">
    <div className="h-[3px] bg-sand-200" />
    <div className="p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-2.5 w-36" />
    </div>
  </div>
);

/* ── Days remaining badge ── */
const DaysLeft: React.FC<{ endDate: string }> = ({ endDate }) => {
  const days = Math.ceil(
    (new Date(endDate).getTime() - Date.now()) / 86_400_000
  );
  const urgent = days <= 7;
  const warning = days <= 21;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold border ${
        urgent
          ? 'bg-ruby-100 text-ruby-700 border-ruby-600/20'
          : warning
          ? 'bg-amber-100 text-amber-700 border-amber-600/20'
          : 'bg-sand-100 text-ink-600 border-line'
      }`}
    >
      <Clock size={10} />
      {days}d
    </span>
  );
};

/* ── Tenant avatar initials ── */
const Avatar: React.FC<{ name: string }> = ({ name }) => {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-maroon-800/10 border border-maroon-700/20 flex items-center justify-center shrink-0">
      <span className="text-2xs font-bold text-maroon-700">{initials}</span>
    </div>
  );
};

/* ── Maintenance priority icon ── */
const PriorityIcon: React.FC<{ priority: string }> = ({ priority }) => {
  const p = priority?.toUpperCase();
  if (p === 'URGENT' || p === 'HIGH')
    return <AlertTriangle size={13} className="text-ruby-600" />;
  if (p === 'MEDIUM')
    return <AlertCircle size={13} className="text-amber-600" />;
  return <CheckCircle2 size={13} className="text-ink-400" />;
};

export const DashboardView: React.FC = () => {
  const { t } = useTranslation();

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const { data: kpis, isError: kpisError, isLoading: kpisLoading, refetch: refetchKpis } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => (await api.get('/dashboard/kpis')).data,
    retry: 2,
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['dashboard-chart'],
    queryFn: async () => (await api.get('/dashboard/revenue-chart')).data,
    retry: 2,
  });

  const { data: upcomingRenewals, isLoading: renewalsLoading } = useQuery({
    queryKey: ['upcoming-renewals'],
    queryFn: async () => {
      const res = await api.get('/leases?status=EXPIRING&expiringInDays=30&limit=5');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    retry: 2,
  });

  const { data: recentMaintenance, isLoading: maintenanceLoading } = useQuery({
    queryKey: ['recent-maintenance'],
    queryFn: async () => {
      const res = await api.get('/maintenance?limit=5');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    retry: 2,
  });

  const handleSendWhatsApp = (tenantName: string, phone: string, unit: string) => {
    const text = encodeURIComponent(
      `Hello ${tenantName}, this is Al Rayyan Real Estate in Doha. Your lease for unit ${unit} is due for renewal soon. Please let us know if you wish to extend your contract under standard terms.`
    );
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  /* Derived chart summary */
  const totalCollected = Array.isArray(chartData)
    ? chartData.reduce((s: number, r: any) => s + (r.collectedQar || 0), 0)
    : null;
  const totalProjected = Array.isArray(chartData)
    ? chartData.reduce((s: number, r: any) => s + (r.projectedQar || 0), 0)
    : null;

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight leading-tight">
            {t('dashboard.title')}
          </h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <CalendarDays size={12} className="text-ink-400" />
            <span className="text-xs text-ink-400">{today}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchKpis()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-600 hover:text-ink-900 bg-white border border-line rounded-lg hover:bg-sand-100 transition-colors shadow-xs"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
          <a
            href="/properties"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-maroon-700 hover:bg-maroon-600 rounded-lg transition-colors shadow-sm"
          >
            <ArrowUpRight size={12} />
            Portfolio
          </a>
        </div>
      </div>

      {/* ── KPI error banner ── */}
      {kpisError && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-ruby-100 border border-ruby-600/20 text-ruby-700 text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} />
            <span>Unable to load KPI data. Dashboard figures are unavailable.</span>
          </div>
          <button onClick={() => refetchKpis()} className="flex items-center gap-1 font-semibold hover:underline ml-4">
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpisLoading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <div className="animate-fade-in stagger-1">
              <KpiCard
                title={t('dashboard.kpiOccupancy')}
                value={kpisError ? 'N/A' : `${kpis?.occupancyRate ?? '—'}%`}
                subtitle={kpisError ? '' : `${kpis?.occupiedUnits} of ${kpis?.totalUnits} units occupied`}
                trend="+2.1% YoY"
                trendPositive
                edgeColor="gold"
                icon={<Building2 size={16} />}
              />
            </div>
            <div className="animate-fade-in stagger-2">
              <KpiCard
                title={t('dashboard.kpiRevenue')}
                value={`${(kpis?.monthlyRevenueQar || 584_500).toLocaleString()} QAR`}
                subtitle={t('dashboard.kpiRevenueSub')}
                trend="+5.4% MTD"
                trendPositive
                edgeColor="green"
                icon={<TrendingUp size={16} />}
              />
            </div>
            <div className="animate-fade-in stagger-3">
              <KpiCard
                title={t('dashboard.kpiMaintenance')}
                value={kpis?.pendingMaintenanceCount ?? 4}
                subtitle={t('dashboard.kpiMaintenanceSub')}
                trend="1 Urgent"
                trendPositive={false}
                edgeColor="maroon"
                icon={<Wrench size={16} />}
              />
            </div>
            <div className="animate-fade-in stagger-4">
              <KpiCard
                title={t('dashboard.kpiRenewals')}
                value={kpis?.renewalsDueCount ?? 5}
                subtitle={t('dashboard.kpiRenewalsSub')}
                trend="Action required"
                trendPositive={false}
                edgeColor="amber"
                icon={<Clock size={16} />}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Revenue chart ── */}
      <div className="animate-fade-in stagger-2">
        <Panel
          title={
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-maroon-700" />
              <span>{t('dashboard.revenueChartTitle')}</span>
            </div>
          }
          subtitle={t('dashboard.revenueChartSub')}
          action={
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-maroon-700" />
                <span className="text-ink-600">Collected</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-gold-500" />
                <span className="text-ink-600">Projected</span>
              </span>
            </div>
          }
        >
          {/* Chart summary strip */}
          {(totalCollected !== null || totalProjected !== null) && !chartLoading && (
            <div className="flex flex-wrap items-center gap-6 mb-5 pb-5 border-b border-line">
              {totalCollected !== null && (
                <div>
                  <p className="text-2xs font-bold uppercase tracking-widest text-ink-400">YTD Collected</p>
                  <p className="text-lg font-bold text-ink-900 mt-0.5 tabular-nums">
                    {totalCollected.toLocaleString()} <span className="text-xs font-medium text-ink-400">QAR</span>
                  </p>
                </div>
              )}
              {totalProjected !== null && (
                <div>
                  <p className="text-2xs font-bold uppercase tracking-widest text-ink-400">YTD Projected</p>
                  <p className="text-lg font-bold text-ink-900 mt-0.5 tabular-nums">
                    {totalProjected.toLocaleString()} <span className="text-xs font-medium text-ink-400">QAR</span>
                  </p>
                </div>
              )}
              {totalCollected !== null && totalProjected !== null && totalProjected > 0 && (
                <div>
                  <p className="text-2xs font-bold uppercase tracking-widest text-ink-400">Collection Rate</p>
                  <p className="text-lg font-bold text-emerald-600 mt-0.5 tabular-nums">
                    {Math.round((totalCollected / totalProjected) * 100)}%
                  </p>
                </div>
              )}
            </div>
          )}

          {chartLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1B4F72" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#1B4F72" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradProjected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00B4D8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00B4D8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CCE0EA" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#B0C4CF"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={6}
                  />
                  <YAxis
                    stroke="#B0C4CF"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #CCE0EA',
                      borderRadius: '10px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                      padding: '10px 14px',
                    }}
                    labelStyle={{ fontWeight: 600, color: '#0D1B2A', marginBottom: 4 }}
                    formatter={(val: any) => [`${Number(val).toLocaleString()} QAR`] as [string]}
                    cursor={{ stroke: '#CCE0EA', strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="collectedQar"
                    name="collectedQar"
                    stroke="#1B4F72"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#gradCollected)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#1B4F72', strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="projectedQar"
                    name="projectedQar"
                    stroke="#00B4D8"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    fillOpacity={1}
                    fill="url(#gradProjected)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#00B4D8', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      {/* ── Bottom two-column section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in stagger-3">

        {/* ── Upcoming renewals ── */}
        <Panel
          title={
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-amber-600" />
              <span>{t('dashboard.upcomingRenewals')}</span>
            </div>
          }
          subtitle="Leases expiring within 30 days"
          noPadding
          action={
            <a href="/leases" className="flex items-center gap-1 text-xs text-maroon-700 hover:underline font-medium">
              View all <ChevronRight size={12} />
            </a>
          }
        >
          {renewalsLoading ? (
            <div className="divide-y divide-line">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3.5 flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          ) : !upcomingRenewals?.length ? (
            <div className="py-12 flex flex-col items-center gap-2 text-ink-400">
              <CheckCircle2 size={28} className="text-emerald-500 opacity-60" />
              <p className="text-xs font-medium">No leases expiring soon</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {upcomingRenewals.map((item: any) => (
                <div
                  key={item.id}
                  className="px-4 py-3.5 hover:bg-sand-050 transition-colors flex items-center gap-3"
                >
                  <Avatar name={item.tenantName} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-ink-900 truncate">{item.tenantName}</p>
                      <DaysLeft endDate={item.endDate} />
                    </div>
                    <p className="text-2xs text-ink-400 mt-0.5 truncate">
                      {item.unitNumber} · {item.property}
                    </p>
                    <p className="text-2xs text-ink-300 mt-0.5 font-mono">{item.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp(item.tenantName, item.phone, item.unitNumber)}
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-600/15 text-emerald-700 rounded-lg font-semibold text-2xs transition-colors border border-emerald-600/20"
                    title="Send WhatsApp"
                  >
                    <MessageSquare size={11} />
                    WA
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* ── Maintenance feed ── */}
        <Panel
          title={
            <div className="flex items-center gap-2">
              <Wrench size={15} className="text-maroon-700" />
              <span>{t('dashboard.recentMaintenance')}</span>
            </div>
          }
          subtitle="Open work orders across all properties"
          noPadding
          action={
            <a href="/maintenance" className="flex items-center gap-1 text-xs text-maroon-700 hover:underline font-medium">
              View all <ChevronRight size={12} />
            </a>
          }
        >
          {maintenanceLoading ? (
            <div className="divide-y divide-line">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-12 rounded-full" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-2.5 w-36" />
                </div>
              ))}
            </div>
          ) : !recentMaintenance?.length ? (
            <div className="py-12 flex flex-col items-center gap-2 text-ink-400">
              <CheckCircle2 size={28} className="text-emerald-500 opacity-60" />
              <p className="text-xs font-medium">No open maintenance tickets</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {recentMaintenance.map((ticket: any) => (
                <div
                  key={ticket.id}
                  className="px-4 py-3.5 hover:bg-sand-050 transition-colors flex items-start gap-3"
                >
                  <div className="mt-0.5 w-7 h-7 rounded-lg bg-sand-100 flex items-center justify-center shrink-0">
                    <PriorityIcon priority={ticket.priority} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusPill status={ticket.priority} />
                      <StatusPill status={ticket.status} />
                    </div>
                    <p className="text-xs font-semibold text-ink-900 leading-snug truncate">
                      {ticket.title}
                    </p>
                    <p className="text-2xs text-ink-400">
                      {ticket.unit}
                      {ticket.vendor && (
                        <> · <span className="text-ink-600 font-medium">{ticket.vendor}</span></>
                      )}
                    </p>
                  </div>
                  <span className="text-2xs text-ink-300 whitespace-nowrap pt-0.5 font-mono">
                    {ticket.reportedDate}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default DashboardView;
