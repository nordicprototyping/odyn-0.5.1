import React from 'react';
import { Shield, CheckCircle, AlertCircle, Settings, Wifi, Camera, Lock, Server } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { useAssets } from '../../hooks/useAssets';

interface SecurityStatusWidgetProps {
  onRemove?: () => void;
  onCollapse?: () => void;
  isCollapsed?: boolean;
  className?: string;
  dragHandleProps?: any;
}

interface SecuritySystem {
  name: string;
  icon: React.ReactNode;
  status: 'online' | 'offline' | 'maintenance' | 'alert';
  count: number;
  total: number;
}

const SecurityStatusWidget: React.FC<SecurityStatusWidgetProps> = ({
  onRemove,
  onCollapse,
  isCollapsed = false,
  className = '',
  dragHandleProps
}) => {
  const { assets, loading, error } = useAssets();
  
  // Calculate security systems status from assets
  const securitySystems = React.useMemo(() => {
    if (!assets.length) return [];
    
    // Initialize counters
    let cctvOnline = 0, cctvTotal = 0;
    let accessOnline = 0, accessTotal = 0;
    let alarmsOnline = 0, alarmsTotal = 0;
    let networkOnline = 0, networkTotal = 0;
    let fireOnline = 0, fireTotal = 0;
    
    // Count systems across all assets
    assets.forEach(asset => {
      const systems = asset.security_systems as any;
      
      if (systems?.cctv) {
        cctvTotal++;
        if (systems.cctv.status === 'online') cctvOnline++;
      }
      
      if (systems?.accessControl) {
        accessTotal++;
        if (systems.accessControl.status === 'online') accessOnline++;
      }
      
      if (systems?.alarms) {
        alarmsTotal++;
        if (systems.alarms.status === 'online') alarmsOnline++;
      }
      
      if (systems?.networkSecurity) {
        networkTotal++;
        if (systems.networkSecurity.status === 'online') networkOnline++;
      }
      
      if (systems?.fireSupression) {
        fireTotal++;
        if (systems.fireSupression.status === 'online') fireOnline++;
      }
    });
    
    // Create security systems array
    return [
      {
        name: 'CCTV Systems',
        icon: <Camera className="w-5 h-5" />,
        status: cctvOnline === cctvTotal ? 'online' : cctvOnline === 0 ? 'offline' : 'maintenance',
        count: cctvOnline,
        total: cctvTotal
      },
      {
        name: 'Access Control',
        icon: <Lock className="w-5 h-5" />,
        status: accessOnline === accessTotal ? 'online' : accessOnline === 0 ? 'offline' : 'maintenance',
        count: accessOnline,
        total: accessTotal
      },
      {
        name: 'Alarm Systems',
        icon: <AlertCircle className="w-5 h-5" />,
        status: alarmsOnline === alarmsTotal ? 'online' : alarmsOnline === 0 ? 'offline' : 'maintenance',
        count: alarmsOnline,
        total: alarmsTotal
      },
      {
        name: 'Network Security',
        icon: <Wifi className="w-5 h-5" />,
        status: networkOnline === networkTotal ? 'online' : networkOnline === 0 ? 'offline' : 'maintenance',
        count: networkOnline,
        total: networkTotal
      },
      {
        name: 'Fire Suppression',
        icon: <Server className="w-5 h-5" />,
        status: fireOnline === fireTotal ? 'online' : fireOnline === 0 ? 'offline' : 'maintenance',
        count: fireOnline,
        total: fireTotal
      }
    ];
  }, [assets]);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'offline': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'maintenance': return <Settings className="w-4 h-4 text-yellow-500" />;
      case 'alert': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600';
      case 'offline': return 'text-red-600';
      case 'maintenance': return 'text-yellow-600';
      case 'alert': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };
  
  const getStatusBg = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100';
      case 'offline': return 'bg-red-100';
      case 'maintenance': return 'bg-yellow-100';
      case 'alert': return 'bg-orange-100';
      default: return 'bg-gray-100';
    }
  };
  
  return (
    <DashboardWidget
      title="Security Systems Status"
      icon={<Shield className="w-5 h-5 text-green-500" />}
      isLoading={loading}
      error={error}
      onRemove={onRemove}
      onCollapse={onCollapse}
      isCollapsed={isCollapsed}
      className={className}
      dragHandleProps={dragHandleProps}
    >
      <div className="space-y-3">
        {securitySystems.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500">No security systems data available</p>
          </div>
        ) : (
          securitySystems.map((system, index) => (
            <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${getStatusBg(system.status)}`}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full bg-white ${getStatusColor(system.status)}`}>
                  {system.icon}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{system.name}</h4>
                  <div className="text-sm text-gray-600">
                    {system.count} of {system.total} systems online
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                {getStatusIcon(system.status)}
                <span className={`ml-2 font-medium capitalize ${getStatusColor(system.status)}`}>
                  {system.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardWidget>
  );
};

export default SecurityStatusWidget;