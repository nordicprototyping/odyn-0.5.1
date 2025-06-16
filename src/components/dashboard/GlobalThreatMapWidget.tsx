import React, { useState, useEffect } from 'react';
import { Globe, AlertTriangle } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import GoogleMapComponent from '../common/GoogleMapComponent';
import { useAssets } from '../../hooks/useAssets';
import { usePersonnel } from '../../hooks/usePersonnel';
import { useIncidents } from '../../hooks/useIncidents';

interface GlobalThreatMapWidgetProps {
  onRemove?: () => void;
  onCollapse?: () => void;
  isCollapsed?: boolean;
  className?: string;
  dragHandleProps?: any;
}

interface ThreatMarker {
  id: string;
  position: {
    lat: number;
    lng: number;
  };
  title: string;
  type: 'asset' | 'personnel' | 'incident' | 'threat';
  status?: string;
  riskScore?: number;
  details?: {
    description?: string;
    department?: string;
    lastUpdate?: string;
    [key: string]: any;
  };
}

// Mock threat data - in a real app, this would come from an API
const mockThreats = [
  {
    id: 'threat-1',
    position: { lat: 50.4501, lng: 30.5234 },
    title: 'Civil Unrest',
    type: 'threat' as const,
    riskScore: 85,
    details: {
      description: 'Civil unrest in Kiev region',
      severity: 'High',
      lastUpdate: '2 hours ago'
    }
  },
  {
    id: 'threat-2',
    position: { lat: 41.0082, lng: 28.9784 },
    title: 'Political Tensions',
    type: 'threat' as const,
    riskScore: 75,
    details: {
      description: 'Increased political tensions in Istanbul',
      severity: 'Medium',
      lastUpdate: '6 hours ago'
    }
  },
  {
    id: 'threat-3',
    position: { lat: 25.2048, lng: 55.2708 },
    title: 'Cyber Attack',
    type: 'threat' as const,
    riskScore: 90,
    details: {
      description: 'Targeted cyber attacks on infrastructure',
      severity: 'Critical',
      lastUpdate: '1 hour ago'
    }
  }
];

const GlobalThreatMapWidget: React.FC<GlobalThreatMapWidgetProps> = ({
  onRemove,
  onCollapse,
  isCollapsed = false,
  className = '',
  dragHandleProps
}) => {
  const [mapMarkers, setMapMarkers] = useState<ThreatMarker[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 20, lng: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { assets, loading: assetsLoading, error: assetsError } = useAssets();
  const { personnel, loading: personnelLoading, error: personnelError } = usePersonnel();
  const { incidents, loading: incidentsLoading, error: incidentsError } = useIncidents();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Wait for all data to load
        if (assetsLoading || personnelLoading || incidentsLoading) {
          return;
        }
        
        // Handle errors
        if (assetsError || personnelError || incidentsError) {
          setError('Failed to load map data');
          return;
        }
        
        // Process assets - only include high-risk assets
        const assetMarkers = assets
          .filter(asset => ((asset.ai_risk_score as any)?.overall || 0) > 70)
          .map(asset => ({
            id: asset.id,
            position: {
              lat: (asset.location as any)?.coordinates?.[1] || 0,
              lng: (asset.location as any)?.coordinates?.[0] || 0
            },
            title: asset.name,
            type: 'asset' as const,
            status: asset.status,
            riskScore: (asset.ai_risk_score as any)?.overall || 0,
            details: {
              description: `${asset.type.replace('-', ' ')} in ${(asset.location as any)?.city || 'Unknown'}`,
              department: (asset.responsible_officer as any)?.department || 'Unknown',
              lastUpdate: 'Recently',
              status: asset.status
            }
          }))
          .filter(marker => marker.position.lat !== 0 && marker.position.lng !== 0);
        
        // Process personnel - only include high-risk personnel
        const personnelMarkers = personnel
          .filter(person => ((person.ai_risk_score as any)?.overall || 0) > 70)
          .map(person => ({
            id: person.id,
            position: {
              lat: (person.current_location as any)?.coordinates?.[1] || 0,
              lng: (person.current_location as any)?.coordinates?.[0] || 0
            },
            title: person.name,
            type: 'personnel' as const,
            status: person.status,
            riskScore: (person.ai_risk_score as any)?.overall || 0,
            details: {
              description: `${person.department} - ${person.category}`,
              department: person.department,
              lastUpdate: person.last_seen,
              clearance: person.clearance_level
            }
          }))
          .filter(marker => marker.position.lat !== 0 && marker.position.lng !== 0);
        
        // Process incidents - only include high and critical severity
        const incidentMarkers = incidents
          .filter(incident => ['High', 'Critical'].includes(incident.severity))
          .map(incident => {
            // Try to extract coordinates from location if available
            let lat = 0, lng = 0;
            
            if (incident.location_coordinates) {
              lat = incident.location_coordinates[1] || 0;
              lng = incident.location_coordinates[0] || 0;
            }
            
            return {
              id: incident.id,
              position: { lat, lng },
              title: incident.title,
              type: 'incident' as const,
              status: incident.status,
              riskScore: incident.severity === 'Critical' ? 90 : 75,
              details: {
                description: incident.description.substring(0, 100) + '...',
                department: incident.department,
                lastUpdate: new Date(incident.date_time).toLocaleString(),
                severity: incident.severity
              }
            };
          })
          .filter(marker => marker.position.lat !== 0 && marker.position.lng !== 0);
        
        // Combine all markers with mock threats
        const allMarkers = [...assetMarkers, ...personnelMarkers, ...incidentMarkers, ...mockThreats];
        
        setMapMarkers(allMarkers);
        
        // Calculate map center based on all markers
        if (allMarkers.length > 0) {
          const avgLat = allMarkers.reduce((sum, marker) => sum + marker.position.lat, 0) / allMarkers.length;
          const avgLng = allMarkers.reduce((sum, marker) => sum + marker.position.lng, 0) / allMarkers.length;
          setMapCenter({ lat: avgLat, lng: avgLng });
        }
        
        setError(null);
      } catch (err) {
        console.error('Error preparing map data:', err);
        setError('Failed to prepare map data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [assets, personnel, incidents, assetsLoading, personnelLoading, incidentsLoading, assetsError, personnelError, incidentsError]);
  
  return (
    <DashboardWidget
      title="Global Threat Map"
      icon={<Globe className="w-5 h-5 text-blue-500" />}
      isLoading={loading}
      error={error}
      onRemove={onRemove}
      onCollapse={onCollapse}
      isCollapsed={isCollapsed}
      className={className}
      dragHandleProps={dragHandleProps}
    >
      <div className="h-[400px] relative">
        <GoogleMapComponent
          markers={mapMarkers}
          center={mapCenter}
          zoom={2}
          height="100%"
          showInfoWindows={true}
        />
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-md">
          <div className="text-xs font-medium text-gray-700 mb-2">Threat Legend</div>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs">Critical Threat</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-xs">High Risk Asset</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-xs">High Risk Personnel</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs">Critical Incident</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardWidget>
  );
};

export default GlobalThreatMapWidget;