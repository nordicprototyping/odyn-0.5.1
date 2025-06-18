import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building, 
  User, 
  AlertTriangle, 
  Plane, 
  Shield, 
  MapPin, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock,
  Brain
} from 'lucide-react';
import { SearchResult } from '../services/globalSearchService';

interface GlobalSearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  onResultClick: () => void;
  searchTerm: string;
}

const GlobalSearchResults: React.FC<GlobalSearchResultsProps> = ({
  results,
  loading,
  error,
  onResultClick,
  searchTerm
}) => {
  const navigate = useNavigate();

  const handleResultClick = (result: SearchResult) => {
    onResultClick();
    
    // Navigate to the appropriate page based on result type
    switch (result.type) {
      case 'asset':
        navigate('/dashboard/assets');
        break;
      case 'personnel':
        navigate('/dashboard/personnel');
        break;
      case 'incident':
        navigate('/dashboard/incidents');
        break;
      case 'risk':
        navigate('/dashboard/risks');
        break;
      case 'travel':
        navigate('/dashboard/travel');
        break;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'asset': return <Building className="w-5 h-5 text-blue-500" />;
      case 'personnel': return <User className="w-5 h-5 text-purple-500" />;
      case 'incident': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'risk': return <Shield className="w-5 h-5 text-orange-500" />;
      case 'travel': return <Plane className="w-5 h-5 text-green-500" />;
      default: return <Building className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusIcon = (type: string, status?: string) => {
    if (!status) return null;
    
    switch (type) {
      case 'asset':
        switch (status) {
          case 'secure': return <CheckCircle className="w-4 h-4 text-green-500" />;
          case 'alert': return <AlertCircle className="w-4 h-4 text-red-500" />;
          case 'maintenance': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
          case 'offline': return <XCircle className="w-4 h-4 text-gray-500" />;
          case 'compromised': return <AlertTriangle className="w-4 h-4 text-red-600" />;
          default: return null;
        }
      case 'personnel':
        switch (status) {
          case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
          case 'on-mission': return <AlertCircle className="w-4 h-4 text-orange-500" />;
          case 'in-transit': return <Plane className="w-4 h-4 text-blue-500" />;
          case 'off-duty': return <Clock className="w-4 h-4 text-gray-500" />;
          case 'unavailable': return <XCircle className="w-4 h-4 text-red-500" />;
          default: return null;
        }
      case 'incident':
        switch (status) {
          case 'Open': return <AlertCircle className="w-4 h-4 text-red-500" />;
          case 'In Progress': return <Clock className="w-4 h-4 text-yellow-500" />;
          case 'Closed': return <CheckCircle className="w-4 h-4 text-green-500" />;
          default: return null;
        }
      case 'risk':
        switch (status) {
          case 'identified': return <AlertCircle className="w-4 h-4 text-blue-500" />;
          case 'assessed': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
          case 'mitigated': return <CheckCircle className="w-4 h-4 text-green-500" />;
          case 'monitoring': return <AlertCircle className="w-4 h-4 text-purple-500" />;
          case 'closed': return <CheckCircle className="w-4 h-4 text-gray-500" />;
          default: return null;
        }
      case 'travel':
        switch (status) {
          case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
          case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
          case 'denied': return <XCircle className="w-4 h-4 text-red-500" />;
          case 'in-progress': return <Plane className="w-4 h-4 text-blue-500" />;
          case 'completed': return <CheckCircle className="w-4 h-4 text-gray-500" />;
          case 'cancelled': return <XCircle className="w-4 h-4 text-gray-500" />;
          default: return null;
        }
      default:
        return null;
    }
  };

  const getStatusColor = (type: string, status?: string) => {
    if (!status) return '';
    
    switch (type) {
      case 'asset':
        switch (status) {
          case 'secure': return 'bg-green-100 text-green-700';
          case 'alert': return 'bg-red-100 text-red-700';
          case 'maintenance': return 'bg-yellow-100 text-yellow-700';
          case 'offline': return 'bg-gray-100 text-gray-700';
          case 'compromised': return 'bg-red-100 text-red-800';
          default: return 'bg-gray-100 text-gray-700';
        }
      case 'personnel':
        switch (status) {
          case 'active': return 'bg-green-100 text-green-700';
          case 'on-mission': return 'bg-orange-100 text-orange-700';
          case 'in-transit': return 'bg-blue-100 text-blue-700';
          case 'off-duty': return 'bg-gray-100 text-gray-700';
          case 'unavailable': return 'bg-red-100 text-red-700';
          default: return 'bg-gray-100 text-gray-700';
        }
      case 'incident':
        switch (status) {
          case 'Open': return 'bg-red-100 text-red-700';
          case 'In Progress': return 'bg-yellow-100 text-yellow-700';
          case 'Closed': return 'bg-green-100 text-green-700';
          default: return 'bg-gray-100 text-gray-700';
        }
      case 'risk':
        switch (status) {
          case 'identified': return 'bg-blue-100 text-blue-700';
          case 'assessed': return 'bg-yellow-100 text-yellow-700';
          case 'mitigated': return 'bg-green-100 text-green-700';
          case 'monitoring': return 'bg-purple-100 text-purple-700';
          case 'closed': return 'bg-gray-100 text-gray-700';
          default: return 'bg-gray-100 text-gray-700';
        }
      case 'travel':
        switch (status) {
          case 'pending': return 'bg-yellow-100 text-yellow-700';
          case 'approved': return 'bg-green-100 text-green-700';
          case 'denied': return 'bg-red-100 text-red-700';
          case 'in-progress': return 'bg-blue-100 text-blue-700';
          case 'completed': return 'bg-gray-100 text-gray-700';
          case 'cancelled': return 'bg-gray-100 text-gray-700';
          default: return 'bg-gray-100 text-gray-700';
        }
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSeverityColor = (type: string, severity?: string) => {
    if (!severity) return '';
    
    if (type === 'incident') {
      switch (severity) {
        case 'Critical': return 'bg-red-100 text-red-700';
        case 'High': return 'bg-orange-100 text-orange-700';
        case 'Medium': return 'bg-yellow-100 text-yellow-700';
        case 'Low': return 'bg-green-100 text-green-700';
        default: return 'bg-gray-100 text-gray-700';
      }
    }
    
    return 'bg-gray-100 text-gray-700';
  };

  const getRiskScoreColor = (score?: number) => {
    if (score === undefined) return '';
    
    if (score <= 30) return 'bg-green-100 text-green-700';
    if (score <= 70) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'asset': return 'Asset';
      case 'personnel': return 'Personnel';
      case 'incident': return 'Incident';
      case 'risk': return 'Risk';
      case 'travel': return 'Travel Plan';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Searching...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">No results found for "{searchTerm}"</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 max-h-[70vh] overflow-y-auto">
      {results.map((result) => (
        <div 
          key={`${result.type}-${result.id}`} 
          className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => handleResultClick(result)}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {getTypeIcon(result.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900 truncate">{result.title}</h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {getTypeLabel(result.type)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{result.subtitle}</p>
              
              {result.description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{result.description}</p>
              )}
              
              <div className="flex flex-wrap items-center mt-2 gap-2">
                {result.status && (
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(result.type, result.status)}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(result.type, result.status)}`}>
                      {result.status.charAt(0).toUpperCase() + result.status.slice(1).replace('-', ' ')}
                    </span>
                  </div>
                )}
                
                {result.severity && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(result.type, result.severity)}`}>
                    {result.severity}
                  </span>
                )}
                
                {result.location && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span>{result.location}</span>
                  </div>
                )}
                
                {result.date && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{result.date}</span>
                  </div>
                )}
                
                {result.score !== undefined && (
                  <div className="flex items-center space-x-1">
                    <Brain className="w-3 h-3 text-purple-500" />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRiskScoreColor(result.score)}`}>
                      Score: {result.score}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GlobalSearchResults;