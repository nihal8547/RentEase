import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';

// Mock data to visualize the design based on Update1.md
const mockPlan = {
  name: 'Agency',
  priceQar: 499,
  unitLimit: 500,
  unitUsage: 342,
  billingStatus: 'ACTIVE',
  currentPeriodEnd: '2026-10-01T00:00:00Z',
  cancelAtPeriodEnd: false,
};

const mockInvoices = [
  { id: 'inv_1', amountQar: 499, status: 'PAID', issuedAt: '2026-09-01T00:00:00Z', gateway: 'fatora' },
  { id: 'inv_2', amountQar: 499, status: 'PAID', issuedAt: '2026-08-01T00:00:00Z', gateway: 'fatora' },
];

export const BillingView: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'invoices'>('overview');

  const progressPercent = (mockPlan.unitUsage / mockPlan.unitLimit) * 100;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-300">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">{t('settings.billing.title', 'Billing & Subscription')}</h1>
        <p className="text-gray-500 mt-1">{t('settings.billing.subtitle', 'Manage your agency\'s subscription plan, payment methods, and invoices.')}</p>
      </header>

      {mockPlan.billingStatus === 'PAST_DUE' && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Payment Past Due</h3>
              <p className="text-sm text-red-700 mt-1">
                Your last payment failed. Please update your payment method to avoid service suspension.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'overview' ? 'border-maroon-600 text-maroon-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'plans' ? 'border-maroon-600 text-maroon-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Plans
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'invoices' ? 'border-maroon-600 text-maroon-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Invoices
        </button>
      </nav>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Plan Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Current Plan</h3>
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-3xl font-bold text-gray-900">{mockPlan.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  QAR {mockPlan.priceQar} / month
                </p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${mockPlan.billingStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {mockPlan.billingStatus}
              </span>
            </div>

            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-gray-700">Unit Usage</span>
              <span className="text-gray-500">{mockPlan.unitUsage} / {mockPlan.unitLimit} units</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
              <div 
                className={`h-2.5 rounded-full ${progressPercent > 90 ? 'bg-red-500' : 'bg-maroon-600'}`} 
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              ></div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setActiveTab('plans')} variant="primary">
                Upgrade Plan
              </Button>
              <Button variant="secondary">
                Cancel Subscription
              </Button>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Payment Method</h3>
              <Button variant="ghost" className="text-sm font-medium text-maroon-600 hover:text-maroon-700 px-2 py-1 h-auto">Add New</Button>
            </div>
            
            <div className="border rounded-md p-4 flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-2 rounded">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Visa ending in 4242</p>
                  <p className="text-xs text-gray-500">Expires 12/28</p>
                </div>
              </div>
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">Default</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(invoice.issuedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    QAR {invoice.amountQar.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button variant="ghost" className="text-maroon-600 hover:text-maroon-900 px-2 py-1 h-auto">Download PDF</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mock Plans Comparison */}
          {[
            { name: 'Starter', price: 199, units: 50 },
            { name: 'Agency', price: 499, units: 500 },
            { name: 'Enterprise', price: 999, units: 2000 }
          ].map((plan) => (
            <div key={plan.name} className={`bg-white rounded-lg shadow-sm border p-6 flex flex-col ${plan.name === mockPlan.name ? 'border-maroon-500 ring-1 ring-maroon-500' : 'border-gray-200'}`}>
              {plan.name === mockPlan.name && (
                <span className="text-xs font-medium text-maroon-600 mb-2 uppercase tracking-wide">Current Plan</span>
              )}
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              <p className="mt-4 flex items-baseline text-3xl font-extrabold text-gray-900">
                QAR {plan.price}
                <span className="ml-1 text-xl font-medium text-gray-500">/mo</span>
              </p>
              <ul className="mt-6 space-y-4 flex-1">
                <li className="flex">
                  <svg className="flex-shrink-0 h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  <span className="ml-3 text-sm text-gray-500">Up to {plan.units} units</span>
                </li>
                <li className="flex">
                  <svg className="flex-shrink-0 h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  <span className="ml-3 text-sm text-gray-500">Unlimited Users</span>
                </li>
              </ul>
              <Button 
                variant={plan.name === mockPlan.name ? 'secondary' : 'primary'}
                disabled={plan.name === mockPlan.name}
                className="mt-8 w-full"
              >
                {plan.name === mockPlan.name ? 'Current' : 'Select Plan'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
