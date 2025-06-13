import React, { useState } from 'react';
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
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { MapPin, Plane, Building, Plus } from 'lucide-react';
import { TimelineBlock } from '../../types/timeline';
import TimelineItem from './TimelineItem';
import TimelineBlockForm from './TimelineBlockForm';

interface TimelineBuilderProps {
  blocks: TimelineBlock[];
  onChange: (blocks: TimelineBlock[]) => void;
}

const TimelineBuilder: React.FC<TimelineBuilderProps> = ({ blocks, onChange }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimelineBlock | undefined>(undefined);
  const [blockType, setBlockType] = useState<'location' | 'transport' | 'accommodation'>('location');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(block => block.id === active.id);
      const newIndex = blocks.findIndex(block => block.id === over.id);
      
      const newBlocks = arrayMove(blocks, oldIndex, newIndex).map((block, index) => ({
        ...block,
        order: index
      }));
      
      onChange(newBlocks);
    }
  };

  const handleAddBlock = (type: 'location' | 'transport' | 'accommodation') => {
    setBlockType(type);
    setEditingBlock(undefined);
    setShowForm(true);
  };

  const handleEditBlock = (block: TimelineBlock) => {
    setEditingBlock(block);
    setShowForm(true);
  };

  const handleDeleteBlock = (id: string) => {
    const newBlocks = blocks.filter(block => block.id !== id).map((block, index) => ({
      ...block,
      order: index
    }));
    onChange(newBlocks);
  };

  const handleSaveBlock = (block: TimelineBlock) => {
    let newBlocks: TimelineBlock[];
    
    if (editingBlock) {
      // Update existing block
      newBlocks = blocks.map(b => b.id === block.id ? block : b);
    } else {
      // Add new block
      newBlocks = [...blocks, block];
    }
    
    // Sort by order
    newBlocks.sort((a, b) => a.order - b.order);
    
    onChange(newBlocks);
    setShowForm(false);
    setEditingBlock(undefined);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Travel Itinerary Timeline</h3>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => handleAddBlock('location')}
            className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            <span>Add Location</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddBlock('transport')}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <Plane className="w-4 h-4" />
            <span>Add Transport</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddBlock('accommodation')}
            className="flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
          >
            <Building className="w-4 h-4" />
            <span>Add Accommodation</span>
          </button>
        </div>
      </div>

      {blocks.length === 0 && !showForm ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Plus className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Build Your Travel Timeline</h3>
          <p className="text-gray-500 mb-4">
            Add locations, transportation, and accommodations to create a detailed itinerary
          </p>
          <div className="flex justify-center space-x-3">
            <button
              type="button"
              onClick={() => handleAddBlock('location')}
              className="flex items-center space-x-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              <span>Add Location</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddBlock('transport')}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Plane className="w-4 h-4" />
              <span>Add Transport</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddBlock('accommodation')}
              className="flex items-center space-x-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <Building className="w-4 h-4" />
              <span>Add Accommodation</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {showForm ? (
            <TimelineBlockForm
              block={editingBlock}
              blockType={blockType}
              onSave={handleSaveBlock}
              onCancel={() => {
                setShowForm(false);
                setEditingBlock(undefined);
              }}
              nextOrder={blocks.length}
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map(block => block.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {blocks.map((block) => (
                    <TimelineItem
                      key={block.id}
                      block={block}
                      onEdit={handleEditBlock}
                      onDelete={handleDeleteBlock}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
};

export default TimelineBuilder;