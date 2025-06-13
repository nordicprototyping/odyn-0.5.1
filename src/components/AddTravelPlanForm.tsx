import React, { useState } from 'react';
import { X, Plane, MapPin, Calendar, User, Shield, Phone, FileText, AlertTriangle, Save, Loader2, Brain } from 'lucide-react';
import { Database } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { TimelineBlock } from '../types/timeline';
import TimelineBuilder from './timeline/TimelineBuilder';

type TravelPlanInsert = Database['public']['Tables']['travel_plans']['Insert'];

interface AddTravelPlanFormProps {
  onClose: () => void;
  onSubmit: (data: TravelPlanInsert) => Promise<void>;
}

const AddTravelPlanForm: React.FC<AddTravelPlanFormProps> = ({ onClose, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'itinerary' | 'risk'>('basic');
  const [timelineBlocks, setTimelineBlocks] = useState<TimelineBlock[]>([]);
  
  const { user, profile } = useAuth();

  const [formData, setFormData] = useState({
    traveler_name: profile?.full_name || '',
    traveler_employee_id: '',
    traveler_department: profile?.department || '',
    traveler_clearance_level: 'Unclassified',
    destination: {
      city: '',
      country: '',
      coordinates: [0, 0] as [number, number]
    },
    origin: {
      city: '',
      country: '',
      coordinates: [0, 0] as [number, number]
    },
    departure_date: '',
    return_date: '',
    purpose: '',
    emergency_contacts: {
      local: '',
      embassy: ''
    },
    itinerary: {
      accommodation: '',
      transportation: '',
      meetings: [] as string[],
      timeline: [] as TimelineBlock[]
    },
    risk_assessment: {
      overall: 25,
      components: {
        geopolitical: 20,
        security: 25,
        health: 15,
        environmental: 20,
        transportation: 30
      },
      aiConfidence: 85,
      recommendations: [] as string[]
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.traveler_name || !formData.traveler_employee_id || !formData.traveler_department || 
          !formData.destination.city || !formData.destination.country || !formData.origin.city || 
          !formData.origin.country || !formData.departure_date || !formData.return_date || !formData.purpose) {
        throw new Error('Please fill in all required fields');
      }

      // Validate dates
      const departureDate = new Date(formData.departure_date);
      const returnDate = new Date(formData.return_date);
      
      if (departureDate >= returnDate) {
        throw new Error('Return date must be after departure date');
      }

      if (departureDate < new Date()) {
        throw new Error('Departure date cannot be in the past');
      }

      // Update itinerary with timeline blocks
      const updatedFormData = {
        ...formData,
        itinerary: {
          ...formData.itinerary,
          timeline: timelineBlocks
        }
      };

      const travelPlanData: TravelPlanInsert = {
        organization_id: profile?.organization_id || '',
        traveler_user_id: user?.id || null,
        traveler_name: updatedFormData.traveler_name,
        traveler_employee_id: updatedFormData.traveler_employee_id,
        traveler_department: updatedFormData.traveler_department,
        traveler_clearance_level: updatedFormData.traveler_clearance_level,
        destination: updatedFormData.destination,
        origin: updatedFormData.origin,
        departure_date: updatedFormData.departure_date,
        return_date: updatedFormData.return_date,
        purpose: updatedFormData.purpose,
        status: 'pending',
        risk_assessment: updatedFormData.risk_assessment,
        emergency_contacts: updatedFormData.emergency_contacts,
        itinerary: updatedFormData.itinerary,
        documents: []
      };

      await onSubmit(travelPlanData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit travel plan');
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
    'Canada',
    'Poland',
    'United Arab Emirates',
    'Netherlands',
    'Switzerland',
    'Italy',
    'Spain'
  ];

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

  const clearanceLevels = [
    'Unclassified',
    'Confidential',
    'Secret',
    'Top Secret'
  ];

  const handleTimelineChange = (blocks: TimelineBlock[]) => {
    setTimelineBlocks(blocks);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Plane className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">New Travel Plan</h2>
                <p className="text-gray-600">Submit a new travel plan for approval</p>
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

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'basic'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <User className="w-5 h-5" />
                <span>Basic Information</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('itinerary')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'itinerary'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>Itinerary Builder</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('risk')}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'risk'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Brain className="w-5 h-5" />
                <span>Risk Assessment</span>
              </button>
            </nav>
          </div>

          {/* Basic Information */}
          {activeTab === 'basic' && (
            <div className="space-y-8">
              {/* Traveler Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-500" />
                  <span>Traveler Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.traveler_name}
                      onChange={(e) => updateFormData('traveler_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter traveler name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.traveler_employee_id}
                      onChange={(e) => updateFormData('traveler_employee_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., EMP-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department *
                    </label>
                    <select
                      required
                      value={formData.traveler_department}
                      onChange={(e) => updateFormData('traveler_department', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Security Clearance *
                    </label>
                    <select
                      required
                      value={formData.traveler_clearance_level}
                      onChange={(e) => updateFormData('traveler_clearance_level', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {clearanceLevels.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Travel Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-green-500" />
                  <span>Travel Details</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Origin */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-800">Origin</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Origin City *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.origin.city}
                        onChange={(e) => updateFormData('origin.city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter origin city"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Origin Country *
                      </label>
                      <select
                        required
                        value={formData.origin.country}
                        onChange={(e) => updateFormData('origin.country', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Country</option>
                        {countries.map(country => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-800">Destination</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Destination City *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.destination.city}
                        onChange={(e) => updateFormData('destination.city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter destination city"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Destination Country *
                      </label>
                      <select
                        required
                        value={formData.destination.country}
                        onChange={(e) => updateFormData('destination.country', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Country</option>
                        {countries.map(country => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Travel Dates */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <span>Travel Dates</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Departure Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.departure_date}
                      onChange={(e) => updateFormData('departure_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Return Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.return_date}
                      onChange={(e) => updateFormData('return_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  <span>Travel Purpose</span>
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purpose of Travel *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.purpose}
                    onChange={(e) => updateFormData('purpose', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe the purpose and objectives of this travel..."
                  />
                </div>
              </div>

              {/* Emergency Contacts */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Phone className="w-5 h-5 text-red-500" />
                  <span>Emergency Contacts</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Local Emergency Contact
                    </label>
                    <input
                      type="tel"
                      value={formData.emergency_contacts.local}
                      onChange={(e) => updateFormData('emergency_contacts.local', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+1-555-0123"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Embassy/Consulate Contact
                    </label>
                    <input
                      type="tel"
                      value={formData.emergency_contacts.embassy}
                      onChange={(e) => updateFormData('emergency_contacts.embassy', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+1-555-0456"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Itinerary Builder */}
          {activeTab === 'itinerary' && (
            <div className="space-y-8">
              <TimelineBuilder 
                blocks={timelineBlocks}
                onChange={handleTimelineChange}
              />
            </div>
          )}

          {/* Risk Assessment */}
          {activeTab === 'risk' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  <span>AI Risk Assessment</span>
                </h3>
                <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Overall Risk Score (0-100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.risk_assessment.overall}
                        onChange={(e) => updateFormData('risk_assessment.overall', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        AI Confidence (0-100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.risk_assessment.aiConfidence}
                        onChange={(e) => updateFormData('risk_assessment.aiConfidence', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <h4 className="text-md font-medium text-gray-800 mb-3">Risk Components</h4>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    {Object.entries(formData.risk_assessment.components).map(([key, value]) => (
                      <div key={key} className="bg-white rounded-lg p-3 border">
                        <div className="text-xs font-medium text-gray-500 mb-1 capitalize">
                          {key}
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={value}
                          onChange={(e) => updateFormData(`risk_assessment.components.${key}`, parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-lg font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                          <div
                            className={`h-1 rounded-full ${
                              value <= 30 ? 'bg-green-500' :
                              value <= 70 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${value}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <h4 className="text-md font-medium text-gray-800 mb-3">AI Recommendations</h4>
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="space-y-2">
                      {formData.risk_assessment.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={rec}
                            onChange={(e) => {
                              const newRecs = [...formData.risk_assessment.recommendations];
                              newRecs[index] = e.target.value;
                              updateFormData('risk_assessment.recommendations', newRecs);
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newRecs = formData.risk_assessment.recommendations.filter((_, i) => i !== index);
                              updateFormData('risk_assessment.recommendations', newRecs);
                            }}
                            className="p-2 text-red-500 hover:text-red-700 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const newRecs = [...formData.risk_assessment.recommendations, ''];
                          updateFormData('risk_assessment.recommendations', newRecs);
                        }}
                        className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                      >
                        + Add Recommendation
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-between space-x-4 pt-6 mt-6 border-t border-gray-200">
            <div className="flex space-x-2">
              {activeTab !== 'basic' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'itinerary' ? 'basic' : 'itinerary')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Previous
                </button>
              )}
              {activeTab !== 'risk' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'basic' ? 'itinerary' : 'risk')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Next
                </button>
              )}
            </div>
            
            <div className="flex space-x-4">
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
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Submit Travel Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTravelPlanForm;