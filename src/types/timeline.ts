export interface BaseTimelineBlock {
  id: string;
  type: 'location' | 'transport' | 'accommodation';
  order: number;
}

export interface LocationBlock extends BaseTimelineBlock {
  type: 'location';
  data: {
    name: string;
    address: string;
    city: string;
    country: string;
    coordinates?: [number, number];
    arrivalTime?: string;
    departureTime?: string;
    purpose: string;
    contacts?: string[];
    notes?: string;
  };
}

export interface TransportBlock extends BaseTimelineBlock {
  type: 'transport';
  data: {
    mode: 'flight' | 'train' | 'car' | 'bus' | 'boat' | 'other';
    from: string;
    to: string;
    departureTime: string;
    arrivalTime: string;
    provider?: string;
    bookingReference?: string;
    seatNumber?: string;
    notes?: string;
  };
}

export interface AccommodationBlock extends BaseTimelineBlock {
  type: 'accommodation';
  data: {
    name: string;
    address: string;
    city: string;
    country: string;
    checkIn: string;
    checkOut: string;
    roomType?: string;
    bookingReference?: string;
    contactNumber?: string;
    notes?: string;
  };
}

export type TimelineBlock = LocationBlock | TransportBlock | AccommodationBlock;

export interface TravelItinerary {
  timeline: TimelineBlock[];
  emergencyContacts: {
    local?: string;
    embassy?: string;
    medical?: string;
  };
  documents: string[];
  notes?: string;
}