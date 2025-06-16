import React from 'react';
import { AlertCircle, MapPin, Clock, User, Shield } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { useIncidents } from '../../hooks/useIncidents';
import { Link } from 'react-router-dom';

interface RecentIncidentsWidgetProps {
  onRemove?: () => void;
  onCollapse?: () => void;
  isCollapsed?: boolean;
  className?: string;
  dragHandleProps?: any;
  limit?: number;
}

const RecentIncidentsWidget: React.FC<RecentIncidentsWidgetProps> = ({
  onRemove,
  onCollapse,
  isCollapsed = false,
  className = '',
  dragHandleProps,
  limit = 5
}) => {
  const { incidents, loading, error } = useIncidents();
  
  // Sort incidents by date (most recent first) and take the most recent ones
  const recentIncidents = React.useMemo(() => {
    return [...incidents]
      .sort((a, b) => {
        return new Date(b.date_time).getTime() - new Date(a.date_time).getTime();
      })
      .slice(0, limit);
  }, [incidents, limit]);
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-red-100 text-red-700';
      case 'In Progress': return 'bg-yellow-100 text-yellow-700';
      case 'Closed': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <DashboardWidget
      title="Recent Incidents"
      icon={<AlertCircle className="w-5 h-5 text-red-500" />}
      isLoading={loading}
      error={error}
      onRemove={onRemove}
      onCollapse={onCollapse}
      isCollapsed={isCollapsed}
      className={className}
      dragHandleProps={dragHandleProps}
    >
      <div className="space-y-3">
        {recentIncidents.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500">No recent incidents found</p>
          </div>
        ) : (
          recentIncidents.map(incident => (
            <div key={incident.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{incident.title}</h4>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(incident.severity)}`}>
                    {incident.severity}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(incident.status)}`}>
                    {incident.status}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center text-sm text-gray-600 mb-1">
                <MapPin className="w-3 h-3 mr-1" />
                {incident.location}
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDate(incident.date_time)}
                </div>
                <div className="flex items-center">
                  <User className="w-3 h-3 mr-1" />
                  {incident.reporter_name}
                </div>
              </div>
              
              {incident.mitigations && (incident.mitigations as any[]).length > 0 && (
                <div className="flex items-center mt-1 text-xs text-green-600">
                  <Shield className="w-3 h-3 mr-1" />
                  <span>{(incident.mitigations as any[]).length} mitigations applied</span>
                </div>
              )}
            </div>
          ))
        )}
        
        <div className="pt-2 text-center">
          <Link 
            to="/dashboard/incidents" 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All Incidents
          </Link>
        </div>
      </div>
    </DashboardWidget>
  );
};

export default RecentIncidentsWidget;