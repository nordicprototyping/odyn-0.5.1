import React, { useState } from 'react';
import { Brain, TrendingUp, TrendingDown, Info, Zap, AlertTriangle, CheckCircle, Shield } from 'lucide-react';

interface AIRiskInsightsProps {
  score: number;
  explanation: string;
  recommendations?: string[];
  confidence: number;
  trend?: 'improving' | 'stable' | 'deteriorating';
  components?: Record<string, number>;
  className?: string;
  compact?: boolean;
}

const AIRiskInsights: React.FC<AIRiskInsightsProps> = ({
  score,
  explanation,
  recommendations = [],
  confidence,
  trend = 'stable',
  components = {},
  className = '',
  compact = false
}) => {
  const [expanded, setExpanded] = useState(!compact);

  const getRiskLevel = (score: number) => {
    if (score <= 30) return { level: 'Low', color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-200' };
    if (score <= 70) return { level: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-200' };
    return { level: 'High', color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-200' };
  };

  const riskLevel = getRiskLevel(score);
  
  const getTrendIcon = () => {
    switch (trend) {
      case 'improving': return <TrendingDown className="w-4 h-4 text-green-500" />;
      case 'deteriorating': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'stable': return <div className="w-4 h-4 bg-gray-400 rounded-full"></div>;
      default: return <div className="w-4 h-4 bg-gray-400 rounded-full"></div>;
    }
  };

  const getTrendText = () => {
    switch (trend) {
      case 'improving': return 'Improving';
      case 'deteriorating': return 'Deteriorating';
      case 'stable': return 'Stable';
      default: return 'Stable';
    }
  };

  if (compact) {
    return (
      <div className={`bg-purple-50 rounded-lg p-3 border border-purple-200 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Brain className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">AI Risk Assessment</span>
          </div>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-purple-600 hover:text-purple-800"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`text-lg font-bold ${riskLevel.color}`}>{score}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${riskLevel.bgColor} ${riskLevel.color}`}>
              {riskLevel.level}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {getTrendIcon()}
            <Zap className="w-3 h-3 text-purple-500" title={`Confidence: ${confidence}%`} />
          </div>
        </div>
        
        {expanded && (
          <div className="mt-2 text-xs text-purple-700">
            <p>{explanation}</p>
            {recommendations.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Recommendations:</p>
                <ul className="list-disc pl-4 space-y-1 mt-1">
                  {recommendations.slice(0, 2).map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                  {recommendations.length > 2 && <li>+ {recommendations.length - 2} more</li>}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-purple-50 rounded-lg p-6 border border-purple-200 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-purple-800">AI Risk Assessment</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
            {confidence}% Confidence
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Risk Score</span>
            <div className="flex items-center space-x-2">
              <span className={`text-2xl font-bold ${riskLevel.color}`}>{score}</span>
              <span className="text-sm text-gray-500">/100</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                score <= 30 ? 'bg-green-500' :
                score <= 70 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${score}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">Low Risk</span>
            <span className="text-xs text-gray-500">High Risk</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Risk Level</span>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${riskLevel.bgColor} ${riskLevel.color}`}>
              {riskLevel.level}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Trend</span>
            <div className="flex items-center space-x-2">
              {getTrendIcon()}
              <span className={`text-sm ${
                trend === 'improving' ? 'text-green-600' :
                trend === 'deteriorating' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {getTrendText()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Last Updated</span>
            <span className="text-sm text-gray-600">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      
      {Object.keys(components).length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Risk Components</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(components).map(([key, value]) => (
              <div key={key} className="bg-white rounded-lg p-3 border">
                <div className="text-xs font-medium text-gray-500 mb-1 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div className="text-lg font-bold text-gray-900">{value}</div>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                  <div
                    className={`h-1 rounded-full ${
                      value <= 30 ? 'bg-green-500' :
                      value <= 70 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">AI Analysis</h4>
        <p className="text-sm text-gray-700 bg-white p-4 rounded-lg border">{explanation}</p>
      </div>
      
      {recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
          <div className="bg-white rounded-lg border p-4">
            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm">
                  <Shield className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIRiskInsights;