import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';
import { Database } from '../lib/supabase';

type Risk = Database['public']['Tables']['risks']['Row'];
type RiskInsert = Database['public']['Tables']['risks']['Insert'];

interface AddEditRiskFormProps {
  onClose: () => void;
  onSubmit: (formData: RiskInsert) => Promise<void>;
  riskToEdit?: Risk | null;
}

const AddEditRiskForm: React.FC<AddEditRiskFormProps> = ({ 
  onClose, 
  onSubmit, 
  riskToEdit 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<RiskInsert>({
    title: '',
    description: '',
    category: 'operational',
    status: 'identified',
    impact: 'medium',
    likelihood: 'medium',
    mitigation_plan: '',
    owner_user_id: null,
    identified_by_user_id: null,
    department: '',
    due_date: null,
    organization_id: '' // This will be set by the parent component
  });

  // Initialize form with risk data if editing
  useEffect(() => {
    if (riskToEdit) {
      setFormData({
        title: riskToEdit.title,
        description: riskToEdit.description,
        category: riskToEdit.category,
        status: riskToEdit.status,
        impact: riskToEdit.impact,
        likelihood: riskToEdit.likelihood,
        mitigation_plan: riskToEdit.mitigation_plan || '',
        owner_user_id: riskToEdit.owner_user_id,
        identified_by_user_id: riskToEdit.identified_by_user_id,
        department: riskToEdit.department || '',
        due_date: riskToEdit.due_date,
        organization_id: riskToEdit.organization_id
      });
    }
  }, [riskToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
    } catch (err) {
      console.error('Error submitting risk:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit risk');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {riskToEdit ? 'Edit Risk' : 'Add New Risk'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Risk Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter risk title"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the risk in detail..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="operational">Operational</option>
                <option value="financial">Financial</option>
                <option value="strategic">Strategic</option>
                <option value="compliance">Compliance</option>
                <option value="security">Security</option>
                <option value="technical">Technical</option>
                <option value="environmental">Environmental</option>
                <option value="reputational">Reputational</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="identified">Identified</option>
                <option value="assessed">Assessed</option>
                <option value="mitigated">Mitigated</option>
                <option value="monitoring">Monitoring</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Impact Level *
              </label>
              <select
                required
                value={formData.impact}
                onChange={(e) => setFormData({...formData, impact: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="very_low">Very Low</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="very_high">Very High</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Likelihood *
              </label>
              <select
                required
                value={formData.likelihood}
                onChange={(e) => setFormData({...formData, likelihood: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="very_low">Very Low</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="very_high">Very High</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <input
                type="text"
                value={formData.department || ''}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter department"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date ? formData.due_date.split('T')[0] : ''}
                onChange={(e) => setFormData({...formData, due_date: e.target.value ? `${e.target.value}T00:00:00Z` : null})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mitigation Plan
              </label>
              <textarea
                rows={4}
                value={formData.mitigation_plan || ''}
                onChange={(e) => setFormData({...formData, mitigation_plan: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the mitigation plan and actions taken..."
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{riskToEdit ? 'Updating...' : 'Adding...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{riskToEdit ? 'Update Risk' : 'Add Risk'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditRiskForm;