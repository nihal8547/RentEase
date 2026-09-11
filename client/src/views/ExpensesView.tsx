import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, DollarSign, Calendar } from 'lucide-react';
import api from '../lib/api';
import { DataTable, type Column } from '../components/DataTable';
import { ComboBoxWithAddNew } from '../components/ComboBoxWithAddNew';
import { PermissionGate } from '../components/PermissionGate';
import { Button } from '../components/ui/button';
import type { Expense, Property } from '../types';

export const ExpensesView: React.FC = () => {
  const queryClient = useQueryClient();
  const [propertyFilter, setPropertyFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [propId, setPropId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [incurredDate, setIncurredDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');

  // Fetch Properties for dropdown filter
  const { data: propertiesData } = useQuery<{ data: Property[] }>({
    queryKey: ['properties-dropdown'],
    queryFn: async () => {
      const res = await api.get('/properties?limit=100');
      return res.data;
    },
  });

  // Fetch Expenses
  const { data: expenses, isLoading } = useQuery<any>({
    queryKey: ['expenses', propertyFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (propertyFilter) params.append('propertyId', propertyFilter);
      const res = await api.get(`/expenses?${params.toString()}`);
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
  });

  // Mutation to add expense
  const createMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      return api.post('/expenses', expenseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsAddModalOpen(false);
      setAmount(0);
      setNote('');
      setCategoryId('');
    },
  });

  // Mutation to delete expense
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propId || amount <= 0) return;
    createMutation.mutate({
      propertyId: propId,
      categoryListItemId: categoryId,
      amount,
      incurredOn: incurredDate,
      note,
    });
  };

  const columns: Column<Expense>[] = [
    {
      key: 'property',
      header: 'Property Asset',
      render: (row) => (
        <span className="font-semibold text-[#221E1C]">
          {row.property?.name || 'Property'}
        </span>
      ),
    },
    {
      key: 'note',
      header: 'Description & Reason',
      render: (row) => (
        <div>
          <span className="font-medium text-[#221E1C] block">{row.note || 'General Operating Outlay'}</span>
        </div>
      ),
    },
    {
      key: 'incurredOn',
      header: 'Incurred Date',
      render: (row) => (
        <div className="flex items-center gap-1.5 font-mono text-xs text-[#5B534C]">
          <Calendar className="w-3.5 h-3.5 text-[#8B8279]" />
          <span>{row.incurredOn?.slice(0, 10)}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Expense Outlay',
      render: (row) => (
        <span className="font-mono font-bold text-[#A23B3B]">
          {Number(row.amount).toLocaleString()} QAR
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <PermissionGate module="reports" action="view">
          <Button
            variant="destructive"
            title="Delete Expense"
            onClick={() => deleteMutation.mutate(row.id)}
            className="p-1.5 h-8 w-8 min-w-0"
          >
            <Trash2 size={15} />
          </Button>
        </PermissionGate>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#221E1C] tracking-tight">Property Operating Expenses</h2>
          <p className="text-xs text-[#5B534C] mt-1">
            Track utilities (Kahramaa), facility maintenance outlays, and Baladiya municipal fees.
          </p>
        </div>
        <PermissionGate module="reports" action="view">
          <Button
            variant="primary"
            onClick={() => {
              if (propertiesData?.data?.[0]) setPropId(propertiesData.data[0].id);
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </Button>
        </PermissionGate>
      </div>

      {/* Expenses DataTable */}
      <DataTable
        columns={columns}
        data={expenses || []}
        total={expenses?.length || 0}
        page={page}
        limit={20}
        totalPages={1}
        isLoading={isLoading}
        onPageChange={setPage}
        filters={
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-[#E4DCCB] rounded-[4px] text-[#221E1C] focus:outline-none focus:border-[#6E1731]"
          >
            <option value="">All Properties</option>
            {propertiesData?.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        }
      />

      {/* Modal: Add Expense */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[6px] border border-[#E4DCCB] shadow-2xl max-w-md w-full flex flex-col max-h-[90dvh] overflow-hidden p-6 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4DCCB] shrink-0">
              <h3 className="text-base font-bold text-[#221E1C] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#A23B3B]" />
                Record Operating Expense
              </h3>
              <Button
                variant="icon"
                onClick={() => setIsAddModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 pt-4 text-xs flex-1 overflow-y-auto min-h-0 pr-2">
              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">Target Property Asset</label>
                <select
                  required
                  value={propId}
                  onChange={(e) => setPropId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E4DCCB] rounded-[4px] focus:outline-none focus:border-[#6E1731]"
                >
                  {propertiesData?.data?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.area})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">Expense Category</label>
                <ComboBoxWithAddNew
                  listKey="expense_category"
                  value={categoryId}
                  onChange={(id) => setCategoryId(id)}
                  placeholder="Select or add expense category..."
                />
              </div>

              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">Amount Outlay (QAR)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-[#E4DCCB] rounded-[4px] focus:outline-none focus:border-[#6E1731] font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">Incurred Date</label>
                <input
                  type="date"
                  required
                  value={incurredDate}
                  onChange={(e) => setIncurredDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E4DCCB] rounded-[4px] focus:outline-none focus:border-[#6E1731]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#221E1C] mb-1">Invoice / Expense Note</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Quarterly Kahramaa water & electricity payment"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E4DCCB] rounded-[4px] focus:outline-none focus:border-[#6E1731]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E4DCCB]">
                <Button
                  variant="secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={createMutation.isPending}
                >
                  Save Expense
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesView;
