import React from 'react';
import { Users, MapPin, Brain, Shield, CheckCircle, AlertCircle, Car } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { usePersonnel } from '../../hooks/usePersonnel';
import { Link } from 'react-router-dom';

interface HighRiskPersonnelWidgetProps {
  onRemove?: () => void;
  onCollapse?: () => void;
  isCollapsed?: boolean;
  className?: string;
  dragHandleProps?: any;
  limit?: number;
}

const HighRiskPersonnelWidget: React.FC<HighRiskPersonnelWidgetProps> = ({
  onRemove,
  onCollapse,
  isCollapsed = false,
  className = '',
  dragHandleProps,
  limit = 5
}) => {
  const { personnel, loading, error } = usePersonnel();
  
  // Sort personnel by risk score and take the top ones
  const highRiskPersonnel = React.useMemo(() => {
    return [...personnel]
      .sort((a, b) => {
        const aScore = (a.ai_risk_score as any)?.overall || 0;
        const bScore = (b.ai_risk_score as any)?.overall || 0;
        return bScore - aScore;
      })
      .slice(0, limit);
  }, [personnel, limit]);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'on-mission': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'in-transit': return <Car className="w-4 h-4 text-blue-500" />;
      case 'off-duty': return <AlertCircle className="w-4 h-4 text-gray-500" />;
      case 'unavailable': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'on-mission': return 'bg-orange-100 text-orange-700';
      case 'in-transit': return 'bg-blue-100 text-blue-700';
      case 'off-duty': return 'bg-gray-100 text-gray-700';
      case 'unavailable': return 'bg-red-100 text-red-700';
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
      title="High Risk Personnel"
      icon={<Users className="w-5 h-5 text-purple-500" />}
      isLoading={loading}
      error={error}
      onRemove={onRemove}
      onCollapse={onCollapse}
      isCollapsed={isCollapsed}
      className={className}
      dragHandleProps={dragHandleProps}
    >
      <div className="space-y-3">
        {highRiskPersonnel.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500">No high-risk personnel found</p>
          </div>
        ) : (
          highRiskPersonnel.map(person => (
            <div key={person.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {person.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{person.name}</h4>
                  <div className="text-sm text-gray-600">{person.department} • {person.category}</div>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {(person.current_location as any)?.city}, {(person.current_location as any)?.country}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <Brain className="w-4 h-4 text-purple-500" />
                    <span className={`font-bold ${getRiskColor((person.ai_risk_score as any)?.overall || 0)}`}>
                      {(person.ai_risk_score as any)?.overall || 0}
                    </span>
                  </div>
                  <div className="flex items-center">
                    {getStatusIcon(person.status)}
                    <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${getStatusColor(person.status)}`}>
                      {person.status.charAt(0).toUpperCase() + person.status.slice(1).replace('-', ' ')}
                    </span>
                  </div>
                </div>
                {person.mitigations && (person.mitigations as any[]).length > 0 && (
                  <div className="flex items-center mt-1 text-xs text-green-600">
                    <Shield className="w-3 h-3 mr-1" />
                    <span>{(person.mitigations as any[]).length} mitigations applied</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        <div className="pt-2 text-center">
          <Link 
            to="/dashboard/personnel" 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All Personnel
          </Link>
        </div>
      </div>
    </DashboardWidget>
  );
};

export default HighRiskPersonnelWidget;