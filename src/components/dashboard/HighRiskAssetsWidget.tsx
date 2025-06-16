import React from 'react';
import { Building, AlertTriangle, MapPin, Brain, Shield, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { useAssets } from '../../hooks/useAssets';
import { Link } from 'react-router-dom';

interface HighRiskAssetsWidgetProps {
  onRemove?: () => void;
  onCollapse?: () => void;
  isCollapsed?: boolean;
  className?: string;
  dragHandleProps?: any;
  limit?: number;
}

const HighRiskAssetsWidget: React.FC<HighRiskAssetsWidgetProps> = ({
  onRemove,
  onCollapse,
  isCollapsed = false,
  className = '',
  dragHandleProps,
  limit = 5
}) => {
  const { assets, loading, error } = useAssets();
  
  // Sort assets by risk score and take the top ones
  const highRiskAssets = React.useMemo(() => {
    return [...assets]
      .sort((a, b) => {
        const aScore = (a.ai_risk_score as any)?.overall || 0;
        const bScore = (b.ai_risk_score as any)?.overall || 0;
        return bScore - aScore;
      })
      .slice(0, limit);
  }, [assets, limit]);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'secure': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'alert': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'maintenance': return <Settings className="w-4 h-4 text-yellow-500" />;
      case 'offline': return <AlertCircle className="w-4 h-4 text-gray-500" />;
      case 'compromised': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <CheckCircle className="w-4 h-4 text-gray-500" />;
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
  
  const getRiskColor = (score: number) => {
    if (score <= 30) return 'text-green-600';
    if (score <= 70) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  return (
    <DashboardWidget
      title="High Risk Assets"
      icon={<Building className="w-5 h-5 text-red-500" />}
      isLoading={loading}
      error={error}
      onRemove={onRemove}
      onCollapse={onCollapse}
      isCollapsed={isCollapsed}
      className={className}
      dragHandleProps={dragHandleProps}
    >
      <div className="space-y-3">
        {highRiskAssets.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500">No high-risk assets found</p>
          </div>
        ) : (
          highRiskAssets.map(asset => (
            <div key={asset.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Building className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{asset.name}</h4>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-3 h-3 mr-1" />
                    {(asset.location as any)?.city}, {(asset.location as any)?.country}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <Brain className="w-4 h-4 text-purple-500" />
                    <span className={`font-bold ${getRiskColor((asset.ai_risk_score as any)?.overall || 0)}`}>
                      {(asset.ai_risk_score as any)?.overall || 0}
                    </span>
                  </div>
                  <div className="flex items-center">
                    {getStatusIcon(asset.status)}
                    <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${getStatusColor(asset.status)}`}>
                      {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                    </span>
                  </div>
                </div>
                {asset.mitigations && (asset.mitigations as any[]).length > 0 && (
                  <div className="flex items-center mt-1 text-xs text-green-600">
                    <Shield className="w-3 h-3 mr-1" />
                    <span>{(asset.mitigations as any[]).length} mitigations applied</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        <div className="pt-2 text-center">
          <Link 
            to="/dashboard/assets" 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All Assets
          </Link>
        </div>
      </div>
    </DashboardWidget>
  );
};

export default HighRiskAssetsWidget;