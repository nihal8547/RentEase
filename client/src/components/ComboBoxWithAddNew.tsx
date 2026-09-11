import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Plus, Check, Loader2 } from 'lucide-react';
import api from '../lib/api';
import type { ListItem } from '../types';

export interface ComboBoxWithAddNewProps {
  listKey?: string;
  listTypeKey?: string;
  value?: string; // Selected ListItem ID or value
  onChange: (selectedId: string, item?: ListItem) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowAddNew?: boolean;
}

export const ComboBoxWithAddNew: React.FC<ComboBoxWithAddNewProps> = ({
  listKey,
  listTypeKey,
  value,
  onChange,
  placeholder = 'Select or type to add...',
  className = '',
  disabled = false,
  allowAddNew = true,
}) => {
  const effectiveKey = listTypeKey || listKey || '';
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 1. Fetch available items for this key
  const { data, isLoading } = useQuery({
    queryKey: ['list-type-items', effectiveKey],
    queryFn: async () => {
      if (!effectiveKey) return [];
      const res = await api.get(`/list-types/${effectiveKey}/items`);
      return (Array.isArray(res.data) ? res.data : res.data?.items) as ListItem[];
    },
    staleTime: 60 * 1000,
    enabled: Boolean(effectiveKey),
  });

  const items = data || [];
  const selectedItem = items.find((i) => i.id === value || i.value === value || i.label === value);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 2. Mutation to add new custom item inline
  const createItemMutation = useMutation({
    mutationFn: async (newLabel: string) => {
      const res = await api.post(`/list-types/${effectiveKey}/items`, {
        value: newLabel.trim(),
        label: newLabel.trim(),
      });
      return res.data as ListItem;
    },
    onSuccess: (newItem) => {
      queryClient.invalidateQueries({ queryKey: ['list-type-items', effectiveKey] });
      onChange(newItem.value || newItem.id, newItem);
      setSearch('');
      setIsOpen(false);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to add custom item.');
    },
  });

  const filteredItems = items.filter(
    (item) =>
      item.isActive &&
      (item.label.toLowerCase().includes(search.toLowerCase()) ||
        (item.labelAr && item.labelAr.toLowerCase().includes(search.toLowerCase())) ||
        item.value.toLowerCase().includes(search.toLowerCase()))
  );

  const exactMatch = items.some(
    (item) => item.label.toLowerCase() === search.trim().toLowerCase()
  );

  const handleAddNew = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!search.trim()) return;
    createItemMutation.mutate(search.trim());
  };

  return (
    <div ref={wrapperRef} className={`relative select-none ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded border transition-colors ${
          isOpen
            ? 'border-maroon-700 ring-1 ring-maroon-700 bg-white'
            : 'border-line bg-white hover:border-sand-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-sand-050' : 'cursor-pointer'}`}
      >
        <span className={selectedItem ? 'text-ink-900 font-medium' : 'text-ink-400 font-normal'}>
          {selectedItem ? (selectedItem.labelAr ? `${selectedItem.label} (${selectedItem.labelAr})` : selectedItem.label) : (value || placeholder)}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-ink-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-line shadow-lg overflow-hidden animate-fade-in">
          {/* Search box */}
          <div className="p-2 border-b border-line bg-sand-050">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or type new..."
              className="w-full px-2.5 py-1 text-xs bg-white border border-line rounded focus:outline-none focus:border-maroon-700 placeholder:text-ink-400"
            />
          </div>

          {/* List items */}
          <div className="max-h-56 overflow-y-auto divide-y divide-line/40 py-1">
            {isLoading ? (
              <div className="flex items-center justify-center p-4 text-xs text-ink-500 gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-600" />
                <span>Loading options...</span>
              </div>
            ) : filteredItems.length === 0 && !search.trim() ? (
              <div className="p-3 text-center text-xs text-ink-400">No options found.</div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.id === value || item.value === value || item.label === value;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onChange(item.value || item.id, item);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-maroon-50 text-maroon-900 font-semibold'
                        : 'hover:bg-sand-050 text-ink-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{item.label}</span>
                      {item.labelAr && (
                        <span className="text-[11px] text-ink-500 font-normal">
                          ({item.labelAr})
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-maroon-700 shrink-0" />}
                  </div>
                );
              })
            )}

            {/* Quick Add Custom Item Option */}
            {allowAddNew && search.trim() && !exactMatch && (
              <div
                onClick={handleAddNew}
                className="flex items-center justify-between px-3 py-2.5 text-xs bg-gold-50/50 hover:bg-gold-100/70 text-maroon-900 cursor-pointer border-t border-gold-200 transition-colors font-semibold"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Plus className="w-3.5 h-3.5 text-gold-700 shrink-0" />
                  <span className="truncate">Add &quot;{search.trim()}&quot;</span>
                </div>
                {createItemMutation.isPending && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-maroon-700 shrink-0" />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComboBoxWithAddNew;
