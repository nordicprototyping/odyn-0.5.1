import React, { useState } from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Calendar,
  User,
  Building,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  Shield,
  Brain,
  Lightbulb,
  Zap,
  Plane,
  FileText
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AddEditRiskForm from './AddEditRiskForm';
import { useRisks } from '../hooks/useRisks';
import Modal from './common/Modal';
import MitigationDisplay from './MitigationDisplay';
import { AppliedMitigation } from '../types/mitigation';
import ConfirmationModal from './common/ConfirmationModal';
import { aiService, DetectedRisk } from '../services/aiService';
import { supabase } from '../lib/supabase';

type Risk = any;

const RiskManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('risk_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState<{id: string, title: string} | null>(null);
  const [aiDetectionLoading, setAiDetectionLoading] = useState(false);
  const [aiDetectionError, setAiDetectionError] = useState<string | null>(null);
  const [aiDetectionSuccess, setAiDetectionSuccess] = useState<string | null>(null);
  const [showAiDetectionConfirmation, setShowAiDetectionConfirmation] = useState(false);
  const [detectedRisks, setDetectedRisks] = useState<DetectedRisk[]>([]);
  const [sourceData, setSourceData] = useState<{
    assets: any[];
    personnel: any[];
    incidents: any[];
    travelPlans: any[];
  }>({
    assets: [],
    personnel: [],
    incidents: [],
    travelPlans: []
  });

  const { user, profile, hasPermission, organization } = useAuth();
  const { 
    risks, 
    userProfiles,
    loading, 
    error, 
    fetchRisks, 
    addRisk, 
    updateRisk, 
    deleteRisk
  } = useRisks();

  const handleCreateRisk = async (formData: any) => {
    try {
      const riskData = {
        ...formData,
        organization_id: profile?.organization_id || '',
        identified_by_user_id: formData.identified_by_user_id || user?.id || null,
        owner_user_id: formData.owner_user_id || user?.id || null,
        department: formData.department || profile?.department || null,
        is_ai_generated: false
      };

      await addRisk(riskData);
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding risk:', err);
      throw err;
    }
  };

  const handleUpdateRisk = async (formData: any) => {
    if (!editingRisk) return;

    try {
      const updateData = {
        ...formData,
        organization_id: profile?.organization_id,
        last_reviewed_at: new Date().toISOString()
      };

      await updateRisk(editingRisk.id, updateData);
      setShowEditForm(false);
      setEditingRisk(null);
    } catch (err) {
      console.error('Error updating risk:', err);
      throw err;
    }
  };

  const handleDeleteRisk = (riskId: string, riskTitle: string) => {
    setRiskToDelete({ id: riskId, title: riskTitle });
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteRisk = async () => {
    if (!riskToDelete) return;
    
    try {
      // Delete the risk
      await deleteRisk(riskToDelete.id);

      // Close the detail view if the deleted risk was selected
      if (selectedRisk?.id === riskToDelete.id) {
        setSelectedRisk(null);
      }
    } catch (err) {
      console.error('Error deleting risk:', err);
    }
  };

  const openEditForm = (risk: Risk) => {
    setEditingRisk(risk);
    setShowEditForm(true);
  };

  const getRiskLevelColor = (score: number) => {
    if (score <= 5) return 'text-green-600 bg-green-100 border-green-200';
    if (score <= 12) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    if (score <= 20) return 'text-orange-600 bg-orange-100 border-orange-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const getRiskLevel = (score: number) => {
    if (score <= 5) return 'Low';
    if (score <= 12) return 'Medium';
    if (score <= 20) return 'High';
    return 'Critical';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'identified': return 'bg-blue-100 text-blue-700';
      case 'assessed': return 'bg-yellow-100 text-yellow-700';
      case 'mitigated': return 'bg-green-100 text-green-700';
      case 'monitoring': return 'bg-purple-100 text-purple-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'identified': return <AlertCircle className="w-4 h-4" />;
      case 'assessed': return <Eye className="w-4 h-4" />;
      case 'mitigated': return <CheckCircle className="w-4 h-4" />;
      case 'monitoring': return <Activity className="w-4 h-4" />;
      case 'closed': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'physical_security_vulnerabilities': return 'Physical Security Vulnerabilities';
      case 'environmental_hazards': return 'Environmental Hazards';
      case 'natural_disasters': return 'Natural Disasters';
      case 'infrastructure_failure': return 'Infrastructure Failure';
      case 'personnel_safety_security': return 'Personnel Safety & Security';
      case 'asset_damage_loss': return 'Asset Damage/Loss';
      default: return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getSourceTypeIcon = (risk: Risk) => {
    if (risk.source_asset_id) return <Building className="w-4 h-4 text-blue-500" />;
    if (risk.source_personnel_id) return <User className="w-4 h-4 text-green-500" />;
    if (risk.source_incident_id) return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (risk.source_travel_plan_id) return <Plane className="w-4 h-4 text-orange-500" />;
    return null;
  };

  const getSourceTypeName = (risk: Risk): string => {
    if (risk.source_asset_id) return 'Asset';
    if (risk.source_personnel_id) return 'Personnel';
    if (risk.source_incident_id) return 'Incident';
    if (risk.source_travel_plan_id) return 'Travel Plan';
    return 'Unknown';
  };

  const getSourceName = async (risk: Risk): Promise<string> => {
    if (risk.source_asset_id) {
      const { data } = await supabase
        .from('assets')
        .select('name')
        .eq('id', risk.source_asset_id)
        .single();
      return data?.name || 'Unknown Asset';
    }
    
    if (risk.source_personnel_id) {
      const { data } = await supabase
        .from('personnel_details')
        .select('name')
        .eq('id', risk.source_personnel_id)
        .single();
      return data?.name || 'Unknown Personnel';
    }
    
    if (risk.source_incident_id) {
      const { data } = await supabase
        .from('incident_reports')
        .select('title')
        .eq('id', risk.source_incident_id)
        .single();
      return data?.title || 'Unknown Incident';
    }
    
    if (risk.source_travel_plan_id) {
      const { data } = await supabase
        .from('travel_plans')
        .select('traveler_name, destination')
        .eq('id', risk.source_travel_plan_id)
        .single();
      return data ? `${data.traveler_name}'s travel to ${(data.destination as any).city}` : 'Unknown Travel Plan';
    }
    
    return 'Unknown Source';
  };

  const filteredRisks = risks.filter(risk => {
    const matchesSearch = risk.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         risk.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || risk.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || risk.status === filterStatus;
    
    let matchesRiskLevel = true;
    if (filterRiskLevel === 'low') matchesRiskLevel = risk.risk_score <= 5;
    else if (filterRiskLevel === 'medium') matchesRiskLevel = risk.risk_score > 5 && risk.risk_score <= 12;
    else if (filterRiskLevel === 'high') matchesRiskLevel = risk.risk_score > 12 && risk.risk_score <= 20;
    else if (filterRiskLevel === 'critical') matchesRiskLevel = risk.risk_score > 20;
    
    let matchesSource = true;
    if (filterSource === 'ai') matchesSource = risk.is_ai_generated === true;
    else if (filterSource === 'manual') matchesSource = risk.is_ai_generated !== true;
    else if (filterSource === 'asset') matchesSource = risk.source_asset_id !== null;
    else if (filterSource === 'personnel') matchesSource = risk.source_personnel_id !== null;
    else if (filterSource === 'incident') matchesSource = risk.source_incident_id !== null;
    else if (filterSource === 'travel') matchesSource = risk.source_travel_plan_id !== null;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesRiskLevel && matchesSource;
  });

  const sortedRisks = [...filteredRisks].sort((a, b) => {
    const aValue = a[sortField as keyof Risk];
    const bValue = b[sortField as keyof Risk];
    
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

  const riskStats = {
    total: risks.length,
    critical: risks.filter(r => r.risk_score > 20).length,
    high: risks.filter(r => r.risk_score > 12 && r.risk_score <= 20).length,
    medium: risks.filter(r => r.risk_score > 5 && r.risk_score <= 12).length,
    low: risks.filter(r => r.risk_score <= 5).length,
    open: risks.filter(r => !['closed', 'mitigated'].includes(r.status)).length,
    aiGenerated: risks.filter(r => r.is_ai_generated).length,
    avgScore: risks.length > 0 ? Math.round(risks.reduce((sum, r) => sum + r.risk_score, 0) / risks.length) : 0
  };

  const handleAiRiskDetection = async () => {
    try {
      setAiDetectionLoading(true);
      setAiDetectionError(null);
      setAiDetectionSuccess(null);
      
      // Fetch all necessary data for AI risk detection
      const [
        { data: assets },
        { data: personnel },
        { data: incidents },
        { data: travelPlans }
      ] = await Promise.all([
        supabase.from('assets').select('*'),
        supabase.from('personnel_details').select('*'),
        supabase.from('incident_reports').select('*'),
        supabase.from('travel_plans').select('*')
      ]);
      
      // Store source data for reference when creating risks
      setSourceData({
        assets: assets || [],
        personnel: personnel || [],
        incidents: incidents || [],
        travelPlans: travelPlans || []
      });
      
      // Prepare aggregate data for AI analysis
      const aggregateData = {
        assets: assets || [],
        personnel: personnel || [],
        incidents: incidents || [],
        travelPlans: travelPlans || [],
        risks: risks || []
      };
      
      // Call AI service to detect risks
      const result = await aiService.detectRisks(profile?.organization_id || '', aggregateData);
      
      // Store detected risks for confirmation
      setDetectedRisks(result.risks);
      
      // Show confirmation dialog with detected risks
      if (result.risks.length > 0) {
        setShowAiDetectionConfirmation(true);
      } else {
        setAiDetectionSuccess('No new risks detected');
      }
    } catch (error) {
      console.error('Error detecting risks:', error);
      setAiDetectionError('Failed to detect risks. Please try again.');
    } finally {
      setAiDetectionLoading(false);
    }
  };

  const confirmAiRiskDetection = async () => {
    try {
      setAiDetectionLoading(true);
      
      // Create each detected risk
      let createdCount = 0;
      
      for (const detectedRisk of detectedRisks) {
        // Map the detected risk to the risk schema
        const riskData = {
          organization_id: profile?.organization_id || '',
          title: detectedRisk.title,
          description: detectedRisk.description,
          category: detectedRisk.category,
          impact: detectedRisk.impact,
          likelihood: detectedRisk.likelihood,
          status: 'identified',
          is_ai_generated: true,
          ai_confidence: detectedRisk.confidence,
          ai_detection_date: new Date().toISOString(),
          source_asset_id: detectedRisk.source_type === 'asset' ? detectedRisk.source_id : null,
          source_personnel_id: detectedRisk.source_type === 'personnel' ? detectedRisk.source_id : null,
          source_incident_id: detectedRisk.source_type === 'incident' ? detectedRisk.source_id : null,
          source_travel_plan_id: detectedRisk.source_type === 'travel' ? detectedRisk.source_id : null,
          department: detectedRisk.department || null,
          mitigation_plan: detectedRisk.recommendations.join('\n\n')
        };
        
        // Add the risk
        await addRisk(riskData);
        createdCount++;
      }
      
      // Close the confirmation dialog
      setShowAiDetectionConfirmation(false);
      
      // Show success message
      setAiDetectionSuccess(`Successfully created ${createdCount} AI-detected risks`);
      
      // Refresh risks
      await fetchRisks();
      
      // Clear detected risks
      setDetectedRisks([]);
    } catch (error) {
      console.error('Error creating AI-detected risks:', error);
      setAiDetectionError('Failed to create AI-detected risks. Please try again.');
    } finally {
      setAiDetectionLoading(false);
    }
  };

  // Check if AI risk detection is enabled in organization settings
  const isAiRiskDetectionEnabled = organization?.settings?.ai?.enabled && 
                                  organization?.settings?.ai?.riskDetection?.enabled;

  if (loading && risks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading risk data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Management</h1>
          <p className="text-gray-600">Identify, assess, and mitigate organizational risks</p>
        </div>
        <div className="flex items-center space-x-3">
          {isAiRiskDetectionEnabled && (
            <button
              onClick={handleAiRiskDetection}
              disabled={aiDetectionLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
            >
              {aiDetectionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Detecting Risks...</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  <span>AI Detect Risks</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Risk</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {aiDetectionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm">{aiDetectionError}</span>
          <button 
            onClick={() => setAiDetectionError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {aiDetectionSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="text-green-700 text-sm">{aiDetectionSuccess}</span>
          <button 
            onClick={() => setAiDetectionSuccess(null)}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Risks</p>
              <p className="text-2xl font-bold text-gray-900">{riskStats.total}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-600">{riskStats.critical}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High</p>
              <p className="text-2xl font-bold text-orange-600">{riskStats.high}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Medium</p>
              <p className="text-2xl font-bold text-yellow-600">{riskStats.medium}</p>
            </div>
            <Activity className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low</p>
              <p className="text-2xl font-bold text-green-600">{riskStats.low}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open</p>
              <p className="text-2xl font-bold text-blue-600">{riskStats.open}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">AI Detected</p>
              <p className="text-2xl font-bold text-purple-600">{riskStats.aiGenerated}</p>
            </div>
            <Brain className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Score</p>
              <p className="text-2xl font-bold text-purple-600">{riskStats.avgScore}</p>
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
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
                placeholder="Search risks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="physical_security_vulnerabilities">Physical Security Vulnerabilities</option>
              <option value="environmental_hazards">Environmental Hazards</option>
              <option value="natural_disasters">Natural Disasters</option>
              <option value="infrastructure_failure">Infrastructure Failure</option>
              <option value="personnel_safety_security">Personnel Safety & Security</option>
              <option value="asset_damage_loss">Asset Damage/Loss</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="identified">Identified</option>
              <option value="assessed">Assessed</option>
              <option value="mitigated">Mitigated</option>
              <option value="monitoring">Monitoring</option>
              <option value="closed">Closed</option>
            </select>
            
            <select
              value={filterRiskLevel}
              onChange={(e) => setFilterRiskLevel(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low (1-5)</option>
              <option value="medium">Medium (6-12)</option>
              <option value="high">High (13-20)</option>
              <option value="critical">Critical (21-25)</option>
            </select>
            
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Sources</option>
              <option value="manual">Manual Entry</option>
              <option value="ai">AI Detected</option>
              <option value="asset">Asset-related</option>
              <option value="personnel">Personnel-related</option>
              <option value="incident">Incident-related</option>
              <option value="travel">Travel-related</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Showing {sortedRisks.length} of {risks.length} risks
            </span>
          </div>
        </div>
      </div>

      {/* Risks Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Risk</span>
                    {sortField === 'title' && (
                      sortDirection === 'asc' ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Category</span>
                    {sortField === 'category' && (
                      sortDirection === 'asc' ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('risk_score')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Risk Score</span>
                    {sortField === 'risk_score' && (
                      sortDirection === 'asc' ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
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
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedRisks.map((risk) => (
                <tr key={risk.id} className={`hover:bg-gray-50 ${risk.is_ai_generated ? 'bg-purple-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                        {risk.is_ai_generated ? (
                          <Brain className="w-5 h-5 text-white" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-gray-900">{risk.title}</div>
                          {risk.is_ai_generated && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              <Brain className="w-3 h-3 mr-1" />
                              AI Detected
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{risk.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                      {getCategoryLabel(risk.category)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRiskLevelColor(risk.risk_score)}`}>
                        {risk.risk_score}
                      </span>
                      <span className="text-xs text-gray-500">{getRiskLevel(risk.risk_score)}</span>
                      {risk.is_ai_generated && risk.ai_confidence && (
                        <div className="flex items-center space-x-1">
                          <Zap className="w-3 h-3 text-purple-500" />
                          <span className="text-xs text-purple-600">{risk.ai_confidence}%</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(risk.status)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(risk.status)}`}>
                        {risk.status.charAt(0).toUpperCase() + risk.status.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <User className="w-4 h-4 mr-1 text-gray-400" />
                      {risk.owner_user_id ? userProfiles[risk.owner_user_id] || 'Unknown User' : 'Unassigned'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {risk.department || 'Not assigned'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {risk.is_ai_generated && getSourceTypeIcon(risk) && (
                      <div className="flex items-center space-x-1">
                        {getSourceTypeIcon(risk)}
                        <span className="text-xs text-gray-700">{getSourceTypeName(risk)}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedRisk(risk)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {hasPermission('risks.update') && (
                        <button
                          onClick={() => openEditForm(risk)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit risk"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission('risks.delete') && (
                        <button
                          onClick={() => handleDeleteRisk(risk.id, risk.title)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete risk"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Risk Form Modal */}
      {showAddForm && (
        <AddEditRiskForm
          onClose={() => setShowAddForm(false)}
          onSubmit={handleCreateRisk}
        />
      )}

      {/* Edit Risk Form Modal */}
      {showEditForm && editingRisk && (
        <AddEditRiskForm
          onClose={() => {
            setShowEditForm(false);
            setEditingRisk(null);
          }}
          onSubmit={handleUpdateRisk}
          riskToEdit={editingRisk}
        />
      )}

      {/* Risk Detail Modal */}
      <Modal
        isOpen={!!selectedRisk}
        onClose={() => setSelectedRisk(null)}
        size="xl"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center">
                {selectedRisk?.is_ai_generated ? (
                  <Brain className="w-8 h-8 text-white" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedRisk?.title}</h2>
                  {selectedRisk?.is_ai_generated && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      <Brain className="w-3 h-3 mr-1" />
                      AI Detected
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRiskLevelColor(selectedRisk?.risk_score)}`}>
                    Risk Score: {selectedRisk?.risk_score}
                  </span>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                    {selectedRisk?.category && getCategoryLabel(selectedRisk.category)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {hasPermission('risks.update') && (
                <button
                  onClick={() => {
                    openEditForm(selectedRisk);
                    setSelectedRisk(null);
                  }}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                  title="Edit risk"
                >
                  <Edit className="w-5 h-5" />
                </button>
              )}
              {hasPermission('risks.delete') && (
                <button
                  onClick={() => {
                    handleDeleteRisk(selectedRisk?.id, selectedRisk?.title);
                    setSelectedRisk(null);
                  }}
                  className="p-2 text-red-600 hover:text-red-800 transition-colors"
                  title="Delete risk"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
            <p className="text-gray-700">{selectedRisk?.description}</p>
          </div>
          
          {/* AI Detection Information */}
          {selectedRisk?.is_ai_generated && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Brain className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-purple-900">AI Detection Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-purple-700 mb-2">
                    This risk was automatically detected by AI on {new Date(selectedRisk?.ai_detection_date).toLocaleString()}.
                  </p>
                  
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-purple-800">Confidence:</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-bold text-purple-900">{selectedRisk?.ai_confidence}%</span>
                      <Zap className="w-4 h-4 text-yellow-500" />
                    </div>
                  </div>
                  
                  {(selectedRisk?.source_asset_id || 
                    selectedRisk?.source_personnel_id || 
                    selectedRisk?.source_incident_id || 
                    selectedRisk?.source_travel_plan_id) && (
                    <div className="flex items-start space-x-2">
                      <span className="text-sm font-medium text-purple-800">Source:</span>
                      <div className="flex items-center space-x-1">
                        {getSourceTypeIcon(selectedRisk)}
                        <span className="text-sm text-purple-900">{getSourceTypeName(selectedRisk)}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-purple-100">
                  <p className="text-xs text-gray-500 mb-1">AI Detection Explanation</p>
                  <p className="text-sm text-gray-700">
                    This risk was detected based on pattern analysis of historical data, current security posture, and predictive modeling.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Applied Mitigations */}
          {selectedRisk?.mitigations && (selectedRisk?.mitigations as AppliedMitigation[]).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Applied Mitigations</h3>
              <MitigationDisplay 
                mitigations={selectedRisk?.mitigations as AppliedMitigation[]}
                showCategory={true}
              />
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Risk Details</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Status</span>
                  <div className="flex items-center">
                    {getStatusIcon(selectedRisk?.status)}
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedRisk?.status)}`}>
                      {selectedRisk?.status.charAt(0).toUpperCase() + selectedRisk?.status.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Impact</span>
                  <span className="text-sm text-gray-900 capitalize">{selectedRisk?.impact.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Likelihood</span>
                  <span className="text-sm text-gray-900 capitalize">{selectedRisk?.likelihood.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Department</span>
                  <span className="text-sm text-gray-900">{selectedRisk?.department || 'Not assigned'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Owner</span>
                  <span className="text-sm text-gray-900">
                    {selectedRisk?.owner_user_id ? userProfiles[selectedRisk.owner_user_id] || 'Unknown User' : 'Not assigned'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Due Date</span>
                  <span className="text-sm text-gray-900">
                    {selectedRisk?.due_date ? new Date(selectedRisk?.due_date).toLocaleDateString() : 'No due date'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Last Reviewed</span>
                  <span className="text-sm text-gray-900">
                    {selectedRisk?.last_reviewed_at ? new Date(selectedRisk?.last_reviewed_at).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Mitigation Plan</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">
                  {selectedRisk?.mitigation_plan || 'No mitigation plan specified'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Delete */}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={confirmDeleteRisk}
        title="Delete Risk"
        message={`Are you sure you want to delete the risk "${riskToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* AI Risk Detection Confirmation Modal */}
      <Modal
        isOpen={showAiDetectionConfirmation}
        onClose={() => setShowAiDetectionConfirmation(false)}
        title="AI Risk Detection Results"
        size="xl"
      >
        <div className="p-6 space-y-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-purple-900">AI Risk Detection</h3>
            </div>
            <p className="text-sm text-purple-700">
              The AI has detected {detectedRisks.length} potential new risks based on pattern analysis of your organization's data.
              Review the detected risks below and confirm to add them to your risk register.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Detected Risks ({detectedRisks.length})</h3>
            
            {detectedRisks.length === 0 ? (
              <div className="bg-gray-50 p-8 text-center rounded-lg border border-gray-200">
                <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No new risks detected</p>
                <p className="text-sm text-gray-400 mt-1">The AI did not identify any new risks based on your current data.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {detectedRisks.map((risk, index) => (
                  <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Brain className="w-5 h-5 text-purple-600" />
                        <h4 className="font-medium text-gray-900">{risk.title}</h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                          risk.impact === 'very_high' || risk.likelihood === 'very_high' ? 'text-red-600 bg-red-100 border-red-200' :
                          risk.impact === 'high' || risk.likelihood === 'high' ? 'text-orange-600 bg-orange-100 border-orange-200' :
                          'text-yellow-600 bg-yellow-100 border-yellow-200'
                        }`}>
                          {risk.impact.replace('_', ' ')} Impact / {risk.likelihood.replace('_', ' ')} Likelihood
                        </span>
                        <div className="flex items-center space-x-1">
                          <Zap className="w-3 h-3 text-purple-500" />
                          <span className="text-xs text-purple-600">{risk.confidence}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-3">{risk.description}</p>
                    
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span className="inline-flex px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        {getCategoryLabel(risk.category)}
                      </span>
                      
                      {risk.source_type && risk.source_id && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          {risk.source_type === 'asset' && <Building className="w-3 h-3 mr-1" />}
                          {risk.source_type === 'personnel' && <User className="w-3 h-3 mr-1" />}
                          {risk.source_type === 'incident' && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {risk.source_type === 'travel' && <Plane className="w-3 h-3 mr-1" />}
                          {risk.source_type === 'pattern' && <Activity className="w-3 h-3 mr-1" />}
                          {risk.source_type.charAt(0).toUpperCase() + risk.source_type.slice(1)} Source
                        </span>
                      )}
                      
                      {risk.department && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          <Building className="w-3 h-3 mr-1" />
                          {risk.department}
                        </span>
                      )}
                    </div>
                    
                    {risk.recommendations && risk.recommendations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-1">Recommendations:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {risk.recommendations.slice(0, 2).map((rec, i) => (
                            <li key={i} className="flex items-start space-x-1">
                              <Shield className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                          {risk.recommendations.length > 2 && (
                            <li className="text-xs text-blue-600">+ {risk.recommendations.length - 2} more recommendations</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={() => setShowAiDetectionConfirmation(false)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmAiRiskDetection}
            disabled={detectedRisks.length === 0 || aiDetectionLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {aiDetectionLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                <span>Add {detectedRisks.length} AI-Detected Risks</span>
              </>
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default RiskManagement;