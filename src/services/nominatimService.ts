/**
 * Service for interacting with the OpenStreetMap Nominatim API
 * for geocoding and address search functionality
 */

// Define the structure of a Nominatim search result
export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
    [key: string]: string | undefined;
  };
}

// Define the structure of a location object used in the application
export interface LocationData {
  address: string;
  city: string;
  country: string;
  coordinates: [number, number]; // [longitude, latitude]
  display_name?: string;
}

/**
 * Search for addresses using the Nominatim API
 * @param query The search query
 * @param limit Maximum number of results to return
 * @returns Promise resolving to an array of search results
 */
export async function searchAddress(query: string, limit: number = 5): Promise<NominatimResult[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    // Use the Nominatim API with appropriate parameters
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en-US,en',
          'User-Agent': 'Odyn Security Platform'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data: NominatimResult[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching addresses:', error);
    return [];
  }
}

/**
 * Convert a Nominatim result to a LocationData object
 * @param result The Nominatim search result
 * @returns A formatted LocationData object
 */
export function nominatimResultToLocation(result: NominatimResult): LocationData {
  // Extract city from various possible fields
  const city = 
    result.address.city || 
    result.address.town || 
    result.address.village || 
    result.address.county || 
    '';

  // Build a clean address string
  const addressParts = [];
  if (result.address.house_number) addressParts.push(result.address.house_number);
  if (result.address.road) addressParts.push(result.address.road);
  
  // Create the location data object
  const locationData: LocationData = {
    address: addressParts.length > 0 ? addressParts.join(' ') : result.display_name.split(',')[0],
    city: city,
    country: result.address.country || '',
    coordinates: [parseFloat(result.lon), parseFloat(result.lat)],
    display_name: result.display_name
  };

  return locationData;
}

/**
 * Reverse geocode a location from coordinates
 * @param lat Latitude
 * @param lon Longitude
 * @returns Promise resolving to a LocationData object
 */
export async function reverseGeocode(lat: number, lon: number): Promise<LocationData | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en-US,en',
          'User-Agent': 'Odyn Security Platform'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const result: NominatimResult = await response.json();
    return nominatimResultToLocation(result);
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}