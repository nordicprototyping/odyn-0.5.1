import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle, Search, Building, User, Plus } from 'lucide-react';
import { Database } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useFormState } from '../hooks/useFormState';
import { useDepartments } from '../hooks/useDepartments';
import { supabase } from '../lib/supabase';
import LocationSearchInput from './common/LocationSearchInput';
import { LocationData } from '../services/nominatimService';

type IncidentReport = Database['public']['Tables']['incident_reports']['Row'];
type IncidentInsert = Database['public']['Tables']['incident_reports']['Insert'];
type Personnel = Database['public']['Tables']['personnel_details']['Row'];
type Asset = Database['public']['Tables']['assets']['Row'];

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
  
  // State for personnel and assets
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [showPersonnelSearch, setShowPersonnelSearch] = useState(false);
  const [personnelSearchTerm, setPersonnelSearchTerm] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel[]>([]);
  const [locationType, setLocationType] = useState<'manual' | 'asset'>('manual');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showAssetSearch, setShowAssetSearch] = useState(false);
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  
  const { formData, updateFormData, setFormData } = useFormState({
    title: '',
    description: '',
    date_time: '',
    severity: 'Medium' as const,
    location: '',
    locationData: null as LocationData | null,
    location_asset_id: null as string | null,
    location_coordinates: null as [number, number] | null,
    department: '',
    involved_parties: '',
    involved_personnel_ids: [] as string[],
    immediate_actions: '',
    reporter_name: profile?.full_name || '',
    reporter_email: user?.email || '',
    reporter_phone: profile?.phone || ''
  });

  // Fetch personnel and assets when component mounts
  useEffect(() => {
    fetchPersonnel();
    fetchAssets();
  }, []);

  // Initialize form with incident data if editing
  useEffect(() => {
    if (incidentToEdit) {
      setFormData({
        title: incidentToEdit.title,
        description: incidentToEdit.description,
        date_time: new Date(incidentToEdit.date_time).toISOString().slice(0, 16),
        severity: incidentToEdit.severity,
        location: incidentToEdit.location,
        locationData: null,
        location_asset_id: incidentToEdit.location_asset_id || null,
        location_coordinates: incidentToEdit.location_coordinates as [number, number] | null,
        department: incidentToEdit.department,
        involved_parties: incidentToEdit.involved_parties.join(', '),
        involved_personnel_ids: incidentToEdit.involved_personnel_ids || [],
        immediate_actions: incidentToEdit.immediate_actions || '',
        reporter_name: incidentToEdit.reporter_name,
        reporter_email: incidentToEdit.reporter_email,
        reporter_phone: incidentToEdit.reporter_phone || ''
      });

      // Set location type based on whether location_asset_id is present
      setLocationType(incidentToEdit.location_asset_id ? 'asset' : 'manual');
      
      // If editing and there's a location_asset_id, fetch and set the selected asset
      if (incidentToEdit.location_asset_id) {
        fetchAssetById(incidentToEdit.location_asset_id);
      }
      
      // If editing and there are involved_personnel_ids, fetch and set the selected personnel
      if (incidentToEdit.involved_personnel_ids && incidentToEdit.involved_personnel_ids.length > 0) {
        fetchPersonnelByIds(incidentToEdit.involved_personnel_ids);
      }
    }
  }, [incidentToEdit, setFormData]);

  const fetchPersonnel = async () => {
    try {
      setLoadingPersonnel(true);
      
      const { data, error } = await supabase
        .from('personnel_details')
        .select('*')
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

  const fetchAssets = async () => {
    try {
      setLoadingAssets(true);
      
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('name');
      
      if (error) {
        throw error;
      }
      
      setAllAssets(data || []);
    } catch (err) {
      console.error('Error fetching assets:', err);
      setError('Failed to load assets data');
    } finally {
      setLoadingAssets(false);
    }
  };

  const fetchAssetById = async (assetId: string) => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', assetId)
        .single();
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setSelectedAsset(data);
      }
    } catch (err) {
      console.error('Error fetching asset by ID:', err);
    }
  };

  const fetchPersonnelByIds = async (personnelIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('personnel_details')
        .select('*')
        .in('id', personnelIds);
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        setSelectedPersonnel(data);
      }
    } catch (err) {
      console.error('Error fetching personnel by IDs:', err);
    }
  };

  const handleLocationChange = (location: LocationData | null) => {
    if (location) {
      // Update both the location string and the location data
      updateFormData('locationData', location);
      updateFormData('location', location.address ? `${location.address}, ${location.city}, ${location.country}` : `${location.city}, ${location.country}`);
      updateFormData('location_coordinates', location.coordinates);
    }
  };

  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset);
    updateFormData('location_asset_id', asset.id);
    
    // Set location based on asset details
    const assetLocation = asset.location as any;
    const locationString = `${asset.name} - ${assetLocation.city}, ${assetLocation.country}`;
    updateFormData('location', locationString);
    
    // Set coordinates if available
    if (assetLocation.coordinates) {
      updateFormData('location_coordinates', assetLocation.coordinates);
    }
    
    setShowAssetSearch(false);
  };

  const handlePersonnelSelect = (personnel: Personnel) => {
    // Check if this personnel is already selected
    if (!selectedPersonnel.some(p => p.id === personnel.id)) {
      const updatedPersonnel = [...selectedPersonnel, personnel];
      setSelectedPersonnel(updatedPersonnel);
      
      // Update the involved_personnel_ids array
      const updatedIds = updatedPersonnel.map(p => p.id);
      updateFormData('involved_personnel_ids', updatedIds);
      
      // Update the involved_parties string (for backward compatibility)
      const updatedParties = updatedPersonnel.map(p => p.name).join(', ');
      updateFormData('involved_parties', updatedParties);
    }
  };

  const handleRemovePersonnel = (personnelId: string) => {
    const updatedPersonnel = selectedPersonnel.filter(p => p.id !== personnelId);
    setSelectedPersonnel(updatedPersonnel);
    
    // Update the involved_personnel_ids array
    const updatedIds = updatedPersonnel.map(p => p.id);
    updateFormData('involved_personnel_ids', updatedIds);
    
    // Update the involved_parties string (for backward compatibility)
    const updatedParties = updatedPersonnel.map(p => p.name).join(', ');
    updateFormData('involved_parties', updatedParties);
  };

  const handleLocationTypeChange = (type: 'manual' | 'asset') => {
    setLocationType(type);
    
    // Reset location-related fields when switching types
    if (type === 'manual') {
      updateFormData('location_asset_id', null);
      setSelectedAsset(null);
      
      // If we have locationData, keep it; otherwise, clear location
      if (!formData.locationData) {
        updateFormData('location', '');
        updateFormData('location_coordinates', null);
      }
    } else {
      // When switching to asset, clear manual location data
      updateFormData('locationData', null);
      if (!selectedAsset) {
        updateFormData('location', '');
        updateFormData('location_coordinates', null);
      }
    }
  };

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
        location_asset_id: formData.location_asset_id,
        location_coordinates: formData.location_coordinates,
        department: formData.department,
        involved_parties: formData.involved_parties ? formData.involved_parties.split(',').map(p => p.trim()) : [],
        involved_personnel_ids: formData.involved_personnel_ids.length > 0 ? formData.involved_personnel_ids : null,
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
        (asset.location as any)?.city?.toLowerCase().includes(assetSearchTerm.toLowerCase()) ||
        asset.type.toLowerCase().includes(assetSearchTerm.toLowerCase())
      );

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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Location *
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={locationType === 'manual'}
                    onChange={() => handleLocationTypeChange('manual')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Manual Location</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={locationType === 'asset'}
                    onChange={() => handleLocationTypeChange('asset')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Select Asset</span>
                </label>
              </div>
            </div>
            
            {locationType === 'manual' ? (
              <LocationSearchInput
                value={formData.locationData}
                onChange={handleLocationChange}
                placeholder="Search for incident location..."
                required={true}
                label=""
              />
            ) : (
              <div>
                {selectedAsset ? (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Building className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedAsset.name}</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-gray-500">{selectedAsset.type.replace('-', ' ')}</p>
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            {(selectedAsset.location as any)?.city}, {(selectedAsset.location as any)?.country}
                          </span>
                        </div>
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
                  <div>
                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search for an asset..."
                        value={assetSearchTerm}
                        onChange={(e) => {
                          setAssetSearchTerm(e.target.value);
                          setShowAssetSearch(true);
                        }}
                        onFocus={() => setShowAssetSearch(true)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    {showAssetSearch && (
                      <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden shadow-lg max-h-60 overflow-y-auto absolute z-10 bg-white w-full">
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
                                    <div className="flex items-center space-x-2">
                                      <p className="text-xs text-gray-500">{asset.type.replace('-', ' ')}</p>
                                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                        {(asset.location as any)?.city}, {(asset.location as any)?.country}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {formData.location && !formData.locationData && locationType === 'manual' && (
              <input
                type="text"
                value={formData.location}
                onChange={(e) => updateFormData('location', e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Or enter location manually"
              />
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
            
            {selectedPersonnel.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedPersonnel.map(person => (
                  <div key={person.id} className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-sm">
                    <span>{person.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePersonnel(person.id)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {showPersonnelSearch && (
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-lg mb-3">
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
                          key={person.id} 
                          className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handlePersonnelSelect(person)}
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
                              </div>
                            </div>
                          </div>
                          {selectedPersonnel.some(p => p.id === person.id) && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <input
              type="text"
              value={formData.involved_parties}
              onChange={(e) => updateFormData('involved_parties', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter additional involved parties (comma separated)"
            />
            <p className="mt-1 text-xs text-gray-500">
              You can add additional people not in the personnel database
            </p>
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