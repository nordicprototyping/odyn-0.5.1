import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle, Building, User, Users } from 'lucide-react';
import { Database } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useFormState } from '../hooks/useFormState';
import { useDepartments } from '../hooks/useDepartments';
import LocationSearchInput from './common/LocationSearchInput';
import { LocationData } from '../services/nominatimService';
import { supabase } from '../lib/supabase';

type IncidentReport = Database['public']['Tables']['incident_reports']['Row'];
type IncidentInsert = Database['public']['Tables']['incident_reports']['Insert'];

interface AddEditIncidentFormProps {
  onClose: () => void;
  onSubmit: (formData: IncidentInsert) => Promise<void>;
  incidentToEdit?: IncidentReport | null;
}

interface Personnel {
  id: string;
  name: string;
  employee_id: string;
  department: string;
}

interface Asset {
  id: string;
  name: string;
  type: string;
  location: {
    address?: string;
    city: string;
    country: string;
    coordinates: [number, number];
  };
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
  
  // Location type state
  const [locationType, setLocationType] = useState<'manual' | 'asset'>('manual');
  
  // Personnel selection state
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<string[]>([]);
  const [personnelSearchTerm, setPersonnelSearchTerm] = useState('');
  const [showPersonnelSearch, setShowPersonnelSearch] = useState(false);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);
  
  // Asset selection state
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [showAssetSearch, setShowAssetSearch] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const { formData, updateFormData, setFormData } = useFormState({
    title: '',
    description: '',
    date_time: '',
    severity: 'Medium' as const,
    location: '',
    locationData: null as LocationData | null,
    department: '',
    involved_parties: '',
    immediate_actions: '',
    reporter_name: profile?.full_name || '',
    reporter_email: user?.email || '',
    reporter_phone: profile?.phone || '',
    location_asset_id: null as string | null,
    location_coordinates: null as number[] | null,
    involved_personnel_ids: [] as string[]
  });

  // Initialize form with incident data if editing
  useEffect(() => {
    if (incidentToEdit) {
      // Set basic form data
      setFormData({
        title: incidentToEdit.title,
        description: incidentToEdit.description,
        date_time: new Date(incidentToEdit.date_time).toISOString().slice(0, 16),
        severity: incidentToEdit.severity,
        location: incidentToEdit.location,
        locationData: null,
        department: incidentToEdit.department,
        involved_parties: incidentToEdit.involved_parties.join(', '),
        immediate_actions: incidentToEdit.immediate_actions || '',
        reporter_name: incidentToEdit.reporter_name,
        reporter_email: incidentToEdit.reporter_email,
        reporter_phone: incidentToEdit.reporter_phone || '',
        location_asset_id: incidentToEdit.location_asset_id || null,
        location_coordinates: incidentToEdit.location_coordinates || null,
        involved_personnel_ids: incidentToEdit.involved_personnel_ids || []
      });

      // Set location type based on whether location_asset_id is present
      setLocationType(incidentToEdit.location_asset_id ? 'asset' : 'manual');
      
      // Set selected personnel IDs
      if (incidentToEdit.involved_personnel_ids && incidentToEdit.involved_personnel_ids.length > 0) {
        setSelectedPersonnelIds(incidentToEdit.involved_personnel_ids);
      }
    }
  }, [incidentToEdit, setFormData]);

  // Fetch personnel data
  useEffect(() => {
    const fetchPersonnel = async () => {
      try {
        setLoadingPersonnel(true);
        
        const { data, error } = await supabase
          .from('personnel_details')
          .select('id, name, employee_id, department')
          .order('name');
        
        if (error) throw error;
        
        setAllPersonnel(data || []);
        
        // If editing and we have involved_personnel_ids, select them
        if (incidentToEdit?.involved_personnel_ids && incidentToEdit.involved_personnel_ids.length > 0) {
          setSelectedPersonnelIds(incidentToEdit.involved_personnel_ids);
        }
      } catch (err) {
        console.error('Error fetching personnel:', err);
      } finally {
        setLoadingPersonnel(false);
      }
    };
    
    fetchPersonnel();
  }, [incidentToEdit]);

  // Fetch assets data
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoadingAssets(true);
        
        const { data, error } = await supabase
          .from('assets')
          .select('id, name, type, location')
          .order('name');
        
        if (error) throw error;
        
        setAllAssets(data || []);
        
        // If editing and we have location_asset_id, select it
        if (incidentToEdit?.location_asset_id) {
          const asset = data?.find(a => a.id === incidentToEdit.location_asset_id) || null;
          setSelectedAsset(asset);
        }
      } catch (err) {
        console.error('Error fetching assets:', err);
      } finally {
        setLoadingAssets(false);
      }
    };
    
    fetchAssets();
  }, [incidentToEdit]);

  const handleLocationChange = (location: LocationData | null) => {
    if (location) {
      // Update both the location string and the location data
      updateFormData('locationData', location);
      
      // Create a formatted location string
      const locationString = [
        location.address,
        location.city,
        location.country
      ].filter(Boolean).join(', ');
      
      updateFormData('location', locationString);
      
      // Update location coordinates
      updateFormData('location_coordinates', location.coordinates);
    }
  };

  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset);
    updateFormData('location_asset_id', asset.id);
    
    // Create a formatted location string from the asset
    const locationString = `${asset.name} - ${asset.location.city}, ${asset.location.country}`;
    updateFormData('location', locationString);
    
    // Update location coordinates from the asset
    updateFormData('location_coordinates', asset.location.coordinates);
    
    setShowAssetSearch(false);
  };

  const handlePersonnelSelect = (personnelId: string) => {
    if (!selectedPersonnelIds.includes(personnelId)) {
      const updatedIds = [...selectedPersonnelIds, personnelId];
      setSelectedPersonnelIds(updatedIds);
      updateFormData('involved_personnel_ids', updatedIds);
      
      // Update the involved_parties string with personnel names
      const selectedPersonnel = allPersonnel.filter(p => updatedIds.includes(p.id));
      const personnelNames = selectedPersonnel.map(p => p.name);
      updateFormData('involved_parties', personnelNames.join(', '));
    }
  };

  const handleRemovePersonnel = (personnelId: string) => {
    const updatedIds = selectedPersonnelIds.filter(id => id !== personnelId);
    setSelectedPersonnelIds(updatedIds);
    updateFormData('involved_personnel_ids', updatedIds);
    
    // Update the involved_parties string with remaining personnel names
    const selectedPersonnel = allPersonnel.filter(p => updatedIds.includes(p.id));
    const personnelNames = selectedPersonnel.map(p => p.name);
    updateFormData('involved_parties', personnelNames.join(', '));
  };

  // Filter personnel based on search term
  const filteredPersonnel = personnelSearchTerm.trim() === '' 
    ? allPersonnel 
    : allPersonnel.filter(person => 
        person.name.toLowerCase().includes(personnelSearchTerm.toLowerCase()) ||
        person.employee_id.toLowerCase().includes(personnelSearchTerm.toLowerCase()) ||
        person.department.toLowerCase().includes(personnelSearchTerm.toLowerCase())
      );

  // Filter assets based on search term
  const filteredAssets = assetSearchTerm.trim() === '' 
    ? allAssets 
    : allAssets.filter(asset => 
        asset.name.toLowerCase().includes(assetSearchTerm.toLowerCase()) ||
        asset.location.city.toLowerCase().includes(assetSearchTerm.toLowerCase()) ||
        asset.location.country.toLowerCase().includes(assetSearchTerm.toLowerCase())
      );

  // Get selected personnel details
  const selectedPersonnel = allPersonnel.filter(person => 
    selectedPersonnelIds.includes(person.id)
  );

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
        ],
        // Add the new fields
        location_asset_id: locationType === 'asset' ? formData.location_asset_id : null,
        location_coordinates: formData.location_coordinates,
        involved_personnel_ids: formData.involved_personnel_ids
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
    <>
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
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location Type *
            </label>
            <div className="flex space-x-4 mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={locationType === 'manual'}
                  onChange={() => setLocationType('manual')}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span>Manual Location</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={locationType === 'asset'}
                  onChange={() => setLocationType('asset')}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span>Select Asset</span>
              </label>
            </div>

            {locationType === 'manual' ? (
              <LocationSearchInput
                value={formData.locationData}
                onChange={handleLocationChange}
                placeholder="Search for incident location..."
                required={true}
                label="Location *"
              />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Asset *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAssetSearch(!showAssetSearch)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showAssetSearch ? 'Hide' : 'Search Assets'}
                  </button>
                </div>
                
                {selectedAsset ? (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Building className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedAsset.name}</p>
                        <p className="text-xs text-gray-500">
                          {selectedAsset.location.city}, {selectedAsset.location.country}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAsset(null);
                        updateFormData('location_asset_id', null);
                        updateFormData('location', '');
                        updateFormData('location_coordinates', null);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                    <p className="text-gray-500 text-sm">No asset selected</p>
                    <button
                      type="button"
                      onClick={() => setShowAssetSearch(true)}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Select Asset
                    </button>
                  </div>
                )}
                
                {showAssetSearch && (
                  <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-3 border-b border-gray-200">
                      <input
                        type="text"
                        placeholder="Search assets by name or location..."
                        value={assetSearchTerm}
                        onChange={(e) => setAssetSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto">
                      {loadingAssets ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                      ) : filteredAssets.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-gray-500">No assets found</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {filteredAssets.map(asset => (
                            <div 
                              key={asset.id} 
                              className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleAssetSelect(asset)}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                  <Building className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {asset.location.city}, {asset.location.country}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full capitalize">
                                {asset.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Involved Personnel
              </label>
              <button
                type="button"
                onClick={() => setShowPersonnelSearch(!showPersonnelSearch)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showPersonnelSearch ? 'Hide' : 'Search Personnel'}
              </button>
            </div>
            
            {selectedPersonnel.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedPersonnel.map(person => (
                  <div 
                    key={person.id} 
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
                      onClick={() => handleRemovePersonnel(person.id)}
                      className="p-1 text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <p className="text-gray-500 text-sm">No personnel added</p>
                <button
                  type="button"
                  onClick={() => setShowPersonnelSearch(true)}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Add Personnel
                </button>
              </div>
            )}
            
            {showPersonnelSearch && (
              <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder="Search personnel by name, ID, or department..."
                    value={personnelSearchTerm}
                    onChange={(e) => setPersonnelSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                          key={person.id} 
                          className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handlePersonnelSelect(person.id)}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePersonnelSelect(person.id);
                            }}
                            disabled={selectedPersonnelIds.includes(person.id)}
                            className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition-colors ${
                              selectedPersonnelIds.includes(person.id)
                                ? 'bg-green-100 text-green-700 cursor-default'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            {selectedPersonnelIds.includes(person.id) ? 'Added' : 'Add'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
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
    </>
  );
};

export default AddEditIncidentForm;