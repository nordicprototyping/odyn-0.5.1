import React from 'react';
import { Plane, MapPin, Calendar, Brain, Shield, AlertCircle } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { useTravelPlans } from '../../hooks/useTravelPlans';
import { Link } from 'react-router-dom';

interface HighRiskTravelWidgetProps {
  onRemove?: () => void;
  onCollapse?: () => void;
  isCollapsed?: boolean;
  className?: string;
  dragHandleProps?: any;
  limit?: number;
}

const HighRiskTravelWidget: React.FC<HighRiskTravelWidgetProps> = ({
  onRemove,
  onCollapse,
  isCollapsed = false,
  className = '',
  dragHandleProps,
  limit = 5
}) => {
  const { travelPlans, loading, error } = useTravelPlans();
  
  // Sort travel plans by risk score and take the top ones
  const highRiskTravel = React.useMemo(() => {
    return [...travelPlans]
      .sort((a, b) => {
        const aScore = (a.risk_assessment as any)?.overall || 0;
        const bScore = (b.risk_assessment as any)?.overall || 0;
        return bScore - aScore;
      })
      .slice(0, limit);
  }, [travelPlans, limit]);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'denied': return 'bg-red-100 text-red-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-gray-100 text-gray-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const getRiskColor = (score: number) => {
    if (score <= 30) return 'text-green-600';
    if (score <= 70) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  return (
    <DashboardWidget
      title="High Risk Travel"
      icon={<Plane className="w-5 h-5 text-orange-500" />}
      isLoading={loading}
      error={error}
      onRemove={onRemove}
      onCollapse={onCollapse}
      isCollapsed={isCollapsed}
      className={className}
      dragHandleProps={dragHandleProps}
    >
      <div className="space-y-3">
        {highRiskTravel.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500">No high-risk travel plans found</p>
          </div>
        ) : (
          highRiskTravel.map(travel => (
            <div key={travel.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{travel.traveler_name}</h4>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-3 h-3 mr-1" />
                    {(travel.destination as any)?.city}, {(travel.destination as any)?.country}
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(travel.departure_date)} - {formatDate(travel.return_date)}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <Brain className="w-4 h-4 text-purple-500" />
                    <span className={`font-bold ${getRiskColor((travel.risk_assessment as any)?.overall || 0)}`}>
                      {(travel.risk_assessment as any)?.overall || 0}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(travel.status)}`}>
                    {travel.status.charAt(0).toUpperCase() + travel.status.slice(1).replace('-', ' ')}
                  </span>
                </div>
                {travel.mitigations && (travel.mitigations as any[]).length > 0 && (
                  <div className="flex items-center mt-1 text-xs text-green-600">
                    <Shield className="w-3 h-3 mr-1" />
                    <span>{(travel.mitigations as any[]).length} mitigations applied</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        <div className="pt-2 text-center">
          <Link 
            to="/dashboard/travel" 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All Travel Plans
          </Link>
        </div>
      </div>
    </DashboardWidget>
  );
};

export default HighRiskTravelWidget;