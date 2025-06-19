import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Zap, 
  AlertTriangle, 
  Clock, 
  User, 
  BarChart, 
  Settings, 
  Loader2, 
  AlertCircle,
  Download,
  RefreshCw,
  Send,
  Clipboard,
  Calendar,
  Lightbulb
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { aiService, TokenUsage } from '../../services/aiService';

interface AIUsageLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  operation_type: string;
  tokens_used: number;
  timestamp: string;
  user_email?: string;
}

interface AISettings {
  enabled: boolean;
  model: string;
  tokenLimit: number;
  riskDetection: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'manual';
    threshold: number;
    autoApprove: boolean;
    notifyOnDetection: boolean;
  };
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
}

// Default AI settings structure to ensure all properties are defined
const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: true,
  model: 'gpt-4',
  tokenLimit: 1000000,
  riskDetection: {
    enabled: false,
    frequency: 'manual',
    threshold: 70,
    autoApprove: false,
    notifyOnDetection: true
  },
  settings: {
    temperature: 0.7,
    contextWindow: 8000,
    responseLength: 'medium'
  },
  notifications: {
    approachingLimit: true,
    limitThreshold: 80,
    weeklyUsageReport: true
  }
};

// Deep merge function to combine default settings with fetched settings
const deepMerge = (target: any, source: any): any => {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
};

const AIUsageMonitoring: React.FC = () => {
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [usageLogs, setUsageLogs] = useState<AIUsageLog[]>([]);
  const [aiSettings, setAISettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [showSettings, setShowSettings] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<AISettings>(DEFAULT_AI_SETTINGS);

  const { profile, organization, hasPermission } = useAuth();

  useEffect(() => {
    if (organization?.id) {
      fetchData(organization.id);
    }
  }, [organization, timeRange]);

  const fetchData = async (organizationId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch token usage
      const usage = await aiService.getTokenUsage(organizationId);
      setTokenUsage(usage);
      
      // Fetch usage logs
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const logs = await aiService.getTokenUsageHistory(organizationId, days);
      
      // Set usage logs without fetching user emails (removed admin API call)
      setUsageLogs(logs || []);
      
      // Fetch AI settings
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();
      
      if (orgError) throw orgError;
      
      // Deep merge fetched settings with default settings to ensure all properties exist
      const fetchedAISettings = orgData?.settings?.ai || {};
      const mergedSettings = deepMerge(DEFAULT_AI_SETTINGS, fetchedAISettings);
      
      setAISettings(mergedSettings);
      setSettingsForm(mergedSettings);
      
    } catch (err) {
      console.error('Error fetching AI usage data:', err);
      setError('Failed to load AI usage data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    if (!organization?.id) return;
    
    try {
      setUpdatingSettings(true);
      
      const { data: orgData, error: fetchError } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organization.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Deep merge the updated settings with existing settings
      const updatedSettings = {
        ...orgData.settings,
        ai: deepMerge(DEFAULT_AI_SETTINGS, settingsForm)
      };
      
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ settings: updatedSettings })
        .eq('id', organization.id);
      
      if (updateError) throw updateError;
      
      setAISettings(settingsForm);
      setShowSettings(false);
    } catch (err) {
      console.error('Error updating AI settings:', err);
      setError('Failed to update AI settings');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const getOperationTypeLabel = (type: string): string => {
    switch (type) {
      case 'asset': return 'Asset Risk Scoring';
      case 'personnel': return 'Personnel Risk Scoring';
      case 'travel': return 'Travel Risk Scoring';
      case 'incident': return 'Incident Risk Scoring';
      case 'risk': return 'Risk Evaluation';
      case 'organization': return 'Organization Risk Scoring';
      case 'mitigation': return 'Mitigation Evaluation';
      case 'detect_risks': return 'AI Risk Detection';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getUsageByDay = (): { date: string; tokens: number }[] => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const result: { date: string; tokens: number }[] = [];
    
    // Create a map of dates with zero tokens
    const dateMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, 0);
    }
    
    // Add token counts from logs
    usageLogs.forEach(log => {
      const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
      if (dateMap.has(dateStr)) {
        dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + log.tokens_used);
      }
    });
    
    // Convert map to array and sort by date
    dateMap.forEach((tokens, date) => {
      result.push({ date, tokens });
    });
    
    return result.sort((a, b) => a.date.localeCompare(b.date));
  };

  const getUsageByType = (): { type: string; tokens: number }[] => {
    const typeMap = new Map<string, number>();
    
    usageLogs.forEach(log => {
      const type = log.operation_type;
      typeMap.set(type, (typeMap.get(type) || 0) + log.tokens_used);
    });
    
    const result: { type: string; tokens: number }[] = [];
    typeMap.forEach((tokens, type) => {
      result.push({ type, tokens });
    });
    
    return result.sort((a, b) => b.tokens - a.tokens);
  };

  const getUsageByUser = (): { user: string; tokens: number }[] => {
    const userMap = new Map<string, number>();
    
    usageLogs.forEach(log => {
      const user = log.user_id || 'System';
      userMap.set(user, (userMap.get(user) || 0) + log.tokens_used);
    });
    
    const result: { user: string; tokens: number }[] = [];
    userMap.forEach((tokens, user) => {
      result.push({ user, tokens });
    });
    
    return result.sort((a, b) => b.tokens - a.tokens);
  };

  if (!hasPermission('organizations.read')) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to view AI usage monitoring.</p>
      </div>
    );
  }

  if (loading && !tokenUsage) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading AI usage data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Usage Monitoring</h1>
          <p className="text-gray-600">Track and manage your organization's AI token usage</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>AI Settings</span>
          </button>
          <button
            onClick={() => fetchData(organization?.id || '')}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {/* Token Usage Overview */}
      {tokenUsage && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Token Usage Overview</h2>
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-gray-500">AI-Powered Features</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-800">Total Tokens Used</span>
                <Zap className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{tokenUsage.total.toLocaleString()}</div>
              <div className="text-sm text-purple-600 mt-1">
                {aiSettings?.model || 'GPT-4'} model
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">Token Limit</span>
                <Brain className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{tokenUsage.limit.toLocaleString()}</div>
              <div className="text-sm text-blue-600 mt-1">
                {organization?.plan_type.charAt(0).toUpperCase() + organization?.plan_type.slice(1)} plan
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-800">Tokens Remaining</span>
                <Zap className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{tokenUsage.remaining.toLocaleString()}</div>
              <div className="text-sm text-green-600 mt-1">
                {Math.round(100 - tokenUsage.usagePercentage)}% of limit remaining
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-800">Usage Percentage</span>
                <BarChart className="w-5 h-5 text-gray-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{Math.round(tokenUsage.usagePercentage)}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div 
                  className={`h-2.5 rounded-full ${
                    tokenUsage.usagePercentage > 90 ? 'bg-red-500' :
                    tokenUsage.usagePercentage > 70 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, tokenUsage.usagePercentage)}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          {tokenUsage.usagePercentage > 80 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Approaching Token Limit</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Your organization is approaching its token usage limit. Consider upgrading your plan or adjusting AI usage.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Usage History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Usage History</h2>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1 text-sm rounded-md ${
                  timeRange === '7d' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-3 py-1 text-sm rounded-md ${
                  timeRange === '30d' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setTimeRange('90d')}
                className={`px-3 py-1 text-sm rounded-md ${
                  timeRange === '90d' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
                }`}
              >
                90 Days
              </button>
            </div>
            <button className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm">Export</span>
            </button>
          </div>
        </div>
        
        {/* Usage by Day Chart */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Daily Token Usage</h3>
          <div className="h-64 bg-gray-50 rounded-lg border border-gray-200 p-4">
            {usageLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">No usage data available for the selected time period</p>
              </div>
            ) : (
              <div className="h-full flex items-end space-x-1">
                {getUsageByDay().map((day, index) => {
                  const maxTokens = Math.max(...getUsageByDay().map(d => d.tokens));
                  const height = maxTokens > 0 ? (day.tokens / maxTokens) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-purple-500 rounded-t"
                        style={{ height: `${Math.max(5, height)}%` }}
                        title={`${day.tokens.toLocaleString()} tokens on ${new Date(day.date).toLocaleDateString()}`}
                      ></div>
                      {index % Math.ceil(getUsageByDay().length / 10) === 0 && (
                        <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left">
                          {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Usage Breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Usage by Type */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">Usage by Operation Type</h3>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              {getUsageByType().length === 0 ? (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-gray-500">No usage data available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getUsageByType().map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700">{getOperationTypeLabel(item.type)}</span>
                        <span className="text-gray-900 font-medium">{item.tokens.toLocaleString()} tokens</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${(item.tokens / tokenUsage?.total || 0) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Usage by User */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">Usage by User</h3>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              {getUsageByUser().length === 0 ? (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-gray-500">No usage data available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getUsageByUser().slice(0, 5).map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 truncate max-w-xs">{item.user}</span>
                        <span className="text-gray-900 font-medium">{item.tokens.toLocaleString()} tokens</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(item.tokens / tokenUsage?.total || 0) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Usage Logs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent AI Operations</h2>
            <span className="text-sm text-gray-500">
              Showing {Math.min(usageLogs.length, 50)} of {usageLogs.length} operations
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tokens Used
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usageLogs.slice(0, 50).map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Clock className="w-4 h-4 mr-2 text-gray-400" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <Brain className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {getOperationTypeLabel(log.operation_type)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      {log.user_id || 'System'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Zap className="w-4 h-4 mr-2 text-purple-500" />
                      <span className="text-sm font-medium text-gray-900">
                        {log.tokens_used.toLocaleString()}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              
              {usageLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No usage logs found for the selected time period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">OdynSentinel AI Settings</h2>
                    <p className="text-gray-600">Configure AI behavior and token limits</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* General Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Enable AI Features</label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settingsForm.enabled}
                        onChange={(e) => setSettingsForm({
                          ...settingsForm,
                          enabled: e.target.checked
                        })}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settingsForm.enabled ? 'bg-purple-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settingsForm.enabled ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Model
                    </label>
                    <select
                      value={settingsForm.model}
                      onChange={(e) => setSettingsForm({
                        ...settingsForm,
                        model: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="gpt-4">GPT-4 (Most Capable)</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster, Lower Cost)</option>
                      <option value="claude-3-opus">Claude 3 Opus (High Performance)</option>
                      <option value="claude-3-sonnet">Claude 3 Sonnet (Balanced)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token Limit
                    </label>
                    <input
                      type="number"
                      min="100000"
                      step="100000"
                      value={settingsForm.tokenLimit}
                      onChange={(e) => setSettingsForm({
                        ...settingsForm,
                        tokenLimit: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Maximum number of tokens your organization can use per month
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Risk Detection Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  <span>AI Risk Detection</span>
                </h3>
                <div className="space-y-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Enable Risk Detection</label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settingsForm.riskDetection.enabled}
                        onChange={(e) => setSettingsForm({
                          ...settingsForm,
                          riskDetection: {
                            ...settingsForm.riskDetection,
                            enabled: e.target.checked
                          }
                        })}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settingsForm.riskDetection.enabled ? 'bg-yellow-500' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settingsForm.riskDetection.enabled ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Detection Frequency
                    </label>
                    <select
                      value={settingsForm.riskDetection.frequency}
                      onChange={(e) => setSettingsForm({
                        ...settingsForm,
                        riskDetection: {
                          ...settingsForm.riskDetection,
                          frequency: e.target.value as 'daily' | 'weekly' | 'monthly' | 'manual'
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      disabled={!settingsForm.riskDetection.enabled}
                    >
                      <option value="manual">Manual Only</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      How often the AI should automatically scan for new risks
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confidence Threshold
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="95"
                      step="5"
                      value={settingsForm.riskDetection.threshold}
                      onChange={(e) => setSettingsForm({
                        ...settingsForm,
                        riskDetection: {
                          ...settingsForm.riskDetection,
                          threshold: parseInt(e.target.value)
                        }
                      })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      disabled={!settingsForm.riskDetection.enabled}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">More Risks (50%)</span>
                      <span className="text-xs text-gray-500 font-medium">{settingsForm.riskDetection.threshold}%</span>
                      <span className="text-xs text-gray-500">Higher Confidence (95%)</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Only create risks when AI confidence is above this threshold
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Auto-approve detected risks</label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settingsForm.riskDetection.autoApprove}
                        onChange={(e) => setSettingsForm({
                          ...settingsForm,
                          riskDetection: {
                            ...settingsForm.riskDetection,
                            autoApprove: e.target.checked
                          }
                        })}
                        disabled={!settingsForm.riskDetection.enabled}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settingsForm.riskDetection.autoApprove ? 'bg-yellow-500' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settingsForm.riskDetection.autoApprove ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Notify on risk detection</label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settingsForm.riskDetection.notifyOnDetection}
                        onChange={(e) => setSettingsForm({
                          ...settingsForm,
                          riskDetection: {
                            ...settingsForm.riskDetection,
                            notifyOnDetection: e.target.checked
                          }
                        })}
                        disabled={!settingsForm.riskDetection.enabled}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settingsForm.riskDetection.notifyOnDetection ? 'bg-yellow-500' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settingsForm.riskDetection.notifyOnDetection ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notification Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Notify when approaching limit
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settingsForm.notifications.approachingLimit}
                        onChange={(e) => setSettingsForm({
                          ...settingsForm,
                          notifications: {
                            ...settingsForm.notifications,
                            approachingLimit: e.target.checked
                          }
                        })}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settingsForm.notifications.approachingLimit ? 'bg-purple-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settingsForm.notifications.approachingLimit ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Limit Threshold (%)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="95"
                      value={settingsForm.notifications.limitThreshold}
                      onChange={(e) => setSettingsForm({
                        ...settingsForm,
                        notifications: {
                          ...settingsForm.notifications,
                          limitThreshold: parseInt(e.target.value)
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Notify when usage reaches this percentage of the limit
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Send weekly usage reports
                    </label>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={settingsForm.notifications.weeklyUsageReport}
                        onChange={(e) => setSettingsForm({
                          ...settingsForm,
                          notifications: {
                            ...settingsForm.notifications,
                            weeklyUsageReport: e.target.checked
                          }
                        })}
                      />
                      <span 
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-colors ${
                          settingsForm.notifications.weeklyUsageReport ? 'bg-purple-600' : 'bg-gray-300'
                        }`}
                      >
                        <span 
                          className={`absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-transform ${
                            settingsForm.notifications.weeklyUsageReport ? 'transform translate-x-6' : ''
                          }`}
                        ></span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSettings}
                disabled={updatingSettings}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {updatingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIUsageMonitoring;