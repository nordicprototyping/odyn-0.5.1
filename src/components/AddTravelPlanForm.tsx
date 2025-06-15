import React, { useState, useEffect } from 'react';
import { X, Plane, MapPin, Calendar, Clock, AlertTriangle, CheckCircle, XCircle, Users, Shield, Globe, Search, Filter, Download, Plus, Eye, Edit, FileText, Brain, Zap, TrendingUp, TrendingDown, Car, Building, Phone, Mail, Loader2, Save } from 'lucide-react';
import { Database } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { TimelineBlock } from '../types/timeline';
import TimelineBuilder from './timeline/TimelineBuilder';
import { aiService } from '../services/aiService';
import MitigationSelector from './MitigationSelector';
import { AppliedMitigation } from '../types/mitigation';
import { useFormState } from '../hooks/useFormState';
import { countries, clearanceLevels } from '../utils/constants';
import { useDepartments } from '../hooks/useDepartments';
import LocationSearchInput from './common/LocationSearchInput';
import { LocationData } from '../services/nominatimService';

type TravelPlan = Database['public']['Tables']['travel_plans']['Row'];
type TravelPlanInsert = Database['public']['Tables']['travel_plans']['Insert'];
type TravelPlanUpdate = Database['public']['Tables']['travel_plans']['Update'];

interface AddTravelPlanFormProps {
  onClose: () => void;
  onSubmit: (data: TravelPlanInsert | TravelPlanUpdate) => Promise<void>;
  travelPlanToEdit?: TravelPlan | null;
}

