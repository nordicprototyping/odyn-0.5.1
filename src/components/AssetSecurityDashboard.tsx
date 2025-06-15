import React, { useState } from 'react';
import {
  Shield,
  Building,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Search,
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  Brain,
  Zap,
  Camera,
  Lock,
  Wifi,
  Server,
  Globe,
  Phone,
  Mail,
  Calendar,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  Loader2
} from 'lucide-react';
import GoogleMapComponent from './common/GoogleMapComponent';
import AddAssetForm from './AddAssetForm';
import { useAuth } from '../hooks/useAuth';
import MitigationDisplay from './MitigationDisplay';
import { AppliedMitigation } from '../types/mitigation';
import AIRiskInsights from './AIRiskInsights';
import { useAssets } from '../hooks/useAssets';
import Modal from './common/Modal';

const AssetSecurityDashboard: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('ai_risk_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showAddAssetForm, setShowAddAssetForm] = useState(false);

  const { hasPermission } = useAuth();
  const { 
    assets: assetsData, 
    loading, 
    error, 
    fetchAssets, 
    addAsset, 
    deleteAsset, 
    logAuditEvent 
  } = useAssets();

  // Add console log to track rendering and state
  console.log('AssetSecurityDashboard rendering, showAddAssetForm:', showAddAssetForm);

  const handleAddAsset = async (assetData: any) => {
    try {
      const newAsset = await addAsset(assetData);
      if (newAsset) {
        await logAuditEvent('asset_created', newAsset.id, { 
          asset_name: newAsset.name,
          asset_type: newAsset.type,
          asset_location: newAsset.location
        });
      }
      setShowAddAssetForm(false);
    } catch (err) {
      console.error('Error adding asset:', err);
      throw err;
    }
  };

  const handleDeleteAsset = async (assetId: string, assetName: string) => {
    // Ask for confirmation before deleting
    const confirmDelete = window.confirm(`Are you sure you want to delete the asset "${assetName}"? This action cannot be undone.`);
    
    if (!confirmDelete) {
      return; // User cancelled the operation
    }
    
    try {
      // Delete the asset from the database
      await deleteAsset(assetId);

      // Log the deletion in audit logs
      await logAuditEvent('asset_deleted', assetId, { 
        asset_name: assetName,
        deleted_at: new Date().toISOString()
      });

      // Close the detail view if the deleted asset was selected
      if (selectedAsset?.id === assetId) {
        setSelectedAsset(null);
      }
    } catch (err) {
      console.error('Error deleting asset:', err);
    }
  };

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
      case 'secure': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'alert': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'maintenance': return <XCircle className="w-4 h-4 text-yellow-500" />;
      case 'offline': return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'compromised': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'secure': return 'bg-green-100 text-green-700';
      case 'alert': return 'bg-red-100 text-red-700';
      case 'maintenance': return 'bg-yellow-100 text-yellow-700';
      case 'offline': return 'bg-gray-100 text-gray-700';
      case 'compromised': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSystemStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600';
      case 'offline': return 'text-red-600';
      case 'maintenance': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const filteredAssets = assetsData.filter(asset => {
    const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
    const matchesType = filterType === 'all' || asset.type === filterType;
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (asset.location as any)?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesRisk = true;
    const riskScore = (asset.ai_risk_score as any)?.overall || 0;
    if (filterRisk === 'low') matchesRisk = riskScore <= 30;
    else if (filterRisk === 'medium') matchesRisk = riskScore > 30 && riskScore <= 70;
    else if (filterRisk === 'high') matchesRisk = riskScore > 70;
    
    return matchesStatus && matchesType && matchesSearch && matchesRisk;
  });

  const sortedAssets = [...filteredAssets].sort((a, b) => {
    let aValue, bValue;
    
    if (sortField === 'ai_risk_score') {
      aValue = (a.ai_risk_score as any)?.overall || 0;
      bValue = (b.ai_risk_score as any)?.overall || 0;
    } else {
      aValue = a[sortField as keyof typeof a];
      bValue = b[sortField as keyof typeof b];
    }
    
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

  const assetStats = {
    total: assetsData.length,
    secure: assetsData.filter(a => a.status === 'secure').length,
    alert: assetsData.filter(a => a.status === 'alert').length,
    maintenance: assetsData.filter(a => a.status === 'maintenance').length,
    highRisk: assetsData.filter(a => ((a.ai_risk_score as any)?.overall || 0) > 70).length,
    avgRisk: assetsData.length > 0 ? Math.round(assetsData.reduce((sum, a) => sum + ((a.ai_risk_score as any)?.overall || 0), 0) / assetsData.length) : 0
  };

  // Convert assets to map markers
  const mapMarkers = filteredAssets.map(asset => ({
    id: asset.id,
    position: {
      lat: (asset.location as any)?.coordinates?.[1] || 0,
      lng: (asset.location as any)?.coordinates?.[0] || 0
    },
    title: asset.name,
    type: 'asset' as const,
    status: asset.status,
    riskScore: (asset.ai_risk_score as any)?.overall || 0,
    details: {
      description: `${asset.type.replace('-', ' ')} in ${(asset.location as any)?.city || 'Unknown'}`,
      department: (asset.responsible_officer as any)?.department || 'Unknown',
      lastUpdate: 'Recently',
      personnel: `${(asset.personnel as any)?.current || 0}/${(asset.personnel as any)?.capacity || 0}`,
      compliance: `${(asset.compliance as any)?.score || 0}%`
    }
  }));

  // Calculate map center based on filtered assets
  const mapCenter = React.useMemo(() => {
    if (filteredAssets.length === 0) return { lat: 40.7128, lng: -74.0060 };
    
    const validAssets = filteredAssets.filter(asset => 
      (asset.location as any)?.coordinates?.[1] && (asset.location as any)?.coordinates?.[0]
    );
    
    if (validAssets.length === 0) return { lat: 40.7128, lng: -74.0060 };
    
    const avgLat = validAssets.reduce((sum, asset) => sum + (asset.location as any).coordinates[1], 0) / validAssets.length;
    const avgLng = validAssets.reduce((sum, asset) => sum + (asset.location as any).coordinates[0], 0) / validAssets.length;
    
    return { lat: avgLat, lng: avgLng };
  }, [filteredAssets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading asset data...</p>
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
            onClick={fetchAssets}
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
          <h1 className="text-2xl font-bold text-gray-900">Asset Security Management</h1>
          <p className="text-gray-600">AI-enhanced monitoring and protection of critical assets</p>
        </div>
        <div className="flex items-center space-x-3">
          {hasPermission('assets.create') && (
            <button 
              onClick={() => {
                console.log('Add Asset button clicked, setting showAddAssetForm to true');
                setShowAddAssetForm(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Asset</span>
            </button>
          )}
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <Building className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              <Shield className="w-4 h-4" />
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
              <p className="text-sm text-gray-600">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">{assetStats.total}</p>
            </div>
            <Building className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Secure</p>
              <p className="text-2xl font-bold text-green-600">{assetStats.secure}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Alerts</p>
              <p className="text-2xl font-bold text-red-600">{assetStats.alert}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Maintenance</p>
              <p className="text-2xl font-bold text-yellow-600">{assetStats.maintenance}</p>
            </div>
            <Settings className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High AI Risk</p>
              <p className="text-2xl font-bold text-red-600">{assetStats.highRisk}</p>
            </div>
            <Brain className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg AI Risk</p>
              <p className="text-2xl font-bold text-purple-600">{assetStats.avgRisk}</p>
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
                placeholder="Search assets..."
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
              <option value="secure">Secure</option>
              <option value="alert">Alert</option>
              <option value="maintenance">Maintenance</option>
              <option value="offline">Offline</option>
              <option value="compromised">Compromised</option>
            </select>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="building">Buildings</option>
              <option value="facility">Facilities</option>
              <option value="embassy">Embassies</option>
              <option value="data-center">Data Centers</option>
              <option value="vehicle">Vehicles</option>
              <option value="equipment">Equipment</option>
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
              Showing {sortedAssets.length} of {assetsData.length} assets
            </span>
          </div>
        </div>
      </div>

      {/* Assets List/Grid/Map */}
      {viewMode === 'map' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Asset Locations</h3>
            <p className="text-sm text-gray-600">
              Interactive map showing {filteredAssets.length} assets across {new Set(filteredAssets.map(a => (a.location as any)?.country).filter(Boolean)).size} countries
            </p>
          </div>
          <GoogleMapComponent
            markers={mapMarkers}
            center={mapCenter}
            zoom={filteredAssets.length === 1 ? 10 : 2}
            height="500px"
            onMarkerClick={(marker) => {
              const asset = filteredAssets.find(a => a.id === marker.id);
              if (asset) setSelectedAsset(asset);
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
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('ai_risk_score')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>AI Risk Score</span>
                      {sortField === 'ai_risk_score' && (
                        sortDirection === 'asc' ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Personnel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Security Systems
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedAssets.map((asset) => {
                  const riskScore = (asset.ai_risk_score as any)?.overall || 0;
                  const location = asset.location as any;
                  const personnel = asset.personnel as any;
                  const securitySystems = asset.security_systems as any;
                  const hasMitigations = asset.mitigations && (asset.mitigations as any[]).length > 0;
                  
                  return (
                    <tr key={asset.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Building className="w-5 h-5 text-white" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                            <div className="text-sm text-gray-500">{asset.id.slice(0, 8)} • {asset.type.replace('-', ' ')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                          {location?.city || 'Unknown'}, {location?.country || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">{location?.address || 'No address'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Brain className="w-4 h-4 text-purple-500" />
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getAIRiskColor(riskScore)}`}>
                              {riskScore}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {getTrendIcon((asset.ai_risk_score as any)?.trend || 'stable')}
                            <Zap className="w-3 h-3 text-purple-400" title={`Confidence: ${(asset.ai_risk_score as any)?.confidence || 0}%`} />
                          </div>
                          {hasMitigations && (
                            <Shield className="w-4 h-4 text-green-500" title="Mitigations applied" />
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{getAIRiskLevel(riskScore)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(asset.status)}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(asset.status)}`}>
                            {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Recently updated</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Users className="w-4 h-4 mr-1 text-gray-400" />
                          {personnel?.current || 0}/{personnel?.capacity || 0}
                        </div>
                        <div className="text-xs text-gray-500">
                          {personnel?.capacity ? Math.round(((personnel?.current || 0) / personnel.capacity) * 100) : 0}% capacity
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Camera className={`w-4 h-4 ${getSystemStatusColor(securitySystems?.cctv?.status || 'offline')}`} />
                          <Lock className={`w-4 h-4 ${getSystemStatusColor(securitySystems?.accessControl?.status || 'offline')}`} />
                          <Shield className={`w-4 h-4 ${getSystemStatusColor(securitySystems?.alarms?.status || 'offline')}`} />
                          <Wifi className={`w-4 h-4 ${getSystemStatusColor(securitySystems?.networkSecurity?.status || 'offline')}`} />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedAsset(asset)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {hasPermission('assets.update') && (
                            <button 
                              className="text-gray-600 hover:text-gray-900"
                              title="Edit asset"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('assets.delete') && (
                            <button 
                              onClick={() => handleDeleteAsset(asset.id, asset.name)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete asset"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAssets.map((asset) => {
            const riskScore = (asset.ai_risk_score as any)?.overall || 0;
            const location = asset.location as any;
            const personnel = asset.personnel as any;
            const hasMitigations = asset.mitigations && (asset.mitigations as any[]).length > 0;
            
            return (
              <div key={asset.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Brain className="w-4 h-4 text-purple-500" />
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getAIRiskColor(riskScore)}`}>
                      {riskScore}
                    </span>
                    {hasMitigations && (
                      <Shield className="w-4 h-4 text-green-500" title="Mitigations applied" />
                    )}
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{asset.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{asset.type.replace('-', ' ')}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {location?.city || 'Unknown'}, {location?.country || 'Unknown'}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    {personnel?.current || 0}/{personnel?.capacity || 0} personnel
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    {getStatusIcon(asset.status)}
                    <span className="ml-2 capitalize">{asset.status}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-1">
                    <Brain className="w-3 h-3 text-purple-500" />
                    <span className="text-xs text-gray-600">AI Risk:</span>
                    <span className={`text-xs font-medium ${riskScore <= 30 ? 'text-green-600' : riskScore <= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {getAIRiskLevel(riskScore)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getTrendIcon((asset.ai_risk_score as any)?.trend || 'stable')}
                    <span className="text-xs text-gray-500">
                      {(asset.ai_risk_score as any)?.confidence || 0}%
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedAsset(asset)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </button>
                  
                  {hasPermission('assets.delete') && (
                    <button
                      onClick={() => handleDeleteAsset(asset.id, asset.name)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title="Delete asset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Asset Form Modal */}
      {showAddAssetForm && (
        <AddAssetForm
          onClose={() => setShowAddAssetForm(false)}
          onSubmit={handleAddAsset}
        />
      )}

      {/* Asset Detail Modal */}
      <Modal
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        size="full"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedAsset?.name}</h2>
                <p className="text-gray-600">{selectedAsset?.id.slice(0, 8)} • {selectedAsset?.type.replace('-', ' ')}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-purple-500" />
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getAIRiskColor((selectedAsset?.ai_risk_score as any)?.overall || 0)}`}>
                  AI Risk: {(selectedAsset?.ai_risk_score as any)?.overall || 0}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {hasPermission('assets.delete') && (
                <button
                  onClick={() => {
                    handleDeleteAsset(selectedAsset?.id, selectedAsset?.name);
                  }}
                  className="p-2 text-red-600 hover:text-red-800 transition-colors"
                  title="Delete asset"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
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
              score={(selectedAsset?.ai_risk_score as any)?.overall || 0}
              explanation={(selectedAsset?.ai_risk_score as any)?.explanation || "No AI analysis available for this asset."}
              recommendations={(selectedAsset?.ai_risk_score as any)?.recommendations || []}
              confidence={(selectedAsset?.ai_risk_score as any)?.confidence || 75}
              trend={(selectedAsset?.ai_risk_score as any)?.trend || 'stable'}
              components={(selectedAsset?.ai_risk_score as any)?.components || {}}
            />
          </div>

          {/* Applied Mitigations */}
          {selectedAsset?.mitigations && (selectedAsset?.mitigations as AppliedMitigation[]).length > 0 && (
            <MitigationDisplay 
              mitigations={selectedAsset?.mitigations as AppliedMitigation[]}
              showCategory={true}
            />
          )}

          {/* Basic Information and Security Systems */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <p className="text-gray-900">{(selectedAsset?.location as any)?.address || 'No address'}</p>
                  <p className="text-gray-600">{(selectedAsset?.location as any)?.city || 'Unknown'}, {(selectedAsset?.location as any)?.country || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Personnel Capacity</label>
                  <p className="text-gray-900">{(selectedAsset?.personnel as any)?.current || 0} / {(selectedAsset?.personnel as any)?.capacity || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Responsible Officer</label>
                  <p className="text-gray-900">{(selectedAsset?.responsible_officer as any)?.name || 'Unknown'}</p>
                  <p className="text-gray-600">{(selectedAsset?.responsible_officer as any)?.email || 'No email'}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Systems</h3>
              <div className="space-y-3">
                {(selectedAsset?.security_systems as any) && Object.entries(selectedAsset?.security_systems as any).map(([system, data]: [string, any]) => (
                  <div key={system} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      {system === 'cctv' && <Camera className="w-4 h-4 text-gray-500" />}
                      {system === 'accessControl' && <Lock className="w-4 h-4 text-gray-500" />}
                      {system === 'alarms' && <Shield className="w-4 h-4 text-gray-500" />}
                      {system === 'fireSupression' && <AlertTriangle className="w-4 h-4 text-gray-500" />}
                      {system === 'networkSecurity' && <Wifi className="w-4 h-4 text-gray-500" />}
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {system.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${getSystemStatusColor(data?.status || 'offline')}`}>
                      {data?.status || 'offline'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Compliance and Incidents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Compliance Score</span>
                    <span className="text-lg font-bold text-green-600">{(selectedAsset?.compliance as any)?.score || 0}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Audit</span>
                    <span className="text-sm text-gray-900">{(selectedAsset?.compliance as any)?.lastAudit ? new Date((selectedAsset?.compliance as any).lastAudit).toLocaleDateString() : 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Next Audit</span>
                    <span className="text-sm text-gray-900">{(selectedAsset?.compliance as any)?.nextAudit ? new Date((selectedAsset?.compliance as any).nextAudit).toLocaleDateString() : 'Unknown'}</span>
                  </div>
                  {(selectedAsset?.compliance as any)?.issues && (selectedAsset?.compliance as any).issues.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Outstanding Issues</span>
                      <ul className="mt-1 space-y-1">
                        {(selectedAsset?.compliance as any).issues.map((issue: string, index: number) => (
                          <li key={index} className="text-sm text-red-600">• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Incident History</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total Incidents</span>
                    <span className="text-lg font-bold text-gray-900">{(selectedAsset?.incidents as any)?.total || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Incident</span>
                    <span className="text-sm text-gray-900">
                      {(selectedAsset?.incidents as any)?.lastIncident === 'None' ? 'None' : ((selectedAsset?.incidents as any)?.lastIncident ? new Date((selectedAsset?.incidents as any).lastIncident).toLocaleDateString() : 'Unknown')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Severity Level</span>
                    <span className={`text-sm font-medium capitalize ${
                      (selectedAsset?.incidents as any)?.severity === 'critical' ? 'text-red-600' :
                      (selectedAsset?.incidents as any)?.severity === 'high' ? 'text-orange-600' :
                      (selectedAsset?.incidents as any)?.severity === 'medium' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {(selectedAsset?.incidents as any)?.severity || 'low'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AssetSecurityDashboard;