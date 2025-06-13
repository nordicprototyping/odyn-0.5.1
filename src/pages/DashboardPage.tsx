import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import PersonnelDashboard from '../components/PersonnelDashboard';
import IncidentManagement from '../components/IncidentManagement';
import AssetSecurityDashboard from '../components/AssetSecurityDashboard';
import RiskManagement from '../components/RiskManagement';
import TravelSecurityManagement from '../components/TravelSecurityManagement';
import OverviewDashboard from '../components/dashboard/OverviewDashboard';

const DashboardPage: React.FC = () => {
  const location = useLocation();

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
        return <OverviewDashboard />;
    }
  };

  return renderMainContent();
};

export default DashboardPage;