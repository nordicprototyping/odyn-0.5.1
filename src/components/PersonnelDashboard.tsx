import React, { useState } from 'react';
import {
  Users,
  MapPin,
  Shield,
  AlertTriangle,
  Clock,
  Plane,
  Building,
  Search,
  Filter,
  Download,
  Eye,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Globe,
  UserCheck,
  Car,
  FileText,
  Star,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Brain,
  Zap,
  Plus,
  Upload,
  Loader2
} from 'lucide-react';
import GoogleMapComponent from './common/GoogleMapComponent';
import AddPersonnelForm from './AddPersonnelForm';
import { useAuth } from '../hooks/useAuth';
import AIRiskInsights from './AIRiskInsights';
import MitigationDisplay from './MitigationDisplay';
import { AppliedMitigation } from '../types/mitigation';
import { usePersonnel } from '../hooks/usePersonnel';
import Modal from './common/Modal';

const PersonnelDashboard: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('list');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const { hasPermission } = useAuth();
  const { 
    personnel: personnelData, 
    loading, 
    error, 
    fetchPersonnel, 
    addPersonnel 
  } = usePersonnel();

  // Add console log to track rendering and state
  console.log('PersonnelDashboard rendering, showAddForm:', showAddForm);

  const handleAddPersonnel = async (personnelData: any) => {
    try {
      await addPersonnel(personnelData);
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding personnel:', err);
      throw err;
    }
  };

  const categoryStats = {
    'full-time': personnelData.filter(p => p.category === 'full-time').length,
    'contractor': personnelData.filter(p => p.category === 'contractor').length,
    'temporary': personnelData.filter(p => p.category === 'temporary').length,
    'remote': personnelData.filter(p => p.category === 'remote').length,
    'executive': personnelData.filter(p => p.category === 'executive').length,
    'field': personnelData.filter(p => p.category === 'field').length,
  };

  const riskStats = {
    low: personnelData.filter(p => (p.ai_risk_score as any).overall <= 30).length,
    medium: personnelData.filter(p => (p.ai_risk_score as any).overall > 30 && (p.ai_risk_score as any).overall <= 70).length,
    high: personnelData.filter(p => (p.ai_risk_score as any).overall > 70).length,
  };

  const filteredPersonnel = personnelData.filter(person => {
    const matchesCategory = selectedCategory === 'all' || person.category === selectedCategory;
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesRisk = true;
    if (riskFilter === 'low') matchesRisk = (person.ai_risk_score as any).overall <= 30;
    else if (riskFilter === 'medium') matchesRisk = (person.ai_risk_score as any).overall > 30 && (person.ai_risk_score as any).overall <= 70;
    else if (riskFilter === 'high') matchesRisk = (person.ai_risk_score as any).overall > 70;
    
    return matchesCategory && matchesSearch && matchesRisk;
  });

  const getAIRiskColor = (score: number) => {
    if (score <= 30) return 'text-green-600 bg-green-100 border-green-200';
    if (score <= 70) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const getAIRiskLevel = (score: number) => {
    if (score <= 30) return 'Low Risk';
    if (score <= 70) return 'Medium Risk';
    return 'High Risk';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingDown className="w-3 h-3 text-green-500" />;
      case 'deteriorating': return <TrendingUp className="w-3 h-3 text-red-500" />;
      case 'stable': return <div className="w-3 h-3 bg-gray-400 rounded-full"></div>;
      default: return <div className="w-3 h-3 bg-gray-400 rounded-full"></div>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'on-mission': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'in-transit': return <Car className="w-4 h-4 text-blue-500" />;
      case 'off-duty': return <Building className="w-4 h-4 text-gray-500" />;
      case 'unavailable': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getClearanceColor = (level: string) => {
    switch (level) {
      case 'Top Secret': return 'bg-red-100 text-red-700 border-red-200';
      case 'Secret': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Confidential': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Unclassified': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Convert personnel to map markers
  const mapMarkers = filteredPersonnel.map(person => ({
    id: person.id,
    position: {
      lat: (person.current_location as any).coordinates[1],
      lng: (person.current_location as any).coordinates[0]
    },
    title: person.name,
    type: 'personnel' as const,
    status: person.status,
    riskScore: (person.ai_risk_score as any).overall,
    details: {
      description: `${person.department} - ${person.category}`,
      department: person.department,
      lastUpdate: person.last_seen,
      clearance: person.clearance_level,
      workLocation: person.work_location
    }
  }));

  // Calculate map center based on filtered personnel
  const mapCenter = React.useMemo(() => {
    if (filteredPersonnel.length === 0) return { lat: 40.7128, lng: -74.0060 };
    
    const avgLat = filteredPersonnel.reduce((sum, person) => sum + (person.current_location as any).coordinates[1], 0) / filteredPersonnel.length;
    const avgLng = filteredPersonnel.reduce((sum, person) => sum + (person.current_location as any).coordinates[0], 0) / filteredPersonnel.length;
    
    return { lat: avgLat, lng: avgLng };
  }, [filteredPersonnel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading personnel data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchPersonnel}
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
          <h1 className="text-2xl font-bold text-gray-900">Personnel Security Dashboard</h1>
          <p className="text-gray-600">AI-enhanced tracking and risk assessment for all personnel</p>
        </div>
        <div className="flex items-center space-x-3">
          {hasPermission('personnel.create') && (
            <button
              onClick={() => {
                console.log('Add Personnel button clicked, setting showAddForm to true');
                setShowAddForm(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Personnel</span>
            </button>
          )}
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              <Building className="w-4 h-4" />
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Personnel</h3>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{personnelData.length}</div>
          <div className="text-sm text-green-600 mt-2">Active tracking</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">High AI Risk</h3>
            <div className="flex items-center space-x-1">
              <Brain className="w-4 h-4 text-red-500" />
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{riskStats.high}</div>
          <div className="text-sm text-red-600 mt-2">Requires attention</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Active Travel</h3>
            <Plane className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {personnelData.filter(p => (p.travel_status as any).isActive).length}
          </div>
          <div className="text-sm text-orange-600 mt-2">Currently traveling</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Avg AI Risk Score</h3>
            <Brain className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {personnelData.length > 0 ? Math.round(personnelData.reduce((sum, p) => sum + (p.ai_risk_score as any).overall, 0) / personnelData.length) : 0}
          </div>
          <div className="text-sm text-purple-600 mt-2">Lower is better</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search personnel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="full-time">Full-time ({categoryStats['full-time']})</option>
              <option value="contractor">Contractors ({categoryStats.contractor})</option>
              <option value="temporary">Temporary ({categoryStats.temporary})</option>
              <option value="remote">Remote ({categoryStats.remote})</option>
              <option value="executive">Executive ({categoryStats.executive})</option>
              <option value="field">Field ({categoryStats.field})</option>
            </select>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
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
              Showing {filteredPersonnel.length} of {personnelData.length} personnel
            </span>
          </div>
        </div>
      </div>

      {/* Personnel List/Grid/Map */}
      {viewMode === 'map' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Personnel Locations</h3>
            <p className="text-sm text-gray-600">
              Interactive map showing {filteredPersonnel.length} personnel across {new Set(filteredPersonnel.map(p => (p.current_location as any).country)).size} countries
            </p>
          </div>
          <GoogleMapComponent
            markers={mapMarkers}
            center={mapCenter}
            zoom={filteredPersonnel.length === 1 ? 10 : 2}
            height="500px"
            onMarkerClick={(marker) => {
              const person = filteredPersonnel.find(p => p.id === marker.id);
              if (person) setSelectedPersonnel(person);
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
                    Personnel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clearance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AI Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Travel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPersonnel.map((person) => (
                  <tr key={person.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {person.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{person.name}</div>
                          <div className="text-sm text-gray-500">{person.employee_id} • {person.department}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                        {(person.current_location as any).city}, {(person.current_location as any).country}
                      </div>
                      <div className="text-sm text-gray-500">{person.work_location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getClearanceColor(person.clearance_level)}`}>
                        {person.clearance_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <Brain className="w-4 h-4 text-purple-500" />
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getAIRiskColor((person.ai_risk_score as any).overall)}`}>
                            {(person.ai_risk_score as any).overall}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {getTrendIcon((person.ai_risk_score as any).trend)}
                          <Zap className="w-3 h-3 text-purple-400" title={`Confidence: ${(person.ai_risk_score as any).confidence}%`} />
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{getAIRiskLevel((person.ai_risk_score as any).overall)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(person.status)}
                        <span className="ml-2 text-sm text-gray-900 capitalize">
                          {person.status.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{person.last_seen}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(person.travel_status as any).isActive ? (
                        <div className="flex items-center text-sm text-orange-600">
                          <Plane className="w-4 h-4 mr-1" />
                          Active
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedPersonnel(person)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPersonnel.map((person) => (
            <div key={person.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {person.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Brain className="w-4 h-4 text-purple-500" />
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getAIRiskColor((person.ai_risk_score as any).overall)}`}>
                    {(person.ai_risk_score as any).overall}
                  </span>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{person.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{person.department}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  {(person.current_location as any).city}, {(person.current_location as any).country}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Shield className="w-4 h-4 mr-2" />
                  {person.clearance_level}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  {getStatusIcon(person.status)}
                  <span className="ml-2 capitalize">{person.status.replace('-', ' ')}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-1">
                  <Brain className="w-3 h-3 text-purple-500" />
                  <span className="text-xs text-gray-600">AI Risk:</span>
                  <span className={`text-xs font-medium ${(person.ai_risk_score as any).overall <= 30 ? 'text-green-600' : (person.ai_risk_score as any).overall <= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {getAIRiskLevel((person.ai_risk_score as any).overall)}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {getTrendIcon((person.ai_risk_score as any).trend)}
                  <span className="text-xs text-gray-500">
                    {(person.ai_risk_score as any).confidence}%
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedPersonnel(person)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Personnel Form Modal */}
      {showAddForm && (
        <AddPersonnelForm
          onClose={() => setShowAddForm(false)}
          onSubmit={handleAddPersonnel}
        />
      )}

      {/* Personnel Detail Modal */}
      <Modal
        isOpen={!!selectedPersonnel}
        onClose={() => setSelectedPersonnel(null)}
        size="full"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {selectedPersonnel?.name.split(' ').map((n: string) => n[0]).join('')}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedPersonnel?.name}</h2>
                <p className="text-gray-600">{selectedPersonnel?.employee_id} • {selectedPersonnel?.department}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-purple-500" />
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getAIRiskColor((selectedPersonnel?.ai_risk_score as any)?.overall || 0)}`}>
                  AI Risk: {(selectedPersonnel?.ai_risk_score as any)?.overall || 0}
                </span>
              </div>
            </div>
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
              score={(selectedPersonnel?.ai_risk_score as any)?.overall || 0}
              explanation={(selectedPersonnel?.ai_risk_score as any)?.explanation || "No AI analysis available for this personnel."}
              recommendations={(selectedPersonnel?.ai_risk_score as any)?.recommendations || []}
              confidence={(selectedPersonnel?.ai_risk_score as any)?.confidence || 75}
              trend={(selectedPersonnel?.ai_risk_score as any)?.trend || 'stable'}
              components={(selectedPersonnel?.ai_risk_score as any)?.components || {}}
            />
          </div>

          {/* Applied Mitigations */}
          {selectedPersonnel?.mitigations && (selectedPersonnel?.mitigations as AppliedMitigation[]).length > 0 && (
            <MitigationDisplay 
              mitigations={selectedPersonnel?.mitigations as AppliedMitigation[]}
              showCategory={true}
            />
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="text-gray-900 capitalize">{selectedPersonnel?.category.replace('-', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Current Location</label>
                  <p className="text-gray-900">{(selectedPersonnel?.current_location as any)?.city}, {(selectedPersonnel?.current_location as any)?.country}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Work Location</label>
                  <p className="text-gray-900">{selectedPersonnel?.work_location}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Security Clearance</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getClearanceColor(selectedPersonnel?.clearance_level)}`}>
                    {selectedPersonnel?.clearance_level}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-gray-900">{(selectedPersonnel?.emergency_contact as any)?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Relationship</label>
                  <p className="text-gray-900">{(selectedPersonnel?.emergency_contact as any)?.relationship}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{(selectedPersonnel?.emergency_contact as any)?.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Travel Status */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel Status</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Current Status</label>
                  <p className="text-gray-900">{(selectedPersonnel?.travel_status as any)?.current}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Active Travel</label>
                  <p className="text-gray-900">{(selectedPersonnel?.travel_status as any)?.isActive ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Authorization</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    (selectedPersonnel?.travel_status as any)?.authorization === 'approved' ? 'bg-green-100 text-green-700' :
                    (selectedPersonnel?.travel_status as any)?.authorization === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {(selectedPersonnel?.travel_status as any)?.authorization}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PersonnelDashboard;