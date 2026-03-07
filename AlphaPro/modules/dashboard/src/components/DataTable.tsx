import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
  sortable?: boolean;
  render?: (value: any) => React.ReactNode;
}

interface DataTableProps {
  data: Record<string, any>[];
  columns: Column[];
  firstColumnLabel?: string;
  defaultSort?: 'asc' | 'desc';
  className?: string;
  showTotals?: boolean;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  striped?: boolean;
  hoverable?: boolean;
  onRowClick?: (row: Record<string, any>) => void;
}

export default function DataTable({
  data,
  columns,
  firstColumnLabel = 'DAY',
  defaultSort = 'desc',
  className = '',
  showTotals = false,
  pageSize = 10,
  searchable = false,
  searchPlaceholder = 'Search...',
  striped = false,
  hoverable = true,
  onRowClick
}: DataTableProps) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSort);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data by search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    
    const query = searchQuery.toLowerCase();
    return data.filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(query)
      )
    );
  }, [data, searchQuery]);

  // Sort filtered data
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    if (sortOrder === 'desc') {
      return sorted;
    }
    return sorted.reverse();
  }, [filteredData, sortOrder]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Calculate totals for numeric columns
  const totals = useMemo(() => {
    if (!showTotals || sortedData.length === 0) return null;
    
    const totalsObj: Record<string, any> = { day: 'TOTAL' };
    columns.forEach(col => {
      const values = sortedData.map(row => row[col.key]);
      const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
      if (numericValues.length > 0) {
        // Sum numeric values
        totalsObj[col.key] = numericValues.reduce((sum: number, v: number) => sum + v, 0);
      } else {
        totalsObj[col.key] = '';
      }
    });
    return totalsObj;
  }, [sortedData, columns, showTotals]);

  const toggleSort = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  return (
    <div className={`bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden ${className}`}>
      {/* Search Bar */}
      {searchable && (
        <div className="p-3 border-b border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              {/* First Column - Day */}
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-slate-400 uppercase cursor-pointer hover:text-white"
                onClick={toggleSort}
              >
                <div className="flex items-center gap-1">
                  {firstColumnLabel}
                  {sortOrder === 'desc' ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronUp className="w-3 h-3" />
                  )}
                </div>
              </th>
              {/* Other Columns */}
              {columns.map((col) => (
                <th 
                  key={col.key} 
                  className={`px-3 py-3 text-${col.align || 'right'} text-xs font-medium text-slate-400 uppercase ${col.sortable ? 'cursor-pointer hover:text-white' : ''}`}
                  onClick={() => col.sortable && toggleSort()}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y divide-slate-700/30 ${striped ? 'divide-y' : ''}`}>
            {paginatedData.map((row, idx) => (
              <tr 
                key={idx} 
                className={`${hoverable ? 'hover:bg-slate-700/20' : ''} ${striped && idx % 2 === 1 ? 'bg-slate-800/30' : ''} transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {/* First Column - Day */}
                <td className="px-3 py-3 text-sm text-slate-300 font-medium">
                  {row.day}
                </td>
                {/* Other Columns */}
                {columns.map((col) => (
                  <td 
                    key={col.key} 
                    className={`px-3 py-3 text-${col.align || 'right'} text-sm ${
                      col.key.includes('Profit') || col.key.includes('Score') || col.key.includes('Uptime')
                        ? 'text-emerald-400' 
                        : col.key.includes('Gas') || col.key.includes('Loss') || col.key.includes('Errors')
                          ? 'text-red-400'
                          : 'text-slate-200'
                    }`}
                  >
                    {col.render ? col.render(row[col.key]) : (col.format ? col.format(row[col.key]) : row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {/* Totals Row */}
          {totals && (
            <tfoot className="bg-slate-700/50 border-t border-slate-600">
              <tr>
                <td className="px-3 py-3 text-sm text-white font-bold">
                  {totals.day}
                </td>
                {columns.map((col) => (
                  <td 
                    key={col.key} 
                    className={`px-3 py-3 text-${col.align || 'right'} text-sm font-bold ${
                      col.key.includes('Profit') || col.key.includes('Score') || col.key.includes('Uptime')
                        ? 'text-emerald-400' 
                        : col.key.includes('Gas') || col.key.includes('Loss') || col.key.includes('Errors')
                          ? 'text-red-400'
                          : 'text-white'
                    }`}
                  >
                    {col.format ? col.format(totals[col.key]) : totals[col.key]}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-700">
          <div className="text-xs text-slate-400">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-2 py-1 text-xs rounded ${
                    currentPage === page 
                      ? 'bg-cyan-500 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {sortedData.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          No data available
        </div>
      )}
    </div>
  );
}
