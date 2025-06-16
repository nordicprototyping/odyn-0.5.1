import React from 'react';
import { AlertTriangle } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { useRisks } from '../../hooks/useRisks';

interface RiskMatrixWidgetProps {
  onRemove?: () => void;
  onCollapse?: () => void;
  isCollapsed?: boolean;
  className?: string;
  dragHandleProps?: any;
}

const RiskMatrixWidget: React.FC<RiskMatrixWidgetProps> = ({
  onRemove,
  onCollapse,
  isCollapsed = false,
  className = '',
  dragHandleProps
}) => {
  const { risks, loading, error } = useRisks();
  
  // Calculate risk matrix data
  const getMatrixData = () => {
    // Initialize empty 5x5 matrix (impact x likelihood)
    const matrix: number[][] = Array(5).fill(0).map(() => Array(5).fill(0));
    
    // Map risk impact and likelihood to matrix positions
    risks.forEach(risk => {
      let impactIndex: number;
      let likelihoodIndex: number;
      
      // Convert impact level to index (0-4)
      switch (risk.impact) {
        case 'very_low': impactIndex = 0; break;
        case 'low': impactIndex = 1; break;
        case 'medium': impactIndex = 2; break;
        case 'high': impactIndex = 3; break;
        case 'very_high': impactIndex = 4; break;
        default: impactIndex = 2; // Default to medium
      }
      
      // Convert likelihood level to index (0-4)
      switch (risk.likelihood) {
        case 'very_low': likelihoodIndex = 0; break;
        case 'low': likelihoodIndex = 1; break;
        case 'medium': likelihoodIndex = 2; break;
        case 'high': likelihoodIndex = 3; break;
        case 'very_high': likelihoodIndex = 4; break;
        default: likelihoodIndex = 2; // Default to medium
      }
      
      // Increment the count in the matrix
      matrix[impactIndex][likelihoodIndex]++;
    });
    
    return matrix;
  };
  
  const getCellColor = (impactIndex: number, likelihoodIndex: number) => {
    const riskScore = (impactIndex + 1) * (likelihoodIndex + 1);
    
    if (riskScore <= 4) return 'bg-green-100 hover:bg-green-200';
    if (riskScore <= 9) return 'bg-yellow-100 hover:bg-yellow-200';
    if (riskScore <= 16) return 'bg-orange-100 hover:bg-orange-200';
    return 'bg-red-100 hover:bg-red-200';
  };
  
  const getCellTextColor = (impactIndex: number, likelihoodIndex: number) => {
    const riskScore = (impactIndex + 1) * (likelihoodIndex + 1);
    
    if (riskScore <= 4) return 'text-green-800';
    if (riskScore <= 9) return 'text-yellow-800';
    if (riskScore <= 16) return 'text-orange-800';
    return 'text-red-800';
  };
  
  const matrixData = getMatrixData();
  const impactLabels = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
  const likelihoodLabels = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
  
  return (
    <DashboardWidget
      title="Risk Matrix"
      icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
      isLoading={loading}
      error={error}
      onRemove={onRemove}
      onCollapse={onCollapse}
      isCollapsed={isCollapsed}
      className={className}
      dragHandleProps={dragHandleProps}
    >
      <div className="flex flex-col">
        <div className="flex">
          {/* Empty top-left cell */}
          <div className="w-24 h-10 flex-shrink-0"></div>
          
          {/* Likelihood labels (top) */}
          <div className="flex-1 flex">
            {likelihoodLabels.map((label, index) => (
              <div key={`likelihood-${index}`} className="flex-1 text-center">
                <span className="text-xs font-medium text-gray-600 rotate-45 inline-block">{label}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Matrix rows */}
        {matrixData.map((row, impactIndex) => (
          <div key={`row-${impactIndex}`} className="flex">
            {/* Impact label (left) */}
            <div className="w-24 flex-shrink-0 flex items-center justify-end pr-2">
              <span className="text-xs font-medium text-gray-600">{impactLabels[4 - impactIndex]}</span>
            </div>
            
            {/* Matrix cells */}
            <div className="flex-1 flex">
              {row.map((count, likelihoodIndex) => (
                <div 
                  key={`cell-${impactIndex}-${likelihoodIndex}`}
                  className={`flex-1 aspect-square flex items-center justify-center border border-white ${getCellColor(4 - impactIndex, likelihoodIndex)}`}
                >
                  <span className={`text-sm font-bold ${getCellTextColor(4 - impactIndex, likelihoodIndex)}`}>
                    {count > 0 ? count : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {/* Legend */}
        <div className="mt-4 flex justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-100 border border-green-200"></div>
            <span>Low Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-200"></div>
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-100 border border-orange-200"></div>
            <span>High Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-100 border border-red-200"></div>
            <span>Critical Risk</span>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 text-center">
          <p>Impact (vertical) × Likelihood (horizontal)</p>
        </div>
      </div>
    </DashboardWidget>
  );
};

export default RiskMatrixWidget;