import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  MapPin,
  User,
  Building,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Save,
  Loader2,
  ChevronDown,
  ChevronRight,
  Trash2,
  FileText,
  Eye,
  Edit
} from 'lucide-react';
import { supabase, Database } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

type IncidentReport = Database['public']['Tables']['incident_reports']['Row'];
type IncidentInsert = Database['public']['Tables']['incident_reports']['Insert'];
type IncidentUpdate = Database['public']['Tables']['incident_reports']['Update'];

const IncidentManagement: React.FC = () => {
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('date_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingIncident, setEditingIncident] = useState<IncidentReport | null>(null);

  const { user, profile, hasPermission } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date_time: '',
    severity: 'Medium' as const,
    location: '',
    department: '',
    involved_parties: '',
    immediate_actions: '',
    reporter_name: '',
    reporter_email: '',
    reporter_phone: ''
  });

  const departments = ['IT Security', 'Physical Security', 'Data Security', 'HR', 'Operations', 'Executive'];

  // Add console log to track rendering and state
  console.log('IncidentManagement rendering, showReportForm:', showReportForm);

  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    // Pre-populate form with user data when not editing
    if (!editingIncident) {
      setFormData(prev => ({
        ...prev,
        reporter_name: profile?.full_name || '',
        reporter_email: user?.email || '',
        department: profile?.department || ''
      }));
    }
  }, [profile, user, editingIncident]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('incident_reports')
        .select('*')
        .order('date_time', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setIncidents(data || []);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError('Failed to load incident data');
    } finally {
      setLoading(false);
    }
  };

  const logAuditEvent = async (action: string, resourceId?: string, details?: Record<string, any>) => {
    if (!profile?.organization_id) {
      console.warn('Cannot log audit event: no organization ID available');
      return;
    }
    
    try {
      const { error } = await supabase.from('audit_logs').insert({
        user_id: user?.id || null,
        organization_id: profile.organization_id,
        action,
        resource_type: 'incident',
        resource_id: resourceId,
        details,
        ip_address: null, // We'll skip IP detection for now
        user_agent: navigator.userAgent
      });

      if (error) {
        console.error('Error logging audit event:', error);
      }
    } catch (error) {
      console.error('Unexpected error logging audit event:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-red-100 text-red-700';
      case 'In Progress': return 'bg-yellow-100 text-yellow-700';
      case 'Closed': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Open': return <XCircle className="w-4 h-4" />;
      case 'In Progress': return <AlertCircle className="w-4 h-4" />;
      case 'Closed': return <CheckCircle className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesStatus = filterStatus === 'all' || incident.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || incident.severity === filterSeverity;
    const matchesDepartment = filterDepartment === 'all' || incident.department === filterDepartment;
    const matchesSearch = incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSeverity && matchesDepartment && matchesSearch;
  });

  const sortedIncidents = [...filteredIncidents].sort((a, b) => {
    const aValue = a[sortField as keyof IncidentReport];
    const bValue = b[sortField as keyof IncidentReport];
    
    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleEditIncident = (incident: IncidentReport) => {
    setEditingIncident(incident);
    
    // Convert involved_parties array to comma-separated string
    const involvedPartiesStr = incident.involved_parties ? incident.involved_parties.join(', ') : '';
    
    // Format date_time for datetime-local input
    const dateTime = new Date(incident.date_time).toISOString().slice(0, 16);
    
    setFormData({
      title: incident.title,
      description: incident.description,
      date_time: dateTime,
      severity: incident.severity,
      location: incident.location,
      department: incident.department,
      involved_parties: involvedPartiesStr,
      immediate_actions: incident.immediate_actions || '',
      reporter_name: incident.reporter_name,
      reporter_email: incident.reporter_email,
      reporter_phone: incident.reporter_phone || ''
    });
    
    setShowReportForm(true);
  };

  const handleDeleteIncident = async (incidentId: string, incidentTitle: string) => {
    // Ask for confirmation before deleting
    const confirmDelete = window.confirm(`Are you sure you want to delete the incident "${incidentTitle}"? This action cannot be undone.`);
    
    if (!confirmDelete) {
      return; // User cancelled the operation
    }
    
    try {
      setLoading(true);
      
      // Delete the incident from the database
      const { error } = await supabase
        .from('incident_reports')
        .delete()
        .eq('id', incidentId);

      if (error) {
        throw error;
      }

      // Log the deletion in audit logs
      await logAuditEvent('incident_deleted', incidentId, { 
        incident_title: incidentTitle,
        deleted_at: new Date().toISOString()
      });

      // Close the detail view if the deleted incident was selected
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident(null);
      }
      
      // Refresh the incidents list
      await fetchIncidents();
      
    } catch (err) {
      console.error('Error deleting incident:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete incident');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.title || !formData.description || !formData.date_time || !formData.location || !formData.department) {
        throw new Error('Please fill in all required fields');
      }

      // Convert comma-separated involved_parties to array
      const involvedPartiesArray = formData.involved_parties 
        ? formData.involved_parties.split(',').map(p => p.trim()).filter(p => p) 
        : [];

      if (editingIncident) {
        // Update existing incident
        const incidentData: IncidentUpdate = {
          title: formData.title,
          description: formData.description,
          date_time: formData.date_time,
          severity: formData.severity,
          location: formData.location,
          department: formData.department,
          involved_parties: involvedPartiesArray,
          immediate_actions: formData.immediate_actions || null,
          reporter_name: formData.reporter_name,
          reporter_email: formData.reporter_email,
          reporter_phone: formData.reporter_phone || null,
          updated_at: new Date().toISOString(),
          // Add a timeline entry for the update
          timeline: [
            ...(editingIncident.timeline || []),
            {
              timestamp: new Date().toISOString(),
              action: 'Incident updated',
              user: profile?.full_name || user?.email || 'Unknown'
            }
          ]
        };

        const { error: updateError } = await supabase
          .from('incident_reports')
          .update(incidentData)
          .eq('id', editingIncident.id);

        if (updateError) {
          throw updateError;
        }

        // Log the update in audit logs
        await logAuditEvent('incident_updated', editingIncident.id, { 
          incident_title: formData.title,
          updated_at: new Date().toISOString()
        });

      } else {
        // Create new incident
        const incidentData: IncidentInsert = {
          organization_id: profile?.organization_id || '',
          title: formData.title,
          description: formData.description,
          date_time: formData.date_time,
          severity: formData.severity,
          location: formData.location,
          department: formData.department,
          involved_parties: involvedPartiesArray,
          immediate_actions: formData.immediate_actions || null,
          reporter_user_id: user?.id || null,
          reporter_name: formData.reporter_name,
          reporter_email: formData.reporter_email,
          reporter_phone: formData.reporter_phone || null,
          status: 'Open',
          timeline: [
            {
              timestamp: new Date().toISOString(),
              action: 'Incident reported',
              user: formData.reporter_name
            }
          ]
        };

        const { data, error: insertError } = await supabase
          .from('incident_reports')
          .insert([incidentData])
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        // Log the creation in audit logs
        if (data) {
          await logAuditEvent('incident_created', data.id, { 
            incident_title: formData.title,
            severity: formData.severity,
            created_at: new Date().toISOString()
          });
        }
      }

      // Refresh incidents list
      await fetchIncidents();
      setShowReportForm(false);
      setEditingIncident(null);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        date_time: '',
        severity: 'Medium',
        location: '',
        department: '',
        involved_parties: '',
        immediate_actions: '',
        reporter_name: profile?.full_name || '',
        reporter_email: user?.email || '',
        reporter_phone: ''
      });
    } catch (err) {
      console.error('Error submitting incident:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit incident report');
    } finally {
      setLoading(false);
    }
  };

  const incidentStats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'Open').length,
    inProgress: incidents.filter(i => i.status === 'In Progress').length,
    closed: incidents.filter(i => i.status === 'Closed').length,
    critical: incidents.filter(i => i.severity === 'Critical').length,
    high: incidents.filter(i => i.severity === 'High').length
  };

  if (loading && incidents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading incident data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incident Management</h1>
          <p className="text-gray-600">Report, track, and manage security incidents</p>
        </div>
        <button
          onClick={() => {
            console.log('Report Incident button clicked, setting showReportForm to true');
            setShowReportForm(true);
            setEditingIncident(null); // Ensure we're in "add" mode, not "edit" mode
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Report Incident</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Incidents</p>
              <p className="text-2xl font-bold text-gray-900">{incidentStats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open</p>
              <p className="text-2xl font-bold text-red-600">{incidentStats.open}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">{incidentStats.inProgress}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Closed</p>
              <p className="text-2xl font-bold text-green-600">{incidentStats.closed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-600">{incidentStats.critical}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-orange-600">{incidentStats.high}</p>
            </div>
            <Activity className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search incidents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Closed">Closed</option>
            </select>
            
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Severity</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <span className="text-sm text-gray-600">
              Showing {sortedIncidents.length} of {incidents.length} incidents
            </span>
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Incident ID</span>
                    {sortField === 'id' && (
                      sortDirection === 'asc' ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Title</span>
                    {sortField === 'title' && (
                      sortDirection === 'asc' ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date_time')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Date/Time</span>
                    {sortField === 'date_time' && (
                      sortDirection === 'asc' ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('severity')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Severity</span>
                    {sortField === 'severity' && (
                      sortDirection === 'asc' ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    {sortField === 'status' && (
                      sortDirection === 'asc' ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedIncidents.map((incident) => (
                <tr key={incident.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-blue-600">{incident.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{incident.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">{incident.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(incident.date_time).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(incident.date_time).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                      {incident.location}
                    </div>
                    <div className="text-sm text-gray-500">{incident.department}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(incident.status)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(incident.status)}`}>
                        {incident.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <User className="w-4 h-4 mr-1 text-gray-400" />
                      {incident.assigned_to || 'Unassigned'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedIncident(incident)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {hasPermission('incidents.update') && (
                        <button 
                          onClick={() => handleEditIncident(incident)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit incident"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission('incidents.delete') && (
                        <button 
                          onClick={() => handleDeleteIncident(incident.id, incident.title)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete incident"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {sortedIncidents.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No incidents found matching your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Report Form Modal */}
      {showReportForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingIncident ? 'Edit Incident Report' : 'Report New Incident'}
                </h2>
                <button
                  onClick={() => {
                    setShowReportForm(false);
                    setEditingIncident(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Incident Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of the incident"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detailed Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Provide detailed information about what happened..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date and Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.date_time}
                    onChange={(e) => setFormData({...formData, date_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Severity Level *
                  </label>
                  <select
                    required
                    value={formData.severity}
                    onChange={(e) => setFormData({...formData, severity: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Specific location where incident occurred"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <select
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Involved Parties
                  </label>
                  <input
                    type="text"
                    value={formData.involved_parties}
                    onChange={(e) => setFormData({...formData, involved_parties: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Names of people involved (comma separated)"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Immediate Actions Taken
                  </label>
                  <textarea
                    rows={3}
                    value={formData.immediate_actions}
                    onChange={(e) => setFormData({...formData, immediate_actions: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe any immediate actions taken to address the incident..."
                  />
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Reporter Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.reporter_name}
                      onChange={(e) => setFormData({...formData, reporter_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={profile?.full_name || ''}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.reporter_email}
                      onChange={(e) => setFormData({...formData, reporter_email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={user?.email || ''}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.reporter_phone}
                      onChange={(e) => setFormData({...formData, reporter_phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowReportForm(false);
                    setEditingIncident(null);
                  }}
                  disabled={loading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{editingIncident ? 'Updating...' : 'Submitting...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingIncident ? 'Update Incident' : 'Submit Incident Report'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedIncident.title}</h2>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getSeverityColor(selectedIncident.severity)}`}>
                    {selectedIncident.severity}
                  </span>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedIncident.status)}`}>
                    {selectedIncident.status}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {hasPermission('incidents.update') && (
                    <button
                      onClick={() => {
                        handleEditIncident(selectedIncident);
                        setSelectedIncident(null);
                      }}
                      className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                      title="Edit incident"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  )}
                  {hasPermission('incidents.delete') && (
                    <button
                      onClick={() => {
                        handleDeleteIncident(selectedIncident.id, selectedIncident.title);
                      }}
                      className="p-2 text-red-600 hover:text-red-800 transition-colors"
                      title="Delete incident"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedIncident(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Details */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Incident Details</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700">{selectedIncident.description}</p>
                    </div>
                  </div>
                  
                  {selectedIncident.immediate_actions && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Immediate Actions Taken</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700">{selectedIncident.immediate_actions}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedIncident.involved_parties.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Involved Parties</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedIncident.involved_parties.map((party, index) => (
                          <span key={index} className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                            <User className="w-4 h-4 mr-1" />
                            {party}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedIncident.documents.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Supporting Documents</h3>
                      <div className="space-y-2">
                        {selectedIncident.documents.map((doc, index) => (
                          <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{doc}</span>
                            <button className="text-blue-600 hover:text-blue-800 text-sm">Download</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Sidebar Info */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Incident ID</label>
                        <p className="text-gray-900">{selectedIncident.id.slice(0, 8)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Date & Time</label>
                        <p className="text-gray-900">
                          {new Date(selectedIncident.date_time).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Location</label>
                        <p className="text-gray-900">{selectedIncident.location}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Department</label>
                        <p className="text-gray-900">{selectedIncident.department}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Assigned To</label>
                        <p className="text-gray-900">{selectedIncident.assigned_to || 'Unassigned'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Reporter Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <p className="text-gray-900">{selectedIncident.reporter_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-gray-900">{selectedIncident.reporter_email}</p>
                      </div>
                      {selectedIncident.reporter_phone && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Phone</label>
                          <p className="text-gray-900">{selectedIncident.reporter_phone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Timeline */}
              {selectedIncident.timeline && selectedIncident.timeline.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Incident Timeline</h3>
                  <div className="space-y-4">
                    {selectedIncident.timeline.map((event, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{event.action}</p>
                            <span className="text-xs text-gray-500">
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">by {event.user}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentManagement;