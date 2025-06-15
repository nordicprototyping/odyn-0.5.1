import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building, 
  Globe, 
  Mail, 
  Phone, 
  Shield, 
  Lock, 
  Key, 
  Clock, 
  Bell, 
  Save, 
  Loader2, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Plus, 
  Trash2, 
  Edit, 
  X 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../common/Modal';

const OrganizationSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>({
    general: {
      description: '',
      website: '',
      industry: '',
      size: '',
      headquarters: {
        address: '',
        city: '',
        country: '',
        timezone: ''
      },
      contact: {
        email: '',
        phone: '',
        emergencyPhone: ''
      }
    },
    security: {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAge: 90,
        preventReuse: 5
      },
      sessionPolicy: {
        maxDuration: 24,
        idleTimeout: 30,
        maxConcurrentSessions: 3,
        requireReauth: true
      },
      twoFactorAuth: {
        required: false,
        allowedMethods: ['app'],
        backupCodes: true
      },
      accessControl: {
        defaultRole: 'user',
        autoLockAccount: true,
        maxFailedAttempts: 5,
        lockoutDuration: 30
      }
    },
    departments: {
      list: []
    }
  });
  
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any | null>(null);
  const [departmentForm, setDepartmentForm] = useState({
    id: '',
    name: '',
    description: '',
    headCount: 0,
    securityLevel: 'standard'
  });

  const { organization, hasPermission } = useAuth();

  useEffect(() => {
    if (organization?.id) {
      fetchOrganizationSettings(organization.id);
    } else {
      setLoading(false);
    }
  }, [organization]);

  const fetchOrganizationSettings = async (organizationId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Merge default settings with stored settings
      const mergedSettings = {
        ...settings,
        ...(data?.settings || {})
      };
      
      // Ensure departments list exists
      if (!mergedSettings.departments) {
        mergedSettings.departments = { list: [] };
      } else if (!mergedSettings.departments.list) {
        mergedSettings.departments.list = [];
      }
      
      setSettings(mergedSettings);
    } catch (err) {
      console.error('Error fetching organization settings:', err);
      setError('Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!organization?.id) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const { error } = await supabase
        .from('organizations')
        .update({ settings })
        .eq('id', organization.id);

      if (error) {
        throw error;
      }

      setSuccess('Settings saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving organization settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (path: string, value: any) => {
    const keys = path.split('.');
    setSettings(prev => {
      const newSettings = { ...prev };
      let current = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const handleAddDepartment = () => {
    setDepartmentForm({
      id: '',
      name: '',
      description: '',
      headCount: 0,
      securityLevel: 'standard'
    });
    setEditingDepartment(null);
    setShowDepartmentModal(true);
  };

  const handleEditDepartment = (department: any) => {
    setDepartmentForm({
      id: department.id,
      name: department.name,
      description: department.description,
      headCount: department.headCount,
      securityLevel: department.securityLevel
    });
    setEditingDepartment(department);
    setShowDepartmentModal(true);
  };

  const handleDeleteDepartment = (departmentId: string) => {
    const updatedList = settings.departments.list.filter((dept: any) => dept.id !== departmentId);
    handleInputChange('departments.list', updatedList);
  };

  const handleSaveDepartment = () => {
    if (!departmentForm.name) {
      return;
    }
    
    const departmentsList = [...settings.departments.list];
    
    if (editingDepartment) {
      // Update existing department
      const index = departmentsList.findIndex((dept: any) => dept.id === editingDepartment.id);
      if (index !== -1) {
        departmentsList[index] = {
          ...departmentForm,
          id: editingDepartment.id
        };
      }
    } else {
      // Add new department
      departmentsList.push({
        ...departmentForm,
        id: crypto.randomUUID()
      });
    }
    
    handleInputChange('departments.list', departmentsList);
    setShowDepartmentModal(false);
  };

  if (!hasPermission('organizations.read')) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to view organization settings.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading organization settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
          <p className="text-gray-600">Configure your organization's settings and preferences</p>
        </div>
        {hasPermission('organizations.update') && (
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="text-green-700 text-sm">{success}</span>
        </div>
      )}

      {/* Settings Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* General Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Building className="w-5 h-5 text-blue-500" />
              <span>General Information</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Description
                </label>
                <textarea
                  rows={3}
                  value={settings.general.description || ''}
                  onChange={(e) => handleInputChange('general.description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of your organization"
                  disabled={!hasPermission('organizations.update')}
                />
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={settings.general.website || ''}
                    onChange={(e) => handleInputChange('general.website', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com"
                    disabled={!hasPermission('organizations.update')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={settings.general.industry || ''}
                    onChange={(e) => handleInputChange('general.industry', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Government, Finance, Technology"
                    disabled={!hasPermission('organizations.update')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Size
                  </label>
                  <select
                    value={settings.general.size || ''}
                    onChange={(e) => handleInputChange('general.size', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!hasPermission('organizations.update')}
                  >
                    <option value="">Select Size</option>
                    <option value="1-50">1-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="501-1000">501-1000 employees</option>
                    <option value="1001-5000">1001-5000 employees</option>
                    <option value="5001+">5001+ employees</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Headquarters */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Globe className="w-5 h-5 text-green-500" />
              <span>Headquarters</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={settings.general.headquarters?.address || ''}
                  onChange={(e) => handleInputChange('general.headquarters.address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Street address"
                  disabled={!hasPermission('organizations.update')}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={settings.general.headquarters?.city || ''}
                    onChange={(e) => handleInputChange('general.headquarters.city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="City"
                    disabled={!hasPermission('organizations.update')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={settings.general.headquarters?.country || ''}
                    onChange={(e) => handleInputChange('general.headquarters.country', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Country"
                    disabled={!hasPermission('organizations.update')}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={settings.general.headquarters?.timezone || ''}
                  onChange={(e) => handleInputChange('general.headquarters.timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!hasPermission('organizations.update')}
                >
                  <option value="">Select Timezone</option>
                  <option value="UTC-12:00">UTC-12:00</option>
                  <option value="UTC-11:00">UTC-11:00</option>
                  <option value="UTC-10:00">UTC-10:00</option>
                  <option value="UTC-09:00">UTC-09:00</option>
                  <option value="UTC-08:00">UTC-08:00 (PST)</option>
                  <option value="UTC-07:00">UTC-07:00 (MST)</option>
                  <option value="UTC-06:00">UTC-06:00 (CST)</option>
                  <option value="UTC-05:00">UTC-05:00 (EST)</option>
                  <option value="UTC-04:00">UTC-04:00</option>
                  <option value="UTC-03:00">UTC-03:00</option>
                  <option value="UTC-02:00">UTC-02:00</option>
                  <option value="UTC-01:00">UTC-01:00</option>
                  <option value="UTC+00:00">UTC+00:00</option>
                  <option value="UTC+01:00">UTC+01:00</option>
                  <option value="UTC+02:00">UTC+02:00</option>
                  <option value="UTC+03:00">UTC+03:00</option>
                  <option value="UTC+04:00">UTC+04:00</option>
                  <option value="UTC+05:00">UTC+05:00</option>
                  <option value="UTC+05:30">UTC+05:30 (IST)</option>
                  <option value="UTC+06:00">UTC+06:00</option>
                  <option value="UTC+07:00">UTC+07:00</option>
                  <option value="UTC+08:00">UTC+08:00</option>
                  <option value="UTC+09:00">UTC+09:00 (JST)</option>
                  <option value="UTC+10:00">UTC+10:00</option>
                  <option value="UTC+11:00">UTC+11:00</option>
                  <option value="UTC+12:00">UTC+12:00</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Contact Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Mail className="w-5 h-5 text-purple-500" />
              <span>Contact Information</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Email
                </label>
                <input
                  type="email"
                  value={settings.general.contact?.email || ''}
                  onChange={(e) => handleInputChange('general.contact.email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="contact@example.com"
                  disabled={!hasPermission('organizations.update')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={settings.general.contact?.phone || ''}
                  onChange={(e) => handleInputChange('general.contact.phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1-555-0123"
                  disabled={!hasPermission('organizations.update')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Phone
                </label>
                <input
                  type="tel"
                  value={settings.general.contact?.emergencyPhone || ''}
                  onChange={(e) => handleInputChange('general.contact.emergencyPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1-555-0123"
                  disabled={!hasPermission('organizations.update')}
                />
              </div>
            </div>
          </div>
          
          {/* Security Settings */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5 text-red-500" />
              <span>Security Settings</span>
            </h2>
            
            {/* Password Policy */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center space-x-2">
                <Lock className="w-4 h-4 text-gray-600" />
                <span>Password Policy</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Length
                  </label>
                  <input
                    type="number"
                    min="8"
                    max="32"
                    value={settings.security.passwordPolicy?.minLength || 8}
                    onChange={(e) => handleInputChange('security.passwordPolicy.minLength', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!hasPermission('organizations.update')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Age (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={settings.security.passwordPolicy?.maxAge || 90}
                    onChange={(e) => handleInputChange('security.passwordPolicy.maxAge', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!hasPermission('organizations.update')}
                  />
                  <p className="mt-1 text-xs text-gray-500">Set to 0 for no expiration</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prevent Password Reuse
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={settings.security.passwordPolicy?.preventReuse || 5}
                    onChange={(e) => handleInputChange('security.passwordPolicy.preventReuse', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!hasPermission('organizations.update')}
                  />
                  <p className="mt-1 text-xs text-gray-500">Number of previous passwords to check</p>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requireUppercase"
                    checked={settings.security.passwordPolicy?.requireUppercase || false}
                    onChange={(e) => handleInputChange('security.passwordPolicy.requireUppercase', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={!hasPermission('organizations.update')}
                  />
                  <label htmlFor="requireUppercase" className="ml-2 text-sm text-gray-700">
                    Require uppercase
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requireLowercase"
                    checked={settings.security.passwordPolicy?.requireLowercase || false}
                    onChange={(e) => handleInputChange('security.passwordPolicy.requireLowercase', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={!hasPermission('organizations.update')}
                  />
                  <label htmlFor="requireLowercase" className="ml-2 text-sm text-gray-700">
                    Require lowercase
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requireNumbers"
                    checked={settings.security.passwordPolicy?.requireNumbers || false}
                    onChange={(e) => handleInputChange('security.passwordPolicy.requireNumbers', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={!hasPermission('organizations.update')}
                  />
                  <label htmlFor="requireNumbers" className="ml-2 text-sm text-gray-700">
                    Require numbers
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requireSpecialChars"
                    checked={settings.security.passwordPolicy?.requireSpecialChars || false}
                    onChange={(e) => handleInputChange('security.passwordPolicy.requireSpecialChars', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={!hasPermission('organizations.update')}
                  />
                  <label htmlFor="requireSpecialChars" className="ml-2 text-sm text-gray-700">
                    Require special chars
                  </label>
                </div>
              </div>
            </div>
            
            {/* Session Policy */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span>Session Policy</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Session Duration (hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={settings.security.sessionPolicy?.maxDuration || 24}
                    onChange={(e) => handleInputChange('security.sessionPolicy.maxDuration', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!hasPermission('organizations.update')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idle Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="240"
                    value={settings.security.sessionPolicy?.idleTimeout || 30}
                    onChange={(e) => handleInputChange('security.sessionPolicy.idleTimeout', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!hasPermission('organizations.update')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Concurrent Sessions
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.security.sessionPolicy?.maxConcurrentSessions || 3}
                    onChange={(e) => handleInputChange('security.sessionPolicy.maxConcurrentSessions', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!hasPermission('organizations.update')}
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requireReauth"
                    checked={settings.security.sessionPolicy?.requireReauth || false}
                    onChange={(e) => handleInputChange('security.sessionPolicy.requireReauth', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={!hasPermission('organizations.update')}
                  />
                  <label htmlFor="requireReauth" className="ml-2 text-sm text-gray-700">
                    Require re-authentication for sensitive actions
                  </label>
                </div>
              </div>
            </div>
            
            {/* Two-Factor Authentication */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center space-x-2">
                <Key className="w-4 h-4 text-gray-600" />
                <span>Two-Factor Authentication</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="twoFactorRequired"
                    checked={settings.security.twoFactorAuth?.required || false}
                    onChange={(e) => handleInputChange('security.twoFactorAuth.required', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={!hasPermission('organizations.update')}
                  />
                  <label htmlFor="twoFactorRequired" className="ml-2 text-sm text-gray-700">
                    Require two-factor authentication for all users
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="backupCodes"
                    checked={settings.security.twoFactorAuth?.backupCodes || false}
                    onChange={(e) => handleInputChange('security.twoFactorAuth.backupCodes', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={!hasPermission('organizations.update')}
                  />
                  <label htmlFor="backupCodes" className="ml-2 text-sm text-gray-700">
                    Enable backup codes
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allowed Methods
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="methodApp"
                        checked={(settings.security.twoFactorAuth?.allowedMethods || []).includes('app')}
                        onChange={(e) => {
                          const methods = [...(settings.security.twoFactorAuth?.allowedMethods || [])];
                          if (e.target.checked) {
                            if (!methods.includes('app')) methods.push('app');
                          } else {
                            const index = methods.indexOf('app');
                            if (index !== -1) methods.splice(index, 1);
                          }
                          handleInputChange('security.twoFactorAuth.allowedMethods', methods);
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={!hasPermission('organizations.update')}
                      />
                      <label htmlFor="methodApp" className="ml-2 text-sm text-gray-700">
                        Authenticator App (TOTP)
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="methodSms"
                        checked={(settings.security.twoFactorAuth?.allowedMethods || []).includes('sms')}
                        onChange={(e) => {
                          const methods = [...(settings.security.twoFactorAuth?.allowedMethods || [])];
                          if (e.target.checked) {
                            if (!methods.includes('sms')) methods.push('sms');
                          } else {
                            const index = methods.indexOf('sms');
                            if (index !== -1) methods.splice(index, 1);
                          }
                          handleInputChange('security.twoFactorAuth.allowedMethods', methods);
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={!hasPermission('organizations.update')}
                      />
                      <label htmlFor="methodSms" className="ml-2 text-sm text-gray-700">
                        SMS
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="methodEmail"
                        checked={(settings.security.twoFactorAuth?.allowedMethods || []).includes('email')}
                        onChange={(e) => {
                          const methods = [...(settings.security.twoFactorAuth?.allowedMethods || [])];
                          if (e.target.checked) {
                            if (!methods.includes('email')) methods.push('email');
                          } else {
                            const index = methods.indexOf('email');
                            if (index !== -1) methods.splice(index, 1);
                          }
                          handleInputChange('security.twoFactorAuth.allowedMethods', methods);
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={!hasPermission('organizations.update')}
                      />
                      <label htmlFor="methodEmail" className="ml-2 text-sm text-gray-700">
                        Email
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Access Control */}
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-600" />
                <span>Access Control</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Role
                  </label>
                  <select
                    value={settings.security.accessControl?.defaultRole || 'user'}
                    onChange={(e) => handleInputChange('security.accessControl.defaultRole', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!hasPermission('organizations.update')}
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Failed Login Attempts
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="10"
                    value={settings.security.accessControl?.maxFailedAttempts || 5}
                    onChange={(e) => handleInputChange('security.accessControl.maxFailedAttempts', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!hasPermission('organizations.update')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Lockout Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={settings.security.accessControl?.lockoutDuration || 30}
                    onChange={(e) => handleInputChange('security.accessControl.lockoutDuration', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!hasPermission('organizations.update')}
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoLockAccount"
                    checked={settings.security.accessControl?.autoLockAccount || false}
                    onChange={(e) => handleInputChange('security.accessControl.autoLockAccount', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={!hasPermission('organizations.update')}
                  />
                  <label htmlFor="autoLockAccount" className="ml-2 text-sm text-gray-700">
                    Automatically lock account after failed attempts
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Departments */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span>Departments</span>
              </div>
              {hasPermission('organizations.update') && (
                <button
                  onClick={handleAddDepartment}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Department</span>
                </button>
              )}
            </h2>
            
            {settings.departments.list.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Departments Configured</h3>
                <p className="text-gray-500 mb-4">
                  Add departments to organize your personnel and manage access control
                </p>
                {hasPermission('organizations.update') && (
                  <button
                    onClick={handleAddDepartment}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Department</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {settings.departments.list.map((department: any) => (
                  <div key={department.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{department.name}</h4>
                      {hasPermission('organizations.update') && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleEditDepartment(department)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDepartment(department.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{department.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Head Count: {department.headCount}</span>
                      <span className={`px-2 py-1 rounded-full ${
                        department.securityLevel === 'high' ? 'bg-red-100 text-red-700' :
                        department.securityLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {department.securityLevel.charAt(0).toUpperCase() + department.securityLevel.slice(1)} Security
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Department Modal */}
      <Modal
        isOpen={showDepartmentModal}
        onClose={() => setShowDepartmentModal(false)}
        title={editingDepartment ? 'Edit Department' : 'Add Department'}
        size="md"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department Name *
            </label>
            <input
              type="text"
              required
              value={departmentForm.name}
              onChange={(e) => setDepartmentForm({...departmentForm, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter department name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={departmentForm.description}
              onChange={(e) => setDepartmentForm({...departmentForm, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of the department"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Head Count
            </label>
            <input
              type="number"
              min="0"
              value={departmentForm.headCount}
              onChange={(e) => setDepartmentForm({...departmentForm, headCount: parseInt(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Security Level
            </label>
            <select
              value={departmentForm.securityLevel}
              onChange={(e) => setDepartmentForm({...departmentForm, securityLevel: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="standard">Standard</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => setShowDepartmentModal(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDepartment}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingDepartment ? 'Update Department' : 'Add Department'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrganizationSettings;