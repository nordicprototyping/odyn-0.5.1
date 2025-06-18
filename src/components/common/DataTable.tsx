import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Loader2, AlertCircle, Download } from 'lucide-react';

export type ColumnDef<T> = {
  id: string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => any;
  cell?: (info: { row: T; value: any }) => React.ReactNode;
  enableSorting?: boolean;
  sortingFn?: (a: T, b: T) => number;
  meta?: Record<string, any>;
};

export type FilterDef<T> = {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  filterFn: (row: T, value: string) => boolean;
};

export type DataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T>[];
  filters?: FilterDef<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  sortable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  loading?: boolean;
  error?: string | null;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  emptyMessage?: string;
  loadingMessage?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  onExport?: () => void;
  exportFileName?: string;
  showRowCount?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
};

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  filters = [],
  searchable = true,
  searchPlaceholder = 'Search...',
  searchFields,
  sortable = true,
  pagination = true,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  loading = false,
  error = null,
  onRowClick,
  rowClassName,
  emptyMessage = 'No data available',
  loadingMessage = 'Loading data...',
  title,
  description,
  actions,
  onExport,
  exportFileName = 'export.csv',
  showRowCount = true,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = ''
}: DataTableProps<T>) {
  // State for search, filters, sorting, and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [showFilters, setShowFilters] = useState(false);

  // Reset pagination when data, search, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [data, searchTerm, activeFilters]);

  // Search function
  const searchData = (items: T[]): T[] => {
    if (!searchTerm.trim()) return items;
    
    return items.filter(item => {
      // If searchFields are provided, only search those fields
      if (searchFields && searchFields.length > 0) {
        return searchFields.some(field => {
          const value = item[field];
          return value !== null && 
                 value !== undefined && 
                 String(value).toLowerCase().includes(searchTerm.toLowerCase());
        });
      }
      
      // Otherwise, search all string and number fields
      return Object.entries(item).some(([_, value]) => {
        return (typeof value === 'string' || typeof value === 'number') && 
               String(value).toLowerCase().includes(searchTerm.toLowerCase());
      });
    });
  };

  // Filter function
  const filterData = (items: T[]): T[] => {
    if (Object.keys(activeFilters).length === 0) return items;
    
    return items.filter(item => {
      return Object.entries(activeFilters).every(([filterId, filterValue]) => {
        if (filterValue === 'all') return true;
        
        const filter = filters.find(f => f.id === filterId);
        return filter ? filter.filterFn(item, filterValue) : true;
      });
    });
  };

  // Sort function
  const sortData = (items: T[]): T[] => {
    if (!sortColumn) return items;
    
    const column = columns.find(col => col.id === sortColumn);
    if (!column) return items;
    
    return [...items].sort((a, b) => {
      let valueA, valueB;
      
      if (column.accessorFn) {
        valueA = column.accessorFn(a);
        valueB = column.accessorFn(b);
      } else if (column.accessorKey) {
        valueA = a[column.accessorKey];
        valueB = b[column.accessorKey];
      } else {
        return 0;
      }
      
      // Custom sorting function
      if (column.sortingFn) {
        return sortDirection === 'asc' 
          ? column.sortingFn(a, b) 
          : column.sortingFn(b, a);
      }
      
      // Default sorting logic
      if (valueA === valueB) return 0;
      if (valueA === null || valueA === undefined) return sortDirection === 'asc' ? -1 : 1;
      if (valueB === null || valueB === undefined) return sortDirection === 'asc' ? 1 : -1;
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      }
      
      return sortDirection === 'asc' 
        ? valueA < valueB ? -1 : 1 
        : valueA < valueB ? 1 : -1;
    });
  };

  // Paginate function
  const paginateData = (items: T[]): T[] => {
    if (!pagination) return items;
    
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  };

  // Process data through search, filter, sort, and paginate
  const processedData = useMemo(() => {
    let result = [...data];
    result = searchData(result);
    result = filterData(result);
    result = sortData(result);
    return result;
  }, [data, searchTerm, activeFilters, sortColumn, sortDirection]);

  // Get paginated data
  const paginatedData = useMemo(() => {
    return paginateData(processedData);
  }, [processedData, currentPage, pageSize, pagination]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(processedData.length / pageSize);
  }, [processedData, pageSize]);

  // Handle sort click
  const handleSort = (columnId: string) => {
    if (!sortable) return;
    
    const column = columns.find(col => col.id === columnId);
    if (!column || column.enableSorting === false) return;
    
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  // Handle filter change
  const handleFilterChange = (filterId: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterId]: value
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setActiveFilters({});
    setSearchTerm('');
    setSortColumn(null);
    setSortDirection('asc');
    setCurrentPage(1);
  };

  // Export data as CSV
  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }
    
    // Default export implementation
    const headers = columns.map(col => col.header);
    
    const rows = processedData.map(row => {
      return columns.map(col => {
        let value;
        if (col.accessorFn) {
          value = col.accessorFn(row);
        } else if (col.accessorKey) {
          value = row[col.accessorKey];
        } else {
          value = '';
        }
        
        // Handle different value types
        if (value === null || value === undefined) {
          return '';
        } else if (typeof value === 'object') {
          return JSON.stringify(value).replace(/"/g, '""');
        } else {
          return String(value).replace(/"/g, '""');
        }
      });
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', exportFileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render cell content
  const renderCell = (row: T, column: ColumnDef<T>) => {
    let value;
    
    if (column.accessorFn) {
      value = column.accessorFn(row);
    } else if (column.accessorKey) {
      value = row[column.accessorKey];
    } else {
      value = null;
    }
    
    if (column.cell) {
      return column.cell({ row, value });
    }
    
    if (value === null || value === undefined) {
      return '-';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      {(title || description || searchable || filters.length > 0 || actions || onExport) && (
        <div className={`p-6 border-b border-gray-200 ${headerClassName}`}>
          {/* Title and description */}
          {(title || description) && (
            <div className="mb-4">
              {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
              {description && <p className="text-sm text-gray-600">{description}</p>}
            </div>
          )}
          
          {/* Search, filters, and actions */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              {searchable && (
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
              
              {/* Filters */}
              {filters.length > 0 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Filter className="w-4 h-4" />
                    <span>Filters</span>
                    {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {Object.keys(activeFilters).length > 0 && (
                    <button
                      onClick={resetFilters}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Custom actions */}
              {actions}
              
              {/* Export button */}
              {onExport !== undefined && (
                <button
                  onClick={handleExport}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              )}
              
              {/* Row count */}
              {showRowCount && (
                <span className="text-sm text-gray-600">
                  Showing {paginatedData.length} of {processedData.length} {processedData.length === 1 ? 'row' : 'rows'}
                </span>
              )}
            </div>
          </div>
          
          {/* Filter options */}
          {showFilters && filters.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filters.map(filter => (
                <div key={filter.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {filter.label}
                  </label>
                  <select
                    value={activeFilters[filter.id] || 'all'}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {filter.options.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">{loadingMessage}</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
              <p className="text-gray-900 font-medium mb-2">Error loading data</p>
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        ) : processedData.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-gray-600">{emptyMessage}</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {columns.map(column => (
                  <th
                    key={column.id}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      sortable && column.enableSorting !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                    onClick={() => sortable && column.enableSorting !== false && handleSort(column.id)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.header}</span>
                      {sortable && column.enableSorting !== false && sortColumn === column.id && (
                        sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`bg-white divide-y divide-gray-200 ${bodyClassName}`}>
              {paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : 'hover:bg-gray-50'} ${rowClassName ? rowClassName(row) : ''}`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map(column => (
                    <td key={column.id} className="px-6 py-4">
                      {renderCell(row, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Pagination */}
      {pagination && !loading && !error && processedData.length > 0 && (
        <div className={`px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 ${footerClassName}`}>
          <div className="flex items-center">
            <span className="text-sm text-gray-700">
              Showing <span className="font-medium">{paginatedData.length}</span> of{' '}
              <span className="font-medium">{processedData.length}</span> results
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <ChevronLeft className="w-4 h-4 -ml-2" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
              <ChevronRight className="w-4 h-4 -ml-2" />
            </button>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}