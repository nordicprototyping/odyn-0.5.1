import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PersonnelDashboard from '../components/PersonnelDashboard';
import IncidentManagement from '../components/IncidentManagement';
import AssetSecurityDashboard from '../components/AssetSecurityDashboard';
import RiskManagement from '../components/RiskManagement';
import TravelSecurityManagement from '../components/TravelSecurityManagement';
import OverviewDashboard from '../components/dashboard/OverviewDashboard';
import { supabase } from '../lib/supabase';
import { aiService } from '../services/aiService';
import { useAuth } from '../hooks/useAuth';

const DashboardPage: React.FC = () => {
  const location = useLocation();
  const { organization } = useAuth();
  const [organizationRiskScore, setOrganizationRiskScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Determine active tab based on current path
  const getActiveTabFromPath = (pathname: string): string => {
    if (pathname.includes('/personnel')) return 'personnel';
    if (pathname.includes('/incidents')) return 'incidents';
    if (pathname.includes('/assets')) return 'assets';
    if (pathname.includes('/risks')) return 'risks';
    if (pathname.includes('/travel')) return 'travel';
    if (pathname.includes('/geopolitical')) return 'geopolitical';
    return 'overview';
  };

  const activeTab = getActiveTabFromPath(location.pathname);

  useEffect(() => {
    if (activeTab === 'overview' && organization?.id) {
      calculateOrganizationRiskScore(organization.id);
    }
  }, [activeTab, organization]);

  const calculateOrganizationRiskScore = async (organizationId: string) => {
    try {
      setLoading(true);
      
      // Fetch data needed for organization risk assessment
      const [
        { data: assets },
        { data: personnel },
        { data: incidents },
        { data: risks },
        { data: travelPlans }
      ] = await Promise.all([
        supabase.from('assets').select('*').eq('organization_id', organizationId),
        supabase.from('personnel_details').select('*').eq('organization_id', organizationId),
        supabase.from('incident_reports').select('*').eq('organization_id', organizationId),
        supabase.from('risks').select('*').eq('organization_id', organizationId),
        supabase.from('travel_plans').select('*').eq('organization_id', organizationId)
      ]);
      
      // Call AI service to calculate organization risk score
      const aggregateData = {
        assets: assets || [],
        personnel: personnel || [],
        incidents: incidents || [],
        risks: risks || [],
        travelPlans: travelPlans || []
      };
      
      const result = await aiService.scoreOrganizationRisk(organizationId, aggregateData);
      setOrganizationRiskScore(result.score);
      
    } catch (error) {
      console.error('Error calculating organization risk score:', error);
      // Fallback to a default score if calculation fails
      setOrganizationRiskScore(42);
    } finally {
      setLoading(false);
    }
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case 'personnel':
        return <PersonnelDashboard />;
      case 'incidents':
        return <IncidentManagement />;
      case 'assets':
        return <AssetSecurityDashboard />;
      case 'risks':
        return <RiskManagement />;
      case 'travel':
        return <TravelSecurityManagement />;
      case 'geopolitical':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Geopolitical Risk Dashboard</h2>
            <p className="text-gray-600">Coming soon...</p>
          </div>
        );
      default:
        return <OverviewDashboard score={organizationRiskScore || 42} previousScore={38} />;
    }
  };

  return renderMainContent();
};

export default DashboardPage;