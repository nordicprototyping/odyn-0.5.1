import React, { useState, useCallback, useMemo } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin, Users, Building, AlertTriangle, Shield, Brain } from 'lucide-react';

interface MapMarker {
  id: string;
  position: {
    lat: number;
    lng: number;
  };
  title: string;
  type: 'personnel' | 'asset' | 'incident' | 'threat';
  status?: string;
  riskScore?: number;
  details?: {
    description?: string;
    department?: string;
    lastUpdate?: string;
    [key: string]: any;
  };
}

interface GoogleMapComponentProps {
  markers: MapMarker[];
  center?: {
    lat: number;
    lng: number;
  };
  zoom?: number;
  height?: string;
  className?: string;
  onMarkerClick?: (marker: MapMarker) => void;
  showInfoWindows?: boolean;
  clustered?: boolean;
}

const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
  markers,
  center = { lat: 40.7128, lng: -74.0060 }, // Default to NYC
  zoom = 2,
  height = '400px',
  className = '',
  onMarkerClick,
  showInfoWindows = true,
  clustered = false
}) => {
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
  });

  const mapContainerStyle = useMemo(() => ({
    width: '100%',
    height: height
  }), [height]);

  const mapOptions = useMemo(() => ({
    disableDefaultUI: false,
    clickableIcons: false,
    scrollwheel: true,
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ]
  }), []);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const getMarkerIcon = (marker: MapMarker) => {
    let color = '#3B82F6'; // Default blue
    
    if (marker.riskScore !== undefined) {
      if (marker.riskScore > 70) color = '#EF4444'; // Red for high risk
      else if (marker.riskScore > 30) color = '#F59E0B'; // Yellow for medium risk
      else color = '#10B981'; // Green for low risk
    } else {
      switch (marker.type) {
        case 'personnel':
          color = '#3B82F6'; // Blue
          break;
        case 'asset':
          color = '#8B5CF6'; // Purple
          break;
        case 'incident':
          color = '#EF4444'; // Red
          break;
        case 'threat':
          color = '#F59E0B'; // Orange
          break;
      }
    }

    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 0.8,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      scale: 8
    };
  };

  const handleMarkerClick = (marker: MapMarker) => {
    setSelectedMarker(marker);
    if (onMarkerClick) {
      onMarkerClick(marker);
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'personnel': return <Users className="w-4 h-4" />;
      case 'asset': return <Building className="w-4 h-4" />;
      case 'incident': return <AlertTriangle className="w-4 h-4" />;
      case 'threat': return <Shield className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const getRiskColor = (score?: number) => {
    if (score === undefined) return 'text-gray-600';
    if (score > 70) return 'text-red-600';
    if (score > 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (!apiKey) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Google Maps API key not configured</p>
          <p className="text-sm text-gray-500">Please add VITE_GOOGLE_MAPS_API_KEY to your environment</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Error loading Google Maps</p>
          <p className="text-sm text-gray-500">Please check your API key and try again</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            title={marker.title}
            icon={getMarkerIcon(marker)}
            onClick={() => handleMarkerClick(marker)}
          />
        ))}

        {selectedMarker && showInfoWindows && (
          <InfoWindow
            position={selectedMarker.position}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-3 max-w-xs">
              <div className="flex items-center space-x-2 mb-2">
                {getStatusIcon(selectedMarker.type)}
                <h3 className="font-semibold text-gray-900">{selectedMarker.title}</h3>
              </div>
              
              {selectedMarker.details?.description && (
                <p className="text-sm text-gray-600 mb-2">{selectedMarker.details.description}</p>
              )}
              
              <div className="space-y-1 text-xs text-gray-500">
                {selectedMarker.details?.department && (
                  <div>Department: {selectedMarker.details.department}</div>
                )}
                
                {selectedMarker.status && (
                  <div className="flex items-center space-x-1">
                    <span>Status:</span>
                    <span className="capitalize font-medium">{selectedMarker.status}</span>
                  </div>
                )}
                
                {selectedMarker.riskScore !== undefined && (
                  <div className="flex items-center space-x-1">
                    <Brain className="w-3 h-3 text-purple-500" />
                    <span>AI Risk:</span>
                    <span className={`font-medium ${getRiskColor(selectedMarker.riskScore)}`}>
                      {selectedMarker.riskScore}
                    </span>
                  </div>
                )}
                
                {selectedMarker.details?.lastUpdate && (
                  <div>Last Update: {selectedMarker.details.lastUpdate}</div>
                )}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default GoogleMapComponent;