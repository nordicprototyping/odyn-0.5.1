import React from 'react';
import { Users, UserCheck, Plane, Car, Brain } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { usePersonnel } from '../../hooks/usePersonnel';

interface PersonnelStatusWidgetProps {
  onRemove?: () => void;
  onCollapse?: () => void;
  isCollapsed?: boolean;
  className?: string;
  dragHandleProps?: any;
}

const PersonnelStatusWidget: React.FC<PersonnelStatusWidgetProps> = ({
  onRemove,
  onCollapse,
  isCollapsed = false,
  className = '',
  dragHandleProps
}) => {
  const { personnel, loading, error } = usePersonnel();
  
  // Calculate personnel statistics
  const stats = React.useMemo(() => {
    const active = personnel.filter(p => p.status === 'active').length;
    const onMission = personnel.filter(p => p.status === 'on-mission').length;
    const inTransit = personnel.filter(p => p.status === 'in-transit').length;
    const offDuty = personnel.filter(p => p.status === 'off-duty').length;
    const unavailable = personnel.filter(p => p.status === 'unavailable').length;
    const highRisk = personnel.filter(p => ((p.ai_risk_score as any)?.overall || 0) > 70).length;
    
    return {
      total: personnel.length,
      active,
      onMission,
      inTransit,
      offDuty,
      unavailable,
      highRisk
    };
  }, [personnel]);
  
  return (
    <DashboardWidget
      title="Personnel Status"
      icon={<Users className="w-5 h-5 text-blue-500" />}
      isLoading={loading}
      error={error}
      onRemove={onRemove}
      onCollapse={onCollapse}
      isCollapsed={isCollapsed}
      className={className}
      dragHandleProps={dragHandleProps}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Active</p>
              <p className="text-2xl font-bold text-green-700">{stats.active}</p>
              <p className="text-xs text-green-600 mt-1">
                {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% of total
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">On Mission</p>
              <p className="text-2xl font-bold text-orange-700">{stats.onMission}</p>
              <p className="text-xs text-orange-600 mt-1">
                {stats.total > 0 ? Math.round((stats.onMission / stats.total) * 100) : 0}% of total
              </p>
            </div>
            <Plane className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">In Transit</p>
              <p className="text-2xl font-bold text-blue-700">{stats.inTransit}</p>
              <p className="text-xs text-blue-600 mt-1">
                {stats.total > 0 ? Math.round((stats.inTransit / stats.total) * 100) : 0}% of total
              </p>
            </div>
            <Car className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 md:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">High AI Risk</p>
              <p className="text-2xl font-bold text-purple-700">{stats.highRisk}</p>
              <p className="text-xs text-purple-600 mt-1">
                {stats.total > 0 ? Math.round((stats.highRisk / stats.total) * 100) : 0}% of personnel require attention
              </p>
            </div>
            <Brain className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>
    </DashboardWidget>
  );
};

export default PersonnelStatusWidget;