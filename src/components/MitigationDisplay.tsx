import React, { useState } from 'react';
import { Shield, Brain, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { AppliedMitigation, MitigationDisplayProps } from '../types/mitigation';

const MitigationDisplay: React.FC<MitigationDisplayProps> = ({
  mitigations,
  showCategory = true,
  compact = false
}) => {
  const [expanded, setExpanded] = useState(true);

  if (!mitigations || mitigations.length === 0) {
    return null;
  }

  // Calculate total risk reduction
  const totalRiskReduction = mitigations.reduce(
    (sum, mitigation) => sum + mitigation.applied_risk_reduction_score, 
    0
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div 
        className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-blue-500" />
          <h3 className="font-medium text-gray-900">Applied Mitigations</h3>
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
            {mitigations.length}
          </span>
          {totalRiskReduction > 0 && (
            <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs">
              <Brain className="w-3 h-3" />
              <span>Risk reduction: -{totalRiskReduction}</span>
            </div>
          )}
        </div>
        <button className="text-gray-500">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      
      {expanded && (
        <div className="divide-y divide-gray-200">
          {mitigations.map((mitigation, index) => (
            <div key={index} className={`p-4 ${compact ? 'space-y-1' : 'space-y-2'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-gray-900">{mitigation.name}</h4>
                  {showCategory && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">
                      {mitigation.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs">
                  <Brain className="w-3 h-3" />
                  <span>-{mitigation.applied_risk_reduction_score}</span>
                </div>
              </div>
              
              {!compact && mitigation.description && (
                <p className="text-sm text-gray-600">{mitigation.description}</p>
              )}
              
              {!compact && mitigation.notes && (
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 text-sm text-gray-700">
                  <p className="font-medium text-xs text-gray-500 mb-1">Notes:</p>
                  {mitigation.notes}
                </div>
              )}
              
              {!compact && (
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Applied by {mitigation.applied_by}</span>
                  <span>{new Date(mitigation.applied_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MitigationDisplay;