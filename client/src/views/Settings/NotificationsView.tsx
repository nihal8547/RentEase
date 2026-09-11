import React, { useState } from 'react';
import { Button } from '../../components/ui/button';

const events = [
  { id: 'lease_expiring', label: 'Lease Renewal Reminder', desc: 'Sent when a lease is approaching expiration.' },
  { id: 'payment_overdue', label: 'Payment Overdue', desc: 'Sent when a rent payment misses its due date.' },
  { id: 'maintenance_assigned', label: 'Maintenance Assigned', desc: 'Sent to tenant when a vendor is assigned to their request.' },
  { id: 'user_invited', label: 'New Team Member', desc: 'Sent to new users when invited to the agency.' },
  { id: 'payment_received', label: 'Payment Received', desc: 'Receipt sent to tenant upon successful payment.' },
];

export const NotificationsView: React.FC = () => {
  const [preferences, setPreferences] = useState<Record<string, Record<string, boolean>>>({
    'lease_expiring': { email: true, whatsapp: true, inapp: true },
    'payment_overdue': { email: true, whatsapp: true, inapp: true },
    'maintenance_assigned': { email: true, whatsapp: false, inapp: true },
    'user_invited': { email: true, whatsapp: false, inapp: true },
    'payment_received': { email: true, whatsapp: false, inapp: true },
  });

  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);

  const togglePreference = (eventId: string, channel: string) => {
    setPreferences(prev => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        [channel]: !prev[eventId][channel]
      }
    }));
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-300">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Notification Preferences</h1>
        <p className="text-gray-500 mt-1">Manage how and when you and your tenants receive alerts.</p>
      </header>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">WhatsApp</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">In-App</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{event.label}</div>
                  <div className="text-sm text-gray-500">{event.desc}</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-maroon-600 focus:ring-maroon-500 border-gray-300 rounded"
                    checked={preferences[event.id]?.email || false}
                    onChange={() => togglePreference(event.id, 'email')}
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-maroon-600 focus:ring-maroon-500 border-gray-300 rounded"
                    checked={preferences[event.id]?.whatsapp || false}
                    onChange={() => togglePreference(event.id, 'whatsapp')}
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-maroon-600 focus:ring-maroon-500 border-gray-300 rounded"
                    checked={preferences[event.id]?.inapp || false}
                    onChange={() => togglePreference(event.id, 'inapp')}
                  />
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <Button 
                    variant="ghost"
                    onClick={() => setEditingTemplate(event.id)}
                    className="text-maroon-600 hover:text-maroon-900 px-2 py-1 h-auto"
                  >
                    Edit Template
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingTemplate && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Edit Template: {events.find(e => e.id === editingTemplate)?.label}
              </h3>
              <Button variant="icon" onClick={() => setEditingTemplate(null)}>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Variables</label>
                <div className="flex flex-wrap gap-2">
                  {['{{tenantName}}', '{{unitNumber}}', '{{dueDate}}', '{{amount}}'].map(v => (
                    <span key={v} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message Body</label>
                <textarea
                  rows={4}
                  className="shadow-sm focus:ring-maroon-500 focus:border-maroon-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  defaultValue={`Dear {{tenantName}},\n\nYour rent for unit {{unitNumber}} is due on {{dueDate}}. The amount is QAR {{amount}}.\n\nThank you.`}
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-lg">
              <Button variant="secondary" onClick={() => setEditingTemplate(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setEditingTemplate(null)}>
                Save Template
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
