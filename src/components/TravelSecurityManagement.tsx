import React, { useState, useMemo, useEffect } from 'react';
import {
  Plane,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Shield,
  Globe,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Edit,
  FileText,
  Brain,
  Zap,
  TrendingUp,
  TrendingDown,
  Car,
  Building,
  Phone,
  Mail,
  Loader2
} from 'lucide-react';
import GoogleMapComponent from './common/GoogleMapComponent';
import AddTravelPlanForm from './AddTravelPlanForm';
import { supabase, Database } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import AIRiskInsights from './AIRiskInsights';
import MitigationDisplay from './MitigationDisplay';
import { AppliedMitigation } from '../types/mitigation';

type TravelPlan = Database['public']['Tables']['travel_plans']['Row'];
type TravelPlanInsert = Database['public']['Tables']['travel_plans']['Insert'];

const TravelSecurityManagement: React.FC = () => {
  const [selectedRequest, setSelectedRequest] = useState<TravelPlan | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [travelPlans, setTravelPlans] = useState<TravelPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { hasPermission } = useAuth();

  // Add console log to track rendering and state
  console.log('TravelSecurityManagement rendering, showNewPlanForm:', showNewPlanForm);

  useEffect(() => {
    fetchTravelPlans();
  }, []);

  const fetchTravelPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('travel_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setTravelPlans(data || []);
    } catch (err) {
      console.error('Error fetching travel plans:', err);
      setError('Failed to load travel plan data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTravelPlan = async (planData: TravelPlanInsert) => {
    try {
      const { error } = await supabase
        .from('travel_plans')
        .insert([planData]);

      if (error) {
        throw error;
      }

      // Refresh the travel plans list
      await fetchTravelPlans();
      setShowNewPlanForm(false);
    } catch (err) {
      console.error('Error adding travel plan:', err);
      throw err;
    }
  };

  const getRiskColor = (score: number) => {
    if (score <= 30) return 'text-green-600 bg-green-100 border-green-200';
    if (score <= 70) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const getRiskLevel = (score: number) => {
    if (score <= 30) return 'Low Risk';
    if (score <= 70) return 'Medium Risk';
    return 'High Risk';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'denied': return 'bg-red-100 text-red-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-gray-100 text-gray-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'denied': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in-progress': return <Plane className="w-4 h-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-gray-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-gray-500" />;
      default: return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredRequests = travelPlans.filter(request => {
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesSearch = request.traveler_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (request.destination as any)?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (request.destination as any)?.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesRisk = true;
    const riskScore = (request.risk_assessment as any)?.overall || 0;
    if (filterRisk === 'low') matchesRisk = riskScore <= 30;
    else if (filterRisk === 'medium') matchesRisk = riskScore > 30 && riskScore <= 70;
    else if (filterRisk === 'high') matchesRisk = riskScore > 70;
    
    return matchesStatus && matchesSearch && matchesRisk;
  });

  const travelStats = {
    total: travelPlans.length,
    pending: travelPlans.filter(r => r.status === 'pending').length,
    approved: travelPlans.filter(r => r.status === 'approved').length,
    inProgress: travelPlans.filter(r => r.status === 'in-progress').length,
    highRisk: travelPlans.filter(r => ((r.risk_assessment as any)?.overall || 0) > 70).length,
    avgRisk: travelPlans.length > 0 ? Math.round(travelPlans.reduce((sum, r) => sum + ((r.risk_assessment as any)?.overall || 0), 0) / travelPlans.length) : 0
  };

  // Convert travel plans to map markers
  const mapMarkers = filteredRequests.map(request => ({
    id: request.id,
    position: {
      lat: (request.destination as any)?.coordinates?.[1] || 0,
      lng: (request.destination as any)?.coordinates?.[0] || 0
    },
    title: `${request.traveler_name} → ${(request.destination as any)?.city || 'Unknown'}`,
    type: 'travel' as const,
    status: request.status,
    riskScore: (request.risk_assessment as any)?.overall || 0,
    details: {
      description: request.purpose,
      department: request.traveler_department,
      lastUpdate: new Date(request.departure_date).toLocaleDateString(),
      traveler: request.traveler_name,
      dates: `${new Date(request.departure_date).toLocaleDateString()} - ${new Date(request.return_date).toLocaleDateString()}`
    }
  }));

  // Calculate map center based on filtered requests
  const mapCenter = useMemo(() => {
    if (filteredRequests.length === 0) return { lat: 40.7128, lng: -74.0060 };
    
    const validRequests = filteredRequests.filter(request => 
      (request.destination as any)?.coordinates?.[1] && (request.destination as any)?.coordinates?.[0]
    );
    
    if (validRequests.length === 0) return { lat: 40.7128, lng: -74.0060 };
    
    const avgLat = validRequests.reduce((sum, request) => sum + (request.destination as any).coordinates[1], 0) / validRequests.length;
    const avgLng = validRequests.reduce((sum, request) => sum + (request.destination as any).coordinates[0], 0) / validRequests.length;
    
    return { lat: avgLat, lng: avgLng };
  }, [filteredRequests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading travel plan data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchTravelPlans}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Travel Security Management</h1>
          <p className="text-gray-600">AI-enhanced travel risk assessment and approval workflow</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              console.log('New Plan button clicked, setting showNewPlanForm to true');
              setShowNewPlanForm(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Plan</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 rounded ${viewMode === 'map' ? 'bg-white shadow-sm' : ''}`}
            >
              <Globe className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Plans</p>
              <p className="text-2xl font-bold text-gray-900">{travelStats.total}</p>
            </div>
            
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{travelStats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">{travelStats.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{travelStats.inProgress}</p>
            </div>
            <Plane className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-red-600">{travelStats.highRisk}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg AI Risk</p>
              <p className="text-2xl font-bold text-purple-600">{travelStats.avgRisk}</p>
            </div>
            <Brain className="w-8 h-8 text-purple-500" />
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
                placeholder="Search travel plans..."
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk (0-30)</option>
              <option value="medium">Medium Risk (31-70)</option>
              <option value="high">High Risk (71-100)</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Showing {filteredRequests.length} of {travelPlans.length} plans
            </span>
          </div>
        </div>
      </div>

      {/* Travel Plans List/Map */}
      {viewMode === 'map' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Travel Destinations</h3>
            <p className="text-sm text-gray-600">
              Interactive map showing {filteredRequests.length} travel plans across {new Set(filteredRequests.map(r => (r.destination as any)?.country).filter(Boolean)).size} countries
            </p>
          </div>
          <GoogleMapComponent
            markers={mapMarkers}
            center={mapCenter}
            zoom={filteredRequests.length === 1 ? 6 : 2}
            height="500px"
            onMarkerClick={(marker) => {
              const request = filteredRequests.find(r => r.id === marker.id);
              if (request) setSelectedRequest(request);
            }}
          />
        </div>
      )}

      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Traveler
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Travel Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AI Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purpose
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => {
                  const riskScore = (request.risk_assessment as any)?.overall || 0;
                  const destination = request.destination as any;
                  const origin = request.origin as any;
                  
                  return (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {request.traveler_name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{request.traveler_name}</div>
                            <div className="text-sm text-gray-500">{request.traveler_employee_id} • {request.traveler_department}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                          {destination?.city || 'Unknown'}, {destination?.country || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">from {origin?.city || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(request.departure_date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          to {new Date(request.return_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Brain className="w-4 h-4 text-purple-500" />
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRiskColor(riskScore)}`}>
                              {riskScore}
                            </span>
                          </div>
                          <Zap className="w-3 h-3 text-purple-400" title={`Confidence: ${(request.risk_assessment as any)?.aiConfidence || 0}%`} />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{getRiskLevel(riskScore)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(request.status)}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1).replace('-', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">{request.purpose}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {hasPermission('travel.update') && (
                          <button className="text-gray-600 hover:text-gray-900">
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Travel Plan Form Modal */}
      {showNewPlanForm && (
        <AddTravelPlanForm
          onClose={() => setShowNewPlanForm(false)}
          onSubmit={handleAddTravelPlan}
        />
      )}

      {/* Travel Plan Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Plane className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedRequest.traveler_name}</h2>
                    <p className="text-gray-600">{selectedRequest.id.slice(0, 8)} • {(selectedRequest.destination as any)?.city}, {(selectedRequest.destination as any)?.country}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Brain className="w-5 h-5 text-purple-500" />
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getRiskColor((selectedRequest.risk_assessment as any)?.overall || 0)}`}>
                      AI Risk: {(selectedRequest.risk_assessment as any)?.overall || 0}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* AI Risk Assessment */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  <span>AI Risk Assessment</span>
                </h3>
                <AIRiskInsights
                  score={(selectedRequest.risk_assessment as any)?.overall || 0}
                  explanation={(selectedRequest.risk_assessment as any)?.explanation || "No AI analysis available for this travel plan."}
                  recommendations={(selectedRequest.risk_assessment as any)?.recommendations || []}
                  confidence={(selectedRequest.risk_assessment as any)?.aiConfidence || 75}
                  trend={(selectedRequest.risk_assessment as any)?.trend || 'stable'}
                  components={(selectedRequest.risk_assessment as any)?.components || {}}
                />
              </div>

              {/* Applied Mitigations */}
              {selectedRequest.mitigations && (selectedRequest.mitigations as AppliedMitigation[]).length > 0 && (
                <MitigationDisplay 
                  mitigations={selectedRequest.mitigations as AppliedMitigation[]}
                  showCategory={true}
                />
              )}

              {/* Travel Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel Details</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Purpose</label>
                      <p className="text-gray-900">{selectedRequest.purpose}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Departure</label>
                      <p className="text-gray-900">{new Date(selectedRequest.departure_date).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Return</label>
                      <p className="text-gray-900">{new Date(selectedRequest.return_date).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Duration</label>
                      <p className="text-gray-900">
                        {Math.ceil((new Date(selectedRequest.return_date).getTime() - new Date(selectedRequest.departure_date).getTime()) / (1000 * 60 * 60 * 24))} days
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Traveler Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Employee ID</label>
                      <p className="text-gray-900">{selectedRequest.traveler_employee_id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Department</label>
                      <p className="text-gray-900">{selectedRequest.traveler_department}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Clearance Level</label>
                      <p className="text-gray-900">{selectedRequest.traveler_clearance_level}</p>
                    </div>
                    {selectedRequest.approver && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Approved By</label>
                        <p className="text-gray-900">{selectedRequest.approver}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Itinerary and Emergency Contacts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Itinerary</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Accommodation</label>
                      <p className="text-gray-900">{(selectedRequest.itinerary as any)?.accommodation || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Transportation</label>
                      <p className="text-gray-900">{(selectedRequest.itinerary as any)?.transportation || 'Not specified'}</p>
                    </div>
                    {(selectedRequest.itinerary as any)?.meetings && (selectedRequest.itinerary as any).meetings.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Scheduled Meetings</label>
                        <ul className="text-gray-900 space-y-1">
                          {(selectedRequest.itinerary as any).meetings.map((meeting: string, index: number) => (
                            <li key={index} className="text-sm">• {meeting}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contacts</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {(selectedRequest.emergency_contacts as any)?.local && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Local Emergency</label>
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <p className="text-gray-900">{(selectedRequest.emergency_contacts as any).local}</p>
                        </div>
                      </div>
                    )}
                    {(selectedRequest.emergency_contacts as any)?.embassy && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Embassy/Consulate</label>
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <p className="text-gray-900">{(selectedRequest.emergency_contacts as any).embassy}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Documents */}
              {selectedRequest.documents.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Supporting Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedRequest.documents.map((doc, index) => (
                      <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700 flex-1">{doc}</span>
                        <button className="text-blue-600 hover:text-blue-800 text-sm">Download</button>
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

export default TravelSecurityManagement;