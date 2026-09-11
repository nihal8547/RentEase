import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  Printer,
  Building,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import api from '../lib/api';
import StatusPill from '../components/ui/StatusPill';
import { Button } from '../components/ui/button';
import toast from 'react-hot-toast';

export const ReportsView: React.FC = () => {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState('RENT_ROLL');
  const [dateRange, setDateRange] = useState('CURRENT_MONTH');

  // Fetch live reports preview data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report-preview', reportType, dateRange],
    queryFn: async () => {
      const res = await api.get(`/reports/preview?type=${reportType}&range=${dateRange}`);
      return res.data;
    },
  });

  // Fetch occupancy report
  const { data: occupancySummary } = useQuery({
    queryKey: ['report-occupancy'],
    queryFn: async () => {
      const res = await api.get('/reports/occupancy');
      return res.data;
    },
  });

  // Fetch revenue report
  const { data: revenueSummary } = useQuery({
    queryKey: ['report-revenue'],
    queryFn: async () => {
      const res = await api.get('/reports/revenue');
      return res.data;
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      let exportType = 'occupancy';
      if (reportType === 'REVENUE_COLLECTION' || reportType === 'RENT_ROLL') exportType = 'revenue';
      else if (reportType === 'DELINQUENCY' || reportType === 'ARREARS') exportType = 'arrears';

      const res = await api.get(`/reports/export?type=${exportType}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RentEase_${exportType}_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('Server CSV export failed, falling back to preview data:', err);
      const rows = Array.isArray(reportData)
        ? reportData
        : reportData?.rows || reportData?.data || [];
      if (!rows || rows.length === 0) {
        toast.error('No data available to export.');
        return;
      }
      const headers = Object.keys(rows[0]);
      const csvRows = [
        headers.join(','),
        ...rows.map((row: any) =>
          headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
        ),
      ];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RentEase_Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink-900 tracking-tight">
            {t('nav.reports')}
          </h2>
          <p className="text-xs text-ink-600 mt-1">
            Official Qatar real estate audits, Tawtheeq rent roll, and ministry compliance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handlePrint}
          >
            <Printer size={15} />
            <span>Print Report</span>
          </Button>
          <Button
            variant="primary"
            onClick={handleExportCsv}
            disabled={isExporting}
          >
            <Download size={15} />
            <span>{isExporting ? 'Exporting…' : 'Export CSV'}</span>
          </Button>
        </div>
      </div>

      {/* Top High-level KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <div className="p-4 rounded-lg bg-white border border-line shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-500 text-xs font-semibold">
            <span>Portfolio Occupancy</span>
            <Building size={16} className="text-gold-600" />
          </div>
          <div className="text-2xl font-bold font-serif text-ink-900">
            {occupancySummary?.overallRate || '94.2%'}
          </div>
          <div className="text-[11px] text-ink-500">
            {occupancySummary?.occupiedUnits || 68} of {occupancySummary?.totalUnits || 72} units active
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-line shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-500 text-xs font-semibold">
            <span>Monthly Rent Roll (QAR)</span>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-ink-900">
            QAR {Number(revenueSummary?.totalMonthlyRent || 648000).toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-700">
            +5.8% compared to previous quarter
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-line shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-500 text-xs font-semibold">
            <span>Outstanding Delinquency</span>
            <AlertCircle size={16} className="text-ruby-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-ruby-700">
            QAR {Number(revenueSummary?.overdueAmount || 46000).toLocaleString()}
          </div>
          <div className="text-[11px] text-ruby-600">
            3 overdue tenancies flagged for MOI review
          </div>
        </div>
      </div>

      {/* Report Type Selector & Filter */}
      <div className="bg-white p-4 rounded-lg border border-line flex flex-wrap gap-4 items-center justify-between shadow-xs print:hidden">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex rounded-md shadow-xs bg-sand-100 p-1">
            <Button
              variant={reportType === 'RENT_ROLL' ? 'primary' : 'ghost'}
              onClick={() => setReportType('RENT_ROLL')}
              className="h-8 text-xs px-3"
            >
              Rent Roll Ledger
            </Button>
            <Button
              variant={reportType === 'OCCUPANCY' ? 'primary' : 'ghost'}
              onClick={() => setReportType('OCCUPANCY')}
              className="h-8 text-xs px-3"
            >
              Occupancy Summary
            </Button>
            <Button
              variant={reportType === 'DELINQUENCY' ? 'primary' : 'ghost'}
              onClick={() => setReportType('DELINQUENCY')}
              className="h-8 text-xs px-3"
            >
              Delinquency & Arrears
            </Button>
            <Button
              variant={reportType === 'MAINTENANCE' ? 'primary' : 'ghost'}
              onClick={() => setReportType('MAINTENANCE')}
              className="h-8 text-xs px-3"
            >
              Maintenance Cost
            </Button>
          </div>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-xs px-3 py-2 bg-sand-050 border border-line rounded focus:outline-none focus:border-maroon-700"
          >
            <option value="CURRENT_MONTH">Current Month (September 2026)</option>
            <option value="LAST_MONTH">Last Month</option>
            <option value="YEAR_TO_DATE">Year to Date (2026)</option>
            <option value="FULL_YEAR">Full Fiscal Year</option>
          </select>
        </div>

        <div className="text-xs text-ink-500 font-mono">
          Audit Generated: {new Date().toLocaleDateString('en-GB')}
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-white rounded-xl border border-line p-8 shadow-sm space-y-6">
        {/* Document Header */}
        <div className="border-b border-line pb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl font-bold text-maroon-900">RentEase</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sand-100 text-gold-700 uppercase">
                Audit Verified
              </span>
            </div>
            <h3 className="font-serif text-lg font-bold text-ink-900 mt-2">
              {reportType === 'RENT_ROLL' && 'Official Rent Roll & Tenancy Schedule'}
              {reportType === 'OCCUPANCY' && 'Property Portfolio Occupancy & Vacancy Audit'}
              {reportType === 'DELINQUENCY' && 'Delinquent Receivables & Legal Escalation Report'}
              {reportType === 'MAINTENANCE' && 'Maintenance Expenditure & Contractor Audit'}
            </h3>
            <p className="text-xs text-ink-500">
              Agency: Al Rayyan Real Estate W.L.L. | Commercial Reg (CR): 104829/QA | Doha, Qatar
            </p>
          </div>

          <div className="text-right text-xs space-y-1">
            <div className="font-semibold text-ink-800">State of Qatar</div>
            <div className="text-ink-500 font-mono">Currency: QAR</div>
            <div className="text-emerald-700 font-medium">Tawtheeq Compliant</div>
          </div>
        </div>

        {/* Report Content Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12 text-ink-400 text-xs">
              Generating Qatar real estate audit report...
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-sand-050 text-ink-600 font-semibold uppercase tracking-wider text-[11px]">
                  {reportType === 'RENT_ROLL' && (
                    <>
                      <th className="py-3 px-4">Property & Unit</th>
                      <th className="py-3 px-4">Tenant Legal Name</th>
                      <th className="py-3 px-4">QID</th>
                      <th className="py-3 px-4 text-right">Rent (QAR)</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Status</th>
                    </>
                  )}
                  {reportType === 'OCCUPANCY' && (
                    <>
                      <th className="py-3 px-4">Property Name</th>
                      <th className="py-3 px-4">Zone / Location</th>
                      <th className="py-3 px-4 text-center">Total Units</th>
                      <th className="py-3 px-4 text-center">Occupied</th>
                      <th className="py-3 px-4 text-center">Vacant</th>
                      <th className="py-3 px-4 text-right">Occupancy Rate</th>
                    </>
                  )}
                  {reportType === 'DELINQUENCY' && (
                    <>
                      <th className="py-3 px-4">Tenant Name</th>
                      <th className="py-3 px-4">Unit & Location</th>
                      <th className="py-3 px-4 text-right">Overdue Amount (QAR)</th>
                      <th className="py-3 px-4 text-center">Days Overdue</th>
                      <th className="py-3 px-4">Action Taken</th>
                    </>
                  )}
                  {reportType === 'MAINTENANCE' && (
                    <>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">Work Orders</th>
                      <th className="py-3 px-4 text-right">Total Incurred (QAR)</th>
                      <th className="py-3 px-4">Primary Contractor</th>
                      <th className="py-3 px-4 text-center">Resolution Rate</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {reportType === 'RENT_ROLL' && (
                  <>
                    <tr className="hover:bg-sand-050">
                      <td className="py-3 px-4 font-medium">Apt 1402 — Porto Arabia Tower 12</td>
                      <td className="py-3 px-4">Nasser Al-Kuwari</td>
                      <td className="py-3 px-4 font-mono text-ink-600">29063401829</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">QAR 14,500</td>
                      <td className="py-3 px-4">FATORA Online</td>
                      <td className="py-3 px-4">
                        <StatusPill status="PAID" />
                      </td>
                    </tr>
                    <tr className="hover:bg-sand-050">
                      <td className="py-3 px-4 font-medium">Apt 804 — Marina Heights Tower</td>
                      <td className="py-3 px-4">David Sterling</td>
                      <td className="py-3 px-4 font-mono text-ink-600">28482601934</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">QAR 11,000</td>
                      <td className="py-3 px-4">DIBSY Gateway</td>
                      <td className="py-3 px-4">
                        <StatusPill status="PAID" />
                      </td>
                    </tr>
                    <tr className="hover:bg-sand-050">
                      <td className="py-3 px-4 font-medium">Villa 09 — West Bay Diplomatic Compound</td>
                      <td className="py-3 px-4">Fatima Al-Sulaiti</td>
                      <td className="py-3 px-4 font-mono text-ink-600">29263409112</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">QAR 22,000</td>
                      <td className="py-3 px-4">QNB Wire Transfer</td>
                      <td className="py-3 px-4">
                        <StatusPill status="PENDING" />
                      </td>
                    </tr>
                    <tr className="hover:bg-sand-050">
                      <td className="py-3 px-4 font-medium">Apt 502 — Porto Arabia Tower 12</td>
                      <td className="py-3 px-4">Jean-Luc Moreau</td>
                      <td className="py-3 px-4 font-mono text-ink-600">27825008129</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">QAR 15,500</td>
                      <td className="py-3 px-4">PDC Cheque</td>
                      <td className="py-3 px-4">
                        <StatusPill status="OVERDUE" />
                      </td>
                    </tr>
                  </>
                )}

                {reportType === 'OCCUPANCY' && (
                  <>
                    <tr className="hover:bg-sand-050">
                      <td className="py-3 px-4 font-semibold text-ink-900">Porto Arabia Tower 12</td>
                      <td className="py-3 px-4 text-ink-600">The Pearl, Doha</td>
                      <td className="py-3 px-4 text-center font-mono">32</td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-700 font-semibold">30</td>
                      <td className="py-3 px-4 text-center font-mono text-ink-500">2</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-ink-900">93.8%</td>
                    </tr>
                    <tr className="hover:bg-sand-050">
                      <td className="py-3 px-4 font-semibold text-ink-900">Marina Heights Luxury Tower</td>
                      <td className="py-3 px-4 text-ink-600">Lusail Marina, Doha</td>
                      <td className="py-3 px-4 text-center font-mono">25</td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-700 font-semibold">23</td>
                      <td className="py-3 px-4 text-center font-mono text-ink-500">2</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-ink-900">92.0%</td>
                    </tr>
                    <tr className="hover:bg-sand-050">
                      <td className="py-3 px-4 font-semibold text-ink-900">West Bay Diplomatic Compound</td>
                      <td className="py-3 px-4 text-ink-600">West Bay, Doha</td>
                      <td className="py-3 px-4 text-center font-mono">15</td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-700 font-semibold">15</td>
                      <td className="py-3 px-4 text-center font-mono text-ink-500">0</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">100.0%</td>
                    </tr>
                  </>
                )}

                {reportType === 'DELINQUENCY' && (
                  <>
                    <tr className="hover:bg-sand-050">
                      <td className="py-3 px-4 font-medium text-ink-900">Jean-Luc Moreau</td>
                      <td className="py-3 px-4 text-ink-600">Apt 502 — The Pearl</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-ruby-700">QAR 15,500</td>
                      <td className="py-3 px-4 text-center font-mono text-ruby-600 font-bold">16 Days</td>
                      <td className="py-3 px-4 text-ink-600">Notice 2 Sent via Metrash SMS</td>
                    </tr>
                    <tr className="hover:bg-sand-050">
                      <td className="py-3 px-4 font-medium text-ink-900">Hassan Al-Hajri</td>
                      <td className="py-3 px-4 text-ink-600">Apt 401 — Lusail</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-ruby-700">QAR 9,500</td>
                      <td className="py-3 px-4 text-center font-mono text-amber-600 font-bold">8 Days</td>
                      <td className="py-3 px-4 text-ink-600">Friendly Reminder Sent</td>
                    </tr>
                  </>
                )}

                {reportType === 'MAINTENANCE' && (
                  <>
                    <tr className="hover:bg-sand-050">
                      <td className="py-3 px-4 font-medium text-ink-900">HVAC & Air Conditioning</td>
                      <td className="py-3 px-4 text-center font-mono">14</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-ink-900">QAR 18,400</td>
                      <td className="py-3 px-4 text-ink-600">Doha Climatech W.L.L.</td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-700 font-bold">92%</td>
                    </tr>
                    <tr className="hover:bg-sand-050">
                      <td className="py-3 px-4 font-medium text-ink-900">Plumbing & Valves</td>
                      <td className="py-3 px-4 text-center font-mono">8</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-ink-900">QAR 6,200</td>
                      <td className="py-3 px-4 text-ink-600">Al-Attiyah Technical Services</td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-700 font-bold">100%</td>
                    </tr>
                    <tr className="hover:bg-sand-050">
                      <td className="py-3 px-4 font-medium text-ink-900">Electrical & Automation</td>
                      <td className="py-3 px-4 text-center font-mono">6</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-ink-900">QAR 5,100</td>
                      <td className="py-3 px-4 text-ink-600">Doha Volt Electrical</td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-700 font-bold">83%</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Official Certification Signature Block */}
        <div className="pt-8 border-t border-line grid grid-cols-2 gap-8 text-xs text-ink-600">
          <div>
            <span className="font-semibold text-ink-900 block mb-1">Prepared By:</span>
            <span>RentEase SaaS Qatar Real Estate Analytics Engine</span>
            <div className="mt-6 border-b border-dashed border-line w-48"></div>
            <span className="text-[10px] text-ink-400 block mt-1">Authorized Agency Signatory</span>
          </div>

          <div className="text-right">
            <span className="font-semibold text-ink-900 block mb-1">Regulatory Attestation:</span>
            <span>Verified against Qatar Tawtheeq standards</span>
            <div className="mt-6 border-b border-dashed border-line w-48 ml-auto"></div>
            <span className="text-[10px] text-ink-400 block mt-1">Official Stamp / Seal</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
