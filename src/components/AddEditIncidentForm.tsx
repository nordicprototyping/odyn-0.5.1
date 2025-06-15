import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';
import { Database } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useFormState } from '../hooks/useFormState';
import { useDepartments } from '../hooks/useDepartments';

type IncidentReport = Database['public']['Tables']['incident_reports']['Row'];
type IncidentInsert = Database['public']['Tables']['incident_reports']['Insert'];

interface AddEditIncidentFormProps {
  onClose: () => void;
  onSubmit: (formData: IncidentInsert) => Promise<void>;
  incidentToEdit?: IncidentReport | null;
}

const AddEditIncidentForm: React.FC<AddEditIncidentFormProps> = ({ 
  onClose, 
  onSubmit, 
  incidentToEdit 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const { departments } = useDepartments();
  
  const { formData, updateFormData, setFormData } = useFormState({
    title: '',
    description: '',
    date_time: '',
    severity: 'Medium' as const,
    location: '',
    department: '',
    involved_parties: '',
    immediate_actions: '',
    reporter_name: profile?.full_name || '',
    reporter_email: user?.email || '',
    reporter_phone: profile?.phone || ''
  });

  // Initialize form with incident data if editing
  useEffect(() => {
    if (incidentToEdit) {
      setFormData({
        title: incidentToEdit.title,
        description: incidentToEdit.description,
        date_time: new Date(incidentToEdit.date_time).toISOString().slice(0, 16),
        severity: incidentToEdit.severity,
        location: incidentToEdit.location,
        department: incidentToEdit.department,
        involved_parties: incidentToEdit.involved_parties.join(', '),
        immediate_actions: incidentToEdit.immediate_actions || '',
        reporter_name: incidentToEdit.reporter_name,
        reporter_email: incidentToEdit.reporter_email,
        reporter_phone: incidentToEdit.reporter_phone || ''
      });
    }
  }, [incidentToEdit, setFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.title || !formData.description || !formData.date_time || !formData.location || !formData.department) {
        throw new Error('Please fill in all required fields');
      }

      const incidentData: IncidentInsert = {
        title: formData.title,
        description: formData.description,
        date_time: formData.date_time,
        severity: formData.severity,
        location: formData.location,
        department: formData.department,
        involved_parties: formData.involved_parties ? formData.involved_parties.split(',').map(p => p.trim()) : [],
        immediate_actions: formData.immediate_actions || null,
        reporter_user_id: user?.id || null,
        reporter_name: formData.reporter_name,
        reporter_email: formData.reporter_email,
        reporter_phone: formData.reporter_phone || null,
        status: incidentToEdit?.status || 'Open',
        organization_id: profile?.organization_id || '',
        timeline: incidentToEdit?.timeline || [
          {
            timestamp: new Date().toISOString(),
            action: 'Incident reported',
            user: formData.reporter_name
          }
        ]
      };

      // If editing, add a timeline entry for the update
      if (incidentToEdit) {
        incidentData.timeline = [
          ...incidentToEdit.timeline,
          {
            timestamp: new Date().toISOString(),
            action: 'Incident updated',
            user: profile?.full_name || user?.email || 'Unknown'
          }
        ];
      }

      await onSubmit(incidentData);
    } catch (err) {
      console.error('Error submitting incident:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit incident report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {incidentToEdit ? 'Edit Incident Report' : 'Report New Incident'}
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
              Incident Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => updateFormData('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of the incident"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detailed Description *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Provide detailed information about what happened..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date and Time *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.date_time}
              onChange={(e) => updateFormData('date_time', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity Level *
            </label>
            <select
              required
              value={formData.severity}
              onChange={(e) => updateFormData('severity', e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location *
            </label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => updateFormData('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Specific location where incident occurred"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department *
            </label>
            <select
              required
              value={formData.department}
              onChange={(e) => updateFormData('department', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Involved Parties
            </label>
            <input
              type="text"
              value={formData.involved_parties}
              onChange={(e) => updateFormData('involved_parties', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Names of people involved (comma separated)"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Immediate Actions Taken
            </label>
            <textarea
              rows={3}
              value={formData.immediate_actions}
              onChange={(e) => updateFormData('immediate_actions', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe any immediate actions taken to address the incident..."
            />
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reporter Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.reporter_name}
                onChange={(e) => updateFormData('reporter_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={profile?.full_name || ''}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.reporter_email}
                onChange={(e) => updateFormData('reporter_email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={user?.email || ''}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.reporter_phone}
                onChange={(e) => updateFormData('reporter_phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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
                <span>{incidentToEdit ? 'Updating...' : 'Submitting...'}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{incidentToEdit ? 'Update Incident' : 'Submit Incident Report'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddEditIncidentForm;