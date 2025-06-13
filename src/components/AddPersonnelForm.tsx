import React, { useState } from 'react';
import { X, User, MapPin, Shield, Phone, Briefcase, AlertTriangle, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AddPersonnelFormProps {
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const AddPersonnelForm: React.FC<AddPersonnelFormProps> = ({ onClose, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    employee_id: '',
    category: 'full-time',
    department: '',
    current_location: {
      city: '',
      country: '',
      coordinates: [0, 0] as [number, number]
    },
    work_location: '',
    clearance_level: 'Unclassified',
    emergency_contact: {
      name: '',
      phone: '',
      relationship: ''
    },
    travel_status: {
      current: '',
      isActive: false,
      authorization: 'approved' as const
    },
    ai_risk_score: {
      overall: 25,
      components: {
        behavioralRisk: 20,
        travelRisk: 15,
        accessRisk: 30,
        complianceRisk: 10,
        geographicRisk: 25
      },
      trend: 'stable' as const,
      lastUpdated: new Date().toISOString(),
      confidence: 85,
      predictions: {
        nextWeek: 26,
        nextMonth: 24
      }
    },
    status: 'active',
    last_seen: 'Just now'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.name || !formData.employee_id || !formData.department) {
        throw new Error('Please fill in all required fields');
      }

      // Set current location as work location if not specified
      if (!formData.travel_status.current) {
        formData.travel_status.current = formData.current_location.city;
      }

      // Add organization_id to the data
      const personnelData = {
        ...formData,
        organization_id: profile?.organization_id || ''
      };

      await onSubmit(personnelData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add personnel');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (path: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const departments = [
    'Security Operations',
    'Field Operations',
    'Risk Analysis',
    'Transport Security',
    'IT Security',
    'Cyber Intelligence',
    'Executive',
    'HR',
    'Operations',
    'Finance'
  ];

  const countries = [
    'United States',
    'United Kingdom',
    'Singapore',
    'Turkey',
    'Ukraine',
    'India',
    'South Korea',
    'France',
    'Germany',
    'Japan',
    'Australia',
    'Canada'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add New Personnel</h2>
                <p className="text-gray-600">Enter personnel details and security information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-500" />
              <span>Basic Information</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee ID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.employee_id}
                  onChange={(e) => updateFormData('employee_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., EMP-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => updateFormData('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="full-time">Full-time</option>
                  <option value="contractor">Contractor</option>
                  <option value="temporary">Temporary</option>
                  <option value="remote">Remote</option>
                  <option value="executive">Executive</option>
                  <option value="field">Field</option>
                </select>
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
            </div>
          </div>

          {/* Location Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-green-500" />
              <span>Location Information</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current City *
                </label>
                <input
                  type="text"
                  required
                  value={formData.current_location.city}
                  onChange={(e) => updateFormData('current_location.city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter current city"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Country *
                </label>
                <select
                  required
                  value={formData.current_location.country}
                  onChange={(e) => updateFormData('current_location.country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Country</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.current_location.coordinates[1]}
                  onChange={(e) => updateFormData('current_location.coordinates', [formData.current_location.coordinates[0], parseFloat(e.target.value) || 0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 40.7128"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.current_location.coordinates[0]}
                  onChange={(e) => updateFormData('current_location.coordinates', [parseFloat(e.target.value) || 0, formData.current_location.coordinates[1]])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., -74.0060"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Location *
                </label>
                <input
                  type="text"
                  required
                  value={formData.work_location}
                  onChange={(e) => updateFormData('work_location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Singapore HQ, Remote, Embassy Ankara"
                />
              </div>
            </div>
          </div>

          {/* Security Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5 text-red-500" />
              <span>Security Information</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Security Clearance *
                </label>
                <select
                  required
                  value={formData.clearance_level}
                  onChange={(e) => updateFormData('clearance_level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Unclassified">Unclassified</option>
                  <option value="Confidential">Confidential</option>
                  <option value="Secret">Secret</option>
                  <option value="Top Secret">Top Secret</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => updateFormData('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="on-mission">On Mission</option>
                  <option value="in-transit">In Transit</option>
                  <option value="off-duty">Off Duty</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Phone className="w-5 h-5 text-orange-500" />
              <span>Emergency Contact</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.emergency_contact.name}
                  onChange={(e) => updateFormData('emergency_contact.name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter contact name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.emergency_contact.phone}
                  onChange={(e) => updateFormData('emergency_contact.phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., +1-555-0123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship *
                </label>
                <select
                  required
                  value={formData.emergency_contact.relationship}
                  onChange={(e) => updateFormData('emergency_contact.relationship', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Relationship</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Child">Child</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* AI Risk Score */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Briefcase className="w-5 h-5 text-purple-500" />
              <span>AI Risk Assessment</span>
            </h3>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overall Risk Score (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.ai_risk_score.overall}
                    onChange={(e) => updateFormData('ai_risk_score.overall', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trend
                  </label>
                  <select
                    value={formData.ai_risk_score.trend}
                    onChange={(e) => updateFormData('ai_risk_score.trend', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="improving">Improving</option>
                    <option value="stable">Stable</option>
                    <option value="deteriorating">Deteriorating</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Confidence (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.ai_risk_score.confidence}
                    onChange={(e) => updateFormData('ai_risk_score.confidence', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
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
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Add Personnel</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPersonnelForm;