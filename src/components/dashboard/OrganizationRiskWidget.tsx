import React, { useState, useEffect } from 'react';
import { Shield, Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { supabase } from '../../lib/supabase';
import { aiService } from '../../services/aiService';
import { useAuth } from '../../hooks/useAuth';

interface OrganizationRiskWidgetProps {
  onRemove?: () => void;
  onCollapse?: () => void;
  isCollapsed?: boolean;
  className?: string;
  dragHandleProps?: any;
}

interface RiskScore {
  score: number;
  previousScore: number;
  components: Record<string, number>;
  trend: 'improving' | 'stable' | 'deteriorating';
  explanation: string;
  recommendations: string[];
}

const OrganizationRiskWidget: React.FC<OrganizationRiskWidgetProps> = ({
  onRemove,
  onCollapse,
  isCollapsed = false,
  className = '',
  dragHandleProps
}) => {
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  const { organization } = useAuth();
  
  useEffect(() => {
    const calculateOrganizationRiskScore = async () => {
      if (!organization?.id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch data needed for organization risk assessment
        const [
          { data: assets },
          { data: personnel },
          { data: incidents },
          { data: risks },
          { data: travelPlans }
        ] = await Promise.all([
          supabase.from('assets').select('*').eq('organization_id', organization.id),
          supabase.from('personnel_details').select('*').eq('organization_id', organization.id),
          supabase.from('incident_reports').select('*').eq('organization_id', organization.id),
          supabase.from('risks').select('*').eq('organization_id', organization.id),
          supabase.from('travel_plans').select('*').eq('organization_id', organization.id)
        ]);
        
        // Call AI service to calculate organization risk score
        const aggregateData = {
          assets: assets || [],
          personnel: personnel || [],
          incidents: incidents || [],
          risks: risks || [],
          travelPlans: travelPlans || []
        };
        
        const result = await aiService.scoreOrganizationRisk(organization.id, aggregateData);
        
        // Simulate previous score (in a real app, this would be stored and tracked)
        const previousScore = Math.max(10, result.score - Math.floor(Math.random() * 10) + 5);
        
        setRiskScore({
          score: result.score,
          previousScore,
          components: result.components || {},
          trend: result.trend || 'stable',
          explanation: result.explanation || '',
          recommendations: result.recommendations || []
        });
      } catch (error) {
        console.error('Error calculating organization risk score:', error);
        setError('Failed to calculate organization risk score');
        
        // Fallback to a default score if calculation fails
        setRiskScore({
          score: 42,
          previousScore: 45,
          components: {
            assetSecurity: 40,
            personnelSecurity: 45,
            incidentManagement: 38,
            travelSecurity: 50,
            complianceRisk: 35,
            geopoliticalRisk: 48
          },
          trend: 'improving',
          explanation: "This is a fallback risk assessment based on limited data. The organization shows moderate risk levels across most categories.",
          recommendations: [
            "Conduct a comprehensive security audit",
            "Review incident response procedures",
            "Enhance personnel security training",
            "Update travel security protocols"
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    
    calculateOrganizationRiskScore();
  }, [organization?.id]);
  
  const getRiskLevel = (score: number) => {
    if (score <= 30) return { level: 'Low', color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-200' };
    if (score <= 70) return { level: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-200' };
    return { level: 'High', color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-200' };
  };
  
  const riskLevel = riskScore ? getRiskLevel(riskScore.score) : getRiskLevel(50);
  const weeklyChange = riskScore ? riskScore.score - riskScore.previousScore : 0;
  const percentageChange = riskScore?.previousScore ? ((weeklyChange / riskScore.previousScore) * 100) : 0;
  
  // Calculate gauge percentage (0-100 scale where lower is better)
  const gaugePercentage = riskScore ? Math.min(riskScore.score, 100) : 50;
  const circumference = 2 * Math.PI * 45; // radius of 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (gaugePercentage / 100) * circumference;
  
  return (
    <DashboardWidget
      title="Organization Risk Score"
      icon={<Shield className="w-5 h-5 text-blue-500" />}
      isLoading={loading}
      error={error}
      onRemove={onRemove}
      onCollapse={onCollapse}
      isCollapsed={isCollapsed}
      className={className}
      dragHandleProps={dragHandleProps}
    >
      <div className="flex flex-col items-center">
        {/* Main Score Display */}
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-32 h-32">
            {/* Gauge Background */}
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-gray-200"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className={riskLevel.color}
                style={{
                  transition: 'stroke-dashoffset 1s ease-in-out'
                }}
              />
            </svg>
            
            {/* Score Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">{riskScore?.score || 0}</span>
              <span className="text-xs text-gray-500">/100</span>
            </div>
          </div>
        </div>

        {/* Risk Level Badge */}
        <div className="flex justify-center mb-4">
          <span className={`inline-flex px-4 py-2 text-sm font-bold rounded-full ${riskLevel.bgColor} ${riskLevel.color} border ${riskLevel.borderColor}`}>
            {riskLevel.level} Risk
          </span>
        </div>

        {/* Weekly Change */}
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="flex items-center space-x-1">
            {weeklyChange > 0 ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : weeklyChange < 0 ? (
              <TrendingDown className="w-4 h-4 text-green-500" />
            ) : (
              <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
            )}
            <span className={`text-sm font-medium ${
              weeklyChange > 0 ? 'text-red-600' : 
              weeklyChange < 0 ? 'text-green-600' : 
              'text-gray-600'
            }`}>
              {weeklyChange > 0 ? '+' : ''}{weeklyChange}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            ({percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}% vs last week)
          </span>
        </div>

        {/* Risk Components */}
        {riskScore && (
          <div className="w-full space-y-3 mb-4">
            {Object.entries(riskScore.components).map(([key, value]) => {
              const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
              const percentage = value;
              
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 capitalize">{formattedKey}</span>
                    <span className="font-medium text-gray-900">{value}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        percentage > 70 ? 'bg-red-500' :
                        percentage > 30 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Toggle Details Button */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-2"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>

        {/* Details Section */}
        {showDetails && riskScore && (
          <div className="w-full mt-2 space-y-4">
            {/* AI Explanation */}
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <Brain className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-800">AI Analysis</span>
              </div>
              <p className="text-xs text-purple-700">{riskScore.explanation}</p>
            </div>
            
            {/* Recommendations */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
              <ul className="space-y-2">
                {riskScore.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm">
                    <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </DashboardWidget>
  );
};

export default OrganizationRiskWidget;