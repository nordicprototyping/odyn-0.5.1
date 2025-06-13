import React, { useState } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Info, Brain, Users, FileText, Globe, Shield } from 'lucide-react';

interface RiskScoreWidgetProps {
  score: number;
  previousScore: number;
  className?: string;
}

interface RiskComponent {
  name: string;
  value: number;
  max: number;
  change: number;
  icon: React.ComponentType<any>;
  color: string;
  description: string;
}

const RiskScoreWidget: React.FC<RiskScoreWidgetProps> = ({ 
  score, 
  previousScore, 
  className = '' 
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const getRiskLevel = (score: number) => {
    if (score <= 30) return { level: 'Low', color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-200' };
    if (score <= 70) return { level: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-200' };
    return { level: 'High', color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-200' };
  };

  const riskLevel = getRiskLevel(score);
  const weeklyChange = score - previousScore;
  const percentageChange = previousScore > 0 ? ((weeklyChange / previousScore) * 100) : 0;
  
  // Calculate gauge percentage (0-100 scale where lower is better)
  const gaugePercentage = Math.min(score, 100);
  const circumference = 2 * Math.PI * 45; // radius of 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (gaugePercentage / 100) * circumference;

  const getRiskComponents = (): RiskComponent[] => [
    {
      name: 'AI Risk Assessment',
      value: Math.floor(score * 0.35),
      max: 35,
      change: Math.floor(weeklyChange * 0.35),
      icon: Brain,
      color: 'text-purple-600',
      description: 'Machine learning analysis of threat patterns, behavioral anomalies, and predictive risk modeling'
    },
    {
      name: 'Personnel Risk',
      value: Math.floor(score * 0.25),
      max: 25,
      change: Math.floor(weeklyChange * 0.25),
      icon: Users,
      color: 'text-blue-600',
      description: 'Staff security clearances, travel risks, compliance violations, and behavioral indicators'
    },
    {
      name: 'Incident History',
      value: Math.floor(score * 0.20),
      max: 20,
      change: Math.floor(weeklyChange * 0.20),
      icon: FileText,
      color: 'text-red-600',
      description: 'Recent security incidents, response times, resolution effectiveness, and recurring issues'
    },
    {
      name: 'External Events',
      value: Math.floor(score * 0.15),
      max: 15,
      change: Math.floor(weeklyChange * 0.15),
      icon: Globe,
      color: 'text-orange-600',
      description: 'Geopolitical tensions, civil unrest, natural disasters, and regional security threats'
    },
    {
      name: 'Asset Vulnerabilities',
      value: Math.floor(score * 0.05),
      max: 5,
      change: Math.floor(weeklyChange * 0.05),
      icon: Shield,
      color: 'text-gray-600',
      description: 'Physical security gaps, system vulnerabilities, and infrastructure weaknesses'
    }
  ];

  const riskComponents = getRiskComponents();

  return (
    <div className={`bg-white rounded-xl shadow-lg border-2 ${riskLevel.borderColor} p-6 relative overflow-hidden ${className}`}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="h-full w-full" 
             style={{
               backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(59, 130, 246, 0.1) 10px, rgba(59, 130, 246, 0.1) 20px)'
             }}>
        </div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Brain className={`w-6 h-6 ${riskLevel.color}`} />
            <h2 className="text-lg font-bold text-gray-900">AI Risk Score</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="group relative"
            >
              <Info className="w-5 h-5 text-gray-400 cursor-help hover:text-gray-600" />
            </button>
          </div>
        </div>

        {/* Main Score Display */}
        <div className="flex items-center justify-center mb-6">
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
              <span className="text-3xl font-bold text-gray-900">{score}</span>
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

        {/* Risk Breakdown Toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showBreakdown ? 'Hide' : 'Show'} Risk Breakdown
          </button>
        </div>

        {/* Risk Components Breakdown */}
        {showBreakdown && (
          <div className="space-y-3 mb-4 p-4 bg-gray-50 rounded-lg">
            {riskComponents.map((component, index) => {
              const Icon = component.icon;
              const percentage = (component.value / component.max) * 100;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon className={`w-4 h-4 ${component.color}`} />
                      <span className="text-sm font-medium text-gray-700">{component.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-gray-900">{component.value}</span>
                      <span className="text-xs text-gray-500">/{component.max}</span>
                      {component.change !== 0 && (
                        <span className={`text-xs ${component.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ({component.change > 0 ? '+' : ''}{component.change})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        percentage > 80 ? 'bg-red-500' :
                        percentage > 60 ? 'bg-orange-500' :
                        percentage > 40 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600">{component.description}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* AI Insights */}
        <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-2 mb-2">
            <Brain className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-800">AI Insights</span>
          </div>
          <p className="text-xs text-purple-700">
            {score > 70 ? 
              "High correlation detected between recent personnel travel and external threat events. Recommend enhanced monitoring protocols." :
            score > 30 ?
              "Moderate risk patterns identified. AI suggests reviewing access controls and incident response procedures." :
              "Risk levels within acceptable parameters. Predictive models show stable security posture."
            }
          </p>
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between text-xs">
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              View AI Analysis
            </button>
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskScoreWidget;