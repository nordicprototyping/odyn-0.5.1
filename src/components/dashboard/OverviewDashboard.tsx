import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  AlertTriangle, 
  MapPin, 
  Users, 
  Brain, 
  Zap, 
  UserCheck, 
  Plane, 
  Car, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import RiskScoreWidget from '../RiskScoreWidget';
import { 
  getStatusIcon, 
  getPersonnelStatusIcon, 
  getAIRiskColor, 
  getStatusColor, 
  getPersonnelStatusColor 
} from '../../utils/uiHelpers';

interface ThreatLevel {
  level: string;
  count: number;
  color: string;
  trend: string;
}

interface RecentAlert {
  id: string;
  type: string;
  title: string;
  location: string;
  time: string;
  status: string;
  aiConfidence: number;
}

interface AssetOverview {
  name: string;
  status: string;
  personnel: number;
  lastUpdate: string;
  aiRisk: number;
}

interface PersonnelOverview {
  name: string;
  role: string;
  location: string;
  status: string;
  clearance: string;
  lastSeen: string;
  aiRiskScore: number;
}

const OverviewDashboard: React.FC = () => {
  const [threatLevels, setThreatLevels] = useState<ThreatLevel[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [assetsOverview, setAssetsOverview] = useState<AssetOverview[]>([]);
  const [personnelOverview, setPersonnelOverview] = useState<PersonnelOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep the external events as requested
  const externalEvents = [
    {
      id: 1,
      title: 'Civil Unrest in Kiev Region',
      severity: 'High',
      distance: '2.3 km from office',
      impact: 'Personnel evacuation protocols activated',
      aiAssessment: 'High probability of escalation within 24 hours'
    },
    {
      id: 2,
      title: 'Cyber Attack on Regional Infrastructure',
      severity: 'Critical',
      distance: 'Network-based threat',
      impact: 'Enhanced monitoring protocols',
      aiAssessment: 'Pattern matches known APT group signatures'
    },
    {
      id: 3,
      title: 'Political Tensions - Embassy District',
      severity: 'Medium',
      distance: '500m from embassy',
      impact: 'Increased security presence',
      aiAssessment: 'Moderate risk of spillover effects'
    }
  ];

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch incidents for threat levels and recent alerts
      const { data: incidents, error: incidentsError } = await supabase
        .from('incident_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (incidentsError) throw incidentsError;

      // Calculate threat levels from incidents
      const threatLevelsData = [
        { 
          level: 'Critical', 
          count: incidents?.filter(i => i.severity === 'Critical').length || 0, 
          color: 'bg-red-500', 
          trend: '+2' 
        },
        { 
          level: 'High', 
          count: incidents?.filter(i => i.severity === 'High').length || 0, 
          color: 'bg-orange-500', 
          trend: '+1' 
        },
        { 
          level: 'Medium', 
          count: incidents?.filter(i => i.severity === 'Medium').length || 0, 
          color: 'bg-yellow-500', 
          trend: '-3' 
        },
        { 
          level: 'Low', 
          count: incidents?.filter(i => i.severity === 'Low').length || 0, 
          color: 'bg-green-500', 
          trend: '-5' 
        }
      ];

      // Get recent alerts from incidents
      const recentAlertsData = incidents?.slice(0, 3).map((incident, index) => ({
        id: incident.id,
        type: incident.severity,
        title: incident.title,
        location: incident.location,
        time: new Date(incident.created_at).toLocaleString(),
        status: incident.status.toLowerCase().replace(' ', '_'),
        aiConfidence: 85 + (index * 5) // Simulated AI confidence
      })) || [];

      // Fetch assets for overview
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .limit(4);

      if (assetsError) throw assetsError;

      const assetsOverviewData = assets?.map(asset => ({
        name: asset.name,
        status: asset.status,
        personnel: (asset.personnel as any)?.current || 0,
        lastUpdate: new Date(asset.updated_at).toLocaleString(),
        aiRisk: (asset.ai_risk_score as any)?.overall || 0
      })) || [];

      // Fetch personnel for overview
      const { data: personnel, error: personnelError } = await supabase
        .from('personnel_details')
        .select('*')
        .limit(4);

      if (personnelError) throw personnelError;

      const personnelOverviewData = personnel?.map(person => ({
        name: person.name,
        role: person.category,
        location: `${(person.current_location as any)?.city || 'Unknown'}, ${(person.current_location as any)?.country || 'Unknown'}`,
        status: person.status,
        clearance: person.clearance_level,
        lastSeen: person.last_seen,
        aiRiskScore: (person.ai_risk_score as any)?.overall || 0
      })) || [];

      setThreatLevels(threatLevelsData);
      setRecentAlerts(recentAlertsData);
      setAssetsOverview(assetsOverviewData);
      setPersonnelOverview(personnelOverviewData);

    } catch (err) {
      console.error('Error fetching overview data:', err);
      setError('Failed to load overview data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchOverviewData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Stripe pattern background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="h-full w-full bg-gradient-to-br from-blue-600 via-transparent to-blue-600 bg-[length:20px_20px] bg-repeat" 
             style={{
               backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(59, 130, 246, 0.1) 10px, rgba(59, 130, 246, 0.1) 20px)'
             }}>
        </div>
      </div>

      {/* Top Row with AI Risk Score and Threat Levels */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8 relative z-10">
        {/* AI Risk Score Widget - Takes up 2 columns on large screens */}
        <div className="lg:col-span-2">
          <RiskScoreWidget 
            score={42} 
            previousScore={38} 
            className="h-full"
          />
        </div>
        
        {/* Threat Level Overview - Takes up 3 columns */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {threatLevels.map((threat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
                <div className={`w-full h-full ${threat.color} transform rotate-45 translate-x-8 -translate-y-8`}></div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">{threat.level} Threats</h3>
                <div className={`w-3 h-3 rounded-full ${threat.color}`}></div>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-gray-900">{threat.count}</span>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  threat.trend.startsWith('+') 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-green-100 text-green-600'
                }`}>
                  {threat.trend}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 relative z-10">
        {/* Global Threat Map */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Global Threat Map</h2>
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-500">AI-Enhanced</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <div className="relative h-80 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg overflow-hidden">
            {/* Stripe pattern overlay */}
            <div className="absolute inset-0 opacity-20" 
                 style={{
                   backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(59, 130, 246, 0.1) 40px, rgba(59, 130, 246, 0.1) 42px)'
                 }}>
            </div>
            
            {/* Mock world map with threat indicators */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-full">
                {/* Threat indicators */}
                <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-lg"></div>
                <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-orange-500 rounded-full animate-pulse shadow-lg"></div>
                <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-yellow-500 rounded-full animate-pulse shadow-lg"></div>
                <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg"></div>
                
                <div className="flex items-center justify-center h-full text-gray-400">
                  <Globe className="w-16 h-16" />
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-3">
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Critical</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>High</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Medium</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">AI-Enhanced Alerts</h2>
            <Brain className="w-5 h-5 text-purple-500" />
          </div>
          <div className="space-y-4">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="border-l-4 border-red-500 pl-4 pb-4 border-b border-gray-100 last:border-b-0">
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    alert.type === 'Critical' ? 'bg-red-100 text-red-700' :
                    alert.type === 'High' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {alert.type}
                  </span>
                  <span className="text-xs text-gray-500">{alert.time}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{alert.title}</h3>
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <MapPin className="w-4 h-4 mr-1" />
                  {alert.location}
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="w-3 h-3 text-purple-500" />
                  <span className="text-xs text-purple-600">AI Confidence: {alert.aiConfidence}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* External Events Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">External Events & Geopolitical Intelligence</h2>
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-500">Real-time Monitoring</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {externalEvents.map((event) => (
            <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  event.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                  event.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {event.severity}
                </span>
                <Globe className="w-4 h-4 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  <span>{event.distance}</span>
                </div>
                <div>
                  <span className="font-medium">Impact:</span> {event.impact}
                </div>
                <div className="bg-purple-50 p-2 rounded border border-purple-200">
                  <div className="flex items-center space-x-1 mb-1">
                    <Brain className="w-3 h-3 text-purple-600" />
                    <span className="text-xs font-medium text-purple-800">AI Assessment</span>
                  </div>
                  <p className="text-xs text-purple-700">{event.aiAssessment}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 relative z-10">
        {/* Risk Assessment Matrix */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">AI Risk Assessment Matrix</h2>
            <Brain className="w-5 h-5 text-purple-500" />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 25 }, (_, i) => {
              const intensity = Math.random();
              return (
                <div 
                  key={i} 
                  className={`aspect-square rounded-sm ${
                    intensity > 0.7 ? 'bg-red-500' :
                    intensity > 0.5 ? 'bg-orange-400' :
                    intensity > 0.3 ? 'bg-yellow-400' :
                    'bg-green-400'
                  }`}
                  style={{ opacity: intensity }}
                ></div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-between text-xs text-gray-500">
            <span>Low Impact</span>
            <span>High Impact</span>
          </div>
          <div className="mt-2 text-center">
            <span className="text-xs text-purple-600">AI-powered predictive modeling</span>
          </div>
        </div>

        {/* Asset Protection Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Asset Protection Status</h2>
          <div className="space-y-4">
            {assetsOverview.map((asset, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(asset.status)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{asset.name}</h3>
                    <p className="text-sm text-gray-600">{asset.personnel} personnel • {asset.lastUpdate}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Brain className="w-3 h-3 text-purple-500" />
                      <span className={`text-xs font-medium ${getAIRiskColor(asset.aiRisk)}`}>
                        AI Risk: {asset.aiRisk}
                      </span>
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(asset.status)}`}>
                  {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Personnel Security Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Personnel Security Overview</h2>
          <div className="flex items-center space-x-2">
            <Brain className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-500">AI-Enhanced Tracking</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Active Personnel</p>
                <p className="text-2xl font-bold text-green-700">
                  {personnelOverview.filter(p => p.status === 'active').length}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">On Mission</p>
                <p className="text-2xl font-bold text-orange-700">
                  {personnelOverview.filter(p => p.status === 'on-mission').length}
                </p>
              </div>
              <Plane className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">In Transit</p>
                <p className="text-2xl font-bold text-blue-700">
                  {personnelOverview.filter(p => p.status === 'in-transit').length}
                </p>
              </div>
              <Car className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">High AI Risk</p>
                <p className="text-2xl font-bold text-purple-700">
                  {personnelOverview.filter(p => p.aiRiskScore > 70).length}
                </p>
              </div>
              <Brain className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Key Personnel Status</h3>
          {personnelOverview.map((person, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {person.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{person.name}</h4>
                  <p className="text-sm text-gray-600">{person.role} • {person.clearance}</p>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {person.location}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    {getPersonnelStatusIcon(person.status)}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPersonnelStatusColor(person.status)}`}>
                      {person.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Last seen: {person.lastSeen}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <Brain className="w-3 h-3 text-purple-500" />
                    <span className={`text-xs font-medium ${getAIRiskColor(person.aiRiskScore)}`}>
                      AI Risk: {person.aiRiskScore}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default OverviewDashboard;