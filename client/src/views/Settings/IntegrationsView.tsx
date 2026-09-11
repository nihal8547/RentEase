import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';

const integrationProviders = [
  { id: 'WHATSAPP_BUSINESS', name: 'WhatsApp Business API', desc: 'Send templates and automated replies to tenants.' },
  { id: 'EMAIL_SMTP', name: 'Custom Email (SMTP)', desc: 'Send emails from your own domain.' },
  { id: 'PAYMENT_FATORA', name: 'Fatora Payment Gateway', desc: 'Process rent and subscription payments in Qatar.' },
  { id: 'PAYMENT_DIBSY', name: 'Dibsy Payment Gateway', desc: 'Process rent and subscription payments via Dibsy.' },
  { id: 'GOOGLE_MAPS', name: 'Google Maps API', desc: 'Enable map views and location picking for properties.' },
  { id: 'AI_ASSISTANT', name: 'AI Assistant', desc: 'Automatically draft or send replies to tenant inquiries.' },
];

export const IntegrationsView: React.FC = () => {
  const { t } = useTranslation();
  const [integrations, setIntegrations] = useState<Record<string, any>>({
    'WHATSAPP_BUSINESS': { status: 'CONNECTED', config: { phoneNumberId: '****8992', businessAccountId: '****1029' } },
    'PAYMENT_FATORA': { status: 'ERROR', config: { merchantId: '****', lastError: 'Invalid API Key' } },
    'AI_ASSISTANT': { status: 'CONNECTED', config: { mode: 'suggest_only' } }
  });

  const [configuring, setConfiguring] = useState<string | null>(null);

  const handleTest = (provider: string) => {
    // Simulate testing connection
    alert(`Testing connection for ${provider}...`);
  };

  const handleDisconnect = (provider: string) => {
    if (confirm('Are you sure you want to disconnect this integration?')) {
      setIntegrations(prev => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-300">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">{t('settings.integrations.title', 'Integrations')}</h1>
        <p className="text-gray-500 mt-1">{t('settings.integrations.subtitle', 'Connect third-party services and APIs to RentEase.')}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrationProviders.map(provider => {
          const integration = integrations[provider.id];
          const isConnected = integration?.status === 'CONNECTED';
          const isError = integration?.status === 'ERROR';

          return (
            <div key={provider.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{provider.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{provider.desc}</p>
                </div>
                {isConnected && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">Connected</span>}
                {isError && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">Error</span>}
                {!integration && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">Not Configured</span>}
              </div>

              <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                {integration ? (
                  <>
                    <Button 
                      variant="ghost"
                      onClick={() => setConfiguring(provider.id)}
                      className="text-sm font-medium text-maroon-600 hover:text-maroon-700 h-auto px-2 py-1"
                    >
                      Update Config
                    </Button>
                    <div className="flex gap-3">
                      <Button 
                        variant="ghost"
                        onClick={() => handleTest(provider.id)}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900 h-auto px-2 py-1"
                      >
                        Test
                      </Button>
                      <Button 
                        variant="ghost"
                        onClick={() => handleDisconnect(provider.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-700 h-auto px-2 py-1"
                      >
                        Disconnect
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button 
                    variant="ghost"
                    onClick={() => setConfiguring(provider.id)}
                    className="text-sm font-medium text-maroon-600 hover:text-maroon-700 w-full text-center h-auto py-2"
                  >
                    Configure
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {configuring && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Configure {integrationProviders.find(p => p.id === configuring)?.name}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Mock fields based on provider */}
              <div>
                <label className="block text-sm font-medium text-gray-700">API Key / Token</label>
                <input type="password" placeholder="sk_test_..." className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-maroon-500 focus:border-maroon-500 sm:text-sm" />
              </div>
              
              {configuring === 'AI_ASSISTANT' && (
                <div className="flex items-start mt-4">
                  <div className="flex items-center h-5">
                    <input id="auto_reply" type="checkbox" className="focus:ring-maroon-500 h-4 w-4 text-maroon-600 border-gray-300 rounded" />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="auto_reply" className="font-medium text-gray-700">Fully Automatic Mode</label>
                    <p className="text-gray-500">If checked, AI will reply directly to tenants without requiring team approval.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-lg">
              <Button variant="secondary" onClick={() => setConfiguring(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => {
                setIntegrations(prev => ({
                  ...prev,
                  [configuring]: { status: 'CONNECTED', config: {} }
                }));
                setConfiguring(null);
              }}>
                Save & Connect
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
