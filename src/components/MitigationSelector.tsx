import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  X, 
  Edit, 
  Trash2, 
  Shield, 
  Save, 
  Loader2, 
  Brain, 
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { 
  Mitigation, 
  AppliedMitigation, 
  MitigationCategory, 
  MitigationSelectorProps 
} from '../types/mitigation';
import AddMitigationForm from './AddMitigationForm';

const MitigationSelector: React.FC<MitigationSelectorProps> = ({
  category,
  selectedMitigations,
  onMitigationsChange,
  disabled = false
}) => {
  const [availableMitigations, setAvailableMitigations] = useState<Mitigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMitigation, setEditingMitigation] = useState<AppliedMitigation | null>(null);
  const [showAppliedMitigations, setShowAppliedMitigations] = useState(true);
  
  const { user, profile } = useAuth();

  useEffect(() => {
    fetchMitigations();
  }, [category]);

  const fetchMitigations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch mitigations that match the category or are general
      const { data, error } = await supabase
        .from('mitigations')
        .select('*')
        .or(`category.eq.${category},category.eq.general`)
        .order('name');

      if (error) throw error;
      
      setAvailableMitigations(data || []);
    } catch (err) {
      console.error('Error fetching mitigations:', err);
      setError('Failed to load mitigations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMitigation = async (mitigation: Mitigation) => {
    // Check if this mitigation is already applied
    if (selectedMitigations.some(m => m.mitigation_id === mitigation.id)) {
      setError('This mitigation is already applied');
      return;
    }

    const newAppliedMitigation: AppliedMitigation = {
      mitigation_id: mitigation.id,
      name: mitigation.name,
      description: mitigation.description || '',
      category: mitigation.category,
      applied_risk_reduction_score: mitigation.default_risk_reduction_score,
      notes: '',
      applied_at: new Date().toISOString(),
      applied_by: profile?.full_name || user?.email || 'Unknown'
    };

    const updatedMitigations = [...selectedMitigations, newAppliedMitigation];
    onMitigationsChange(updatedMitigations);
  };

  const handleRemoveMitigation = (mitigationId: string) => {
    const updatedMitigations = selectedMitigations.filter(m => m.mitigation_id !== mitigationId);
    onMitigationsChange(updatedMitigations);
  };

  const handleEditMitigation = (mitigation: AppliedMitigation) => {
    setEditingMitigation(mitigation);
  };

  const handleSaveEdit = () => {
    if (!editingMitigation) return;
    
    const updatedMitigations = selectedMitigations.map(m => 
      m.mitigation_id === editingMitigation.mitigation_id ? editingMitigation : m
    );
    
    onMitigationsChange(updatedMitigations);
    setEditingMitigation(null);
  };

  const handleCreateMitigation = async (formData: { name: string; description: string; category: MitigationCategory; default_risk_reduction_score: number }) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('mitigations')
        .insert([{
          organization_id: profile?.organization_id || '',
          name: formData.name,
          description: formData.description,
          category: formData.category,
          default_risk_reduction_score: formData.default_risk_reduction_score,
          is_custom: true
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Add the newly created mitigation to available mitigations
      setAvailableMitigations(prev => [...prev, data]);
      
      // Also apply it immediately
      const newAppliedMitigation: AppliedMitigation = {
        mitigation_id: data.id,
        name: data.name,
        description: data.description || '',
        category: data.category,
        applied_risk_reduction_score: data.default_risk_reduction_score,
        notes: '',
        applied_at: new Date().toISOString(),
        applied_by: profile?.full_name || user?.email || 'Unknown'
      };
      
      onMitigationsChange([...selectedMitigations, newAppliedMitigation]);
      setShowAddForm(false);
    } catch (err) {
      console.error('Error creating mitigation:', err);
      setError('Failed to create mitigation');
    } finally {
      setLoading(false);
    }
  };

  // Filter available mitigations based on search term and already selected mitigations
  const filteredMitigations = availableMitigations.filter(mitigation => {
    const matchesSearch = mitigation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (mitigation.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const isNotSelected = !selectedMitigations.some(m => m.mitigation_id === mitigation.id);
    return matchesSearch && isNotSelected;
  });

  // Calculate total risk reduction from applied mitigations
  const totalRiskReduction = selectedMitigations.reduce(
    (sum, mitigation) => sum + mitigation.applied_risk_reduction_score, 
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Shield className="w-5 h-5 text-blue-500" />
          <span>Mitigations</span>
          {selectedMitigations.length > 0 && (
            <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {selectedMitigations.length}
            </span>
          )}
        </h3>
        <div className="flex items-center space-x-2">
          {totalRiskReduction > 0 && (
            <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-lg text-sm">
              <Brain className="w-4 h-4" />
              <span>Risk reduction: -{totalRiskReduction}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            disabled={disabled}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Applied Mitigations Section */}
      {selectedMitigations.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div 
            className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between cursor-pointer"
            onClick={() => setShowAppliedMitigations(!showAppliedMitigations)}
          >
            <h4 className="font-medium text-gray-700">Applied Mitigations</h4>
            <button className="text-gray-500">
              {showAppliedMitigations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          
          {showAppliedMitigations && (
            <div className="divide-y divide-gray-200">
              {selectedMitigations.map((mitigation) => (
                <div key={mitigation.mitigation_id} className="p-4 bg-white">
                  {editingMitigation?.mitigation_id === mitigation.mitigation_id ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-gray-900">{mitigation.name}</h5>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleSaveEdit}
                            className="text-green-600 hover:text-green-800"
                            disabled={disabled}
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingMitigation(null)}
                            className="text-gray-500 hover:text-gray-700"
                            disabled={disabled}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Risk Reduction Score
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editingMitigation.applied_risk_reduction_score}
                          onChange={(e) => setEditingMitigation({
                            ...editingMitigation,
                            applied_risk_reduction_score: parseInt(e.target.value) || 0
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={disabled}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          rows={2}
                          value={editingMitigation.notes || ''}
                          onChange={(e) => setEditingMitigation({
                            ...editingMitigation,
                            notes: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Add implementation notes..."
                          disabled={disabled}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h5 className="font-medium text-gray-900">{mitigation.name}</h5>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">
                            {mitigation.category}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditMitigation(mitigation)}
                            className="text-blue-600 hover:text-blue-800"
                            disabled={disabled}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveMitigation(mitigation.mitigation_id)}
                            className="text-red-600 hover:text-red-800"
                            disabled={disabled}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {mitigation.description && (
                        <p className="text-sm text-gray-600">{mitigation.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1">
                          <Brain className="w-4 h-4 text-green-500" />
                          <span className="text-green-700">Risk reduction: {mitigation.applied_risk_reduction_score}</span>
                        </div>
                        <span className="text-gray-500 text-xs">
                          Applied by {mitigation.applied_by} on {new Date(mitigation.applied_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {mitigation.notes && (
                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 text-sm text-gray-700">
                          <p className="font-medium text-xs text-gray-500 mb-1">Notes:</p>
                          {mitigation.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search and Available Mitigations */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search mitigations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={disabled}
            />
          </div>
        </div>
        
        <div className="max-h-60 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredMitigations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No matching mitigations found</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                disabled={disabled}
              >
                Create a custom mitigation
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredMitigations.map((mitigation) => (
                <div 
                  key={mitigation.id} 
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => !disabled && handleAddMitigation(mitigation)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-gray-900">{mitigation.name}</h5>
                      {mitigation.description && (
                        <p className="text-sm text-gray-600 mt-1">{mitigation.description}</p>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">
                          {mitigation.category}
                        </span>
                        <div className="flex items-center space-x-1">
                          <Brain className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-green-700">Risk reduction: {mitigation.default_risk_reduction_score}</span>
                        </div>
                        {mitigation.is_custom && (
                          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                            Custom
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        !disabled && handleAddMitigation(mitigation);
                      }}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={disabled}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Apply</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Custom Mitigation Form */}
      {showAddForm && (
        <AddMitigationForm
          category={category}
          onClose={() => setShowAddForm(false)}
          onSubmit={handleCreateMitigation}
        />
      )}
    </div>
  );
};

export default MitigationSelector;