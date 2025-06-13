import React, { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  Download,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Brain,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Mitigation, MitigationCategory } from '../types/mitigation';
import AddMitigationForm from '../components/AddMitigationForm';

const MitigationsPage: React.FC = () => {
  const [mitigations, setMitigations] = useState<Mitigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterCustom, setFilterCustom] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMitigation, setEditingMitigation] = useState<Mitigation | null>(null);
  const [expandedMitigation, setExpandedMitigation] = useState<string | null>(null);

  const { hasPermission, profile } = useAuth();

  useEffect(() => {
    fetchMitigations();
  }, []);

  const fetchMitigations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('mitigations')
        .select('*')
        .order('name');

      if (error) throw error;
      
      setMitigations(data || []);
    } catch (err) {
      console.error('Error fetching mitigations:', err);
      setError('Failed to load mitigations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMitigation = async (formData: { 
    name: string; 
    description: string; 
    category: MitigationCategory; 
    default_risk_reduction_score: number 
  }) => {
    try {
      setLoading(true);
      setError(null);
      
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
        .select();

      if (error) throw error;
      
      setMitigations(prev => [...prev, ...(data || [])]);
      setShowAddForm(false);
      setSuccess('Mitigation created successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error creating mitigation:', err);
      setError(err instanceof Error ? err.message : 'Failed to create mitigation');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMitigation = async (id: string, updates: Partial<Mitigation>) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('mitigations')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      
      setMitigations(prev => prev.map(m => m.id === id ? (data?.[0] || m) : m));
      setEditingMitigation(null);
      setSuccess('Mitigation updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating mitigation:', err);
      setError(err instanceof Error ? err.message : 'Failed to update mitigation');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMitigation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mitigation? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('mitigations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setMitigations(prev => prev.filter(m => m.id !== id));
      setSuccess('Mitigation deleted successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting mitigation:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete mitigation');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedMitigation(expandedMitigation === id ? null : id);
  };

  const filteredMitigations = mitigations.filter(mitigation => {
    const matchesSearch = mitigation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (mitigation.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || mitigation.category === filterCategory;
    const matchesCustom = filterCustom === 'all' || 
                         (filterCustom === 'custom' && mitigation.is_custom) || 
                         (filterCustom === 'standard' && !mitigation.is_custom);
    
    return matchesSearch && matchesCategory && matchesCustom;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'asset': return 'bg-blue-100 text-blue-700';
      case 'personnel': return 'bg-green-100 text-green-700';
      case 'incident': return 'bg-red-100 text-red-700';
      case 'travel': return 'bg-orange-100 text-orange-700';
      case 'risk': return 'bg-purple-100 text-purple-700';
      case 'general': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'asset': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'personnel': return <FileText className="w-4 h-4 text-green-500" />;
      case 'incident': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'travel': return <FileText className="w-4 h-4 text-orange-500" />;
      case 'risk': return <FileText className="w-4 h-4 text-purple-500" />;
      case 'general': return <FileText className="w-4 h-4 text-gray-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'asset', label: 'Asset' },
    { value: 'personnel', label: 'Personnel' },
    { value: 'incident', label: 'Incident' },
    { value: 'travel', label: 'Travel' },
    { value: 'risk', label: 'Risk' },
    { value: 'general', label: 'General' }
  ];

  const mitigationStats = {
    total: mitigations.length,
    custom: mitigations.filter(m => m.is_custom).length,
    standard: mitigations.filter(m => !m.is_custom).length,
    asset: mitigations.filter(m => m.category === 'asset').length,
    personnel: mitigations.filter(m => m.category === 'personnel').length,
    incident: mitigations.filter(m => m.category === 'incident').length,
    travel: mitigations.filter(m => m.category === 'travel').length,
    risk: mitigations.filter(m => m.category === 'risk').length,
    general: mitigations.filter(m => m.category === 'general').length
  };

  if (loading && mitigations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading mitigations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mitigation Management</h1>
          <p className="text-gray-600">Create and manage risk mitigation strategies</p>
        </div>
        <div className="flex items-center space-x-3">
          {hasPermission('mitigations.create') && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Mitigation</span>
            </button>
          )}
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
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

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="text-green-700 text-sm">{success}</span>
          <button 
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Mitigations</p>
              <p className="text-2xl font-bold text-gray-900">{mitigationStats.total}</p>
            </div>
            <Shield className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Custom Mitigations</p>
              <p className="text-2xl font-bold text-purple-600">{mitigationStats.custom}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Standard Mitigations</p>
              <p className="text-2xl font-bold text-blue-600">{mitigationStats.standard}</p>
            </div>
            <Shield className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Risk Reduction</p>
              <p className="text-2xl font-bold text-green-600">
                {mitigations.length > 0 
                  ? Math.round(mitigations.reduce((sum, m) => sum + m.default_risk_reduction_score, 0) / mitigations.length) 
                  : 0}
              </p>
            </div>
            <Brain className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search mitigations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            
            <select
              value={filterCustom}
              onChange={(e) => setFilterCustom(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="standard">Standard</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Showing {filteredMitigations.length} of {mitigations.length} mitigations
            </span>
          </div>
        </div>
      </div>

      {/* Mitigations List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredMitigations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No mitigations found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterCategory !== 'all' || filterCustom !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first mitigation to get started'}
            </p>
            {hasPermission('mitigations.create') && (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Mitigation</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredMitigations.map((mitigation) => (
              <div key={mitigation.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getCategoryColor(mitigation.category)}`}>
                      {getCategoryIcon(mitigation.category)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{mitigation.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(mitigation.category)} capitalize`}>
                          {mitigation.category}
                        </span>
                        {mitigation.is_custom && (
                          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                            Custom
                          </span>
                        )}
                        <div className="flex items-center space-x-1 text-xs text-green-700">
                          <Brain className="w-3 h-3 text-green-500" />
                          <span>Risk reduction: {mitigation.default_risk_reduction_score}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleExpand(mitigation.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    >
                      {expandedMitigation === mitigation.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {hasPermission('mitigations.update') && (
                      <button
                        onClick={() => setEditingMitigation(mitigation)}
                        className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {hasPermission('mitigations.delete') && mitigation.is_custom && (
                      <button
                        onClick={() => handleDeleteMitigation(mitigation.id)}
                        className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                {expandedMitigation === mitigation.id && (
                  <div className="mt-4 pl-12">
                    {mitigation.description ? (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                        <p className="text-sm text-gray-600">{mitigation.description}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic mb-3">No description provided</p>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Details</h4>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Category:</span>
                            <span className="font-medium capitalize">{mitigation.category}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Type:</span>
                            <span className="font-medium">{mitigation.is_custom ? 'Custom' : 'Standard'}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Created:</span>
                            <span className="font-medium">{new Date(mitigation.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Last Updated:</span>
                            <span className="font-medium">{new Date(mitigation.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Risk Reduction</h4>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">Default Score:</span>
                            <div className="flex items-center space-x-1">
                              <Brain className="w-4 h-4 text-green-500" />
                              <span className="text-lg font-bold text-green-600">{mitigation.default_risk_reduction_score}</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-green-500 h-2.5 rounded-full" 
                              style={{ width: `${Math.min(mitigation.default_risk_reduction_score, 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            This score represents how much this mitigation reduces the overall risk (0-100)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Edit Form */}
                {editingMitigation?.id === mitigation.id && (
                  <div className="mt-4 pl-12 border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Edit Mitigation</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={editingMitigation.name}
                          onChange={(e) => setEditingMitigation({...editingMitigation, name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          value={editingMitigation.description || ''}
                          onChange={(e) => setEditingMitigation({...editingMitigation, description: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <select
                          value={editingMitigation.category}
                          onChange={(e) => setEditingMitigation({...editingMitigation, category: e.target.value as MitigationCategory})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {categories.filter(c => c.value !== 'all').map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center space-x-2">
                          <Brain className="w-4 h-4 text-green-500" />
                          <span>Risk Reduction Score</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editingMitigation.default_risk_reduction_score}
                          onChange={(e) => setEditingMitigation({...editingMitigation, default_risk_reduction_score: parseInt(e.target.value) || 0})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-3 pt-3">
                        <button
                          type="button"
                          onClick={() => setEditingMitigation(null)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateMitigation(editingMitigation.id, editingMitigation)}
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
            ))}
          </div>
        )}
      </div>

      {/* Add Mitigation Form Modal */}
      {showAddForm && (
        <AddMitigationForm
          category="general"
          onClose={() => setShowAddForm(false)}
          onSubmit={handleAddMitigation}
        />
      )}
    </div>
  );
};

export default MitigationsPage;