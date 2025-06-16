import React, { useState, ReactNode } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  X, 
  ArrowUpRight,
  LayoutGrid,
  LayoutList
} from 'lucide-react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface Widget {
  id: string;
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  component: ReactNode;
  defaultOrder?: number;
}

interface DashboardLayoutProps {
  widgets: Widget[];
  onOrderChange?: (newOrder: string[]) => void;
  savedOrder?: string[];
}

interface SortableWidgetProps {
  widget: Widget;
  onMaximize: (id: string) => void;
  onClose: (id: string) => void;
  maximizedWidget: string | null;
}

const SortableWidget: React.FC<SortableWidgetProps> = ({ 
  widget, 
  onMaximize, 
  onClose,
  maximizedWidget
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1
  };

  const isMaximized = maximizedWidget === widget.id;

  // Determine widget class based on size
  const getWidgetClassName = () => {
    // If any widget is maximized and this isn't it, hide it
    if (maximizedWidget && !isMaximized) {
      return 'hidden';
    }

    // If this widget is maximized, make it full width and height
    if (isMaximized) {
      return 'col-span-12 row-span-full';
    }

    // Default sizing based on widget size
    switch (widget.size) {
      case 'small':
        return 'col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3';
      case 'medium':
        return 'col-span-12 md:col-span-6 lg:col-span-6 xl:col-span-6';
      case 'large':
        return 'col-span-12 md:col-span-12 lg:col-span-8 xl:col-span-8';
      case 'full':
        return 'col-span-12';
      default:
        return 'col-span-12 md:col-span-6 lg:col-span-4';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${getWidgetClassName()} min-h-[200px] transition-all duration-300`}
    >
      <div className="h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div 
          className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between cursor-move"
          {...attributes}
          {...listeners}
        >
          <h3 className="font-medium text-gray-800 text-sm">{widget.title}</h3>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onMaximize(widget.id)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onClose(widget.id)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {widget.component}
        </div>
      </div>
    </div>
  );
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  widgets, 
  onOrderChange,
  savedOrder 
}) => {
  const [activeWidgets, setActiveWidgets] = useState<Widget[]>(() => {
    // If there's a saved order, use it to sort the widgets
    if (savedOrder) {
      const orderedWidgets = [...widgets].sort((a, b) => {
        const aIndex = savedOrder.indexOf(a.id);
        const bIndex = savedOrder.indexOf(b.id);
        
        // If a widget is not in the saved order, put it at the end
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        
        return aIndex - bIndex;
      });
      
      return orderedWidgets;
    }
    
    // Otherwise, sort by defaultOrder if available
    return [...widgets].sort((a, b) => 
      (a.defaultOrder || 0) - (b.defaultOrder || 0)
    );
  });
  
  const [maximizedWidget, setMaximizedWidget] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setActiveWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Call the onOrderChange callback with the new order of widget IDs
        if (onOrderChange) {
          onOrderChange(newOrder.map(widget => widget.id));
        }
        
        return newOrder;
      });
    }
  };

  const handleMaximize = (id: string) => {
    setMaximizedWidget(maximizedWidget === id ? null : id);
  };

  const handleClose = (id: string) => {
    setActiveWidgets(activeWidgets.filter(widget => widget.id !== id));
    
    // Update the order if a widget is removed
    if (onOrderChange) {
      onOrderChange(activeWidgets.filter(widget => widget.id !== id).map(widget => widget.id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <LayoutList className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={activeWidgets.map(widget => widget.id)}>
          <div className={`grid grid-cols-12 gap-4 ${viewMode === 'list' ? 'grid-flow-row' : ''}`}>
            {activeWidgets.map((widget) => (
              <SortableWidget
                key={widget.id}
                widget={widget}
                onMaximize={handleMaximize}
                onClose={handleClose}
                maximizedWidget={maximizedWidget}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default DashboardLayout;