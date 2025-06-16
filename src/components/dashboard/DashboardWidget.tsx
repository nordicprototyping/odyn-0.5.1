import React, { ReactNode } from 'react';
import { Loader2, X, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

interface DashboardWidgetProps {
  title: string;
  icon: ReactNode;
  isLoading?: boolean;
  error?: string | null;
  onRemove?: () => void;
  onCollapse?: () => void;
  isCollapsed?: boolean;
  className?: string;
  dragHandleProps?: any;
  children: ReactNode;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  title,
  icon,
  isLoading = false,
  error = null,
  onRemove,
  onCollapse,
  isCollapsed = false,
  className = '',
  dragHandleProps,
  children
}) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {dragHandleProps && (
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-1">
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
          )}
          <div className="flex items-center space-x-2">
            {icon}
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {onCollapse && (
            <button 
              onClick={onCollapse}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          )}
          {onRemove && (
            <button 
              onClick={onRemove}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 rounded-lg text-center">
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardWidget;