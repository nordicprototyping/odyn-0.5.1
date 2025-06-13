import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Shield,
  Users,
  Globe,
  Mail,
  Phone,
  MapPin,
  Save,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Key,
  Lock,
  Bell,
  Clock,
  Database,
  Server,
  Wifi,
  Monitor,
  Loader2,
  Brain,
  Zap,
  BarChart,
  Sliders,
  MessageSquare,
  AlertTriangle,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface OrganizationConfig {
  general: {
    name: string;
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
  ai: {
    enabled: boolean;
    model: string;
    tokensUsed: number;
    tokenLimit: number;
    settings: {
      temperature: number;
      contextWindow: number;
      responseLength: string;
    };
    notifications: {
      approachingLimit: boolean;
      limitThreshold: number;
      weeklyUsageReport: boolean;
    };
  };
}

const OrganizationSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [newDepartment, setNewDepartment] = useState({
    id: '',
    name: '',
    description: '',
    headCount: 0,
    securityLevel: 'standard'
  });

  const { organization, hasPermission } = useAuth();

  const [config, setConfig] = useState<OrganizationConfig>({
    general: {
      name: 'SecureIntel Corporation',
      description: 'Global security intelligence and risk management platform',
      website: 'https://secureintel.com',
      industry: 'Security & Intelligence',
      size: '500-1000',
      headquarters: {
        address: '123 Security Plaza',
        city: 'Washington',
        country: 'United States',
        timezone: 'America/New_York'
      },
      contact: {
        email: 'contact@secureintel.com',
        phone: '+1-202-555-0123',
        emergencyPhone: '+1-202-555-0911'
      }
    },
    security: {
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAge: 90,
        preventReuse: 5
      },
      sessionPolicy: {
        maxDuration: 480, // 8 hours
        idleTimeout: 30,
        maxConcurrentSessions: 3,
        requireReauth: true
      },
      twoFactorAuth: {
        required: true,
        allowedMethods: ['totp', 'sms', 'email'],
        backupCodes: true
      },
      accessControl: {
        defaultRole: 'user',
        autoLockAccount: true,
        maxFailedAttempts: 5,
        lockoutDuration: 30
      }
    },
    notifications: {
      email: {
        enabled: true,
        smtp: {
          host: 'smtp.secureintel.com',
          port: 587,
          secure: true,
          username: 'noreply@secureintel.com',
          password: '••••••••••••'
        }
      },
      alerts: {
        securityIncidents: true,
        systemMaintenance: true,
        userActivity: false,
        riskAssessments: true
      },
      thresholds: {
        highRiskScore: 70,
        criticalRiskScore: 85,
        unusualActivity: true,
        geopoliticalEvents: true,
        travelRisks: true
      }
    },
    integrations: {
      googleMaps: {
        enabled: true,
        apiKey: 'AIzaSyB_wJ5jSA50__7XC2JpbAFEWZJJzdWWj1M'
      },
      externalSystems: {
        enabled: false,
        endpoints: []
      }
    },
    departments: {
      list: [
        {
          id: 'sec-ops',
          name: 'Security Operations',
          description: 'Manages day-to-day security operations and incident response',
          headCount: 45,
          securityLevel: 'high'
        },
        {
          id: 'field-ops',
          name: 'Field Operations',
          description: 'Handles on-site security assessments and deployments',
          headCount: 78,
          securityLevel: 'high'
        },
        {
          id: 'risk-analysis',
          name: 'Risk Analysis',
          description: 'Conducts threat assessments and risk modeling',
          headCount: 32,
          securityLevel: 'medium'
        },
        {
          id: 'it-security',
          name: 'IT Security',
          description: 'Manages cybersecurity and digital infrastructure protection',
          headCount: 56,
          securityLevel: 'high'
        },
        {
          id: 'hr',
          name: 'Human Resources',
          description: 'Manages personnel and organizational development',
          headCount: 18,
          securityLevel: 'medium'
        }
      ]
    },
    ai: {
      enabled: true,
      model: 'OdynSentinel-Pro',
      tokensUsed: 1458732,
      tokenLimit: 5000000,
      settings: {
        temperature: 0.7,
        contextWindow: 16000,
        responseLength: 'balanced'
      },
      notifications: {
        approachingLimit: true,
        limitThreshold: 80,
        weeklyUsageReport: true
      }
    }
  });

  useEffect(() => {
    if (organization) {
      loadOrganizationSettings();
    } else {
      setLoading(false);
    }
  }, [organization]);

  const loadOrganizationSettings = async () => {
    if (!organization) return;
    
    try {
      setLoading(true);
      
      // If settings exist in the organization record, use them
      if (organization.settings && Object.keys(organization.settings).length > 0) {
        // Merge default settings with stored settings to ensure all fields exist
        setConfig(prevConfig => ({
          ...prevConfig,
          ...organization.settings,
          general: {
            ...prevConfig.general,
            name: organization.name,
            ...(organization.settings.general || {})
          }
        }));
      } else {
        // Just update the organization name
        setConfig(prevConfig => ({
          ...prevConfig,
          general: {
            ...prevConfig.general,
            name: organization.name
          }
        }));
      }
    } catch (err) {
      console.error('Error loading organization settings:', err);
      setError('Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organization) {
      setError('No organization found');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Update organization name and settings
      const { error } = await supabase
        .from('organizations')
        .update({
          name: config.general.name,
          settings: {
            general: { ...config.general, name: undefined }, // Don't duplicate name in settings
            security: config.security,
            notifications: config.notifications,
            integrations: config.integrations,
            departments: config.departments,
            ai: config.ai
          }
        })
        .eq('id', organization.id);

      if (error) {
        throw error;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving organization settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (section: keyof OrganizationConfig, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const updateNestedConfig = (section: keyof OrganizationConfig, subsection: string, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }));
  };

  const handleAddDepartment = () => {
    if (!newDepartment.name) return;
    
    const departmentId = newDepartment.id || newDepartment.name.toLowerCase().replace(/\s+/g, '-');
    
    const newDepartmentWithId = {
      ...newDepartment,
      id: departmentId
    };
    
    setConfig(prev => ({
      ...prev,
      departments: {
        list: [...prev.departments.list, newDepartmentWithId]
      }
    }));
    
    setNewDepartment({
      id: '',
      name: '',
      description: '',
      headCount: 0,
      securityLevel: 'standard'
    });
    
    setShowAddDepartment(false);
  };

  const handleRemoveDepartment = (id: string) => {
    setConfig(prev => ({
      ...prev,
      departments: {
        list: prev.departments.list.filter(dept => dept.id !== id)
      }
    }));
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Building },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'departments', label: 'Departments', icon: Users },
    { id: 'integrations', label: 'Integrations', icon: Wifi },
    { id: 'ai', label: 'AI Settings', icon: Brain }
  ];

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

  // Calculate token usage percentage
  const tokenUsagePercentage = Math.min(100, Math.round((config.ai.tokensUsed / config.ai.tokenLimit) * 100));
  const tokenUsageColor = tokenUsagePercentage > 90 ? 'bg-red-500' : 
                          tokenUsagePercentage > 70 ? 'bg-yellow-500' : 
                          'bg-green-500';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Organization Settings</h1>
          <p className="text-gray-600">Configure your organization's security and operational settings</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Organization Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={config.general.name}
                        onChange={(e) => updateNestedConfig('general', 'name', '', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        value={config.general.website}
                        onChange={(e) => updateNestedConfig('general', 'website', '', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={config.general.description}
                        onChange={(e) => updateNestedConfig('general', 'description', '', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Industry
                      </label>
                      <select
                        value={config.general.industry}
                        onChange={(e) => updateNestedConfig('general', 'industry', '', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Security & Intelligence">Security & Intelligence</option>
                        <option value="Government">Government</option>
                        <option value="Defense">Defense</option>
                        <option value="Corporate Security">Corporate Security</option>
                        <option value="Consulting">Consulting</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organization Size
                      </label>
                      <select
                        value={config.general.size}
                        onChange={(e) => updateNestedConfig('general', 'size', '', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="1-50">1-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-500">201-500 employees</option>
                        <option value="500-1000">500-1000 employees</option>
                        <option value="1000+">1000+ employees</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Headquarters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        value={config.general.headquarters.address}
                        onChange={(e) => updateNestedConfig('general', 'headquarters', 'address', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={config.general.headquarters.city}
                        onChange={(e) => updateNestedConfig('general', 'headquarters', 'city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={config.general.headquarters.country}
                        onChange={(e) => updateNestedConfig('general', 'headquarters', 'country', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
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
                        value={config.general.contact.email}
                        onChange={(e) => updateNestedConfig('general', 'contact', 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Phone
                      </label>
                      <input
                        type="tel"
                        value={config.general.contact.phone}
                        onChange={(e) => updateNestedConfig('general', 'contact', 'phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emergency Phone
                      </label>
                      <input
                        type="tel"
                        value={config.general.contact.emergencyPhone}
                        onChange={(e) => updateNestedConfig('general', 'contact', 'emergencyPhone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Policies</h2>
                  
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Password Policy</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Minimum Length
                          </label>
                          <input
                            type="number"
                            min="8"
                            max="32"
                            value={config.security.passwordPolicy.minLength}
                            onChange={(e) => updateNestedConfig('security', 'passwordPolicy', 'minLength', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password Age (days)
                          </label>
                          <input
                            type="number"
                            min="30"
                            max="365"
                            value={config.security.passwordPolicy.maxAge}
                            onChange={(e) => updateNestedConfig('security', 'passwordPolicy', 'maxAge', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Requirements
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={config.security.passwordPolicy.requireUppercase}
                                onChange={(e) => updateNestedConfig('security', 'passwordPolicy', 'requireUppercase', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Require uppercase letters</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={config.security.passwordPolicy.requireLowercase}
                                onChange={(e) => updateNestedConfig('security', 'passwordPolicy', 'requireLowercase', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Require lowercase letters</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={config.security.passwordPolicy.requireNumbers}
                                onChange={(e) => updateNestedConfig('security', 'passwordPolicy', 'requireNumbers', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Require numbers</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={config.security.passwordPolicy.requireSpecialChars}
                                onChange={(e) => updateNestedConfig('security', 'passwordPolicy', 'requireSpecialChars', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Require special characters</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
                      <div className="space-y-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.security.twoFactorAuth.required}
                            onChange={(e) => updateNestedConfig('security', 'twoFactorAuth', 'required', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">Require 2FA for all users</span>
                        </label>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Allowed Methods
                          </label>
                          <div className="space-y-2">
                            {['totp', 'sms', 'email'].map((method) => (
                              <label key={method} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={config.security.twoFactorAuth.allowedMethods.includes(method)}
                                  onChange={(e) => {
                                    const methods = e.target.checked
                                      ? [...config.security.twoFactorAuth.allowedMethods, method]
                                      : config.security.twoFactorAuth.allowedMethods.filter(m => m !== method);
                                    updateNestedConfig('security', 'twoFactorAuth', 'allowedMethods', methods);
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700 capitalize">
                                  {method === 'totp' ? 'Authenticator App (TOTP)' : method.toUpperCase()}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Lockout</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Failed Attempts
                          </label>
                          <input
                            type="number"
                            min="3"
                            max="10"
                            value={config.security.accessControl.maxFailedAttempts}
                            onChange={(e) => updateNestedConfig('security', 'accessControl', 'maxFailedAttempts', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Lockout Duration (minutes)
                          </label>
                          <input
                            type="number"
                            min="5"
                            max="1440"
                            value={config.security.accessControl.lockoutDuration}
                            onChange={(e) => updateNestedConfig('security', 'accessControl', 'lockoutDuration', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Settings</h2>
                  
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Configuration</h3>
                      <div className="space-y-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.notifications.email.enabled}
                            onChange={(e) => updateNestedConfig('notifications', 'email', 'enabled', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">Enable email notifications</span>
                        </label>
                        
                        {config.notifications.email.enabled && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                SMTP Host
                              </label>
                              <input
                                type="text"
                                value={config.notifications.email.smtp.host}
                                onChange={(e) => updateNestedConfig('notifications', 'email', 'smtp', { ...config.notifications.email.smtp, host: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                SMTP Port
                              </label>
                              <input
                                type="number"
                                value={config.notifications.email.smtp.port}
                                onChange={(e) => updateNestedConfig('notifications', 'email', 'smtp', { ...config.notifications.email.smtp, port: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Username
                              </label>
                              <input
                                type="text"
                                value={config.notifications.email.smtp.username}
                                onChange={(e) => updateNestedConfig('notifications', 'email', 'smtp', { ...config.notifications.email.smtp, username: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                              </label>
                              <div className="relative">
                                <input
                                  type={showPasswords ? 'text' : 'password'}
                                  value={config.notifications.email.smtp.password}
                                  onChange={(e) => updateNestedConfig('notifications', 'email', 'smtp', { ...config.notifications.email.smtp, password: e.target.value })}
                                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPasswords(!showPasswords)}
                                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                  {showPasswords ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Preferences</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.notifications.alerts.securityIncidents}
                            onChange={(e) => updateNestedConfig('notifications', 'alerts', 'securityIncidents', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Security incidents</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.notifications.alerts.systemMaintenance}
                            onChange={(e) => updateNestedConfig('notifications', 'alerts', 'systemMaintenance', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">System maintenance</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.notifications.alerts.userActivity}
                            onChange={(e) => updateNestedConfig('notifications', 'alerts', 'userActivity', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">User activity</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.notifications.alerts.riskAssessments}
                            onChange={(e) => updateNestedConfig('notifications', 'alerts', 'riskAssessments', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Risk assessments</span>
                        </label>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Thresholds</h3>
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              High Risk Score Threshold (0-100)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={config.notifications.thresholds.highRiskScore}
                              onChange={(e) => updateNestedConfig('notifications', 'thresholds', 'highRiskScore', parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Alerts will be triggered when risk scores exceed this value
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Critical Risk Score Threshold (0-100)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={config.notifications.thresholds.criticalRiskScore}
                              onChange={(e) => updateNestedConfig('notifications', 'thresholds', 'criticalRiskScore', parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Emergency alerts will be triggered when risk scores exceed this value
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={config.notifications.thresholds.unusualActivity}
                              onChange={(e) => updateNestedConfig('notifications', 'thresholds', 'unusualActivity', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Alert on unusual activity patterns</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={config.notifications.thresholds.geopoliticalEvents}
                              onChange={(e) => updateNestedConfig('notifications', 'thresholds', 'geopoliticalEvents', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Alert on relevant geopolitical events</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={config.notifications.thresholds.travelRisks}
                              onChange={(e) => updateNestedConfig('notifications', 'thresholds', 'travelRisks', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Alert on travel risk changes</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Departments Settings */}
            {activeTab === 'departments' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Departments</h2>
                    <button
                      onClick={() => setShowAddDepartment(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Department
                    </button>
                  </div>
                  
                  {config.departments.list.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Departments Configured</h3>
                      <p className="text-gray-600 mb-4">Add departments to organize your personnel and manage access controls</p>
                      <button
                        onClick={() => setShowAddDepartment(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add First Department
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {config.departments.list.map((dept) => (
                        <div key={dept.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">{dept.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">{dept.description}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <div className="flex items-center space-x-1">
                                  <Users className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">{dept.headCount} personnel</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Shield className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-600 capitalize">{dept.securityLevel} security</span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveDepartment(dept.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {showAddDepartment && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200">
                          <h2 className="text-xl font-bold text-gray-900">Add Department</h2>
                        </div>
                        
                        <div className="p-6 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Department Name *
                            </label>
                            <input
                              type="text"
                              value={newDepartment.name}
                              onChange={(e) => setNewDepartment({...newDepartment, name: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="e.g., Security Operations"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Description
                            </label>
                            <textarea
                              rows={3}
                              value={newDepartment.description}
                              onChange={(e) => setNewDepartment({...newDepartment, description: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Describe the department's function"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Security Level
                            </label>
                            <select
                              value={newDepartment.securityLevel}
                              onChange={(e) => setNewDepartment({...newDepartment, securityLevel: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="low">Low</option>
                              <option value="standard">Standard</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                            </select>
                          </div>
                          
                          <div className="flex justify-end space-x-4 pt-4">
                            <button
                              type="button"
                              onClick={() => setShowAddDepartment(false)}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleAddDepartment}
                              disabled={!newDepartment.name}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Add Department
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Integrations Settings */}
            {activeTab === 'integrations' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">External Integrations</h2>
                  
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Google Maps</h3>
                      <div className="space-y-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.integrations.googleMaps.enabled}
                            onChange={(e) => updateNestedConfig('integrations', 'googleMaps', 'enabled', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">Enable Google Maps integration</span>
                        </label>
                        
                        {config.integrations.googleMaps.enabled && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              API Key
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords ? 'text' : 'password'}
                                value={config.integrations.googleMaps.apiKey}
                                onChange={(e) => updateNestedConfig('integrations', 'googleMaps', 'apiKey', e.target.value)}
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter your Google Maps API key"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords(!showPasswords)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              >
                                {showPasswords ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                              </button>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              Used for displaying maps in asset and personnel dashboards
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">External Systems</h3>
                      <div className="space-y-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.integrations.externalSystems.enabled}
                            onChange={(e) => updateNestedConfig('integrations', 'externalSystems', 'enabled', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">Enable external system integrations</span>
                        </label>
                        
                        <p className="text-sm text-gray-600">
                          Configure connections to external security systems, threat intelligence feeds, and other data sources.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Settings */}
            {activeTab === 'ai' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <h2 className="text-xl font-semibold text-gray-900">OdynSentinel AI Settings</h2>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.ai.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {config.ai.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={config.ai.enabled}
                        onChange={(e) => updateConfig('ai', 'enabled', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Token Usage */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Token Usage</h3>
                        <div className="flex items-center space-x-2">
                          <Brain className="w-5 h-5 text-purple-500" />
                          <span className="text-sm text-purple-600 font-medium">{config.ai.model}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Current Usage</span>
                            <div className="flex items-center space-x-1">
                              <span className="text-sm font-bold text-gray-900">{config.ai.tokensUsed.toLocaleString()}</span>
                              <span className="text-xs text-gray-500">/ {config.ai.tokenLimit.toLocaleString()} tokens</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${tokenUsageColor}`} 
                              style={{ width: `${tokenUsagePercentage}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between mt-1 text-xs text-gray-500">
                            <span>{tokenUsagePercentage}% used</span>
                            <span>{Math.max(0, config.ai.tokenLimit - config.ai.tokensUsed).toLocaleString()} tokens remaining</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Token Limit
                            </label>
                            <input
                              type="number"
                              min="1000000"
                              step="1000000"
                              value={config.ai.tokenLimit}
                              onChange={(e) => updateConfig('ai', 'tokenLimit', parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Monthly token allocation for your organization
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              AI Model
                            </label>
                            <select
                              value={config.ai.model}
                              onChange={(e) => updateConfig('ai', 'model', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="OdynSentinel-Standard">OdynSentinel Standard</option>
                              <option value="OdynSentinel-Pro">OdynSentinel Pro</option>
                              <option value="OdynSentinel-Enterprise">OdynSentinel Enterprise</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                              Higher tier models provide more advanced analysis capabilities
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                            onClick={() => updateConfig('ai', 'tokensUsed', 0)}
                          >
                            Reset Token Counter
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Model Configuration */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Configuration</h3>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Temperature (0.1-1.0)
                          </label>
                          <div className="flex items-center space-x-4">
                            <input
                              type="range"
                              min="0.1"
                              max="1"
                              step="0.1"
                              value={config.ai.settings.temperature}
                              onChange={(e) => updateNestedConfig('ai', 'settings', 'temperature', parseFloat(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-sm font-medium text-gray-900 w-10">
                              {config.ai.settings.temperature.toFixed(1)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Lower values produce more consistent, deterministic outputs. Higher values produce more creative, varied outputs.
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Context Window
                          </label>
                          <select
                            value={config.ai.settings.contextWindow}
                            onChange={(e) => updateNestedConfig('ai', 'settings', 'contextWindow', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="8000">8K tokens</option>
                            <option value="16000">16K tokens</option>
                            <option value="32000">32K tokens</option>
                            <option value="64000">64K tokens</option>
                          </select>
                          <p className="mt-1 text-xs text-gray-500">
                            Larger context windows allow the AI to consider more information but use more tokens per request
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Response Length
                          </label>
                          <select
                            value={config.ai.settings.responseLength}
                            onChange={(e) => updateNestedConfig('ai', 'settings', 'responseLength', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="concise">Concise</option>
                            <option value="balanced">Balanced</option>
                            <option value="detailed">Detailed</option>
                          </select>
                          <p className="mt-1 text-xs text-gray-500">
                            Controls the verbosity of AI responses across the platform
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Usage Notifications */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Notifications</h3>
                      <div className="space-y-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.ai.notifications.approachingLimit}
                            onChange={(e) => updateNestedConfig('ai', 'notifications', 'approachingLimit', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">
                            Notify when approaching token limit
                          </span>
                        </label>
                        
                        {config.ai.notifications.approachingLimit && (
                          <div className="ml-7">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Threshold Percentage
                            </label>
                            <div className="flex items-center space-x-4">
                              <input
                                type="range"
                                min="50"
                                max="95"
                                step="5"
                                value={config.ai.notifications.limitThreshold}
                                onChange={(e) => updateNestedConfig('ai', 'notifications', 'limitThreshold', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                              />
                              <span className="text-sm font-medium text-gray-900 w-10">
                                {config.ai.notifications.limitThreshold}%
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.ai.notifications.weeklyUsageReport}
                            onChange={(e) => updateNestedConfig('ai', 'notifications', 'weeklyUsageReport', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">
                            Send weekly usage reports
                          </span>
                        </label>
                      </div>
                    </div>
                    
                    {/* Usage Statistics */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <BarChart className="w-5 h-5 text-purple-500" />
                        <span>Usage Statistics</span>
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="text-sm text-gray-500 mb-1">Today</div>
                            <div className="text-xl font-bold text-gray-900">
                              {Math.round(config.ai.tokensUsed * 0.05).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">tokens</div>
                          </div>
                          
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="text-sm text-gray-500 mb-1">This Week</div>
                            <div className="text-xl font-bold text-gray-900">
                              {Math.round(config.ai.tokensUsed * 0.35).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">tokens</div>
                          </div>
                          
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="text-sm text-gray-500 mb-1">This Month</div>
                            <div className="text-xl font-bold text-gray-900">
                              {config.ai.tokensUsed.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">tokens</div>
                          </div>
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Usage by Feature</h4>
                          <div className="space-y-3">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600">Risk Assessment</span>
                                <span className="text-xs font-medium text-gray-900">
                                  {Math.round(config.ai.tokensUsed * 0.35).toLocaleString()} tokens
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '35%' }}></div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600">Threat Intelligence</span>
                                <span className="text-xs font-medium text-gray-900">
                                  {Math.round(config.ai.tokensUsed * 0.25).toLocaleString()} tokens
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '25%' }}></div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600">Travel Security</span>
                                <span className="text-xs font-medium text-gray-900">
                                  {Math.round(config.ai.tokensUsed * 0.20).toLocaleString()} tokens
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '20%' }}></div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600">Personnel Monitoring</span>
                                <span className="text-xs font-medium text-gray-900">
                                  {Math.round(config.ai.tokensUsed * 0.15).toLocaleString()} tokens
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: '15%' }}></div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600">Other</span>
                                <span className="text-xs font-medium text-gray-900">
                                  {Math.round(config.ai.tokensUsed * 0.05).toLocaleString()} tokens
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div className="bg-gray-500 h-1.5 rounded-full" style={{ width: '5%' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <button
                            type="button"
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Detailed Usage Reports
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {saved && (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-green-600">Settings saved successfully</span>
                  </>
                )}
                {error && (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-red-600">{error}</span>
                  </>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !hasPermission('organizations.update')}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettings;