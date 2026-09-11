import React from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';

export interface Column<T> {
  key?: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => React.ReactNode;
  accessor?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  isLoading?: boolean;
  search?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  headerActions?: React.ReactNode;
  sort?: string;
  onSortChange?: (sort: string) => void;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  emptyState?: React.ReactNode;
  isFiltered?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  total,
  page,
  limit,
  totalPages,
  isLoading = false,
  search,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters,
  headerActions,
  sort,
  onSortChange,
  onPageChange,
  onLimitChange,
  onRowClick,
  emptyMessage = 'No records found matching your filters.',
  emptyState,
  isFiltered,
}: DataTableProps<T>) {
  const [sortField, sortDirection] = (sort || '').split(':');
  const computedTotalPages = totalPages ?? Math.max(1, Math.ceil(total / (limit || 10)));

  const handleSort = (key?: string) => {
    if (!onSortChange || !key) return;
    if (sortField === key) {
      onSortChange(sortDirection === 'asc' ? `${key}:desc` : `${key}:asc`);
    } else {
      onSortChange(`${key}:asc`);
    }
  };

  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Top Filter and Search Bar */}
      {(onSearchChange || filters || headerActions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-line shadow-xs">
          <div className="flex flex-1 items-center gap-3 min-w-[280px]">
            {onSearchChange && (
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 rtl:left-auto rtl:right-3 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-sand-050 border border-line rounded focus:outline-none focus:border-maroon-700 rtl:pl-3 rtl:pr-9 transition-colors placeholder:text-ink-400 font-sans"
                />
              </div>
            )}
            {filters}
          </div>

          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-line overflow-hidden shadow-xs relative">
        {isLoading && data.length > 0 && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-maroon-800 bg-white px-4 py-2 rounded-full shadow-md border border-line">
              <Loader2 className="w-4 h-4 animate-spin text-gold-600" />
              <span>Updating results...</span>
            </div>
          </div>
        )}

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-line bg-sand-050 text-ink-600 font-semibold uppercase tracking-wider text-[11px]">
              {columns.map((col, idx) => {
                const colKey = col.key || `col-${idx}`;
                const isSorted = col.key && sortField === col.key;
                return (
                  <th
                    key={colKey}
                    scope="col"
                    className={`py-3 px-4 ${col.className || ''} ${
                      col.sortable ? 'cursor-pointer select-none hover:text-ink-900' : ''
                    }`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-ink-400">
                          {isSorted ? (
                            sortDirection === 'desc' ? (
                              <ArrowDown className="w-3.5 h-3.5 text-maroon-700" />
                            ) : (
                              <ArrowUp className="w-3.5 h-3.5 text-maroon-700" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-ink-900">
            {data.length === 0 && isLoading ? (
              Array.from({ length: Math.min(limit || 5, 10) }).map((_, idx) => (
                <tr key={`skeleton-${idx}`}>
                  {columns.map((col, colIdx) => (
                    <td key={`sk-cell-${colIdx}`} className={`py-3 px-4 ${col.className || ''}`}>
                      <div className="flex flex-col gap-1.5">
                        <div className="h-3.5 bg-sand-200 animate-pulse rounded w-3/4"></div>
                        {colIdx === 0 && <div className="h-2 bg-sand-100 animate-pulse rounded w-1/2"></div>}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  {(search || isFiltered) ? (
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-sand-100 flex items-center justify-center text-ink-400">
                        <Search className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-ink-900">No matching results</h4>
                        <p className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
                          We couldn't find any records matching your current search or filters. Try adjusting them.
                        </p>
                      </div>
                    </div>
                  ) : emptyState ? (
                    emptyState
                  ) : (
                    <span className="text-xs text-ink-500">{emptyMessage}</span>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors hover:bg-sand-050 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col, colIdx) => (
                    <td key={col.key || `cell-${colIdx}`} className={`py-3 px-4 ${col.className || ''}`}>
                      {col.render
                        ? col.render(row)
                        : col.accessor
                        ? col.accessor(row)
                        : col.key
                        ? row[col.key]
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-line bg-sand-050 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-600 select-none">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-ink-900 font-semibold">{startRecord}</strong> to{' '}
              <strong className="text-ink-900 font-semibold">{endRecord}</strong> of{' '}
              <strong className="text-ink-900 font-semibold">{total}</strong> records
            </span>

            {onLimitChange && (
              <div className="flex items-center gap-1.5 ml-4">
                <span>Show:</span>
                <select
                  value={limit}
                  onChange={(e) => onLimitChange(Number(e.target.value))}
                  className="bg-white border border-line rounded px-2 py-1 text-xs text-ink-800 font-medium focus:outline-none focus:border-maroon-700"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded border border-line bg-white hover:bg-sand-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4 text-ink-700" />
            </button>

            <span className="px-3 py-1 font-medium text-ink-800">
              Page {page} of {computedTotalPages}
            </span>

            <button
              type="button"
              disabled={page >= computedTotalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded border border-line bg-white hover:bg-sand-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4 text-ink-700" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
