import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X, Check } from 'lucide-react';
import { searchAddress, nominatimResultToLocation, NominatimResult, LocationData } from '../../services/nominatimService';

interface LocationSearchInputProps {
  value: LocationData | null;
  onChange: (location: LocationData | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  showCoordinates?: boolean;
}

const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search for a location...',
  required = false,
  disabled = false,
  className = '',
  label,
  showCoordinates = false
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedResult, setSelectedResult] = useState<NominatimResult | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Initialize query from value if provided
  useEffect(() => {
    if (value) {
      if (value.display_name) {
        setQuery(value.display_name);
      } else {
        const displayParts = [];
        if (value.address) displayParts.push(value.address);
        if (value.city) displayParts.push(value.city);
        if (value.country) displayParts.push(value.country);
        setQuery(displayParts.join(', '));
      }
    } else {
      setQuery('');
    }
  }, [value]);

  // Handle outside clicks to close results dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced search function
  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    
    // Clear any existing timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (searchQuery.trim().length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    setShowResults(true);

    // Set a new timeout for the search
    searchTimeout.current = setTimeout(async () => {
      try {
        const searchResults = await searchAddress(searchQuery);
        setResults(searchResults);
      } catch (error) {
        console.error('Error searching for location:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500); // 500ms debounce
  };

  const handleSelectResult = (result: NominatimResult) => {
    setSelectedResult(result);
    const locationData = nominatimResultToLocation(result);
    onChange(locationData);
    setShowResults(false);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedResult(null);
    onChange(null);
    setResults([]);
  };

  const handleCoordinateChange = (type: 'lat' | 'lng', value: string) => {
    if (!value || isNaN(parseFloat(value))) return;
    
    if (type === 'lat' && value && onChange && value) {
      onChange({
        ...value,
        coordinates: [
          value?.coordinates?.[0] || 0,
          parseFloat(value)
        ]
      });
    } else if (type === 'lng' && value && onChange) {
      onChange({
        ...value,
        coordinates: [
          parseFloat(value),
          value?.coordinates?.[1] || 0
        ]
      });
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <div className="relative">
          <MapPin className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => query.trim().length >= 3 && setShowResults(true)}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {loading ? (
            <Loader2 className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          ) : null}
        </div>

        {showResults && (
          <div 
            ref={resultsRef}
            className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto"
          >
            {loading ? (
              <div className="p-4 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500" />
                <p className="text-sm text-gray-500 mt-1">Searching...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {query.trim().length < 3 ? 'Type at least 3 characters to search' : 'No results found'}
              </div>
            ) : (
              <ul className="py-1">
                {results.map((result) => (
                  <li 
                    key={result.place_id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-start"
                    onClick={() => handleSelectResult(result)}
                  >
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {result.address.road ? `${result.address.road}${result.address.house_number ? ` ${result.address.house_number}` : ''}` : result.display_name.split(',')[0]}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {result.display_name}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {value && showCoordinates && (
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              value={value.coordinates[1]}
              onChange={(e) => handleCoordinateChange('lat', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="40.7128"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              value={value.coordinates[0]}
              onChange={(e) => handleCoordinateChange('lng', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="-74.0060"
            />
          </div>
        </div>
      )}

      {value && (
        <div className="flex items-center mt-1 text-xs text-green-600">
          <Check className="w-3 h-3 mr-1" />
          <span>Location selected</span>
        </div>
      )}
    </div>
  );
};

export default LocationSearchInput;