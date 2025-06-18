import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Settings, Save, X, GripVertical } from 'lucide-react';

import OrganizationRiskWidget from './OrganizationRiskWidget';
import ThreatLevelWidget from './ThreatLevelWidget';
import GlobalThreatMapWidget from './GlobalThreatMapWidget';
import HighRiskAssetsWidget from './HighRiskAssetsWidget';
import HighRiskPersonnelWidget from './HighRiskPersonnelWidget';
import HighRiskTravelWidget from './HighRiskTravelWidget';
import RecentIncidentsWidget from './RecentIncidentsWidget';
import RiskMatrixWidget from './RiskMatrixWidget';
import SecurityStatusWidget from './SecurityStatusWidget';
import PersonnelStatusWidget from './PersonnelStatusWidget';
import ExternalEventsWidget from './ExternalEventsWidget';

interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  position: number;
  visible: boolean;
  collapsed: boolean;
}

interface SortableWidgetProps {
  id: string;
  type: string;
  onRemove: (id: string) => void;
  onCollapse: (id: string) => void;
  isCollapsed: boolean;
  className?: string;
}

const SortableWidget: React.FC<SortableWidgetProps> = ({ id, type, onRemove, onCollapse, isCollapsed, className }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const renderWidget = () => {
    switch (type) {
      case 'organizationRisk':
        return (
          <OrganizationRiskWidget
            onRemove={() => onRemove(id)}
            onCollapse={() => onCollapse(id)}
            isCollapsed={isCollapsed}
            className={className}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        );
      case 'threatLevel':
        return (
          <ThreatLevelWidget
            onRemove={() => onRemove(id)}
            onCollapse={() => onCollapse(id)}
            isCollapsed={isCollapsed}
            className={className}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        );
      case 'globalThreatMap':
        return (
          <GlobalThreatMapWidget
            onRemove={() => onRemove(id)}
            onCollapse={() => onCollapse(id)}
            isCollapsed={isCollapsed}
            className={className}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        );
      case 'highRiskAssets':
        return (
          <HighRiskAssetsWidget
            onRemove={() => onRemove(id)}
            onCollapse={() => onCollapse(id)}
            isCollapsed={isCollapsed}
            className={className}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        );
      case 'highRiskPersonnel':
        return (
          <HighRiskPersonnelWidget
            onRemove={() => onRemove(id)}
            onCollapse={() => onCollapse(id)}
            isCollapsed={isCollapsed}
            className={className}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        );
      case 'highRiskTravel':
        return (
          <HighRiskTravelWidget
            onRemove={() => onRemove(id)}
            onCollapse={() => onCollapse(id)}
            isCollapsed={isCollapsed}
            className={className}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        );
      case 'recentIncidents':
        return (
          <RecentIncidentsWidget
            onRemove={() => onRemove(id)}
            onCollapse={() => onCollapse(id)}
            isCollapsed={isCollapsed}
            className={className}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        );
      case 'riskMatrix':
        return (
          <RiskMatrixWidget
            onRemove={() => onRemove(id)}
            onCollapse={() => onCollapse(id)}
            isCollapsed={isCollapsed}
            className={className}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        );
      case 'securityStatus':
        return (
          <SecurityStatusWidget
            onRemove={() => onRemove(id)}
            onCollapse={() => onCollapse(id)}
            isCollapsed={isCollapsed}
            className={className}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        );
      case 'personnelStatus':
        return (
          <PersonnelStatusWidget
            onRemove={() => onRemove(id)}
            onCollapse={() => onCollapse(id)}
            isCollapsed={isCollapsed}
            className={className}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        );
      case 'externalEvents':
        return (
          <ExternalEventsWidget
            onRemove={() => onRemove(id)}
            onCollapse={() => onCollapse(id)}
            isCollapsed={isCollapsed}
            className={className}
            dragHandleProps={{ ...attributes, ...listeners }}
          />
        );
      default:
        return <div>Unknown widget type: {type}</div>;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="h-full">
      {renderWidget()}
    </div>
  );
};

const DashboardLayout: React.FC = () => {
  // Default widget configuration
  const defaultWidgets: WidgetConfig[] = [
    { id: 'org-risk', type: 'organizationRisk', title: 'Organization Risk Score', size: 'medium', position: 0, visible: true, collapsed: false },
    { id: 'threat-level', type: 'threatLevel', title: 'Threat Levels', size: 'medium', position: 1, visible: true, collapsed: false },
    { id: 'global-map', type: 'globalThreatMap', title: 'Global Threat Map', size: 'full', position: 2, visible: true, collapsed: false },
    { id: 'high-risk-assets', type: 'highRiskAssets', title: 'High Risk Assets', size: 'medium', position: 3, visible: true, collapsed: false },
    { id: 'high-risk-personnel', type: 'highRiskPersonnel', title: 'High Risk Personnel', size: 'medium', position: 4, visible: true, collapsed: false },
    { id: 'high-risk-travel', type: 'highRiskTravel', title: 'High Risk Travel', size: 'medium', position: 5, visible: true, collapsed: false },
    { id: 'recent-incidents', type: 'recentIncidents', title: 'Recent Incidents', size: 'medium', position: 6, visible: true, collapsed: false },
    { id: 'risk-matrix', type: 'riskMatrix', title: 'Risk Matrix', size: 'medium', position: 7, visible: true, collapsed: false },
    { id: 'security-status', type: 'securityStatus', title: 'Security Status', size: 'medium', position: 8, visible: true, collapsed: false },
    { id: 'personnel-status', type: 'personnelStatus', title: 'Personnel Status', size: 'medium', position: 9, visible: true, collapsed: false },
    { id: 'external-events', type: 'externalEvents', title: 'External Events', size: 'full', position: 10, visible: true, collapsed: false }
  ];

  // Load widget configuration from localStorage or use defaults
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const savedWidgets = localStorage.getItem('dashboardWidgets');
    return savedWidgets ? JSON.parse(savedWidgets) : defaultWidgets;
  });
  
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [availableWidgets, setAvailableWidgets] = useState<WidgetConfig[]>([]);
  
  // Save widget configuration to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('dashboardWidgets', JSON.stringify(widgets));
    
    // Update available widgets for the selector
    const hidden = defaultWidgets.filter(
      dw => !widgets.some(w => w.id === dw.id && w.visible)
    );
    setAvailableWidgets(hidden);
  }, [widgets]);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setWidgets(items => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update positions
        return newItems.map((item, index) => ({
          ...item,
          position: index
        }));
      });
    }
  };
  
  const handleRemoveWidget = (id: string) => {
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === id ? { ...widget, visible: false } : widget
      )
    );
  };
  
  const handleCollapseWidget = (id: string) => {
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === id ? { ...widget, collapsed: !widget.collapsed } : widget
      )
    );
  };
  
  const handleAddWidget = (widgetId: string) => {
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === widgetId ? { ...widget, visible: true } : widget
      )
    );
    setShowWidgetSelector(false);
  };
  
  const handleResetLayout = () => {
    setWidgets(defaultWidgets);
    setShowSettings(false);
  };
  
  const visibleWidgets = widgets.filter(w => w.visible).sort((a, b) => a.position - b.position);
  
  const getWidgetClassName = (widgetType: string) => {
    // Define which widgets should span 2 columns
    const wideWidgets = ['globalThreatMap', 'externalEvents', 'riskMatrix', 'threatLevel'];
    
    if (wideWidgets.includes(widgetType)) {
      return 'col-span-1 md:col-span-2';
    }
    
    return 'col-span-1';
  };
  
  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>
          <p className="text-gray-600">Real-time security overview and risk assessment</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowWidgetSelector(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Widget</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Dashboard Settings</span>
          </button>
        </div>
      </div>
      
      {/* Dashboard Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleWidgets.map(w => w.id)}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {visibleWidgets.map(widget => (
              <SortableWidget
                key={widget.id}
                id={widget.id}
                type={widget.type}
                onRemove={handleRemoveWidget}
                onCollapse={handleCollapseWidget}
                isCollapsed={widget.collapsed}
                className={getWidgetClassName(widget.type)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      {/* Widget Selector Modal */}
      {showWidgetSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add Widget</h2>
                <button
                  onClick={() => setShowWidgetSelector(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {availableWidgets.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">All widgets are already displayed</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableWidgets.map(widget => (
                    <button
                      key={widget.id}
                      onClick={() => handleAddWidget(widget.id)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      <span className="font-medium text-gray-900">{widget.title}</span>
                      <Plus className="w-4 h-4 text-blue-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Dashboard Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Widget Order</h3>
                <p className="text-sm text-gray-600">Drag and drop widgets to reorder them on the dashboard.</p>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {widgets.filter(w => w.visible).map(widget => (
                    <div key={widget.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                      <span className="font-medium text-gray-900">{widget.title}</span>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleResetLayout}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Reset to Default Layout
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;