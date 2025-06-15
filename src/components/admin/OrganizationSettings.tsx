import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building, 
  Shield, 
  Bell, 
  Globe, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  X,
  Brain,
  Zap,
  Plus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import AIUsageMonitoring from './AIUsageMonitoring';

interface OrganizationSettings {
  general?: {
    description?: string;
    website?: string;
    industry?: string;
    size?: string;
    headquarters?: {
      address?: string;
      city?: string;
      country?: string;
      timezone?: string;
    };
    contact?: {
      email?: string;
      phone?: string;
      emergencyPhone?: string;
    };
  };
  security?: {
    passwordPolicy?: {
      minLength?: number;
      requireUppercase?: boolean;
      requireLowercase?: boolean;
      requireNumbers?: boolean;
      requireSpecialChars?: boolean;
      maxAge?: number;
      preventReuse?: number;
    };
    sessionPolicy?: {
      maxDuration?: number;
      idleTimeout?: number;
      maxConcurrentSessions?: number;
      requireReauth?: boolean;
    };
    twoFactorAuth?: {
      required?: boolean;
      allowedMethods?: string[];
      backupCodes?: boolean;
    };
    accessControl?: {
      defaultRole?: string;
      autoLockAccount?: boolean;
      maxFailedAttempts?: number;
      lockoutDuration?: number;
    };
  };
  notifications?: {
    email?: {
      enabled?: boolean;
      smtp?: {
        host?: string;
        port?: number;
        secure?: boolean;
        username?: string;
        password?: string;
      };
    };
    alerts?: {
      securityIncidents?: boolean;
      systemMaintenance?: boolean;
      userActivity?: boolean;
      riskAssessments?: boolean;
    };
    thresholds?: {
      highRiskScore?: number;
      criticalRiskScore?: number;
      unusualActivity?: boolean;
      geopoliticalEvents?: boolean;
      travelRisks?: boolean;
    };
  };
  integrations?: {
    googleMaps?: {
      enabled?: boolean;
      apiKey?: string;
    };
    externalSystems?: {
      enabled?: boolean;
      endpoints?: string[];
    };
  };
  departments?: {
    list?: {
      id: string;
      name: string;
      description: string;
      headCount: number;
      securityLevel: string;
    }[];
  };
  ai?: {
    enabled?: boolean;
    model?: string;
    tokenLimit?: number;
    settings?: {
      temperature?: number;
      contextWindow?: number;
      responseLength?: string;
    };
    notifications?: {
      approachingLimit?: boolean;
      limitThreshold?: number;
      weeklyUsageReport?: boolean;
    };
  };
}

