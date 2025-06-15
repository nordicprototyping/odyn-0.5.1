import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building, 
  Shield, 
  Bell, 
  Globe, 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Plus,
  Trash2,
  Edit,
  X,
  Brain,
  Zap,
  Mail,
  Phone,
  MapPin,
  Clock,
  Lock,
  Key,
  Users,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import AIUsageMonitoring from './AIUsageMonitoring';

interface OrganizationSettings {
  general: {
    description: string;
    website: string;
    industry: string;
    size: string;
    headquarters: {
      address: string;
      city: string;
      country: string;
      timezone: string;
    };
    contact: {
      email: string;
      phone: string;
      emergencyPhone: string;
    };
  };
  security: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      maxAge: number;
      preventReuse: number;
    };
    sessionPolicy: {
      maxDuration: number;
      idleTimeout: number;
      maxConcurrentSessions: number;
      requireReauth: boolean;
    };
    twoFactorAuth: {
      required: boolean;
      allowedMethods: string[];
      backupCodes: boolean;
    };
    accessControl: {
      defaultRole: string;
      autoLockAccount: boolean;
      maxFailedAttempts: number;
      lockoutDuration: number;
    };
  };
  notifications: {
    email: {
      enabled: boolean;
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        username: string;
        password: string;
      };
    };
    alerts: {
      securityIncidents: boolean;
      systemMaintenance: boolean;
      userActivity: boolean;
      riskAssessments: boolean;
    };
    thresholds: {
      highRiskScore: number;
      criticalRiskScore: number;
      unusualActivity: boolean;
      geopoliticalEvents: boolean;
      travelRisks: boolean;
    };
  };
  integrations: {
    googleMaps: {
      enabled: boolean;
      apiKey: string;
    };
    externalSystems: {
      enabled: boolean;
      endpoints: string[];
    };
  };
  departments: {
    list: {
      id: string;
      name: string;
      description: string;
      headCount: number;
      securityLevel: string;
    }[];
  };
}

const OrganizationSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'integrations' | 'departments' | 'ai'>('general');
  const [settings, setSettings] = useState<OrganizationSettings>({
    general: {
      description: '',
      website: '',
      industry: '',
      size: '',
      headquarters: {
        address: '',
        city: '',
        country: '',
        timezone: '',
      },
      contact: {
        email: '',
        phone: '',
        emergencyPhone: '',
      },
    },
    security: {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAge: 90,
        preventReuse: 5,
      },
      sessionPolicy: {
        maxDuration: 24,
        idleTimeout: 30,
        maxConcurrentSessions: 3,
        requireReauth: true,
      },
      twoFactorAuth: {
        required: false,
        allowedMethods: ['app'],
        backupCodes: true,
      },
      accessControl: {
        defaultRole: 'user',
        autoLockAccount: true,
        maxFailedAttempts: 5,
        lockoutDuration: 30,
      },
    },
    notifications: {
      email: {
        enabled: false,
        smtp: {
          host: '',
          port: 587,
          secure: false,
          username: '',
          password: '',
        },
      },
      alerts: {
        securityIncidents: true,
        systemMaintenance: true,
        userActivity: false,
        riskAssessments: true,
      },
      thresholds: {
        highRiskScore: 70,
        criticalRiskScore: 90,
        unusualActivity: true,
        geopoliticalEvents: true,
        travelRisks: true,
      },
    },
    integrations: {
      googleMaps: {
        enabled: true,
        apiKey: '',
      },
      externalSystems: {
        enabled: false,
        endpoints: [],
      },
    },
    departments: {
      list: [],
    },
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<number | null>(null);
  const [newDepartment, setNewDepartment] = useState({
    name: '',
    description: '',
    headCount: 0,
    securityLevel: 'standard',
  });
  const [showNewDepartmentForm, setShowNewDepartmentForm] = useState(false);

  const { organization, hasPermission } = useAuth();

  useEffect(() => {
    if (organization?.id) {
      fetchOrganizationSettings(organization.id);
    }
  }, [organization]);

  const fetchOrganizationSettings = async (organizationId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();
      
      if (error) throw error;
      
      // Initialize settings with defaults and merge with stored settings
      const storedSettings = data?.settings || {};
      
      setSettings({
        general: {
          description: storedSettings.general?.description || '',
          website: storedSettings.general?.website || '',
          industry: storedSettings.general?.industry || '',
          size: storedSettings.general?.size || '',
          headquarters: {
            address: storedSettings.general?.headquarters?.address || '',
            city: storedSettings.general?.headquarters?.city || '',
            country: storedSettings.general?.headquarters?.country || '',
            timezone: storedSettings.general?.headquarters?.timezone || 'UTC',
          },
          contact: {
            email: storedSettings.general?.contact?.email || '',
            phone: storedSettings.general?.contact?.phone || '',
            emergencyPhone: storedSettings.general?.contact?.emergencyPhone || '',
          },
        },
        security: {
          passwordPolicy: {
            minLength: storedSettings.security?.passwordPolicy?.minLength || 8,
            requireUppercase: storedSettings.security?.passwordPolicy?.requireUppercase !== false,
            requireLowercase: storedSettings.security?.passwordPolicy?.requireLowercase !== false,
            requireNumbers: storedSettings.security?.passwordPolicy?.requireNumbers !== false,
            requireSpecialChars: storedSettings.security?.passwordPolicy?.requireSpecialChars !== false,
            maxAge: storedSettings.security?.passwordPolicy?.maxAge || 90,
            preventReuse: storedSettings.security?.passwordPolicy?.preventReuse || 5,
          },
          sessionPolicy: {
            maxDuration: storedSettings.security?.sessionPolicy?.maxDuration || 24,
            idleTimeout: storedSettings.security?.sessionPolicy?.idleTimeout || 30,
            maxConcurrentSessions: storedSettings.security?.sessionPolicy?.maxConcurrentSessions || 3,
            requireReauth: storedSettings.security?.sessionPolicy?.requireReauth !== false,
          },
          twoFactorAuth: {
            required: storedSettings.security?.twoFactorAuth?.required || false,
            allowedMethods: storedSettings.security?.twoFactorAuth?.allowedMethods || ['app'],
            backupCodes: storedSettings.security?.twoFactorAuth?.backupCodes !== false,
          },
          accessControl: {
            defaultRole: storedSettings.security?.accessControl?.defaultRole || 'user',
            autoLockAccount: storedSettings.security?.accessControl?.autoLockAccount !== false,
            maxFailedAttempts: storedSettings.security?.accessControl?.maxFailedAttempts || 5,
            lockoutDuration: storedSettings.security?.accessControl?.lockoutDuration || 30,
          },
        },
        notifications: {
          email: {
            enabled: storedSettings.notifications?.email?.enabled || false,
            smtp: {
              host: storedSettings.notifications?.email?.smtp?.host || '',
              port: storedSettings.notifications?.email?.smtp?.port || 587,
              secure: storedSettings.notifications?.email?.smtp?.secure || false,
              username: storedSettings.notifications?.email?.smtp?.username || '',
              password: storedSettings.notifications?.email?.smtp?.password || '',
            },
          },
          alerts: {
            securityIncidents: storedSettings.notifications?.alerts?.securityIncidents !== false,
            systemMaintenance: storedSettings.notifications?.alerts?.systemMaintenance !== false,
            userActivity: storedSettings.notifications?.alerts?.userActivity || false,
            riskAssessments: storedSettings.notifications?.alerts?.riskAssessments !== false,
          },
          thresholds: {
            highRiskScore: storedSettings.notifications?.thresholds?.highRiskScore || 70,
            criticalRiskScore: storedSettings.notifications?.thresholds?.criticalRiskScore || 90,
            unusualActivity: storedSettings.notifications?.thresholds?.unusualActivity !== false,
            geopoliticalEvents: storedSettings.notifications?.thresholds?.geopoliticalEvents !== false,
            travelRisks: storedSettings.notifications?.thresholds?.travelRisks !== false,
          },
        },
        integrations: {
          googleMaps: {
            enabled: storedSettings.integrations?.googleMaps?.enabled !== false,
            apiKey: storedSettings.integrations?.googleMaps?.apiKey || '',
          },
          externalSystems: {
            enabled: storedSettings.integrations?.externalSystems?.enabled || false,
            endpoints: storedSettings.integrations?.externalSystems?.endpoints || [],
          },
        },
        departments: {
          list: storedSettings.departments?.list || [],
        },
      });
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

  const handleAddDepartment = () => {
    if (!newDepartment.name) {
      setError('Department name is required');
      return;
    }
    
    const updatedDepartments = [
      ...settings.departments.list,
      {
        id: crypto.randomUUID(),
        name: newDepartment.name,
        description: newDepartment.description,
        headCount: newDepartment.headCount,
        securityLevel: newDepartment.securityLevel,
      }
    ];
    
    setSettings({
      ...settings,
      departments: {
        ...settings.departments,
        list: updatedDepartments
      }
    });
    
    setNewDepartment({
      name: '',
      description: '',
      headCount: 0,
      securityLevel: 'standard',
    });
    
    setShowNewDepartmentForm(false);
  };

  const handleUpdateDepartment = (index: number) => {
    if (editingDepartment !== index) return;
    
    const updatedDepartments = [...settings.departments.list];
    updatedDepartments[index] = {
      ...updatedDepartments[index],
      name: updatedDepartments[index].name,
      description: updatedDepartments[index].description,
      headCount: updatedDepartments[index].headCount,
      securityLevel: updatedDepartments[index].securityLevel,
    };
    
    setSettings({
      ...settings,
      departments: {
        ...settings.departments,
        list: updatedDepartments
      }
    });
    
    setEditingDepartment(null);
  };

  const handleDeleteDepartment = (index: number) => {
    const updatedDepartments = [...settings.departments.list];
    updatedDepartments.splice(index, 1);
    
    setSettings({
      ...settings,
      departments: {
        ...settings.departments,
        list: updatedDepartments
      }
    });
  };

  const updateDepartmentField = (index: number, field: string, value: any) => {
    const updatedDepartments = [...settings.departments.list];
    updatedDepartments[index] = {
      ...updatedDepartments[index],
      [field]: value
    };
    
    setSettings({
      ...settings,
      departments: {
        ...settings.departments,
        list: updatedDepartments
      }
    });
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
            onClick={saveSettings}
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
                <span>Save Changes</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="text-green-700 text-sm">{success}</span>
        </div>
      )}

      {/* Settings Tabs and Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'general'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4" />
                <span>General</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'security'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Security</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'notifications'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'integrations'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4" />
                <span>Integrations</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'departments'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Departments</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'ai'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Brain className="w-4 h-4" />
                <span>AI Settings</span>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      value={organization?.name || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      <a href="#" className="text-blue-600 hover:text-blue-800">Upgrade your plan</a> for additional features
                    </p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={settings.general.description}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          description: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief description of your organization"
                      disabled={!hasPermission('organizations.update')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={settings.general.website}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          website: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com"
                      disabled={!hasPermission('organizations.update')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Industry
                    </label>
                    <select
                      value={settings.general.industry}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          industry: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!hasPermission('organizations.update')}
                    >
                      <option value="">Select Industry</option>
                      <option value="government">Government</option>
                      <option value="defense">Defense & Security</option>
                      <option value="energy">Energy</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="finance">Finance & Banking</option>
                      <option value="technology">Technology</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="transportation">Transportation & Logistics</option>
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
                      value={settings.general.size}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          size: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!hasPermission('organizations.update')}
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Headquarters</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={settings.general.headquarters.address}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          headquarters: {
                            ...settings.general.headquarters,
                            address: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Street address"
                      disabled={!hasPermission('organizations.update')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={settings.general.headquarters.city}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          headquarters: {
                            ...settings.general.headquarters,
                            city: e.target.value
                          }
                        }
                      })}
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
                      value={settings.general.headquarters.country}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          headquarters: {
                            ...settings.general.headquarters,
                            country: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Country"
                      disabled={!hasPermission('organizations.update')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={settings.general.headquarters.timezone}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          headquarters: {
                            ...settings.general.headquarters,
                            timezone: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!hasPermission('organizations.update')}
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Europe/Paris">Central European Time (CET)</option>
                      <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                      <option value="Asia/Singapore">Singapore Time (SGT)</option>
                      <option value="Australia/Sydney">Australian Eastern Time (AET)</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={settings.general.contact.email}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          contact: {
                            ...settings.general.contact,
                            email: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="contact@organization.com"
                      disabled={!hasPermission('organizations.update')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={settings.general.contact.phone}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          contact: {
                            ...settings.general.contact,
                            phone: e.target.value
                          }
                        }
                      })}
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
                      value={settings.general.contact.emergencyPhone}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          contact: {
                            ...settings.general.contact,
                            emergencyPhone: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+1-555-0123"
                      disabled={!hasPermission('organizations.update')}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Key className="w-5 h-5 text-blue-500" />
                  <span>Password Policy</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Password Length
                    </label>
                    <input
                      type="number"
                      min="6"
                      max="32"
                      value={settings.security.passwordPolicy.minLength}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          passwordPolicy: {
                            ...settings.security.passwordPolicy,
                            minLength: parseInt(e.target.value) || 8
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!hasPermission('organizations.update')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password Expiry (Days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={settings.security.passwordPolicy.maxAge}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          passwordPolicy: {
                            ...settings.security.passwordPolicy,
                            maxAge: parseInt(e.target.value) || 90
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!hasPermission('organizations.update')}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Set to 0 for no expiry
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password History
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={settings.security.passwordPolicy.preventReuse}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          passwordPolicy: {
                            ...settings.security.passwordPolicy,
                            preventReuse: parseInt(e.target.value) || 5
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!hasPermission('organizations.update')}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Number of previous passwords that cannot be reused
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requireUppercase"
                        checked={settings.security.passwordPolicy.requireUppercase}
                        onChange={(e) => setSettings({
                          ...settings,
                          security: {
                            ...settings.security,
                            passwordPolicy: {
                              ...settings.security.passwordPolicy,
                              requireUppercase: e.target.checked
                            }
                          }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={!hasPermission('organizations.update')}
                      />
                      <label htmlFor="requireUppercase" className="ml-2 block text-sm text-gray-700">
                        Require uppercase letters
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requireLowercase"
                        checked={settings.security.passwordPolicy.requireLowercase}
                        onChange={(e) => setSettings({
                          ...settings,
                          security: {
                            ...settings.security,
                            passwordPolicy: {
                              ...settings.security.passwordPolicy,
                              requireLowercase: e.target.checked
                            }
                          }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={!hasPermission('organizations.update')}
                      />
                      <label htmlFor="requireLowercase" className="ml-2 block text-sm text-gray-700">
                        Require lowercase letters
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requireNumbers"
                        checked={settings.security.passwordPolicy.requireNumbers}
                        onChange={(e) => setSettings({
                          ...settings,
                          security: {
                            ...settings.security,
                            passwordPolicy: {
                              ...settings.security.passwordPolicy,
                              requireNumbers: e.target.checked
                            }
                          }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={!hasPermission('organizations.update')}
                      />
                      <label htmlFor="requireNumbers" className="ml-2 block text-sm text-gray-700">
                        Require numbers
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requireSpecialChars"
                        checked={settings.security.passwordPolicy.requireSpecialChars}
                        onChange={(e) => setSettings({
                          ...settings,
                          security: {
                            ...settings.security,
                            passwordPolicy: {
                              ...settings.security.passwordPolicy,
                              requireSpecialChars: e.target.checked
                            }
                          }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={!hasPermission('organizations.update')}
                      />
                      <label htmlFor="requireSpecialChars" className="ml-2 block text-sm text-gray-700">
                        Require special characters
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-green-500" />
                  <span>Session Policy</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Session Duration (Hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={settings.security.sessionPolicy.maxDuration}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          sessionPolicy: {
                            ...settings.security.sessionPolicy,
                            maxDuration: parseInt(e.target.value) || 24
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!hasPermission('organizations.update')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Idle Timeout (Minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="240"
                      value={settings.security.sessionPolicy.idleTimeout}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          sessionPolicy: {
                            ...settings.security.sessionPolicy,
                            idleTimeout: parseInt(e.target.value) || 30
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!hasPermission('organizations.update')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Concurrent Sessions
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={settings.security.sessionPolicy.maxConcurrentSessions}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          sessionPolicy: {
                            ...settings.security.sessionPolicy,
                            maxConcurrentSessions: parseInt(e.target.value) || 3
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!hasPermission('organizations.update')}
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="requireReauth"
                      checked={settings.security.sessionPolicy.requireReauth}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          sessionPolicy: {
                            ...settings.security.sessionPolicy,
                            requireReauth: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={!hasPermission('organizations.update')}
                    />
                    <label htmlFor="requireReauth" className="ml-2 block text-sm text-gray-700">
                      Require re-authentication for sensitive operations
                    </label>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-red-500" />
                  <span>Two-Factor Authentication</span>
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="twoFactorRequired"
                      checked={settings.security.twoFactorAuth.required}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          twoFactorAuth: {
                            ...settings.security.twoFactorAuth,
                            required: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={!hasPermission('organizations.update')}
                    />
                    <label htmlFor="twoFactorRequired" className="ml-2 block text-sm text-gray-700">
                      Require two-factor authentication for all users
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Allowed Authentication Methods
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="methodApp"
                          checked={settings.security.twoFactorAuth.allowedMethods.includes('app')}
                          onChange={(e) => {
                            const methods = e.target.checked
                              ? [...settings.security.twoFactorAuth.allowedMethods, 'app']
                              : settings.security.twoFactorAuth.allowedMethods.filter(m => m !== 'app');
                            
                            setSettings({
                              ...settings,
                              security: {
                                ...settings.security,
                                twoFactorAuth: {
                                  ...settings.security.twoFactorAuth,
                                  allowedMethods: methods
                                }
                              }
                            });
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={!hasPermission('organizations.update')}
                        />
                        <label htmlFor="methodApp" className="ml-2 block text-sm text-gray-700">
                          Authenticator App (TOTP)
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="methodSms"
                          checked={settings.security.twoFactorAuth.allowedMethods.includes('sms')}
                          onChange={(e) => {
                            const methods = e.target.checked
                              ? [...settings.security.twoFactorAuth.allowedMethods, 'sms']
                              : settings.security.twoFactorAuth.allowedMethods.filter(m => m !== 'sms');
                            
                            setSettings({
                              ...settings,
                              security: {
                                ...settings.security,
                                twoFactorAuth: {
                                  ...settings.security.twoFactorAuth,
                                  allowedMethods: methods
                                }
                              }
                            });
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={!hasPermission('organizations.update')}
                        />
                        <label htmlFor="methodSms" className="ml-2 block text-sm text-gray-700">
                          SMS
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="methodEmail"
                          checked={settings.security.twoFactorAuth.allowedMethods.includes('email')}
                          onChange={(e) => {
                            const methods = e.target.checked
                              ? [...settings.security.twoFactorAuth.allowedMethods, 'email']
                              : settings.security.twoFactorAuth.allowedMethods.filter(m => m !== 'email');
                            
                            setSettings({
                              ...settings,
                              security: {
                                ...settings.security,
                                twoFactorAuth: {
                                  ...settings.security.twoFactorAuth,
                                  allowedMethods: methods
                                }
                              }
                            });
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={!hasPermission('organizations.update')}
                        />
                        <label htmlFor="methodEmail" className="ml-2 block text-sm text-gray-700">
                          Email
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="backupCodes"
                      checked={settings.security.twoFactorAuth.backupCodes}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          twoFactorAuth: {
                            ...settings.security.twoFactorAuth,
                            backupCodes: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={!hasPermission('organizations.update')}
                    />
                    <label htmlFor="backupCodes" className="ml-2 block text-sm text-gray-700">
                      Allow backup codes for account recovery
                    </label>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Lock className="w-5 h-5 text-orange-500" />
                  <span>Access Control</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Role for New Users
                    </label>
                    <select
                      value={settings.security.accessControl.defaultRole}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          accessControl: {
                            ...settings.security.accessControl,
                            defaultRole: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!hasPermission('organizations.update')}
                    >
                      <option value="user">User</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoLockAccount"
                      checked={settings.security.accessControl.autoLockAccount}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          accessControl: {
                            ...settings.security.accessControl,
                            autoLockAccount: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={!hasPermission('organizations.update')}
                    />
                    <label htmlFor="autoLockAccount" className="ml-2 block text-sm text-gray-700">
                      Automatically lock accounts after failed login attempts
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Failed Login Attempts
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={settings.security.accessControl.maxFailedAttempts}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          accessControl: {
                            ...settings.security.accessControl,
                            maxFailedAttempts: parseInt(e.target.value) || 5
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!hasPermission('organizations.update') || !settings.security.accessControl.autoLockAccount}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Lockout Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={settings.security.accessControl.lockoutDuration}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          accessControl: {
                            ...settings.security.accessControl,
                            lockoutDuration: parseInt(e.target.value) || 30
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!hasPermission('organizations.update') || !settings.security.accessControl.autoLockAccount}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Mail className="w-5 h-5 text-blue-500" />
                  <span>Email Configuration</span>
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailEnabled"
                      checked={settings.notifications.email.enabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          email: {
                            ...settings.notifications.email,
                            enabled: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={!hasPermission('organizations.update')}
                    />
                    <label htmlFor="emailEnabled" className="ml-2 block text-sm text-gray-700">
                      Enable email notifications
                    </label>
                  </div>
                  
                  {settings.notifications.email.enabled && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">SMTP Settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SMTP Host
                          </label>
                          <input
                            type="text"
                            value={settings.notifications.email.smtp.host}
                            onChange={(e) => setSettings({
                              ...settings,
                              notifications: {
                                ...settings.notifications,
                                email: {
                                  ...settings.notifications.email,
                                  smtp: {
                                    ...settings.notifications.email.smtp,
                                    host: e.target.value
                                  }
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="smtp.example.com"
                            disabled={!hasPermission('organizations.update')}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Port
                          </label>
                          <input
                            type="number"
                            value={settings.notifications.email.smtp.port}
                            onChange={(e) => setSettings({
                              ...settings,
                              notifications: {
                                ...settings.notifications,
                                email: {
                                  ...settings.notifications.email,
                                  smtp: {
                                    ...settings.notifications.email.smtp,
                                    port: parseInt(e.target.value) || 587
                                  }
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={!hasPermission('organizations.update')}
                          />
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="smtpSecure"
                            checked={settings.notifications.email.smtp.secure}
                            onChange={(e) => setSettings({
                              ...settings,
                              notifications: {
                                ...settings.notifications,
                                email: {
                                  ...settings.notifications.email,
                                  smtp: {
                                    ...settings.notifications.email.smtp,
                                    secure: e.target.checked
                                  }
                                }
                              }
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            disabled={!hasPermission('organizations.update')}
                          />
                          <label htmlFor="smtpSecure" className="ml-2 block text-sm text-gray-700">
                            Use SSL/TLS
                          </label>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Username
                          </label>
                          <input
                            type="text"
                            value={settings.notifications.email.smtp.username}
                            onChange={(e) => setSettings({
                              ...settings,
                              notifications: {
                                ...settings.notifications,
                                email: {
                                  ...settings.notifications.email,
                                  smtp: {
                                    ...settings.notifications.email.smtp,
                                    username: e.target.value
                                  }
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="username@example.com"
                            disabled={!hasPermission('organizations.update')}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                          </label>
                          <input
                            type="password"
                            value={settings.notifications.email.smtp.password}
                            onChange={(e) => setSettings({
                              ...settings,
                              notifications: {
                                ...settings.notifications,
                                email: {
                                  ...settings.notifications.email,
                                  smtp: {
                                    ...settings.notifications.email.smtp,
                                    password: e.target.value
                                  }
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="••••••••"
                            disabled={!hasPermission('organizations.update')}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-orange-500" />
                  <span>Alert Settings</span>
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="securityIncidents"
                      checked={settings.notifications.alerts.securityIncidents}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          alerts: {
                            ...settings.notifications.alerts,
                            securityIncidents: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={!hasPermission('organizations.update')}
                    />
                    <label htmlFor="securityIncidents" className="ml-2 block text-sm text-gray-700">
                      Security Incidents
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="systemMaintenance"
                      checked={settings.notifications.alerts.systemMaintenance}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          alerts: {
                            ...settings.notifications.alerts,
                            systemMaintenance: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={!hasPermission('organizations.update')}
                    />
                    <label htmlFor="systemMaintenance" className="ml-2 block text-sm text-gray-700">
                      System Maintenance
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="userActivity"
                      checked={settings.notifications.alerts.userActivity}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          alerts: {
                            ...settings.notifications.alerts,
                            userActivity: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={!hasPermission('organizations.update')}
                    />
                    <label htmlFor="userActivity" className="ml-2 block text-sm text-gray-700">
                      User Activity
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="riskAssessments"
                      checked={settings.notifications.alerts.riskAssessments}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          alerts: {
                            ...settings.notifications.alerts,
                            riskAssessments: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={!hasPermission('organizations.update')}
                    />
                    <label htmlFor="riskAssessments" className="ml-2 block text-sm text-gray-700">
                      Risk Assessments
                    </label>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span>Alert Thresholds</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      High Risk Score Threshold
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.notifications.thresholds.highRiskScore}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          thresholds: {
                            ...settings.notifications.thresholds,
                            highRiskScore: parseInt(e.target.value) || 70
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!hasPermission('organizations.update')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Critical Risk Score Threshold
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.notifications.thresholds.criticalRiskScore}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          thresholds: {
                            ...settings.notifications.thresholds,
                            criticalRiskScore: parseInt(e.target.value) || 90
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!hasPermission('organizations.update')}
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="unusualActivity"
                      checked={settings.notifications.thresholds.unusualActivity}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          thresholds: {
                            ...settings.notifications.thresholds,
                            unusualActivity: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={!hasPermission('organizations.update')}
                    />
                    <label htmlFor="unusualActivity" className="ml-2 block text-sm text-gray-700">
                      Alert on unusual activity
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="geopoliticalEvents"
                      checked={settings.notifications.thresholds.geopoliticalEvents}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          thresholds: {
                            ...settings.notifications.thresholds,
                            geopoliticalEvents: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={!hasPermission('organizations.update')}
                    />
                    <label htmlFor="geopoliticalEvents" className="ml-2 block text-sm text-gray-700">
                      Alert on geopolitical events
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="travelRisks"
                      checked={settings.notifications.thresholds.travelRisks}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          thresholds: {
                            ...settings.notifications.thresholds,
                            travelRisks: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={!hasPermission('organizations.update')}
                    />
                    <label htmlFor="travelRisks" className="ml-2 block text-sm text-gray-700">
                      Alert on travel risks
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Integrations Settings */}
          {activeTab === 'integrations' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  <span>Google Maps Integration</span>
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="googleMapsEnabled"
                      checked={settings.integrations.googleMaps.enabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        integrations: {
                          ...settings.integrations,
                          googleMaps: {
                            ...settings.integrations.googleMaps,
                            enabled: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={!hasPermission('organizations.update')}
                    />
                    <label htmlFor="googleMapsEnabled" className="ml-2 block text-sm text-gray-700">
                      Enable Google Maps integration
                    </label>
                  </div>
                  
                  {settings.integrations.googleMaps.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Google Maps API Key
                      </label>
                      <input
                        type="text"
                        value={settings.integrations.googleMaps.apiKey}
                        onChange={(e) => setSettings({
                          ...settings,
                          integrations: {
                            ...settings.integrations,
                            googleMaps: {
                              ...settings.integrations.googleMaps,
                              apiKey: e.target.value
                            }
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your Google Maps API key"
                        disabled={!hasPermission('organizations.update')}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Get your API key from the <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Google Cloud Console</a>
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-green-500" />
                  <span>External Systems Integration</span>
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="externalSystemsEnabled"
                      checked={settings.integrations.externalSystems.enabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        integrations: {
                          ...settings.integrations,
                          externalSystems: {
                            ...settings.integrations.externalSystems,
                            enabled: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={!hasPermission('organizations.update')}
                    />
                    <label htmlFor="externalSystemsEnabled" className="ml-2 block text-sm text-gray-700">
                      Enable external systems integration
                    </label>
                  </div>
                  
                  {settings.integrations.externalSystems.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Endpoints
                      </label>
                      <div className="space-y-2">
                        {settings.integrations.externalSystems.endpoints.map((endpoint, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={endpoint}
                              onChange={(e) => {
                                const updatedEndpoints = [...settings.integrations.externalSystems.endpoints];
                                updatedEndpoints[index] = e.target.value;
                                
                                setSettings({
                                  ...settings,
                                  integrations: {
                                    ...settings.integrations,
                                    externalSystems: {
                                      ...settings.integrations.externalSystems,
                                      endpoints: updatedEndpoints
                                    }
                                  }
                                });
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="https://api.example.com/webhook"
                              disabled={!hasPermission('organizations.update')}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updatedEndpoints = settings.integrations.externalSystems.endpoints.filter((_, i) => i !== index);
                                
                                setSettings({
                                  ...settings,
                                  integrations: {
                                    ...settings.integrations,
                                    externalSystems: {
                                      ...settings.integrations.externalSystems,
                                      endpoints: updatedEndpoints
                                    }
                                  }
                                });
                              }}
                              className="p-2 text-red-500 hover:text-red-700 transition-colors"
                              disabled={!hasPermission('organizations.update')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setSettings({
                              ...settings,
                              integrations: {
                                ...settings.integrations,
                                externalSystems: {
                                  ...settings.integrations.externalSystems,
                                  endpoints: [...settings.integrations.externalSystems.endpoints, '']
                                }
                              }
                            });
                          }}
                          className="flex items-center space-x-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                          disabled={!hasPermission('organizations.update')}
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Endpoint</span>
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
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Departments</h2>
                {hasPermission('organizations.update') && (
                  <button
                    onClick={() => setShowNewDepartmentForm(true)}
                    className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Department</span>
                  </button>
                )}
              </div>
              
              {showNewDepartmentForm && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-medium text-blue-800 mb-3">New Department</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department Name *
                      </label>
                      <input
                        type="text"
                        value={newDepartment.name}
                        onChange={(e) => setNewDepartment({...newDepartment, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter department name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Head Count
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newDepartment.headCount}
                        onChange={(e) => setNewDepartment({...newDepartment, headCount: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        value={newDepartment.description}
                        onChange={(e) => setNewDepartment({...newDepartment, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Brief description of the department"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Security Level
                      </label>
                      <select
                        value={newDepartment.securityLevel}
                        onChange={(e) => setNewDepartment({...newDepartment, securityLevel: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="low">Low</option>
                        <option value="standard">Standard</option>
                        <option value="high">High</option>
                        <option value="restricted">Restricted</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowNewDepartmentForm(false)}
                      className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddDepartment}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Department
                    </button>
                  </div>
                </div>
              )}
              
              {settings.departments.list.length === 0 ? (
                <div className="bg-gray-50 p-8 rounded-lg border border-gray-200 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Departments</h3>
                  <p className="text-gray-500 mb-4">
                    Add departments to organize your personnel and assets
                  </p>
                  {hasPermission('organizations.update') && (
                    <button
                      onClick={() => setShowNewDepartmentForm(true)}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Department</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Head Count
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Security Level
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {settings.departments.list.map((department, index) => (
                        <tr key={department.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingDepartment === index ? (
                              <input
                                type="text"
                                value={department.name}
                                onChange={(e) => updateDepartmentField(index, 'name', e.target.value)}
                                className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            ) : (
                              <div className="text-sm font-medium text-gray-900">{department.name}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingDepartment === index ? (
                              <input
                                type="text"
                                value={department.description}
                                onChange={(e) => updateDepartmentField(index, 'description', e.target.value)}
                                className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            ) : (
                              <div className="text-sm text-gray-500">{department.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingDepartment === index ? (
                              <input
                                type="number"
                                min="0"
                                value={department.headCount}
                                onChange={(e) => updateDepartmentField(index, 'headCount', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            ) : (
                              <div className="text-sm text-gray-900">{department.headCount}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingDepartment === index ? (
                              <select
                                value={department.securityLevel}
                                onChange={(e) => updateDepartmentField(index, 'securityLevel', e.target.value)}
                                className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="low">Low</option>
                                <option value="standard">Standard</option>
                                <option value="high">High</option>
                                <option value="restricted">Restricted</option>
                              </select>
                            ) : (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                department.securityLevel === 'low' ? 'bg-green-100 text-green-700' :
                                department.securityLevel === 'standard' ? 'bg-blue-100 text-blue-700' :
                                department.securityLevel === 'high' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {department.securityLevel.charAt(0).toUpperCase() + department.securityLevel.slice(1)}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {hasPermission('organizations.update') && (
                              <div className="flex items-center justify-end space-x-2">
                                {editingDepartment === index ? (
                                  <>
                                    <button
                                      onClick={() => handleUpdateDepartment(index)}
                                      className="text-green-600 hover:text-green-900"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingDepartment(null)}
                                      className="text-gray-600 hover:text-gray-900"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setEditingDepartment(index)}
                                      className="text-blue-600 hover:text-blue-900"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDepartment(index)}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* AI Settings */}
          {activeTab === 'ai' && (
            <AIUsageMonitoring />
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettings;