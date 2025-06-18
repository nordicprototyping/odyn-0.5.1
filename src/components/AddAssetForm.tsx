import React, { useState, useEffect } from 'react';
import { X, Building, MapPin, Shield, Users, Settings, AlertTriangle, Save, Loader2, Brain, Search, Plus, UserCheck, Car, PenTool as Tool } from 'lucide-react';
import { Database } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import MitigationSelector from './MitigationSelector';
import { AppliedMitigation } from '../types/mitigation';
import { aiService } from '../services/aiService';
import { supabase } from '../lib/supabase';
import { useFormState } from '../hooks/useFormState';
import { useDepartments } from '../hooks/useDepartments';
import LocationSearchInput from './common/LocationSearchInput';
import { LocationData } from '../services/nominatimService';

type AssetInsert = Database['public']['Tables']['assets']['Insert'];
type Asset = Database['public']['Tables']['assets']['Row'];

interface AddAssetFormProps {
  onClose: () => void;
  onSubmit: (data: AssetInsert) => Promise<void>;
  assetToEdit?: Asset | null;
}

interface Personnel {
  id: string;
  name: string;
  employee_id: string;
  department: string;
  category: string;
  status: string;
}

const AddAssetForm: React.FC<AddAssetFormProps> = ({ onClose, onSubmit, assetToEdit }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiScoring, setAiScoring] = useState(false);
  const { profile } = useAuth();
  const [mitigations, setMitigations] = useState<AppliedMitigation[]>([]);
  const { departments } = useDepartments();
  
  // Personnel search and selection states
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [personnelSearchTerm, setPersonnelSearchTerm] = useState('');
  const [showPersonnelSearch, setShowPersonnelSearch] = useState(false);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);
  
  const { formData, updateFormData, setFormData } = useFormState({
    name: '',
    type: 'building' as const,
    type_specific_attributes: {} as Record<string, any>,
    location: {
      address: '',
      city: '',
      country: '',
      coordinates: [0, 0] as [number, number]
    },
    status: 'secure' as const,
    personnel: {
      current: 0,
      capacity: 0,
      authorized: [] as string[]
    },
    ai_risk_score: {
      overall: 25,
      components: {
        physicalSecurity: 20,
        cyberSecurity: 30,
        accessControl: 15,
        environmentalRisk: 25,
        personnelRisk: 20
      },
      trend: 'stable' as const,
      lastUpdated: new Date().toISOString(),
      confidence: 85,
      predictions: {
        nextWeek: 26,
        nextMonth: 24
      }
    },
    security_systems: {
      cctv: { status: 'online' as const, coverage: 90 },
      accessControl: { status: 'online' as const, zones: 5 },
      alarms: { status: 'online' as const, sensors: 20 },
      fireSupression: { status: 'online' as const, coverage: 100 },
      networkSecurity: { status: 'online' as const, threats: 0 }
    },
    compliance: {
      lastAudit: new Date().toISOString().split('T')[0],
      nextAudit: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      score: 90,
      issues: [] as string[]
    },
    incidents: {
      total: 0,
      lastIncident: 'None',
      severity: 'low' as const
    },
    responsible_officer: {
      name: '',
      email: '',
      phone: '',
      department: ''
    }
  });

  // Initialize form with asset data if editing
  useEffect(() => {
    if (assetToEdit) {
      // Set mitigations if they exist
      if (assetToEdit.mitigations && Array.isArray(assetToEdit.mitigations)) {
        setMitigations(assetToEdit.mitigations as AppliedMitigation[]);
      }
      
      // Update form data with asset values
      const formValues = {
        name: assetToEdit.name,
        type: assetToEdit.type,
        type_specific_attributes: assetToEdit.type_specific_attributes || {},
        location: assetToEdit.location as any,
        status: assetToEdit.status,
        personnel: assetToEdit.personnel as any,
        ai_risk_score: assetToEdit.ai_risk_score as any,
        security_systems: assetToEdit.security_systems as any,
        compliance: assetToEdit.compliance as any,
        incidents: assetToEdit.incidents as any,
        responsible_officer: assetToEdit.responsible_officer as any
      };
      
      // Update each field in the form
      Object.entries(formValues).forEach(([key, value]) => {
        updateFormData(key, value);
      });
    }
  }, [assetToEdit, updateFormData]);

  // Fetch personnel data when component mounts
  useEffect(() => {
    fetchPersonnel();
  }, []);

  const fetchPersonnel = async () => {
    try {
      setLoadingPersonnel(true);
      
      const { data, error } = await supabase
        .from('personnel_details')
        .select('id, name, employee_id, department, category, status')
        .order('name');
      
      if (error) {
        throw error;
      }
      
      setAllPersonnel(data || []);
    } catch (err) {
      console.error('Error fetching personnel:', err);
      setError('Failed to load personnel data');
    } finally {
      setLoadingPersonnel(false);
    }
  };

  // Filter personnel based on search term
  const filteredPersonnel = personnelSearchTerm.trim() === '' 
    ? allPersonnel 
    : allPersonnel.filter(person => 
        person.name.toLowerCase().includes(personnelSearchTerm.toLowerCase()) ||
        person.employee_id.toLowerCase().includes(personnelSearchTerm.toLowerCase()) ||
        person.department.toLowerCase().includes(personnelSearchTerm.toLowerCase())
      );

  // Get selected personnel details
  const selectedPersonnel = allPersonnel.filter(person => 
    formData.personnel.authorized.includes(person.employee_id)
  );

  const handleAddPersonnel = (employeeId: string) => {
    if (!formData.personnel.authorized.includes(employeeId)) {
      const updatedAuthorized = [...formData.personnel.authorized, employeeId];
      updateFormData('personnel.authorized', updatedAuthorized);
    }
  };

  const handleRemovePersonnel = (employeeId: string) => {
    const updatedAuthorized = formData.personnel.authorized.filter(id => id !== employeeId);
    updateFormData('personnel.authorized', updatedAuthorized);
  };

  const handleLocationChange = (location: LocationData | null) => {
    if (location) {
      updateFormData('location', {
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
      if (!formData.name || !formData.location.city || !formData.location.country || !formData.responsible_officer.name) {
        throw new Error('Please fill in all required fields');
      }

      // Prepare asset data for AI risk scoring
      const assetData = {
        organization_id: profile?.organization_id || '',
        name: formData.name,
        type: formData.type,
        type_specific_attributes: formData.type_specific_attributes,
        location: formData.location,
        status: formData.status,
        personnel: formData.personnel,
        security_systems: formData.security_systems,
        compliance: formData.compliance,
        incidents: formData.incidents,
        responsible_officer: formData.responsible_officer
      };

      // Only perform AI scoring for new assets or if explicitly requested
      let aiRiskScore = { ...formData.ai_risk_score };
      
      if (!assetToEdit) {
        // Set AI scoring state to show loading indicator
        setAiScoring(true);

        // Call AI service to get risk score
        try {
          const aiResult = await aiService.scoreAssetRisk(assetData);
          
          // Update risk score with AI-calculated values
          aiRiskScore = {
            overall: aiResult.score,
            components: aiResult.components || aiRiskScore.components,
            trend: (aiResult.trend as 'improving' | 'stable' | 'deteriorating') || 'stable',
            lastUpdated: new Date().toISOString(),
            confidence: aiResult.confidence,
            predictions: aiResult.predictions || {
              nextWeek: Math.round(aiResult.score * (1 + (Math.random() * 0.1 - 0.05))),
              nextMonth: Math.round(aiResult.score * (1 + (Math.random() * 0.2 - 0.1)))
            },
            explanation: aiResult.explanation
          };
        } catch (aiError) {
          console.error('Error getting AI risk score:', aiError);
          // Continue with default risk score if AI scoring fails
        } finally {
          setAiScoring(false);
        }
      }
      
      // Calculate effective risk score based on mitigations
      const totalRiskReduction = mitigations.reduce(
        (sum, mitigation) => sum + mitigation.applied_risk_reduction_score, 
        0
      );
      
      // Ensure risk score doesn't go below 0
      const effectiveRiskScore = Math.max(0, aiRiskScore.overall - totalRiskReduction);
      
      // Update the risk score with the effective value
      const updatedRiskScore = {
        ...aiRiskScore,
        overall: effectiveRiskScore,
        mitigationApplied: totalRiskReduction > 0,
        originalScore: aiRiskScore.overall,
        totalRiskReduction
      };

      const finalAssetData: AssetInsert = {
        organization_id: profile?.organization_id || '',
        name: formData.name,
        type: formData.type,
        type_specific_attributes: formData.type_specific_attributes,
        location: formData.location,
        status: formData.status,
        personnel: formData.personnel,
        ai_risk_score: updatedRiskScore,
        security_systems: formData.security_systems,
        compliance: formData.compliance,
        incidents: formData.incidents,
        responsible_officer: formData.responsible_officer,
        mitigations: mitigations.length > 0 ? mitigations : null
      };

      // If editing, include the ID in the data
      if (assetToEdit) {
        finalAssetData.id = assetToEdit.id;
      }

      await onSubmit(finalAssetData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add asset');
    } finally {
      setLoading(false);
    }
  };

  const assetTypes = [
    { value: 'building', label: 'Building' },
    { value: 'vehicle', label: 'Vehicle' },
    { value: 'equipment', label: 'Equipment' }
  ];

  // Building type options
  const buildingTypes = [
    { value: 'office', label: 'Office Building' },
    { value: 'data-center', label: 'Data Center' },
    { value: 'embassy', label: 'Embassy' },
    { value: 'residential', label: 'Residential' },
    { value: 'industrial', label: 'Industrial Facility' },
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'retail', label: 'Retail' }
  ];

  // Vehicle type options
  const vehicleTypes = [
    { value: 'car', label: 'Car' },
    { value: 'truck', label: 'Truck' },
    { value: 'van', label: 'Van' },
    { value: 'suv', label: 'SUV' },
    { value: 'armored', label: 'Armored Vehicle' },
    { value: 'boat', label: 'Boat' },
    { value: 'aircraft', label: 'Aircraft' },
    { value: 'drone', label: 'Drone' }
  ];

  // Equipment type options
  const equipmentTypes = [
    { value: 'server', label: 'Server' },
    { value: 'network', label: 'Network Equipment' },
    { value: 'security', label: 'Security Equipment' },
    { value: 'communication', label: 'Communication Device' },
    { value: 'sensor', label: 'Sensor/Monitor' },
    { value: 'tool', label: 'Tool/Machinery' },
    { value: 'medical', label: 'Medical Equipment' },
    { value: 'other', label: 'Other Equipment' }
  ];

  // Handle type-specific attribute changes
  const updateTypeSpecificAttribute = (key: string, value: any) => {
    updateFormData('type_specific_attributes', {
      ...formData.type_specific_attributes,
      [key]: value
    });
  };

  // Get the appropriate icon for the asset type
  const getAssetTypeIcon = () => {
    switch (formData.type) {
      case 'building':
        return <Building className="w-5 h-5 text-white" />;
      case 'vehicle':
        return <Car className="w-5 h-5 text-white" />;
      case 'equipment':
        return <Tool className="w-5 h-5 text-white" />;
      default:
        return <Building className="w-5 h-5 text-white" />;
    }
  };

  // Render type-specific form fields based on the selected asset type
  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case 'building':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Building className="w-5 h-5 text-blue-500" />
              <span>Building Details</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Building Type *
                </label>
                <select
                  required
                  value={formData.type_specific_attributes.building_type || ''}
                  onChange={(e) => updateTypeSpecificAttribute('building_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Building Type</option>
                  {buildingTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Function
                </label>
                <input
                  type="text"
                  value={formData.type_specific_attributes.primary_function || ''}
                  onChange={(e) => updateTypeSpecificAttribute('primary_function', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Office Space, Data Storage, Diplomatic Mission"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Floor Count
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.type_specific_attributes.floor_count || ''}
                  onChange={(e) => updateTypeSpecificAttribute('floor_count', parseInt(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Number of floors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year Built
                </label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={formData.type_specific_attributes.year_built || ''}
                  onChange={(e) => updateTypeSpecificAttribute('year_built', parseInt(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Year of construction"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Area (sq ft/m²)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.type_specific_attributes.total_area || ''}
                  onChange={(e) => updateTypeSpecificAttribute('total_area', parseInt(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Total area"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Renovation Year
                </label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={formData.type_specific_attributes.last_renovation || ''}
                  onChange={(e) => updateTypeSpecificAttribute('last_renovation', parseInt(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Year of last renovation"
                />
              </div>
            </div>
          </div>
        );
      
      case 'vehicle':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Car className="w-5 h-5 text-blue-500" />
              <span>Vehicle Details</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Type *
                </label>
                <select
                  required
                  value={formData.type_specific_attributes.vehicle_type || ''}
                  onChange={(e) => updateTypeSpecificAttribute('vehicle_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Vehicle Type</option>
                  {vehicleTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Make
                </label>
                <input
                  type="text"
                  value={formData.type_specific_attributes.make || ''}
                  onChange={(e) => updateTypeSpecificAttribute('make', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Toyota, Ford, Boeing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <input
                  type="text"
                  value={formData.type_specific_attributes.model || ''}
                  onChange={(e) => updateTypeSpecificAttribute('model', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Land Cruiser, F-150"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={formData.type_specific_attributes.year || ''}
                  onChange={(e) => updateTypeSpecificAttribute('year', parseInt(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Manufacturing year"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License/Registration
                </label>
                <input
                  type="text"
                  value={formData.type_specific_attributes.license_plate || ''}
                  onChange={(e) => updateTypeSpecificAttribute('license_plate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="License plate or registration number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mileage/Hours
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.type_specific_attributes.mileage || ''}
                  onChange={(e) => updateTypeSpecificAttribute('mileage', parseInt(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Current mileage or operating hours"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fuel Type
                </label>
                <select
                  value={formData.type_specific_attributes.fuel_type || ''}
                  onChange={(e) => updateTypeSpecificAttribute('fuel_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Fuel Type</option>
                  <option value="gasoline">Gasoline</option>
                  <option value="diesel">Diesel</option>
                  <option value="electric">Electric</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="jet_fuel">Jet Fuel</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Security Features
                </label>
                <input
                  type="text"
                  value={formData.type_specific_attributes.security_features || ''}
                  onChange={(e) => updateTypeSpecificAttribute('security_features', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Armored, GPS tracking, Immobilizer"
                />
              </div>
            </div>
          </div>
        );
      
      case 'equipment':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Tool className="w-5 h-5 text-blue-500" />
              <span>Equipment Details</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Equipment Type *
                </label>
                <select
                  required
                  value={formData.type_specific_attributes.equipment_type || ''}
                  onChange={(e) => updateTypeSpecificAttribute('equipment_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Equipment Type</option>
                  {equipmentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manufacturer
                </label>
                <input
                  type="text"
                  value={formData.type_specific_attributes.manufacturer || ''}
                  onChange={(e) => updateTypeSpecificAttribute('manufacturer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Cisco, Dell, Siemens"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <input
                  type="text"
                  value={formData.type_specific_attributes.model || ''}
                  onChange={(e) => updateTypeSpecificAttribute('model', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Model number or name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={formData.type_specific_attributes.serial_number || ''}
                  onChange={(e) => updateTypeSpecificAttribute('serial_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Unique serial number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={formData.type_specific_attributes.purchase_date || ''}
                  onChange={(e) => updateTypeSpecificAttribute('purchase_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Maintenance Date
                </label>
                <input
                  type="date"
                  value={formData.type_specific_attributes.last_maintenance_date || ''}
                  onChange={(e) => updateTypeSpecificAttribute('last_maintenance_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Next Maintenance Due
                </label>
                <input
                  type="date"
                  value={formData.type_specific_attributes.next_maintenance_due || ''}
                  onChange={(e) => updateTypeSpecificAttribute('next_maintenance_due', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operational Status
                </label>
                <select
                  value={formData.type_specific_attributes.operational_status || ''}
                  onChange={(e) => updateTypeSpecificAttribute('operational_status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Status</option>
                  <option value="operational">Operational</option>
                  <option value="maintenance">Under Maintenance</option>
                  <option value="repair">Needs Repair</option>
                  <option value="calibration">Needs Calibration</option>
                  <option value="standby">Standby</option>
                  <option value="decommissioned">Decommissioned</option>
                </select>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                {getAssetTypeIcon()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{assetToEdit ? 'Edit Asset' : 'Add New Asset'}</h2>
                <p className="text-gray-600">Enter asset details and security information</p>
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
              <Building className="w-5 h-5 text-blue-500" />
              <span>Basic Information</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter asset name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset Type *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => {
                    updateFormData('type', e.target.value as 'building' | 'vehicle' | 'equipment');
                    // Reset type-specific attributes when type changes
                    updateFormData('type_specific_attributes', {});
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {assetTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => updateFormData('status', e.target.value as 'secure' | 'alert' | 'maintenance' | 'offline' | 'compromised')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="secure">Secure</option>
                  <option value="alert">Alert</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="offline">Offline</option>
                  <option value="compromised">Compromised</option>
                </select>
              </div>
            </div>
          </div>

          {/* Type-specific fields */}
          {renderTypeSpecificFields()}

          {/* Location Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-green-500" />
              <span>Location Information</span>
            </h3>
            
            <LocationSearchInput
              value={formData.location.address ? {
                address: formData.location.address,
                city: formData.location.city,
                country: formData.location.country,
                coordinates: formData.location.coordinates
              } : null}
              onChange={handleLocationChange}
              placeholder="Search for asset location..."
              required={true}
              label="Asset Location *"
              showCoordinates={true}
            />
          </div>

          {/* Personnel Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Users className="w-5 h-5 text-purple-500" />
              <span>Personnel Information</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Personnel
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.personnel.current}
                  onChange={(e) => updateFormData('personnel.current', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personnel Capacity
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.personnel.capacity}
                  onChange={(e) => updateFormData('personnel.capacity', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Authorized Personnel Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Authorized Personnel
                </label>
                <button
                  type="button"
                  onClick={() => setShowPersonnelSearch(!showPersonnelSearch)}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Personnel</span>
                </button>
              </div>

              {/* Selected Personnel List */}
              {selectedPersonnel.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedPersonnel.map(person => (
                    <div 
                      key={person.employee_id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-xs">
                            {person.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{person.name}</p>
                          <p className="text-xs text-gray-500">{person.employee_id} • {person.department}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePersonnel(person.employee_id)}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <p className="text-gray-500 text-sm">No personnel added yet</p>
                </div>
              )}

              {/* Personnel Search Panel */}
              {showPersonnelSearch && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-3 border-b border-gray-200">
                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search personnel by name, ID, or department..."
                        value={personnelSearchTerm}
                        onChange={(e) => setPersonnelSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto">
                    {loadingPersonnel ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      </div>
                    ) : filteredPersonnel.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-gray-500">No personnel found</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {filteredPersonnel.map(person => (
                          <div 
                            key={person.employee_id} 
                            className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-xs">
                                  {person.name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{person.name}</p>
                                <div className="flex items-center space-x-2">
                                  <p className="text-xs text-gray-500">{person.employee_id}</p>
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{person.department}</span>
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full capitalize">{person.status}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddPersonnel(person.employee_id);
                                setShowPersonnelSearch(false);
                              }}
                              disabled={formData.personnel.authorized.includes(person.employee_id)}
                              className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition-colors ${
                                formData.personnel.authorized.includes(person.employee_id)
                                  ? 'bg-green-100 text-green-700 cursor-default'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                            >
                              {formData.personnel.authorized.includes(person.employee_id) ? (
                                <>
                                  <UserCheck className="w-4 h-4" />
                                  <span>Added</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4" />
                                  <span>Add</span>
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Responsible Officer */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5 text-red-500" />
              <span>Responsible Officer</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Officer Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.responsible_officer.name}
                  onChange={(e) => updateFormData('responsible_officer.name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter officer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.responsible_officer.email}
                  onChange={(e) => updateFormData('responsible_officer.email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="officer@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.responsible_officer.phone}
                  onChange={(e) => updateFormData('responsible_officer.phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1-555-0123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department *
                </label>
                <select
                  required
                  value={formData.responsible_officer.department}
                  onChange={(e) => updateFormData('responsible_officer.department', e.target.value)}
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

          {/* Security Systems */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Settings className="w-5 h-5 text-orange-500" />
              <span>Security Systems</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CCTV Coverage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.security_systems.cctv.coverage}
                  onChange={(e) => updateFormData('security_systems.cctv.coverage', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Control Zones
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.security_systems.accessControl.zones}
                  onChange={(e) => updateFormData('security_systems.accessControl.zones', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alarm Sensors
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.security_systems.alarms.sensors}
                  onChange={(e) => updateFormData('security_systems.alarms.sensors', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Audit Date
                </label>
                <input
                  type="date"
                  value={formData.compliance.lastAudit}
                  onChange={(e) => updateFormData('compliance.lastAudit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Next Audit Date
                </label>
                <input
                  type="date"
                  value={formData.compliance.nextAudit}
                  onChange={(e) => updateFormData('compliance.nextAudit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compliance Score (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.compliance.score}
                  onChange={(e) => updateFormData('compliance.score', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Mitigations */}
          <div>
            <MitigationSelector
              category="asset"
              selectedMitigations={mitigations}
              onMitigationsChange={setMitigations}
              disabled={loading}
            />
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
              disabled={loading || aiScoring}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading || aiScoring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{aiScoring ? 'Calculating AI Risk Score...' : assetToEdit ? 'Updating...' : 'Adding...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{assetToEdit ? 'Update Asset' : 'Add Asset'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAssetForm;