import React, { useState, useEffect } from 'react';
import { X, MapPin, Plane, Building, Calendar, Clock, Save } from 'lucide-react';
import { TimelineBlock, LocationBlock, TransportBlock, AccommodationBlock } from '../../types/timeline';

interface TimelineBlockFormProps {
  block?: TimelineBlock;
  onSave: (block: TimelineBlock) => void;
  onCancel: () => void;
  blockType?: 'location' | 'transport' | 'accommodation';
  nextOrder: number;
}

const TimelineBlockForm: React.FC<TimelineBlockFormProps> = ({ 
  block, 
  onSave, 
  onCancel, 
  blockType = 'location',
  nextOrder
}) => {
  const [type, setType] = useState<'location' | 'transport' | 'accommodation'>(block?.type || blockType);
  
  // Location state
  const [locationData, setLocationData] = useState<LocationBlock['data']>({
    name: '',
    address: '',
    city: '',
    country: '',
    purpose: '',
    arrivalTime: '',
    departureTime: '',
    notes: ''
  });

  // Transport state
  const [transportData, setTransportData] = useState<TransportBlock['data']>({
    mode: 'flight',
    from: '',
    to: '',
    departureTime: '',
    arrivalTime: '',
    provider: '',
    bookingReference: '',
    notes: ''
  });

  // Accommodation state
  const [accommodationData, setAccommodationData] = useState<AccommodationBlock['data']>({
    name: '',
    address: '',
    city: '',
    country: '',
    checkIn: '',
    checkOut: '',
    roomType: '',
    bookingReference: '',
    contactNumber: '',
    notes: ''
  });

  useEffect(() => {
    if (block) {
      setType(block.type);
      
      if (block.type === 'location') {
        setLocationData(block.data);
      } else if (block.type === 'transport') {
        setTransportData(block.data);
      } else if (block.type === 'accommodation') {
        setAccommodationData(block.data);
      }
    }
  }, [block]);

  const handleSave = () => {
    const id = block?.id || `block-${Date.now()}`;
    const order = block?.order !== undefined ? block.order : nextOrder;
    
    let newBlock: TimelineBlock;
    
    if (type === 'location') {
      newBlock = {
        id,
        type: 'location',
        order,
        data: locationData
      };
    } else if (type === 'transport') {
      newBlock = {
        id,
        type: 'transport',
        order,
        data: transportData
      };
    } else {
      newBlock = {
        id,
        type: 'accommodation',
        order,
        data: accommodationData
      };
    }
    
    onSave(newBlock);
  };

  const updateLocationData = (field: keyof LocationBlock['data'], value: any) => {
    setLocationData(prev => ({ ...prev, [field]: value }));
  };

  const updateTransportData = (field: keyof TransportBlock['data'], value: any) => {
    setTransportData(prev => ({ ...prev, [field]: value }));
  };

  const updateAccommodationData = (field: keyof AccommodationBlock['data'], value: any) => {
    setAccommodationData(prev => ({ ...prev, [field]: value }));
  };

  const countries = [
    'United States',
    'United Kingdom',
    'Singapore',
    'Turkey',
    'Ukraine',
    'India',
    'South Korea',
    'France',
    'Germany',
    'Japan',
    'Australia',
    'Canada',
    'Poland',
    'United Arab Emirates',
    'Netherlands',
    'Switzerland',
    'Italy',
    'Spain'
  ];

  const renderLocationForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location Name *
          </label>
          <input
            type="text"
            required
            value={locationData.name}
            onChange={(e) => updateLocationData('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Client Office, Conference Venue"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Purpose *
          </label>
          <input
            type="text"
            required
            value={locationData.purpose}
            onChange={(e) => updateLocationData('purpose', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Meeting, Conference, Site Visit"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address *
        </label>
        <input
          type="text"
          required
          value={locationData.address}
          onChange={(e) => updateLocationData('address', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Street address"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City *
          </label>
          <input
            type="text"
            required
            value={locationData.city}
            onChange={(e) => updateLocationData('city', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="City"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country *
          </label>
          <select
            required
            value={locationData.country}
            onChange={(e) => updateLocationData('country', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Country</option>
            {countries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Arrival Time
          </label>
          <input
            type="datetime-local"
            value={locationData.arrivalTime || ''}
            onChange={(e) => updateLocationData('arrivalTime', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Departure Time
          </label>
          <input
            type="datetime-local"
            value={locationData.departureTime || ''}
            onChange={(e) => updateLocationData('departureTime', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          rows={2}
          value={locationData.notes || ''}
          onChange={(e) => updateLocationData('notes', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Additional details about this location"
        />
      </div>
    </div>
  );

  const renderTransportForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transport Mode *
          </label>
          <select
            required
            value={transportData.mode}
            onChange={(e) => updateTransportData('mode', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="flight">Flight</option>
            <option value="train">Train</option>
            <option value="car">Car</option>
            <option value="bus">Bus</option>
            <option value="boat">Boat</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provider/Carrier
          </label>
          <input
            type="text"
            value={transportData.provider || ''}
            onChange={(e) => updateTransportData('provider', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Airline name, Car rental company"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From *
          </label>
          <input
            type="text"
            required
            value={transportData.from}
            onChange={(e) => updateTransportData('from', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Origin location"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To *
          </label>
          <input
            type="text"
            required
            value={transportData.to}
            onChange={(e) => updateTransportData('to', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Destination location"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Departure Time *
          </label>
          <input
            type="datetime-local"
            required
            value={transportData.departureTime}
            onChange={(e) => updateTransportData('departureTime', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Arrival Time *
          </label>
          <input
            type="datetime-local"
            required
            value={transportData.arrivalTime}
            onChange={(e) => updateTransportData('arrivalTime', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Booking Reference
          </label>
          <input
            type="text"
            value={transportData.bookingReference || ''}
            onChange={(e) => updateTransportData('bookingReference', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Confirmation number"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Seat/Assignment
          </label>
          <input
            type="text"
            value={transportData.seatNumber || ''}
            onChange={(e) => updateTransportData('seatNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Seat 12A, Car #3"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          rows={2}
          value={transportData.notes || ''}
          onChange={(e) => updateTransportData('notes', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Additional details about this transport"
        />
      </div>
    </div>
  );

  const renderAccommodationForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Accommodation Name *
        </label>
        <input
          type="text"
          required
          value={accommodationData.name}
          onChange={(e) => updateAccommodationData('name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Hotel name, Apartment, etc."
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address *
        </label>
        <input
          type="text"
          required
          value={accommodationData.address}
          onChange={(e) => updateAccommodationData('address', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Street address"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City *
          </label>
          <input
            type="text"
            required
            value={accommodationData.city}
            onChange={(e) => updateAccommodationData('city', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="City"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country *
          </label>
          <select
            required
            value={accommodationData.country}
            onChange={(e) => updateAccommodationData('country', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Country</option>
            {countries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Check-in *
          </label>
          <input
            type="datetime-local"
            required
            value={accommodationData.checkIn}
            onChange={(e) => updateAccommodationData('checkIn', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Check-out *
          </label>
          <input
            type="datetime-local"
            required
            value={accommodationData.checkOut}
            onChange={(e) => updateAccommodationData('checkOut', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Room Type
          </label>
          <input
            type="text"
            value={accommodationData.roomType || ''}
            onChange={(e) => updateAccommodationData('roomType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Standard, Suite, etc."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Booking Reference
          </label>
          <input
            type="text"
            value={accommodationData.bookingReference || ''}
            onChange={(e) => updateAccommodationData('bookingReference', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Confirmation number"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contact Number
        </label>
        <input
          type="tel"
          value={accommodationData.contactNumber || ''}
          onChange={(e) => updateAccommodationData('contactNumber', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., +1-555-0123"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          rows={2}
          value={accommodationData.notes || ''}
          onChange={(e) => updateAccommodationData('notes', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Additional details about this accommodation"
        />
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg border shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {type === 'location' && <MapPin className="w-5 h-5 text-green-500" />}
          {type === 'transport' && <Plane className="w-5 h-5 text-blue-500" />}
          {type === 'accommodation' && <Building className="w-5 h-5 text-purple-500" />}
          <h3 className="text-lg font-semibold text-gray-900">
            {block ? 'Edit' : 'Add'} {type.charAt(0).toUpperCase() + type.slice(1)} Block
          </h3>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Block Type
        </label>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => setType('location')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
              type === 'location' 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Location</span>
          </button>
          
          <button
            type="button"
            onClick={() => setType('transport')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
              type === 'transport' 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Plane className="w-4 h-4" />
            <span>Transport</span>
          </button>
          
          <button
            type="button"
            onClick={() => setType('accommodation')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
              type === 'accommodation' 
                ? 'bg-purple-50 border-purple-200 text-purple-700' 
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Accommodation</span>
          </button>
        </div>
      </div>
      
      <div className="space-y-6">
        {type === 'location' && renderLocationForm()}
        {type === 'transport' && renderTransportForm()}
        {type === 'accommodation' && renderAccommodationForm()}
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Block</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimelineBlockForm;