import React from 'react';
import { AlertTriangle } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { useIncidents } from '../../hooks/useIncidents';

interface ThreatLevelWidgetProps {
  onRemove?: () => void;
  onCollapse?: () => void;
  isCollapsed?: boolean;
  className?: string;
  dragHandleProps?: any;
}

interface ThreatLevel {
  level: string;
  count: number;
  color: string;
  trend: string;
}

const ThreatLevelWidget: React.FC<ThreatLevelWidgetProps> = ({
  onRemove,
  onCollapse,
  isCollapsed = false,
  className = '',
  dragHandleProps
}) => {
  const { incidents, loading, error } = useIncidents();
  
  // Calculate threat levels from incidents
  const threatLevels = React.useMemo(() => {
    // Count incidents by severity
    const criticalCount = incidents.filter(i => i.severity === 'Critical').length;
    const highCount = incidents.filter(i => i.severity === 'High').length;
    const mediumCount = incidents.filter(i => i.severity === 'Medium').length;
    const lowCount = incidents.filter(i => i.severity === 'Low').length;
    
    // Generate trend indicators (in a real app, this would compare to historical data)
    const criticalTrend = criticalCount > 2 ? '+2' : criticalCount > 0 ? '+1' : '0';
    const highTrend = highCount > 3 ? '+3' : highCount > 1 ? '+1' : '-1';
    const mediumTrend = mediumCount > 5 ? '+2' : '-3';
    const lowTrend = lowCount > 8 ? '+1' : '-5';
    
    return [
      { 
        level: 'Critical', 
        count: criticalCount, 
        color: 'bg-red-500', 
        trend: criticalTrend
      },
      { 
        level: 'High', 
        count: highCount, 
        color: 'bg-orange-500', 
        trend: highTrend
      },
      { 
        level: 'Medium', 
        count: mediumCount, 
        color: 'bg-yellow-500', 
        trend: mediumTrend
      },
      { 
        level: 'Low', 
        count: lowCount, 
        color: 'bg-green-500', 
        trend: lowTrend
      }
    ];
  }, [incidents]);
  
  return (
    <DashboardWidget
      title="Threat Levels"
      icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
      isLoading={loading}
      error={error}
      onRemove={onRemove}
      onCollapse={onCollapse}
      isCollapsed={isCollapsed}
      className={className}
      dragHandleProps={dragHandleProps}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {threatLevels.map((threat, index) => (
          <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
              <div className={`w-full h-full ${threat.color} transform rotate-45 translate-x-8 -translate-y-8`}></div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">{threat.level}</h3>
              <div className={`w-3 h-3 rounded-full ${threat.color}`}></div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-gray-900">{threat.count}</span>
              <span className={`text-sm px-2 py-1 rounded-full ${
                threat.trend.startsWith('+') && threat.trend !== '+0'
                  ? 'bg-red-100 text-red-600' 
                  : threat.trend.startsWith('-') && threat.trend !== '-0'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {threat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
};

export default ThreatLevelWidget;