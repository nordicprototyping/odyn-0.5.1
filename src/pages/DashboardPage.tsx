import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout, { Widget } from '../components/dashboard/DashboardLayout';
import OverviewDashboard from '../components/dashboard/OverviewDashboard';
import RiskScoreWidget from '../components/RiskScoreWidget';
import { supabase } from '../lib/supabase';
import { aiService } from '../services/aiService';
import { useAuth } from '../hooks/useAuth';
import { 
  Globe, 
  Shield, 
  Users, 
  Plane, 
  AlertCircle, 
  Building2, 
  BarChart, 
  Map, 
  Brain,
  AlertTriangle
} from 'lucide-react';
import GoogleMapComponent from '../components/common/GoogleMapComponent';
import AIRiskInsights from '../components/AIRiskInsights';

const DashboardPage: React.FC = () => {
  const location = useLocation();
  const { organization } = useAuth();
  const [organizationRiskScore, setOrganizationRiskScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [travelPlans, setTravelPlans] = useState<any[]>([]);
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const savedOrder = localStorage.getItem('dashboardWidgetOrder');
    return savedOrder ? JSON.parse(savedOrder) : [];
  });

  useEffect(() => {
    if (organization?.id) {
      fetchDashboardData(organization.id);
    }
  }, [organization]);

  const fetchDashboardData = async (organizationId: string) => {
    try {
      setLoading(true);
      
      // Fetch data needed for dashboard
      const [
        { data: assetsData },
        { data: personnelData },
        { data: incidentsData },
        { data: travelPlansData },
        { data: risksData }
      ] = await Promise.all([
        supabase.from('assets').select('*').eq('organization_id', organizationId),
        supabase.from('personnel_details').select('*').eq('organization_id', organizationId),
        supabase.from('incident_reports').select('*').eq('organization_id', organizationId),
        supabase.from('travel_plans').select('*').eq('organization_id', organizationId),
        supabase.from('risks').select('*').eq('organization_id', organizationId)
      ]);
      
      setAssets(assetsData || []);
      setPersonnel(personnelData || []);
      setIncidents(incidentsData || []);
      setTravelPlans(travelPlansData || []);
      
      // Call AI service to calculate organization risk score
      const aggregateData = {
        assets: assetsData || [],
        personnel: personnelData || [],
        incidents: incidentsData || [],
        risks: risksData || [],
        travelPlans: travelPlansData || []
      };
      
      const result = await aiService.scoreOrganizationRisk(organizationId, aggregateData);
      setOrganizationRiskScore(result.score);
      setAiInsights(result);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Fallback to a default score if calculation fails
      setOrganizationRiskScore(42);
    } finally {
      setLoading(false);
    }
  };

  const handleWidgetOrderChange = (newOrder: string[]) => {
    setWidgetOrder(newOrder);
    localStorage.setItem('dashboardWidgetOrder', JSON.stringify(newOrder));
  };

  // Convert assets and personnel to map markers
  const mapMarkers = [
    ...assets.map(asset => ({
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
    })),
    ...personnel.map(person => ({
      id: person.id,
      position: {
        lat: (person.current_location as any)?.coordinates?.[1] || 0,
        lng: (person.current_location as any)?.coordinates?.[0] || 0
      },
      title: person.name,
      type: 'personnel' as const,
      status: person.status,
      riskScore: (person.ai_risk_score as any)?.overall || 0,
      details: {
        description: `${person.department} - ${person.category}`,
        department: person.department,
        lastUpdate: person.last_seen,
        clearance: person.clearance_level
      }
    }))
  ];

  // Calculate map center based on all markers
  const mapCenter = React.useMemo(() => {
    if (mapMarkers.length === 0) return { lat: 40.7128, lng: -74.0060 };
    
    const validMarkers = mapMarkers.filter(marker => 
      marker.position.lat !== 0 && marker.position.lng !== 0
    );
    
    if (validMarkers.length === 0) return { lat: 40.7128, lng: -74.0060 };
    
    const avgLat = validMarkers.reduce((sum, marker) => sum + marker.position.lat, 0) / validMarkers.length;
    const avgLng = validMarkers.reduce((sum, marker) => sum + marker.position.lng, 0) / validMarkers.length;
    
    return { lat: avgLat, lng: avgLng };
  }, [mapMarkers]);

  // Define dashboard widgets
  const dashboardWidgets: Widget[] = [
    {
      id: 'risk-score',
      title: 'Organization Risk Score',
      size: 'medium',
      component: <RiskScoreWidget score={organizationRiskScore || 42} previousScore={38} />,
      defaultOrder: 1
    },
    {
      id: 'global-map',
      title: 'Global Asset & Personnel Map',
      size: 'large',
      component: (
        <div className="h-[400px]">
          <GoogleMapComponent
            markers={mapMarkers}
            center={mapCenter}
            zoom={2}
            height="100%"
            showInfoWindows={true}
          />
        </div>
      ),
      defaultOrder: 2
    },
    {
      id: 'ai-insights',
      title: 'AI Risk Insights',
      size: 'large',
      component: aiInsights ? (
        <AIRiskInsights
          score={aiInsights.score}
          explanation={aiInsights.explanation}
          recommendations={aiInsights.recommendations}
          confidence={aiInsights.confidence}
          trend={aiInsights.trend}
          components={aiInsights.components}
          compact={true}
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Brain className="w-12 h-12 text-purple-300 mx-auto mb-2" />
            <p className="text-gray-500">AI insights loading...</p>
          </div>
        </div>
      ),
      defaultOrder: 3
    },
    {
      id: 'asset-status',
      title: 'Asset Security Status',
      size: 'medium',
      component: (
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">Total Assets: {assets.length}</span>
            <Building2 className="w-5 h-5 text-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 p-2 rounded-lg border border-green-100">
              <div className="text-sm font-medium text-green-800">Secure</div>
              <div className="text-xl font-bold text-green-600">
                {assets.filter(a => a.status === 'secure').length}
              </div>
            </div>
            <div className="bg-red-50 p-2 rounded-lg border border-red-100">
              <div className="text-sm font-medium text-red-800">Alert</div>
              <div className="text-xl font-bold text-red-600">
                {assets.filter(a => a.status === 'alert').length}
              </div>
            </div>
            <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-100">
              <div className="text-sm font-medium text-yellow-800">Maintenance</div>
              <div className="text-xl font-bold text-yellow-600">
                {assets.filter(a => a.status === 'maintenance').length}
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
              <div className="text-sm font-medium text-gray-800">Offline</div>
              <div className="text-xl font-bold text-gray-600">
                {assets.filter(a => a.status === 'offline').length}
              </div>
            </div>
          </div>
        </div>
      ),
      defaultOrder: 4
    },
    {
      id: 'personnel-status',
      title: 'Personnel Status',
      size: 'medium',
      component: (
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">Total Personnel: {personnel.length}</span>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 p-2 rounded-lg border border-green-100">
              <div className="text-sm font-medium text-green-800">Active</div>
              <div className="text-xl font-bold text-green-600">
                {personnel.filter(p => p.status === 'active').length}
              </div>
            </div>
            <div className="bg-orange-50 p-2 rounded-lg border border-orange-100">
              <div className="text-sm font-medium text-orange-800">On Mission</div>
              <div className="text-xl font-bold text-orange-600">
                {personnel.filter(p => p.status === 'on-mission').length}
              </div>
            </div>
            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
              <div className="text-sm font-medium text-blue-800">In Transit</div>
              <div className="text-xl font-bold text-blue-600">
                {personnel.filter(p => p.status === 'in-transit').length}
              </div>
            </div>
            <div className="bg-purple-50 p-2 rounded-lg border border-purple-100">
              <div className="text-sm font-medium text-purple-800">High Risk</div>
              <div className="text-xl font-bold text-purple-600">
                {personnel.filter(p => (p.ai_risk_score as any)?.overall > 70).length}
              </div>
            </div>
          </div>
        </div>
      ),
      defaultOrder: 5
    },
    {
      id: 'incident-status',
      title: 'Incident Status',
      size: 'medium',
      component: (
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">Total Incidents: {incidents.length}</span>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-red-50 p-2 rounded-lg border border-red-100">
              <div className="text-sm font-medium text-red-800">Open</div>
              <div className="text-xl font-bold text-red-600">
                {incidents.filter(i => i.status === 'Open').length}
              </div>
            </div>
            <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-100">
              <div className="text-sm font-medium text-yellow-800">In Progress</div>
              <div className="text-xl font-bold text-yellow-600">
                {incidents.filter(i => i.status === 'In Progress').length}
              </div>
            </div>
            <div className="bg-green-50 p-2 rounded-lg border border-green-100">
              <div className="text-sm font-medium text-green-800">Closed</div>
              <div className="text-xl font-bold text-green-600">
                {incidents.filter(i => i.status === 'Closed').length}
              </div>
            </div>
            <div className="bg-red-50 p-2 rounded-lg border border-red-100">
              <div className="text-sm font-medium text-red-800">Critical</div>
              <div className="text-xl font-bold text-red-600">
                {incidents.filter(i => i.severity === 'Critical').length}
              </div>
            </div>
          </div>
        </div>
      ),
      defaultOrder: 6
    },
    {
      id: 'travel-status',
      title: 'Travel Security Status',
      size: 'medium',
      component: (
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">Total Travel Plans: {travelPlans.length}</span>
            <Plane className="w-5 h-5 text-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-100">
              <div className="text-sm font-medium text-yellow-800">Pending</div>
              <div className="text-xl font-bold text-yellow-600">
                {travelPlans.filter(t => t.status === 'pending').length}
              </div>
            </div>
            <div className="bg-green-50 p-2 rounded-lg border border-green-100">
              <div className="text-sm font-medium text-green-800">Approved</div>
              <div className="text-xl font-bold text-green-600">
                {travelPlans.filter(t => t.status === 'approved').length}
              </div>
            </div>
            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
              <div className="text-sm font-medium text-blue-800">In Progress</div>
              <div className="text-xl font-bold text-blue-600">
                {travelPlans.filter(t => t.status === 'in-progress').length}
              </div>
            </div>
            <div className="bg-red-50 p-2 rounded-lg border border-red-100">
              <div className="text-sm font-medium text-red-800">High Risk</div>
              <div className="text-xl font-bold text-red-600">
                {travelPlans.filter(t => ((t.risk_assessment as any)?.overall || 0) > 70).length}
              </div>
            </div>
          </div>
        </div>
      ),
      defaultOrder: 7
    },
    {
      id: 'risk-matrix',
      title: 'Risk Assessment Matrix',
      size: 'large',
      component: (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">AI-powered risk visualization</span>
            <Brain className="w-5 h-5 text-purple-500" />
          </div>
          <div className="grid grid-cols-5 gap-1 w-full">
            {Array.from({ length: 25 }, (_, i) => {
              const row = Math.floor(i / 5);
              const col = i % 5;
              const intensity = (5 - row) * (col + 1) / 25;
              
              return (
                <div 
                  key={i} 
                  className={`aspect-square rounded-sm flex items-center justify-center text-xs font-medium ${
                    intensity > 0.7 ? 'bg-red-500 text-white' :
                    intensity > 0.5 ? 'bg-orange-400 text-white' :
                    intensity > 0.3 ? 'bg-yellow-400 text-black' :
                    'bg-green-400 text-black'
                  }`}
                  title={`Impact: ${5-row}, Likelihood: ${col+1}`}
                >
                  {(5-row) * (col+1)}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <div className="flex flex-col items-center">
              <span>Impact</span>
              <div className="flex items-center mt-1">
                <div className="w-3 h-3 bg-green-400 rounded-sm mr-1"></div>
                <span>Low</span>
                <ArrowUpRight className="w-3 h-3 mx-1" />
                <div className="w-3 h-3 bg-red-500 rounded-sm mr-1"></div>
                <span>High</span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span>Likelihood</span>
              <div className="flex items-center mt-1">
                <div className="w-3 h-3 bg-green-400 rounded-sm mr-1"></div>
                <span>Low</span>
                <ArrowUpRight className="w-3 h-3 mx-1" />
                <div className="w-3 h-3 bg-red-500 rounded-sm mr-1"></div>
                <span>High</span>
              </div>
            </div>
          </div>
        </div>
      ),
      defaultOrder: 8
    },
    {
      id: 'threat-levels',
      title: 'Threat Level Overview',
      size: 'medium',
      component: (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Current threat levels by category</span>
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm">Critical Threats</span>
              </div>
              <span className="text-sm font-medium">{incidents.filter(i => i.severity === 'Critical').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                <span className="text-sm">High Threats</span>
              </div>
              <span className="text-sm font-medium">{incidents.filter(i => i.severity === 'High').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-sm">Medium Threats</span>
              </div>
              <span className="text-sm font-medium">{incidents.filter(i => i.severity === 'Medium').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Low Threats</span>
              </div>
              <span className="text-sm font-medium">{incidents.filter(i => i.severity === 'Low').length}</span>
            </div>
          </div>
        </div>
      ),
      defaultOrder: 9
    },
    {
      id: 'recent-alerts',
      title: 'Recent Alerts',
      size: 'medium',
      component: (
        <div className="space-y-3">
          {incidents.slice(0, 3).map((incident, index) => (
            <div key={index} className="p-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  incident.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                  incident.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                  incident.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {incident.severity}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(incident.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-800">{incident.title}</p>
              <div className="flex items-center text-xs text-gray-500 mt-1">
                <MapPin className="w-3 h-3 mr-1" />
                <span>{incident.location}</span>
              </div>
            </div>
          ))}
          {incidents.length === 0 && (
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No recent alerts</p>
            </div>
          )}
        </div>
      ),
      defaultOrder: 10
    }
  ];

  return (
    <DashboardLayout 
      widgets={dashboardWidgets} 
      onOrderChange={handleWidgetOrderChange}
      savedOrder={widgetOrder}
    />
  );
};

export default DashboardPage;