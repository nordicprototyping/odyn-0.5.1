import React from 'react';
import { Globe, AlertCircle, MapPin, Brain } from 'lucide-react';
import DashboardWidget from './DashboardWidget';

interface ExternalEventsWidgetProps {
  onRemove?: () => void;
  onCollapse?: () => void;
  isCollapsed?: boolean;
  className?: string;
  dragHandleProps?: any;
}

interface ExternalEvent {
  id: number;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  distance: string;
  impact: string;
  aiAssessment: string;
}

// Mock external events data - in a real app, this would come from an API
const externalEvents: ExternalEvent[] = [
  {
    id: 1,
    title: 'Civil Unrest in Kiev Region',
    severity: 'High',
    distance: '2.3 km from office',
    impact: 'Personnel evacuation protocols activated',
    aiAssessment: 'High probability of escalation within 24 hours'
  },
  {
    id: 2,
    title: 'Cyber Attack on Regional Infrastructure',
    severity: 'Critical',
    distance: 'Network-based threat',
    impact: 'Enhanced monitoring protocols',
    aiAssessment: 'Pattern matches known APT group signatures'
  },
  {
    id: 3,
    title: 'Political Tensions - Embassy District',
    severity: 'Medium',
    distance: '500m from embassy',
    impact: 'Increased security presence',
    aiAssessment: 'Moderate risk of spillover effects'
  }
];

const ExternalEventsWidget: React.FC<ExternalEventsWidgetProps> = ({
  onRemove,
  onCollapse,
  isCollapsed = false,
  className = '',
  dragHandleProps
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-700';
      case 'High': return 'bg-orange-100 text-orange-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  return (
    <DashboardWidget
      title="External Events & Geopolitical Intelligence"
      icon={<Globe className="w-5 h-5 text-blue-500" />}
      onRemove={onRemove}
      onCollapse={onCollapse}
      isCollapsed={isCollapsed}
      className={className}
      dragHandleProps={dragHandleProps}
    >
      <div className="space-y-4">
        {externalEvents.map((event) => (
          <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getSeverityColor(event.severity)}`}>
                {event.severity}
              </span>
              <Globe className="w-4 h-4 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                <span>{event.distance}</span>
              </div>
              <div>
                <span className="font-medium">Impact:</span> {event.impact}
              </div>
              <div className="bg-purple-50 p-2 rounded border border-purple-200">
                <div className="flex items-center space-x-1 mb-1">
                  <Brain className="w-3 h-3 text-purple-600" />
                  <span className="text-xs font-medium text-purple-800">AI Assessment</span>
                </div>
                <p className="text-xs text-purple-700">{event.aiAssessment}</p>
              </div>
            </div>
          </div>
        ))}
        
        <div className="text-center">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View All External Events
          </button>
        </div>
      </div>
    </DashboardWidget>
  );
};

export default ExternalEventsWidget;