const AddTravelPlanForm: React.FC<AddTravelPlanFormProps> = ({ onClose, onSubmit, travelPlanToEdit }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'itinerary' | 'risk'>('basic');
  const [timelineBlocks, setTimelineBlocks] = useState<TimelineBlock[]>([]);
  const [aiScoring, setAiScoring] = useState(false);
  const [mitigations, setMitigations] = useState<AppliedMitigation[]>([]);
  const { departments } = useDepartments();
  
  const { user, profile } = useAuth();

  const isEditMode = !!travelPlanToEdit;

  // Initialize form data based on whether we're editing or creating
  const { formData, updateFormData, setFormData } = useFormState({
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

  // Update form data when editing an existing travel plan
  useEffect(() => {
    if (travelPlanToEdit) {
      // Extract timeline blocks from the travel plan's itinerary
      const existingTimelineBlocks = (travelPlanToEdit.itinerary as any)?.timeline || [];
      setTimelineBlocks(existingTimelineBlocks);
      
      // Extract mitigations if they exist
      if (travelPlanToEdit.mitigations && Array.isArray(travelPlanToEdit.mitigations)) {
        setMitigations(travelPlanToEdit.mitigations as AppliedMitigation[]);
      }
      
      // Set form data from the travel plan
      setFormData({
        traveler_name: travelPlanToEdit.traveler_name,
        traveler_employee_id: travelPlanToEdit.traveler_employee_id,
        traveler_department: travelPlanToEdit.traveler_department,
        traveler_clearance_level: travelPlanToEdit.traveler_clearance_level,
        destination: travelPlanToEdit.destination as any,
        origin: travelPlanToEdit.origin as any,
        departure_date: new Date(travelPlanToEdit.departure_date).toISOString().slice(0, 16),
        return_date: new Date(travelPlanToEdit.return_date).toISOString().slice(0, 16),
        purpose: travelPlanToEdit.purpose,
        emergency_contacts: travelPlanToEdit.emergency_contacts as any,
        itinerary: {
          ...(travelPlanToEdit.itinerary as any),
          timeline: existingTimelineBlocks
        },
        risk_assessment: travelPlanToEdit.risk_assessment as any
      });
    }
  }, [travelPlanToEdit, setFormData]);

  const handleDestinationChange = (location: LocationData | null) => {
    if (location) {
      updateFormData('destination', {
        address: location.address,
        city: location.city,
        country: location.country,
        coordinates: location.coordinates
      });
    }
  };

  const handleOriginChange = (location: LocationData | null) => {
    if (location) {
      updateFormData('origin', {
        address: location.address,
        city: location.city,
        country: location.country,
        coordinates: location.coordinates
      });
    }
  };

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

      // Only validate departure date is in the future for new plans, not when editing
      if (!isEditMode && departureDate < new Date()) {
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

      // For new plans, calculate AI risk score
      if (!isEditMode) {
        // Prepare travel plan data for AI risk scoring
        const travelPlanData = {
          organization_id: profile?.organization_id || '',
          traveler_name: updatedFormData.traveler_name,
          traveler_employee_id: updatedFormData.traveler_employee_id,
          traveler_department: updatedFormData.traveler_department,
          traveler_clearance_level: updatedFormData.traveler_clearance_level,
          destination: updatedFormData.destination,
          origin: updatedFormData.origin,
          departure_date: updatedFormData.departure_date,
          return_date: updatedFormData.return_date,
          purpose: updatedFormData.purpose,
          itinerary: updatedFormData.itinerary
        };

        // Set AI scoring state to show loading indicator
        setAiScoring(true);

        // Call AI service to get risk score
        let aiRiskAssessment = { ...formData.risk_assessment };
        
        try {
          const aiResult = await aiService.scoreTravelRisk(travelPlanData);
          
          // Update risk assessment with AI-calculated values
          aiRiskAssessment = {
            overall: aiResult.score,
            components: aiResult.components || aiRiskAssessment.components,
            aiConfidence: aiResult.confidence,
            recommendations: aiResult.recommendations || [],
            explanation: aiResult.explanation,
            trend: aiResult.trend || 'stable'
          };
        } catch (aiError) {
          console.error('Error getting AI risk score:', aiError);
          // Continue with default risk assessment if AI scoring fails
        } finally {
          setAiScoring(false);
        }
        
        // Calculate effective risk score based on mitigations
        const totalRiskReduction = mitigations.reduce(
          (sum, mitigation) => sum + mitigation.applied_risk_reduction_score, 
          0
        );
        
        // Ensure risk score doesn't go below 0
        const effectiveRiskScore = Math.max(0, aiRiskAssessment.overall - totalRiskReduction);
        
        // Update the risk assessment with the effective value
        const updatedRiskAssessment = {
          ...aiRiskAssessment,
          overall: effectiveRiskScore,
          mitigationApplied: totalRiskReduction > 0,
          originalScore: aiRiskAssessment.overall,
          totalRiskReduction
        };

        // Prepare final data for new travel plan
        const travelPlanDataFinal: TravelPlanInsert = {
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
          risk_assessment: updatedRiskAssessment,
          emergency_contacts: updatedFormData.emergency_contacts,
          itinerary: updatedFormData.itinerary,
          documents: [],
          mitigations: mitigations.length > 0 ? mitigations : null
        };

        await onSubmit(travelPlanDataFinal);
      } else {
        // For editing, we don't recalculate AI risk score unless explicitly requested
        // Just update the existing travel plan with the new values
        
        // Calculate effective risk score based on mitigations if they've changed
        let updatedRiskAssessment = formData.risk_assessment;
        
        if (mitigations.length > 0) {
          const totalRiskReduction = mitigations.reduce(
            (sum, mitigation) => sum + mitigation.applied_risk_reduction_score, 
            0
          );
          
          // Get the original score (before mitigation) if available, otherwise use current overall
          const originalScore = (formData.risk_assessment as any).originalScore || formData.risk_assessment.overall;
          
          // Ensure risk score doesn't go below 0
          const effectiveRiskScore = Math.max(0, originalScore - totalRiskReduction);
          
          // Update the risk assessment with the effective value
          updatedRiskAssessment = {
            ...formData.risk_assessment,
            overall: effectiveRiskScore,
            mitigationApplied: totalRiskReduction > 0,
            originalScore: originalScore,
            totalRiskReduction
          };
        }

        // Prepare update data
        const travelPlanUpdateData: TravelPlanUpdate = {
          traveler_name: updatedFormData.traveler_name,
          traveler_employee_id: updatedFormData.traveler_employee_id,
          traveler_department: updatedFormData.traveler_department,
          traveler_clearance_level: updatedFormData.traveler_clearance_level,
          destination: updatedFormData.destination,
          origin: updatedFormData.origin,
          departure_date: updatedFormData.departure_date,
          return_date: updatedFormData.return_date,
          purpose: updatedFormData.purpose,
          risk_assessment: updatedRiskAssessment,
          emergency_contacts: updatedFormData.emergency_contacts,
          itinerary: updatedFormData.itinerary,
          mitigations: mitigations.length > 0 ? mitigations : null,
          updated_at: new Date().toISOString()
        };

        await onSubmit(travelPlanUpdateData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit travel plan');
    } finally {
      setLoading(false);
    }
  };

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
                <h2 className="text-xl font-bold text-gray-900">
                  {isEditMode ? 'Edit Travel Plan' : 'New Travel Plan'}
                </h2>
                <p className="text-gray-600">
                  {isEditMode ? 'Update travel plan details' : 'Submit a new travel plan for approval'}
                </p>
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
                    <LocationSearchInput
                      value={formData.origin.city ? {
                        address: formData.origin.address || '',
                        city: formData.origin.city,
                        country: formData.origin.country,
                        coordinates: formData.origin.coordinates
                      } : null}
                      onChange={handleOriginChange}
                      placeholder="Search for origin location..."
                      required={true}
                      label="Origin Location *"
                    />
                  </div>

                  {/* Destination */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-800">Destination</h4>
                    <LocationSearchInput
                      value={formData.destination.city ? {
                        address: formData.destination.address || '',
                        city: formData.destination.city,
                        country: formData.destination.country,
                        coordinates: formData.destination.coordinates
                      } : null}
                      onChange={handleDestinationChange}
                      placeholder="Search for destination location..."
                      required={true}
                      label="Destination Location *"
                    />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Accommodation
                  </label>
                  <input
                    type="text"
                    value={formData.itinerary.accommodation}
                    onChange={(e) => updateFormData('itinerary.accommodation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Hotel name, Secure facility, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transportation
                  </label>
                  <input
                    type="text"
                    value={formData.itinerary.transportation}
                    onChange={(e) => updateFormData('itinerary.transportation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Commercial flight, Secure vehicle, etc."
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Meetings
                </label>
                <div className="space-y-2">
                  {formData.itinerary.meetings.map((meeting, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={meeting}
                        onChange={(e) => {
                          const updatedMeetings = [...formData.itinerary.meetings];
                          updatedMeetings[index] = e.target.value;
                          updateFormData('itinerary.meetings', updatedMeetings);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Meeting description"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updatedMeetings = formData.itinerary.meetings.filter((_, i) => i !== index);
                          updateFormData('itinerary.meetings', updatedMeetings);
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
                      updateFormData('itinerary.meetings', [...formData.itinerary.meetings, '']);
                    }}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  >
                    + Add Meeting
                  </button>
                </div>
              </div>
              
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
                  <p className="text-sm text-purple-700 mb-4">
                    {isEditMode ? 
                      "The AI risk assessment was calculated when this travel plan was created. You can add or modify mitigations below to adjust the risk score." :
                      "AI risk assessment will be automatically calculated when you submit the travel plan. The assessment will consider factors such as destination, purpose, traveler profile, and current geopolitical conditions."
                    }
                  </p>
                  
                  {isEditMode && (formData.risk_assessment as any).explanation && (
                    <div className="bg-white rounded-lg p-4 border border-purple-200 mb-4">
                      <h4 className="text-sm font-medium text-purple-800 mb-2">AI Analysis</h4>
                      <p className="text-sm text-gray-700">{(formData.risk_assessment as any).explanation}</p>
                    </div>
                  )}
                  
                  <div className="bg-white rounded-lg p-4 border border-purple-200 mb-4">
                    <h4 className="text-sm font-medium text-purple-800 mb-2">Recommendations</h4>
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
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium text-purple-800 mb-2">Mitigations</p>
                    <MitigationSelector
                      category="travel"
                      selectedMitigations={mitigations}
                      onMitigationsChange={setMitigations}
                      disabled={loading}
                    />
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
                disabled={loading || aiScoring}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading || aiScoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{aiScoring ? 'Calculating AI Risk Score...' : isEditMode ? 'Updating...' : 'Submitting...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isEditMode ? 'Update Travel Plan' : 'Submit Travel Plan'}</span>
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