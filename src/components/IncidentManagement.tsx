import React, { useState } from 'react';
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
  FileText,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Activity,
  Loader2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useDepartments } from '../hooks/useDepartments';
import { useIncidents } from '../hooks/useIncidents';
import AddEditIncidentForm from './AddEditIncidentForm';
import Modal from './common/Modal';

const IncidentManagement: React.FC = () => {
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [editingIncident, setEditingIncident] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('date_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { user, profile, hasPermission } = useAuth();
  const { departments } = useDepartments();
  const { 
    incidents, 
    loading, 
    error, 
    addIncident, 
    updateIncident, 
    deleteIncident, 
    logAuditEvent 
  } = useIncidents();

  // Add console log to track rendering and state
  console.log('IncidentManagement rendering, showReportForm:', showReportForm);

  const handleSubmit = async (formData: any) => {
    try {
      if (editingIncident) {
        // Update existing incident
        const updatedIncident = await updateIncident(editingIncident.id, formData);
        
        // Log audit event
        if (updatedIncident) {
          await logAuditEvent('incident_updated', updatedIncident.id, {
            incident_title: updatedIncident.title,
            incident_severity: updatedIncident.severity,
            incident_status: updatedIncident.status
          });
        }
        
        setEditingIncident(null);
      } else {
        // Create new incident
        const newIncident = await addIncident(formData);
        
        // Log audit event
        if (newIncident) {
          await logAuditEvent('incident_created', newIncident.id, {
            incident_title: newIncident.title,
            incident_severity: newIncident.severity
          });
        }
      }
      
      // Close the form
      setShowReportForm(false);
    } catch (err) {
      console.error('Error submitting incident:', err);
      throw err;
    }
  };

  const handleDeleteIncident = async (incidentId: string, incidentTitle: string) => {
    // Ask for confirmation before deleting
    const confirmDelete = window.confirm(`Are you sure you want to delete the incident "${incidentTitle}"? This action cannot be undone.`);
    
    if (!confirmDelete) {
      return; // User cancelled the operation
    }
    
    try {
      // Delete the incident
      await deleteIncident(incidentId);

      // Log the deletion in audit logs
      await logAuditEvent('incident_deleted', incidentId, { 
        incident_title: incidentTitle,
        deleted_at: new Date().toISOString()
      });

      // Close the detail view if the deleted incident was selected
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident(null);
      }
    } catch (err) {
      console.error('Error deleting incident:', err);
    }
  };

  const handleEditIncident = (incident: any) => {
    setEditingIncident(incident);
    setShowReportForm(true);
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
    const aValue = a[sortField as keyof typeof a];
    const bValue = b[sortField as keyof typeof b];
    
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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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

      {/* Add/Edit Incident Form Modal */}
      {showReportForm && (
        <Modal isOpen={showReportForm} onClose={() => setShowReportForm(false)} size="xl" showCloseButton={false}>
          <AddEditIncidentForm
            onClose={() => {
              setShowReportForm(false);
              setEditingIncident(null);
            }}
            onSubmit={handleSubmit}
            incidentToEdit={editingIncident}
          />
        </Modal>
      )}

      {/* Incident Detail Modal */}
      <Modal
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        size="full"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-900">{selectedIncident?.title}</h2>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getSeverityColor(selectedIncident?.severity)}`}>
                {selectedIncident?.severity}
              </span>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedIncident?.status)}`}>
                {selectedIncident?.status}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {hasPermission('incidents.update') && (
                <button 
                  onClick={() => {
                    handleEditIncident(selectedIncident);
                    setSelectedIncident(null);
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                  title="Edit incident"
                >
                  <Edit className="w-5 h-5" />
                </button>
              )}
              {hasPermission('incidents.delete') && (
                <button 
                  onClick={() => {
                    handleDeleteIncident(selectedIncident?.id, selectedIncident?.title);
                  }}
                  className="p-2 text-red-600 hover:text-red-800 transition-colors"
                  title="Delete incident"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
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
                  <p className="text-gray-700">{selectedIncident?.description}</p>
                </div>
              </div>
              
              {selectedIncident?.immediate_actions && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Immediate Actions Taken</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{selectedIncident?.immediate_actions}</p>
                  </div>
                </div>
              )}
              
              {selectedIncident?.involved_parties?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Involved Parties</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedIncident?.involved_parties.map((party: string, index: number) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        <User className="w-4 h-4 mr-1" />
                        {party}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedIncident?.documents?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Supporting Documents</h3>
                  <div className="space-y-2">
                    {selectedIncident?.documents.map((doc: string, index: number) => (
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
                    <p className="text-gray-900">{selectedIncident?.id.slice(0, 8)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date & Time</label>
                    <p className="text-gray-900">
                      {selectedIncident && new Date(selectedIncident.date_time).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <p className="text-gray-900">{selectedIncident?.location}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Department</label>
                    <p className="text-gray-900">{selectedIncident?.department}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Assigned To</label>
                    <p className="text-gray-900">{selectedIncident?.assigned_to || 'Unassigned'}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Reporter Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-gray-900">{selectedIncident?.reporter_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{selectedIncident?.reporter_email}</p>
                  </div>
                  {selectedIncident?.reporter_phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-gray-900">{selectedIncident?.reporter_phone}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Timeline */}
          {selectedIncident?.timeline && selectedIncident.timeline.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Incident Timeline</h3>
              <div className="space-y-4">
                {selectedIncident.timeline.map((event: any, index: number) => (
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
      </Modal>
    </div>
  );
};

export default IncidentManagement;