import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle, Calendar, User, Building, Shield } from 'lucide-react';
import { Database } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useDepartments } from '../hooks/useDepartments';
import { supabase } from '../lib/supabase';
import MitigationSelector from './MitigationSelector';
import { AppliedMitigation } from '../types/mitigation';

type Risk = Database['public']['Tables']['risks']['Row'];
type RiskInsert = Database['public']['Tables']['risks']['Insert'];

interface AddEditRiskFormProps {
  onClose: () => void;
  onSubmit: (formData: RiskInsert) => Promise<void>;
  riskToEdit?: Risk | null;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  department: string | null;
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
    category: 'physical_security_vulnerabilities',
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
  const [mitigations, setMitigations] = useState<AppliedMitigation[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const { user, profile } = useAuth();
  const { departments } = useDepartments();

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

      // Set mitigations if they exist
      if (riskToEdit.mitigations && Array.isArray(riskToEdit.mitigations)) {
        setMitigations(riskToEdit.mitigations as AppliedMitigation[]);
      }
    }
  }, [riskToEdit]);

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, user_id, full_name, department')
          .order('full_name');
        
        if (error) {
          throw error;
        }
        
        setUsers(data || []);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoadingUsers(false);
      }
    };
    
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Ensure organization_id is set
      const finalFormData = {
        ...formData,
        organization_id: profile?.organization_id || '',
        mitigations: mitigations.length > 0 ? mitigations : null
      };

      await onSubmit(finalFormData);
    } catch (err) {
      console.error('Error submitting risk:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit risk');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'physical_security_vulnerabilities': return 'Physical Security Vulnerabilities';
      case 'environmental_hazards': return 'Environmental Hazards';
      case 'natural_disasters': return 'Natural Disasters';
      case 'infrastructure_failure': return 'Infrastructure Failure';
      case 'personnel_safety_security': return 'Personnel Safety & Security';
      case 'asset_damage_loss': return 'Asset Damage/Loss';
      default: return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
                <option value="physical_security_vulnerabilities">Physical Security Vulnerabilities</option>
                <option value="environmental_hazards">Environmental Hazards</option>
                <option value="natural_disasters">Natural Disasters</option>
                <option value="infrastructure_failure">Infrastructure Failure</option>
                <option value="personnel_safety_security">Personnel Safety & Security</option>
                <option value="asset_damage_loss">Asset Damage/Loss</option>
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
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                <Building className="w-4 h-4 text-gray-500" />
                <span>Department *</span>
              </label>
              <select
                value={formData.department || ''}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                value={formData.due_date ? formData.due_date.split('T')[0] : ''}
                onChange={(e) => setFormData({...formData, due_date: e.target.value ? `${e.target.value}T00:00:00Z` : null})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <span>Risk Owner</span>
              </label>
              <select
                value={formData.owner_user_id || ''}
                onChange={(e) => setFormData({...formData, owner_user_id: e.target.value || null})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Risk Owner</option>
                {loadingUsers ? (
                  <option disabled>Loading users...</option>
                ) : (
                  users.map(user => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.full_name} {user.department ? `(${user.department})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <span>Identified By</span>
              </label>
              <select
                value={formData.identified_by_user_id || ''}
                onChange={(e) => setFormData({...formData, identified_by_user_id: e.target.value || null})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select User</option>
                {loadingUsers ? (
                  <option disabled>Loading users...</option>
                ) : (
                  users.map(user => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.full_name} {user.department ? `(${user.department})` : ''}
                    </option>
                  ))
                )}
              </select>
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

          {/* Mitigations Selector */}
          <div className="border-t border-gray-200 pt-6">
            <MitigationSelector
              category="risk"
              selectedMitigations={mitigations}
              onMitigationsChange={setMitigations}
              disabled={loading}
            />
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