const OrganizationSettings: React.FC = () => {
  const [settings, setSettings] = useState<OrganizationSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'integrations' | 'departments' | 'ai'>('general');

  const { organization, hasPermission } = useAuth();

  useEffect(() => {
    if (organization?.id) {
      fetchSettings();
    }
  }, [organization]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organization?.id)
        .single();

      if (error) throw error;
      
      setSettings(data?.settings || {});
    } catch (err) {
      console.error('Error fetching organization settings:', err);
      setError('Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!organization?.id) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const { error } = await supabase
        .from('organizations')
        .update({ settings })
        .eq('id', organization.id);

      if (error) throw error;
      
      setSuccess('Settings saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving organization settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (path: string, value: any) => {
    const pathParts = path.split('.');
    const newSettings = { ...settings };
    
    let current = newSettings;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[pathParts[pathParts.length - 1]] = value;
    setSettings(newSettings);
  };

  if (!hasPermission('organizations.read')) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to view organization settings.</p>
      </div>
    );
  }

  if (loading && Object.keys(settings).length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading organization settings...</p>
        </div>
      </div>
    );
  }

  // If the active tab is 'ai', render the AIUsageMonitoring component
  if (activeTab === 'ai') {
    return <AIUsageMonitoring />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
          <p className="text-gray-600">Configure your organization's settings and preferences</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving || !hasPermission('organizations.update')}
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
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="text-green-700 text-sm">{success}</span>
          <button 
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Settings Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'general'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Building className="w-5 h-5" />
                <span>General</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('security')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Security</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notifications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Notifications</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('integrations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'integrations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>Integrations</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('departments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'departments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Departments</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('ai')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'ai'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5" />
                <span>AI & Usage</span>
              </div>
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      value={organization?.name || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Contact support to change your organization name
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plan Type
                    </label>
                    <input
                      type="text"
                      value={(organization?.plan_type || '').charAt(0).toUpperCase() + (organization?.plan_type || '').slice(1)}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Contact sales to upgrade your plan
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={settings.general?.description || ''}
                      onChange={(e) => updateSettings('general.description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief description of your organization"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={settings.general?.website || ''}
                      onChange={(e) => updateSettings('general.website', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Industry
                    </label>
                    <select
                      value={settings.general?.industry || ''}
                      onChange={(e) => updateSettings('general.industry', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Industry</option>
                      <option value="government">Government</option>
                      <option value="defense">Defense & Security</option>
                      <option value="finance">Financial Services</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="technology">Technology</option>
                      <option value="energy">Energy & Utilities</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="transportation">Transportation & Logistics</option>
                      <option value="retail">Retail & Consumer Goods</option>
                      <option value="education">Education</option>
                      <option value="nonprofit">Non-profit & NGO</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Size
                    </label>
                    <select
                      value={settings.general?.size || ''}
                      onChange={(e) => updateSettings('general.size', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="501-1000">501-1000 employees</option>
                      <option value="1001-5000">1001-5000 employees</option>
                      <option value="5001+">5001+ employees</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Headquarters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={settings.general?.headquarters?.address || ''}
                      onChange={(e) => updateSettings('general.headquarters.address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Street address"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={settings.general?.headquarters?.city || ''}
                      onChange={(e) => updateSettings('general.headquarters.city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="City"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={settings.general?.headquarters?.country || ''}
                      onChange={(e) => updateSettings('general.headquarters.country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Country"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={settings.general?.headquarters?.timezone || ''}
                      onChange={(e) => updateSettings('general.headquarters.timezone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      <option value="UTC+01:00">UTC+01:00 (CET)</option>
                      <option value="UTC+02:00">UTC+02:00</option>
                      <option value="UTC+03:00">UTC+03:00</option>
                      <option value="UTC+04:00">UTC+04:00</option>
                      <option value="UTC+05:00">UTC+05:00</option>
                      <option value="UTC+05:30">UTC+05:30 (IST)</option>
                      <option value="UTC+06:00">UTC+06:00</option>
                      <option value="UTC+07:00">UTC+07:00</option>
                      <option value="UTC+08:00">UTC+08:00 (CST)</option>
                      <option value="UTC+09:00">UTC+09:00 (JST)</option>
                      <option value="UTC+10:00">UTC+10:00</option>
                      <option value="UTC+11:00">UTC+11:00</option>
                      <option value="UTC+12:00">UTC+12:00</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Email
                    </label>
                    <input
                      type="email"
                      value={settings.general?.contact?.email || ''}
                      onChange={(e) => updateSettings('general.contact.email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="contact@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={settings.general?.contact?.phone || ''}
                      onChange={(e) => updateSettings('general.contact.phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Emergency Contact Number
                    </label>
                    <input
                      type="tel"
                      value={settings.general?.contact?.emergencyPhone || ''}
                      onChange={(e) => updateSettings('general.contact.emergencyPhone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+1 (555) 987-6543"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Password Policy</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Password Length
                    </label>
                    <input
                      type="number"
                      min="8"
                      max="32"
                      value={settings.security?.passwordPolicy?.minLength || 8}
                      onChange={(e) => updateSettings('security.passwordPolicy.minLength', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password Expiry (days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={settings.security?.passwordPolicy?.maxAge || 90}
                      onChange={(e) => updateSettings('security.passwordPolicy.maxAge', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Set to 0 for no expiration
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Require Uppercase Letters
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.security?.passwordPolicy?.requireUppercase || false}
                        onChange={(e) => updateSettings('security.passwordPolicy.requireUppercase', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.security?.passwordPolicy?.requireUppercase ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.security?.passwordPolicy?.requireUppercase ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Require Lowercase Letters
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.security?.passwordPolicy?.requireLowercase || false}
                        onChange={(e) => updateSettings('security.passwordPolicy.requireLowercase', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.security?.passwordPolicy?.requireLowercase ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.security?.passwordPolicy?.requireLowercase ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Require Numbers
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.security?.passwordPolicy?.requireNumbers || false}
                        onChange={(e) => updateSettings('security.passwordPolicy.requireNumbers', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.security?.passwordPolicy?.requireNumbers ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.security?.passwordPolicy?.requireNumbers ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Require Special Characters
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.security?.passwordPolicy?.requireSpecialChars || false}
                        onChange={(e) => updateSettings('security.passwordPolicy.requireSpecialChars', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.security?.passwordPolicy?.requireSpecialChars ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.security?.passwordPolicy?.requireSpecialChars ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Require Two-Factor Authentication
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.security?.twoFactorAuth?.required || false}
                        onChange={(e) => updateSettings('security.twoFactorAuth.required', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.security?.twoFactorAuth?.required ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.security?.twoFactorAuth?.required ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Allow Backup Codes
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.security?.twoFactorAuth?.backupCodes || false}
                        onChange={(e) => updateSettings('security.twoFactorAuth.backupCodes', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.security?.twoFactorAuth?.backupCodes ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.security?.twoFactorAuth?.backupCodes ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Security</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Auto-lock Account After Failed Attempts
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.security?.accessControl?.autoLockAccount || false}
                        onChange={(e) => updateSettings('security.accessControl.autoLockAccount', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.security?.accessControl?.autoLockAccount ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.security?.accessControl?.autoLockAccount ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Failed Login Attempts
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="10"
                      value={settings.security?.accessControl?.maxFailedAttempts || 5}
                      onChange={(e) => updateSettings('security.accessControl.maxFailedAttempts', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      value={settings.security?.accessControl?.lockoutDuration || 30}
                      onChange={(e) => updateSettings('security.accessControl.lockoutDuration', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default User Role
                    </label>
                    <select
                      value={settings.security?.accessControl?.defaultRole || 'user'}
                      onChange={(e) => updateSettings('security.accessControl.defaultRole', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="user">User</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={settings.security?.sessionPolicy?.idleTimeout || 30}
                      onChange={(e) => updateSettings('security.sessionPolicy.idleTimeout', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Time of inactivity before a user is logged out
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Session Duration (hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={settings.security?.sessionPolicy?.maxDuration || 24}
                      onChange={(e) => updateSettings('security.sessionPolicy.maxDuration', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Maximum time a session can remain active
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Require Re-authentication for Sensitive Actions
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.security?.sessionPolicy?.requireReauth || false}
                        onChange={(e) => updateSettings('security.sessionPolicy.requireReauth', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.security?.sessionPolicy?.requireReauth ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.security?.sessionPolicy?.requireReauth ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Enable Email Notifications
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.notifications?.email?.enabled || false}
                        onChange={(e) => updateSettings('notifications.email.enabled', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.notifications?.email?.enabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.notifications?.email?.enabled ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                  
                  {settings.notifications?.email?.enabled && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">SMTP Configuration</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SMTP Host
                          </label>
                          <input
                            type="text"
                            value={settings.notifications?.email?.smtp?.host || ''}
                            onChange={(e) => updateSettings('notifications.email.smtp.host', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="smtp.example.com"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SMTP Port
                          </label>
                          <input
                            type="number"
                            value={settings.notifications?.email?.smtp?.port || 587}
                            onChange={(e) => updateSettings('notifications.email.smtp.port', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SMTP Username
                          </label>
                          <input
                            type="text"
                            value={settings.notifications?.email?.smtp?.username || ''}
                            onChange={(e) => updateSettings('notifications.email.smtp.username', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="username"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SMTP Password
                          </label>
                          <input
                            type="password"
                            value={settings.notifications?.email?.smtp?.password || ''}
                            onChange={(e) => updateSettings('notifications.email.smtp.password', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="••••••••"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between md:col-span-2">
                          <label className="text-sm font-medium text-gray-700">
                            Use Secure Connection (TLS/SSL)
                          </label>
                          <div className="relative inline-block w-12 h-6">
                            <input
                              type="checkbox"
                              className="opacity-0 w-0 h-0"
                              checked={settings.notifications?.email?.smtp?.secure || false}
                              onChange={(e) => updateSettings('notifications.email.smtp.secure', e.target.checked)}
                            />
                            <span 
                              className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                                settings.notifications?.email?.smtp?.secure ? 'bg-blue-600' : 'bg-gray-300'
                              }`}
                            >
                              <span 
                                className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                                  settings.notifications?.email?.smtp?.secure ? 'transform translate-x-6' : ''
                                }`}
                              ></span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Security Incidents
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.notifications?.alerts?.securityIncidents || false}
                        onChange={(e) => updateSettings('notifications.alerts.securityIncidents', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.notifications?.alerts?.securityIncidents ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.notifications?.alerts?.securityIncidents ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      System Maintenance
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.notifications?.alerts?.systemMaintenance || false}
                        onChange={(e) => updateSettings('notifications.alerts.systemMaintenance', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.notifications?.alerts?.systemMaintenance ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.notifications?.alerts?.systemMaintenance ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      User Activity
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.notifications?.alerts?.userActivity || false}
                        onChange={(e) => updateSettings('notifications.alerts.userActivity', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.notifications?.alerts?.userActivity ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.notifications?.alerts?.userActivity ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Risk Assessments
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.notifications?.alerts?.riskAssessments || false}
                        onChange={(e) => updateSettings('notifications.alerts.riskAssessments', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.notifications?.alerts?.riskAssessments ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.notifications?.alerts?.riskAssessments ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Thresholds</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      High Risk Score Threshold
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="90"
                      value={settings.notifications?.thresholds?.highRiskScore || 70}
                      onChange={(e) => updateSettings('notifications.thresholds.highRiskScore', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Alert when risk score exceeds this value
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Critical Risk Score Threshold
                    </label>
                    <input
                      type="number"
                      min="70"
                      max="100"
                      value={settings.notifications?.thresholds?.criticalRiskScore || 90}
                      onChange={(e) => updateSettings('notifications.thresholds.criticalRiskScore', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Escalate alerts when risk score exceeds this value
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Unusual Activity Detection
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.notifications?.thresholds?.unusualActivity || false}
                        onChange={(e) => updateSettings('notifications.thresholds.unusualActivity', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.notifications?.thresholds?.unusualActivity ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.notifications?.thresholds?.unusualActivity ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Geopolitical Event Alerts
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.notifications?.thresholds?.geopoliticalEvents || false}
                        onChange={(e) => updateSettings('notifications.thresholds.geopoliticalEvents', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.notifications?.thresholds?.geopoliticalEvents ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.notifications?.thresholds?.geopoliticalEvents ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Travel Risk Alerts
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.notifications?.thresholds?.travelRisks || false}
                        onChange={(e) => updateSettings('notifications.thresholds.travelRisks', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.notifications?.thresholds?.travelRisks ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.notifications?.thresholds?.travelRisks ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Integrations Settings */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Google Maps Integration</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Enable Google Maps
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.integrations?.googleMaps?.enabled || false}
                        onChange={(e) => updateSettings('integrations.googleMaps.enabled', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.integrations?.googleMaps?.enabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.integrations?.googleMaps?.enabled ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                  
                  {settings.integrations?.googleMaps?.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Google Maps API Key
                      </label>
                      <input
                        type="text"
                        value={settings.integrations?.googleMaps?.apiKey || ''}
                        onChange={(e) => updateSettings('integrations.googleMaps.apiKey', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your Google Maps API key"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Required for map functionality. Get an API key from the <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Google Cloud Console</a>.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">External Systems Integration</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Enable External Systems Integration
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settings.integrations?.externalSystems?.enabled || false}
                        onChange={(e) => updateSettings('integrations.externalSystems.enabled', e.target.checked)}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settings.integrations?.externalSystems?.enabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settings.integrations?.externalSystems?.enabled ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                  
                  {settings.integrations?.externalSystems?.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        External API Endpoints
                      </label>
                      <div className="space-y-2">
                        {(settings.integrations?.externalSystems?.endpoints || []).map((endpoint, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={endpoint}
                              onChange={(e) => {
                                const newEndpoints = [...(settings.integrations?.externalSystems?.endpoints || [])];
                                newEndpoints[index] = e.target.value;
                                updateSettings('integrations.externalSystems.endpoints', newEndpoints);
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="https://api.example.com/endpoint"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newEndpoints = [...(settings.integrations?.externalSystems?.endpoints || [])];
                                newEndpoints.splice(index, 1);
                                updateSettings('integrations.externalSystems.endpoints', newEndpoints);
                              }}
                              className="p-2 text-red-600 hover:text-red-800 transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const newEndpoints = [...(settings.integrations?.externalSystems?.endpoints || []), ''];
                            updateSettings('integrations.externalSystems.endpoints', newEndpoints);
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        >
                          + Add Endpoint
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Departments Settings */}
          {activeTab === 'departments' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Management</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-700">
                      Departments are used throughout the system to organize personnel, assets, and incidents. 
                      Add all departments in your organization to ensure proper categorization and access control.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {(settings.departments?.list || []).map((dept, index) => (
                      <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Building className="w-4 h-4 text-blue-600" />
                            </div>
                            <input
                              type="text"
                              value={dept.name}
                              onChange={(e) => {
                                const newList = [...(settings.departments?.list || [])];
                                newList[index].name = e.target.value;
                                updateSettings('departments.list', newList);
                              }}
                              className="text-sm font-medium text-gray-900 px-2 py-1 border border-transparent hover:border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Department Name"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newList = [...(settings.departments?.list || [])];
                              newList.splice(index, 1);
                              updateSettings('departments.list', newList);
                            }}
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={dept.description}
                              onChange={(e) => {
                                const newList = [...(settings.departments?.list || [])];
                                newList[index].description = e.target.value;
                                updateSettings('departments.list', newList);
                              }}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Department description"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Head Count
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={dept.headCount}
                              onChange={(e) => {
                                const newList = [...(settings.departments?.list || [])];
                                newList[index].headCount = parseInt(e.target.value);
                                updateSettings('departments.list', newList);
                              }}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Security Level
                            </label>
                            <select
                              value={dept.securityLevel}
                              onChange={(e) => {
                                const newList = [...(settings.departments?.list || [])];
                                newList[index].securityLevel = e.target.value;
                                updateSettings('departments.list', newList);
                              }}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="standard">Standard</option>
                              <option value="elevated">Elevated</option>
                              <option value="high">High</option>
                              <option value="restricted">Restricted</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => {
                        const newDept = {
                          id: crypto.randomUUID(),
                          name: '',
                          description: '',
                          headCount: 0,
                          securityLevel: 'standard'
                        };
                        const newList = [...(settings.departments?.list || []), newDept];
                        updateSettings('departments.list', newList);
                      }}
                      className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Department</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettings;