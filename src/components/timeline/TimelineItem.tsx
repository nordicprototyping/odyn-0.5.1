import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  MapPin, 
  Plane, 
  Car, 
  Train, 
  Bus, 
  Ship, 
  Building, 
  Clock, 
  GripVertical,
  Edit,
  Trash2,
  Phone,
  FileText
} from 'lucide-react';
import { TimelineBlock } from '../../types/timeline';

interface TimelineItemProps {
  block: TimelineBlock;
  onEdit: (block: TimelineBlock) => void;
  onDelete: (id: string) => void;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ block, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getIcon = () => {
    switch (block.type) {
      case 'location':
        return <MapPin className="w-5 h-5" />;
      case 'transport':
        switch (block.data.mode) {
          case 'flight': return <Plane className="w-5 h-5" />;
          case 'train': return <Train className="w-5 h-5" />;
          case 'car': return <Car className="w-5 h-5" />;
          case 'bus': return <Bus className="w-5 h-5" />;
          case 'boat': return <Ship className="w-5 h-5" />;
          default: return <Car className="w-5 h-5" />;
        }
      case 'accommodation':
        return <Building className="w-5 h-5" />;
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  const getTypeColor = () => {
    switch (block.type) {
      case 'location': return 'bg-green-100 text-green-700 border-green-200';
      case 'transport': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'accommodation': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const renderContent = () => {
    switch (block.type) {
      case 'location':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">{block.data.name}</h4>
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getTypeColor()}`}>
                Location
              </span>
            </div>
            <p className="text-sm text-gray-600">{block.data.address}</p>
            <p className="text-sm text-gray-600">{block.data.city}, {block.data.country}</p>
            {block.data.purpose && (
              <p className="text-sm text-gray-700 font-medium">Purpose: {block.data.purpose}</p>
            )}
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              {block.data.arrivalTime && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Arrive: {new Date(block.data.arrivalTime).toLocaleString()}</span>
                </div>
              )}
              {block.data.departureTime && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Depart: {new Date(block.data.departureTime).toLocaleString()}</span>
                </div>
              )}
            </div>
            {block.data.notes && (
              <div className="flex items-start space-x-1 text-xs text-gray-600">
                <FileText className="w-3 h-3 mt-0.5" />
                <span>{block.data.notes}</span>
              </div>
            )}
          </div>
        );

      case 'transport':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 capitalize">{block.data.mode} Transport</h4>
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getTypeColor()}`}>
                Transport
              </span>
            </div>
            <p className="text-sm text-gray-600">{block.data.from} → {block.data.to}</p>
            {block.data.provider && (
              <p className="text-sm text-gray-700">Provider: {block.data.provider}</p>
            )}
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Depart: {new Date(block.data.departureTime).toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Arrive: {new Date(block.data.arrivalTime).toLocaleString()}</span>
              </div>
            </div>
            {block.data.bookingReference && (
              <p className="text-xs text-gray-600">Booking: {block.data.bookingReference}</p>
            )}
            {block.data.notes && (
              <div className="flex items-start space-x-1 text-xs text-gray-600">
                <FileText className="w-3 h-3 mt-0.5" />
                <span>{block.data.notes}</span>
              </div>
            )}
          </div>
        );

      case 'accommodation':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">{block.data.name}</h4>
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getTypeColor()}`}>
                Accommodation
              </span>
            </div>
            <p className="text-sm text-gray-600">{block.data.address}</p>
            <p className="text-sm text-gray-600">{block.data.city}, {block.data.country}</p>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Check-in: {new Date(block.data.checkIn).toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Check-out: {new Date(block.data.checkOut).toLocaleString()}</span>
              </div>
            </div>
            {block.data.roomType && (
              <p className="text-xs text-gray-600">Room: {block.data.roomType}</p>
            )}
            {block.data.contactNumber && (
              <div className="flex items-center space-x-1 text-xs text-gray-600">
                <Phone className="w-3 h-3" />
                <span>{block.data.contactNumber}</span>
              </div>
            )}
            {block.data.notes && (
              <div className="flex items-start space-x-1 text-xs text-gray-600">
                <FileText className="w-3 h-3 mt-0.5" />
                <span>{block.data.notes}</span>
              </div>
            )}
          </div>
        );

      default:
        return <div>Unknown block type</div>;
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative bg-white rounded-lg border p-4 mb-3 ${isDragging ? 'opacity-50 z-10 shadow-lg' : ''}`}
    >
      <div className="flex items-start">
        <div 
          className="p-2 cursor-grab active:cursor-grabbing" 
          {...attributes} 
          {...listeners}
        >
          <GripVertical className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="flex-1 ml-2">
          <div className="flex items-center space-x-2 mb-2">
            <div className={`p-2 rounded-full ${
              block.type === 'location' ? 'bg-green-100' : 
              block.type === 'transport' ? 'bg-blue-100' : 
              'bg-purple-100'
            }`}>
              {getIcon()}
            </div>
            <div className="flex-1">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute top-2 right-2 flex space-x-1">
        <button 
          onClick={() => onEdit(block)}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="Edit"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onDelete(block.id)}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TimelineItem;