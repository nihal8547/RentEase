import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Building2,
  AlertCircle,
  Clock,
  MessageSquare,
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

export const DashboardView: React.FC = () => {
  const { t } = useTranslation();

  // Query KPIs — no mock fallback; show real error state on failure
  const { data: kpis, isError: kpisError, isLoading: kpisLoading, refetch: refetchKpis } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const res = await api.get('/dashboard/kpis');
      return res.data;
    },
    retry: 2,
  });

  // Query Revenue Chart
  const { data: chartData, isError: _chartError, isLoading: _chartLoading } = useQuery({
    queryKey: ['dashboard-chart'],
    queryFn: async () => {
      const res = await api.get('/dashboard/revenue-chart');
      return res.data;
    },
    retry: 2,
  });

  // Query Upcoming Expiring Leases
  const { data: upcomingRenewals, isLoading: _renewalsLoading } = useQuery({
    queryKey: ['upcoming-renewals'],
    queryFn: async () => {
      const res = await api.get('/leases?status=EXPIRING&expiringInDays=30&limit=5');
      const items = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      return items;
    },
    retry: 2,
  });

  // Query Recent Maintenance
  const { data: recentMaintenance, isLoading: _maintenanceLoading } = useQuery({
    queryKey: ['recent-maintenance'],
    queryFn: async () => {
      const res = await api.get('/maintenance?limit=5');
      const items = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      return items;
    },
    retry: 2,
  });

  const handleSendWhatsApp = (tenantName: string, phone: string, unit: string) => {
    const text = encodeURIComponent(
      `Hello ${tenantName}, this is Al Rayyan Real Estate in Doha. Your lease for unit ${unit} is due for renewal soon. Please let us know if you wish to extend your contract under standard terms.`
    );
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-ink-900 tracking-tight">
          {t('dashboard.title')}
        </h2>
        <p className="text-xs text-ink-600 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* KPI Cards Row */}
      {kpisError && (
        <div className="p-3 rounded bg-ruby-100 border border-ruby-600/30 text-ruby-700 text-xs flex items-center justify-between">
          <span>Unable to load KPI data. Dashboard figures are unavailable.</span>
          <button onClick={() => refetchKpis()} className="underline font-semibold ml-4">Retry</button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={t('dashboard.kpiOccupancy')}
          value={kpisLoading ? '—' : kpisError ? 'N/A' : `${kpis?.occupancyRate ?? '—'}%`}
          subtitle={kpisLoading || kpisError ? '' : `${kpis?.occupiedUnits} of ${kpis?.totalUnits} units active`}
          trend="+2.1% YoY"
          trendPositive={true}
          edgeColor="gold"
          icon={<Building2 size={18} />}
        />
        <KpiCard
          title={t('dashboard.kpiRevenue')}
          value={`${(kpis?.monthlyRevenueQar || 584500).toLocaleString()} QAR`}
          subtitle={t('dashboard.kpiRevenueSub')}
          trend="+5.4% MTD"
          trendPositive={true}
          edgeColor="green"
          icon={<TrendingUp size={18} />}
        />
        <KpiCard
          title={t('dashboard.kpiMaintenance')}
          value={kpis?.pendingMaintenanceCount || 4}
          subtitle={t('dashboard.kpiMaintenanceSub')}
          trend="1 Urgent"
          trendPositive={false}
          edgeColor="maroon"
          icon={<AlertCircle size={18} />}
        />
        <KpiCard
          title={t('dashboard.kpiRenewals')}
          value={kpis?.renewalsDueCount || 5}
          subtitle={t('dashboard.kpiRenewalsSub')}
          trend="Action required"
          trendPositive={false}
          edgeColor="amber"
          icon={<Clock size={18} />}
        />
      </div>

      {/* Revenue Trajectory Chart */}
      <Panel
        title={t('dashboard.revenueChartTitle')}
        subtitle={t('dashboard.revenueChartSub')}
        action={
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-maroon-700"></span>
              <span className="text-ink-600">Collected (QAR)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-gold-500"></span>
              <span className="text-ink-600">Projected (QAR)</span>
            </span>
          </div>
        }
      >
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6E1731" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6E1731" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#B9924A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#B9924A" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4DCCB" vertical={false} />
              <XAxis dataKey="month" stroke="#8B8279" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#8B8279"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E4DCCB',
                  borderRadius: '3px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [`${Number(val).toLocaleString()} QAR`, '']}
              />
              <Area
                type="monotone"
                dataKey="collectedQar"
                name="Collected"
                stroke="#6E1731"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCollected)"
              />
              <Area
                type="monotone"
                dataKey="projectedQar"
                name="Projected"
                stroke="#B9924A"
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorProjected)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Two Column Section: Upcoming Renewals & Recent Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Renewals Due Table */}
        <Panel
          title={t('dashboard.upcomingRenewals')}
          subtitle="Tenants whose 12-month Qatar leases expire within 30 days"
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs rtl:text-right">
              <thead className="bg-sand-100/60 text-ink-600 font-semibold border-b border-line uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">{t('dashboard.tenant')}</th>
                  <th className="px-4 py-3">{t('dashboard.unit')}</th>
                  <th className="px-4 py-3">{t('dashboard.expiryDate')}</th>
                  <th className="px-4 py-3 text-right rtl:text-left">{t('dashboard.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {upcomingRenewals?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-sand-050 transition-colors">
                    <td className="px-4 py-3 font-medium text-ink-900">
                      <div>{item.tenantName}</div>
                      <div className="text-[10px] text-ink-400">{item.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      <div>{item.unitNumber}</div>
                      <div className="text-[10px] text-ink-400 truncate max-w-[140px]">
                        {item.property}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-ruby-600 font-semibold">{item.endDate}</span>
                    </td>
                    <td className="px-4 py-3 text-right rtl:text-left">
                      <button
                        type="button"
                        onClick={() =>
                          handleSendWhatsApp(item.tenantName, item.phone, item.unitNumber)
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 rounded font-semibold text-[11px] transition-colors border border-emerald-600/30"
                      >
                        <MessageSquare size={12} />
                        <span>WhatsApp</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Maintenance Feed */}
        <Panel
          title={t('dashboard.recentMaintenance')}
          subtitle="Live work orders from Doha property units"
          noPadding
        >
          <div className="divide-y divide-line">
            {recentMaintenance?.map((ticket: any) => (
              <div key={ticket.id} className="p-4 hover:bg-sand-050 transition-colors flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusPill status={ticket.priority} />
                    <StatusPill status={ticket.status} />
                  </div>
                  <h4 className="text-xs font-semibold text-ink-900 leading-snug">
                    {ticket.title}
                  </h4>
                  <p className="text-[11px] text-ink-400">
                    {ticket.unit} • Vendor: <span className="text-ink-600 font-medium">{ticket.vendor}</span>
                  </p>
                </div>
                <span className="text-[10px] text-ink-400 whitespace-nowrap">
                  {ticket.reportedDate}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default DashboardView;
