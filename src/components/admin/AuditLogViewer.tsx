import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Eye
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'24h' | '7d' | '30d' | '90d' | 'custom'>('7d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [users, setUsers] = useState<{id: string, email: string, name: string}[]>([]);
  const [uniqueActions, setUniqueActions] = useState<string[]>([]);
  const [uniqueResourceTypes, setUniqueResourceTypes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const { hasPermission } = useAuth();

  useEffect(() => {
    if (hasPermission('audit.read')) {
      fetchLogs();
      fetchUsers();
    }
  }, [actionFilter, resourceTypeFilter, userFilter, dateRangeFilter, startDate, endDate, page, pageSize, sortField, sortDirection]);

  useEffect(() => {
    // Reset to first page when filters change
    setPage(1);
  }, [actionFilter, resourceTypeFilter, userFilter, dateRangeFilter, startDate, endDate, searchTerm]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' });
      
      // Apply filters
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }
      
      if (resourceTypeFilter !== 'all') {
        query = query.eq('resource_type', resourceTypeFilter);
      }
      
      if (userFilter !== 'all') {
        query = query.eq('user_id', userFilter);
      }
      
      // Apply date range filter
      const now = new Date();
      let startDateTime: Date;
      
      if (dateRangeFilter === 'custom' && startDate) {
        startDateTime = new Date(startDate);
      } else {
        switch (dateRangeFilter) {
          case '24h':
            startDateTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            startDateTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startDateTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90d':
            startDateTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDateTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
      }
      
      query = query.gte('created_at', startDateTime.toISOString());
      
      if (dateRangeFilter === 'custom' && endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDateTime.toISOString());
      }
      
      // Apply search term to details
      if (searchTerm) {
        // This is a simplified approach - for production, you might want to use more sophisticated search
        query = query.or(`resource_id.ilike.%${searchTerm}%,action.ilike.%${searchTerm}%`);
      }
      
      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' });
      
      // Apply pagination
      query = query.range((page - 1) * pageSize, page * pageSize - 1);
      
      // Execute query
      const { data, error: fetchError, count } = await query;
      
      if (fetchError) throw fetchError;
      
      if (count !== null) {
        setTotalCount(count);
      }
      
      // Extract unique actions and resource types for filters
      if (page === 1) {
        const { data: allLogs } = await supabase
          .from('audit_logs')
          .select('action, resource_type')
          .limit(1000);
        
        if (allLogs) {
          const actions = [...new Set(allLogs.map(log => log.action))].filter(Boolean).sort();
          const resourceTypes = [...new Set(allLogs.map(log => log.resource_type))].filter(Boolean).sort();
          
          setUniqueActions(actions);
          setUniqueResourceTypes(resourceTypes);
        }
      }
      
      // Fetch user information for each log
      const logsWithUserInfo = await Promise.all((data || []).map(async (log) => {
        if (log.user_id) {
          const matchingUser = users.find(u => u.id === log.user_id);
          if (matchingUser) {
            return {
              ...log,
              user_email: matchingUser.email,
              user_name: matchingUser.name
            };
          }
        }
        return log;
      }));
      
      setLogs(logsWithUserInfo);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, user_id, full_name');
      
      if (profilesError) throw profilesError;
      
      // For each profile, get the auth user data
      const userMap: {id: string, email: string, name: string}[] = [];
      
      for (const profile of profiles || []) {
        // In a real implementation, you'd need admin access to get user auth data
        // For now, we'll simulate the email
        userMap.push({
          id: profile.user_id,
          email: `user${profile.user_id.slice(-4)}@example.com`, // Simulated email
          name: profile.full_name
        });
      }
      
      setUsers(userMap);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleExport = () => {
    // Convert logs to CSV
    const headers = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Details', 'IP Address'];
    
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.user_name || log.user_email || 'System',
        log.action,
        log.resource_type || '',
        log.resource_id || '',
        log.details ? JSON.stringify(log.details).replace(/,/g, ';') : '',
        log.ip_address || ''
      ].join(','))
    ].join('\n');
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatActionName = (action: string): string => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getActionColor = (action: string): string => {
    if (action.includes('created') || action.includes('added')) {
      return 'bg-green-100 text-green-800';
    } else if (action.includes('updated') || action.includes('modified')) {
      return 'bg-blue-100 text-blue-800';
    } else if (action.includes('deleted') || action.includes('removed')) {
      return 'bg-red-100 text-red-800';
    } else if (action.includes('login') || action.includes('auth')) {
      return 'bg-purple-100 text-purple-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  const getResourceTypeIcon = (type: string | null): JSX.Element => {
    switch (type) {
      case 'user_profile':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'asset':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'personnel':
        return <User className="w-4 h-4 text-purple-500" />;
      case 'risk':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'travel_plan':
        return <Calendar className="w-4 h-4 text-orange-500" />;
      case 'incident':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'authentication':
        return <User className="w-4 h-4 text-indigo-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const resetFilters = () => {
    setActionFilter('all');
    setResourceTypeFilter('all');
    setUserFilter('all');
    setDateRangeFilter('7d');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  if (!hasPermission('audit.read')) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to view audit logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">View and export detailed system activity logs</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => fetchLogs()}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </div>
          
          {dateRangeFilter === 'custom' && (
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
          
          {showFilters && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Actions</option>
                    {uniqueActions.map(action => (
                      <option key={action} value={action}>{formatActionName(action)}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
                  <select
                    value={resourceTypeFilter}
                    onChange={(e) => setResourceTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Resource Types</option>
                    {uniqueResourceTypes.map(type => (
                      <option key={type} value={type}>{type?.charAt(0).toUpperCase() + type?.slice(1).replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                  <select
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Users</option>
                    <option value="null">System</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name || user.email}</option>
                    ))}
                  </select>
                </div>
                
                <div className="self-end">
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>Timestamp</span>
                    {sortField === 'created_at' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>User</span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('action')}
                >
                  <div className="flex items-center space-x-1">
                    <FileText className="w-4 h-4" />
                    <span>Action</span>
                    {sortField === 'action' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('resource_type')}
                >
                  <div className="flex items-center space-x-1">
                    <FileText className="w-4 h-4" />
                    <span>Resource Type</span>
                    {sortField === 'resource_type' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No audit logs found matching your criteria
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(log.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {log.user_name || log.user_email || 'System'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.user_id ? log.user_id.substring(0, 8) : 'System Action'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(log.action)}`}>
                        {formatActionName(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getResourceTypeIcon(log.resource_type)}
                        <span className="ml-1 text-sm text-gray-900 capitalize">
                          {log.resource_type?.replace('_', ' ') || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {log.resource_id ? log.resource_id.substring(0, 8) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {log.details ? (
                          Object.entries(log.details).map(([key, value]) => (
                            <div key={key} className="truncate">
                              <span className="font-medium">{key.replace('_', ' ')}:</span> {
                                typeof value === 'object' 
                                  ? JSON.stringify(value).substring(0, 30) + '...' 
                                  : String(value).substring(0, 30) + (String(value).length > 30 ? '...' : '')
                              }
                            </div>
                          )).slice(0, 2)
                        ) : (
                          'No details'
                        )}
                        {log.details && Object.keys(log.details).length > 2 && (
                          <span className="text-xs text-blue-600">+ more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-sm text-gray-700">
              Showing <span className="font-medium">{logs.length}</span> of{' '}
              <span className="font-medium">{totalCount}</span> logs
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {page} of {Math.ceil(totalCount / pageSize) || 1}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(totalCount / pageSize)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
          </div>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Audit Log Details</h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Timestamp</h3>
                  <p className="text-gray-900">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">User</h3>
                  <p className="text-gray-900">{selectedLog.user_name || selectedLog.user_email || 'System'}</p>
                  {selectedLog.user_id && (
                    <p className="text-xs text-gray-500">ID: {selectedLog.user_id}</p>
                  )}
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Action</h3>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(selectedLog.action)}`}>
                    {formatActionName(selectedLog.action)}
                  </span>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Resource</h3>
                  <div className="flex items-center">
                    {getResourceTypeIcon(selectedLog.resource_type)}
                    <span className="ml-1 text-gray-900 capitalize">
                      {selectedLog.resource_type?.replace('_', ' ') || 'N/A'}
                    </span>
                  </div>
                  {selectedLog.resource_id && (
                    <p className="text-xs text-gray-500">ID: {selectedLog.resource_id}</p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Details</h3>
                {selectedLog.details ? (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No details available</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">IP Address</h3>
                  <p className="text-gray-900">{selectedLog.ip_address || 'Not recorded'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">User Agent</h3>
                  <p className="text-gray-900 text-sm truncate">{selectedLog.user_agent || 'Not recorded'}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer;