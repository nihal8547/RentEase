import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, MapPin, X, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { DataTable, type Column } from '../components/DataTable';
import { ComboBoxWithAddNew } from '../components/ComboBoxWithAddNew';
import { PermissionGate } from '../components/PermissionGate';
import StatusPill from '../components/ui/StatusPill';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useEscapeKey } from '../hooks/useEscapeKey';
import toast from 'react-hot-toast';
import type { Property, Unit, PaginatedResponse } from '../types';

export const PropertiesView: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [unitToDelete, setUnitToDelete] = useState<any>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [unitSearch, setUnitSearch] = useState('');
  const [unitStatusFilter, setUnitStatusFilter] = useState('');
  const [unitTypeFilter, setUnitTypeFilter] = useState('');
  const [unitPage, setUnitPage] = useState(1);

  // Modals
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [planLimitError, setPlanLimitError] = useState<string | null>(null);

  // Add Unit Form State
  const [unitNumber, setUnitNumber] = useState('');
  const [floor, setFloor] = useState('1');
  const [bedrooms, setBedrooms] = useState('2');
  const [bathrooms, setBathrooms] = useState('2');
  const [sizeSqm, setSizeSqm] = useState('120');
  const [targetPropId, setTargetPropId] = useState('');
  const [unitTypeId, setUnitTypeId] = useState('');

  // Add Property Form State
  const [propName, setPropName] = useState('');
  const [propArea, setPropArea] = useState('The Pearl-Qatar');
  const [propAddress, setPropAddress] = useState('');

  // Keyboard navigation
  useEscapeKey(() => setIsAddUnitOpen(false), isAddUnitOpen);
  useEscapeKey(() => setIsAddPropertyOpen(false), isAddPropertyOpen);

  // 1. Fetch Properties
  const { data: propertiesData } = useQuery<PaginatedResponse<Property>>({
    queryKey: ['properties'],
    queryFn: async () => {
      const res = await api.get('/properties?limit=50');
      return res.data;
    },
  });

  const properties = propertiesData?.data || [];

  // 2. Fetch Units with Server-Side Query Contract
  const { data: unitsData, isLoading: unitsLoading } = useQuery<PaginatedResponse<Unit>>({
    queryKey: ['units', selectedPropertyId, unitSearch, unitStatusFilter, unitTypeFilter, unitPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (unitSearch) params.append('search', unitSearch);
      if (unitStatusFilter) params.append('filter[status]', unitStatusFilter);
      if (unitTypeFilter) params.append('filter[unitTypeId]', unitTypeFilter);
      if (selectedPropertyId !== 'all') params.append('filter[propertyId]', selectedPropertyId);
      params.append('page', String(unitPage));
      params.append('limit', '15');

      const res = await api.get(`/properties/units/all?${params.toString()}`);
      return res.data;
    },
  });

  // 3. Create Unit Mutation (handles 402 unitLimit check)
  const createUnitMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post(`/properties/${payload.propertyId}/units`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setIsAddUnitOpen(false);
      setPlanLimitError(null);
      setUnitNumber('');
      setUnitTypeId('');
    },
    onError: (err: any) => {
      if (err.response?.status === 402) {
        setPlanLimitError(
          err.response.data?.message ||
            'Unit limit reached for your subscription plan. Please upgrade under Settings > Billing to add more units.',
        );
      } else {
        setPlanLimitError(err.response?.data?.message || 'Failed to create unit.');
      }
    },
  });

  // 4. Create Property Mutation
  const createPropMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/properties', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setIsAddPropertyOpen(false);
      setPropName('');
      setPropAddress('');
    },
  });

  const handleUnitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPropId || !unitNumber.trim() || !unitTypeId) return;
    createUnitMutation.mutate({
      propertyId: targetPropId,
      unitNumber: unitNumber.trim(),
      floor: Number(floor),
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      sizeSqm: Number(sizeSqm),
      unitTypeId,
    });
  };

  const handlePropSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propName.trim() || !propAddress.trim()) return;
    createPropMutation.mutate({
      name: propName.trim(),
      area: propArea,
      address: propAddress.trim(),
    });
  };

  const unitColumns: Column<Unit>[] = [
    {
      key: 'unitNumber',
      header: 'Unit Code',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-bold font-mono text-[#221E1C] block">{row.unitNumber}</span>
          <span className="text-[10px] text-[#5B534C]">{row.unitTypeName || 'Apartment'}</span>
        </div>
      ),
    },
    {
      key: 'propertyName',
      header: 'Property Asset & Area',
      render: (row) => (
        <div>
          <span className="font-semibold text-[#221E1C] block">{row.propertyName}</span>
          <span className="text-[10px] text-[#8B8279]">{row.propertyArea}</span>
        </div>
      ),
    },
    {
      key: 'bedrooms',
      header: 'Layout & Dimensions',
      render: (row) => (
        <div>
          <span className="text-xs text-[#221E1C] block">
            {row.bedrooms} Bed • {row.bathrooms} Bath
          </span>
          <span className="text-[10px] font-mono text-[#8B8279]">{row.sizeSqm} m²</span>
        </div>
      ),
    },
    {
      key: 'monthlyRentQar',
      header: 'Monthly Rent',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-[#6E1731]">
          {row.monthlyRentQar ? `${row.monthlyRentQar.toLocaleString()} QAR` : '—'}
        </span>
      ),
    },
    {
      key: 'tenantName',
      header: 'Current Resident',
      render: (row) => (
        <span className={row.tenantName === 'Vacant' ? 'text-[#8B8279] italic' : 'font-medium text-[#221E1C]'}>
          {row.tenantName}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Occupancy Status',
      className: 'text-right',
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: 'id',
      header: 'Actions',
      className: 'text-right w-24',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              toast.success('Edit unit functionality placeholder');
            }}
            title="Edit Unit"
            className="p-1.5 h-8 w-8 min-w-0"
          >
            <span className="sr-only">Edit</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </Button>
          <Button
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              setUnitToDelete(row);
            }}
            title="Delete Unit"
            className="p-1.5 h-8 w-8 min-w-0"
          >
            <span className="sr-only">Delete</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#221E1C] tracking-tight">{t('properties.title')}</h2>
          <p className="text-xs text-[#5B534C] mt-1">{t('properties.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <PermissionGate module="properties" action="create">
            <Button
              variant="secondary"
              onClick={() => setIsAddPropertyOpen(true)}
            >
              <Building2 size={14} className="text-[#B9924A]" />
              <span>{t('properties.addProperty')}</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (properties[0]) setTargetPropId(properties[0].id);
                setPlanLimitError(null);
                setIsAddUnitOpen(true);
              }}
            >
              <Plus size={14} />
              <span>{t('properties.addUnit')}</span>
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Property Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {properties.map((prop) => {
          const isSelected = selectedPropertyId === prop.id;
          const total = prop.totalUnits || 0;
          const occ = prop.occupiedUnits || 0;
          const occPct = total > 0 ? Math.round((occ / total) * 100) : 0;
          return (
            <div
              key={prop.id}
              onClick={() => setSelectedPropertyId(isSelected ? 'all' : prop.id)}
              className={`cursor-pointer bg-white border rounded-[6px] p-4 shadow-xs transition-all duration-150 ${
                isSelected
                  ? 'border-[#6E1731] ring-2 ring-[#6E1731]/20'
                  : 'border-[#E4DCCB] hover:border-[#B9924A]/70'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#221E1C]">{prop.name}</h3>
                  <p className="flex items-center gap-1 text-[11px] text-[#5B534C] mt-0.5">
                    <MapPin size={11} className="text-[#B9924A]" />
                    <span>{prop.area}</span>
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F4EFE4] text-[#5B534C] border border-[#E4DCCB]">
                  Doha Asset
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#E4DCCB] text-center">
                <div>
                  <div className="text-[10px] text-[#8B8279] uppercase">Units</div>
                  <div className="text-xs font-bold font-mono text-[#221E1C]">{total}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8B8279] uppercase">Occupancy</div>
                  <div className="text-xs font-bold font-mono text-emerald-700">{occPct}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8B8279] uppercase">Rent Roll</div>
                  <div className="text-xs font-bold font-mono text-[#6E1731]">
                    {Math.round((prop.monthlyRollQar || 0) / 1000)}k QAR
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Unit Inventory List via Server DataTable */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#221E1C]">
            {selectedPropertyId === 'all'
              ? 'Units Inventory'
              : `Units in ${properties.find((p) => p.id === selectedPropertyId)?.name}`}
          </h3>
          {selectedPropertyId !== 'all' && (
            <Button
              variant="ghost"
              onClick={() => setSelectedPropertyId('all')}
            >
              Show all properties
            </Button>
          )}
        </div>

        <DataTable
          columns={unitColumns}
          data={unitsData?.data || []}
          total={unitsData?.total || 0}
          page={unitsData?.page || 1}
          limit={unitsData?.limit || 15}
          totalPages={unitsData?.totalPages || 1}
          isLoading={unitsLoading}
          search={unitSearch}
          isFiltered={Boolean(unitStatusFilter || unitTypeFilter || selectedPropertyId !== 'all')}
          onSearchChange={(val) => {
            setUnitSearch(val);
            setUnitPage(1);
          }}
          searchPlaceholder="Search unit number or property..."
          onPageChange={setUnitPage}
          emptyState={
            <div className="flex flex-col items-center justify-center space-y-3 py-6">
              <div className="w-12 h-12 rounded-full bg-[#F4EFE4] flex items-center justify-center text-[#B9924A]">
                <Building2 size={24} />
              </div>
              <div className="text-center">
                <h4 className="text-sm font-semibold text-[#221E1C]">No Units Registered</h4>
                <p className="text-xs text-[#5B534C] mt-1 max-w-sm mx-auto">
                  You haven't registered any units yet. Add your first unit to start managing leases and tenants.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  if (properties[0]) setTargetPropId(properties[0].id);
                  setPlanLimitError(null);
                  setIsAddUnitOpen(true);
                }}
                className="mt-2"
              >
                <Plus size={14} />
                <span>Add First Unit</span>
              </Button>
            </div>
          }
          filters={
            <div className="flex items-center gap-2">
              <select
                value={unitStatusFilter}
                onChange={(e) => {
                  setUnitStatusFilter(e.target.value);
                  setUnitPage(1);
                }}
                className="px-2.5 py-1.5 text-xs bg-white border border-[#E4DCCB] rounded-[4px] text-[#221E1C] focus:outline-none focus:border-[#6E1731]"
              >
                <option value="">All Statuses</option>
                <option value="VACANT">Vacant</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
              <div className="w-36">
                <ComboBoxWithAddNew
                  listKey="unit_types"
                  value={unitTypeFilter}
                  onChange={(val) => {
                    setUnitTypeFilter(val);
                    setUnitPage(1);
                  }}
                  placeholder="Unit Type..."
                  allowAddNew={false}
                />
              </div>
            </div>
          }
        />
      </div>

      {/* Modal: Register New Unit */}
      {isAddUnitOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[6px] border border-[#E4DCCB] shadow-2xl max-w-md w-full flex flex-col max-h-[90dvh] overflow-hidden p-6 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4DCCB] shrink-0">
              <h3 className="text-base font-bold text-[#221E1C]">Register New Unit</h3>
              <Button variant="icon" onClick={() => setIsAddUnitOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {planLimitError && (
              <div className="mt-3 p-3 rounded-[4px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <p className="font-semibold">Subscription Plan Limit</p>
                  <p className="mt-0.5">{planLimitError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleUnitSubmit} className="space-y-3.5 pt-4 text-xs flex-1 overflow-y-auto min-h-0 pr-2">
              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">Target Property Asset</label>
                <select
                  required
                  value={targetPropId}
                  onChange={(e) => setTargetPropId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E4DCCB] rounded-[4px] focus:outline-none focus:border-[#6E1731]"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.area})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#221E1C] mb-1">Unit Number / Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apt 1405"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E4DCCB] rounded-[4px] focus:outline-none focus:border-[#6E1731]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#221E1C] mb-1">Floor Level</label>
                  <input
                    type="number"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E4DCCB] rounded-[4px] focus:outline-none focus:border-[#6E1731]"
                  />
                </div>
              </div>

              {/* Dynamic List ComboBox for Unit Type */}
              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">Unit Classification / Type</label>
                <ComboBoxWithAddNew
                  listKey="unit_type"
                  value={unitTypeId}
                  onChange={(id) => setUnitTypeId(id)}
                  placeholder="Select or type new unit type..."
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-[#221E1C] mb-1">Bedrooms</label>
                  <input
                    type="number"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-[#E4DCCB] rounded-[4px] focus:outline-none focus:border-[#6E1731]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#221E1C] mb-1">Bathrooms</label>
                  <input
                    type="number"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-[#E4DCCB] rounded-[4px] focus:outline-none focus:border-[#6E1731]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#221E1C] mb-1">Size (m²)</label>
                  <input
                    type="number"
                    value={sizeSqm}
                    onChange={(e) => setSizeSqm(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-[#E4DCCB] rounded-[4px] focus:outline-none focus:border-[#6E1731]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E4DCCB]">
                <Button variant="secondary" onClick={() => setIsAddUnitOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={createUnitMutation.isPending}
                >
                  Register Unit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register New Property */}
      {isAddPropertyOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[6px] border border-[#E4DCCB] shadow-2xl max-w-md w-full flex flex-col max-h-[90dvh] overflow-hidden p-6 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4DCCB] shrink-0">
              <h3 className="text-base font-bold text-[#221E1C]">Register New Doha Property</h3>
              <Button variant="icon" onClick={() => setIsAddPropertyOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handlePropSubmit} className="space-y-3.5 pt-4 text-xs flex-1 overflow-y-auto min-h-0 pr-2">
              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">Property Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marina Promenade Residence"
                  value={propName}
                  onChange={(e) => setPropName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E4DCCB] rounded-[4px] focus:outline-none focus:border-[#6E1731]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">Qatar Zone / District</label>
                <select
                  value={propArea}
                  onChange={(e) => setPropArea(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E4DCCB] rounded-[4px] focus:outline-none focus:border-[#6E1731]"
                >
                  <option value="The Pearl-Qatar">The Pearl-Qatar (Porto Arabia / Qanat Quartier)</option>
                  <option value="Lusail Marina">Lusail Marina & Fox Hills</option>
                  <option value="West Bay">West Bay Diplomatic</option>
                  <option value="Msheireb Downtown">Msheireb Downtown Doha</option>
                  <option value="Al Sadd">Al Sadd</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Building 12, Marina Promenade, Lusail"
                  value={propAddress}
                  onChange={(e) => setPropAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E4DCCB] rounded-[4px] focus:outline-none focus:border-[#6E1731]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E4DCCB]">
                <Button variant="secondary" onClick={() => setIsAddPropertyOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={createPropMutation.isPending}
                >
                  Save Property
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!unitToDelete}
        onClose={() => setUnitToDelete(null)}
        onConfirm={() => {
          if (unitToDelete) {
            toast.success('Delete unit functionality placeholder');
          }
        }}
        title="Delete Unit"
        message="Are you sure you want to delete this unit? This action cannot be undone."
        confirmText="Delete Unit"
        isDestructive={true}
      />
    </div>
  );
};

export default PropertiesView;
