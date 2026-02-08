// Static demo data for the 3 featured cities
// This can be replaced with real API integrations later

export interface City {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  image: string;
  airports: string[];
}

export interface ConferenceVenue {
  id: string;
  name: string;
  cityId: string;
  address: string;
  capacity: number;
  pricePerDay: number;
  amenities: string[];
  image: string;
  rating: number;
}

export interface Hotel {
  id: string;
  name: string;
  cityId: string;
  address: string;
  pricePerNight: number;
  stars: number;
  amenities: string[];
  image: string;
  rating: number;
  distanceToCenter: string;
}

export interface FlightOption {
  id: string;
  airline: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  class: 'economy' | 'business' | 'first';
  stops: number;
}

export interface GroundTransport {
  id: string;
  provider: 'uber' | 'lyft';
  type: string;
  estimatedPrice: { min: number; max: number };
  estimatedTime: string;
  capacity: number;
}

export const cities: City[] = [];

export const conferenceVenues: ConferenceVenue[] = [];

export const hotels: Hotel[] = [];

export const groundTransportOptions: GroundTransport[] = [
  {
    id: 'uber-x',
    provider: 'uber',
    type: 'UberX',
    estimatedPrice: { min: 25, max: 35 },
    estimatedTime: '15-20 min',
    capacity: 4,
  },
  {
    id: 'uber-xl',
    provider: 'uber',
    type: 'UberXL',
    estimatedPrice: { min: 40, max: 55 },
    estimatedTime: '15-20 min',
    capacity: 6,
  },
  {
    id: 'uber-black',
    provider: 'uber',
    type: 'Uber Black',
    estimatedPrice: { min: 75, max: 100 },
    estimatedTime: '10-15 min',
    capacity: 4,
  },
  {
    id: 'lyft-standard',
    provider: 'lyft',
    type: 'Lyft',
    estimatedPrice: { min: 23, max: 33 },
    estimatedTime: '15-20 min',
    capacity: 4,
  },
  {
    id: 'lyft-xl',
    provider: 'lyft',
    type: 'Lyft XL',
    estimatedPrice: { min: 38, max: 52 },
    estimatedTime: '15-20 min',
    capacity: 6,
  },
  {
    id: 'lyft-lux',
    provider: 'lyft',
    type: 'Lyft Lux',
    estimatedPrice: { min: 70, max: 95 },
    estimatedTime: '10-15 min',
    capacity: 4,
  },
];

// Helper functions
export const getVenuesByCity = (cityId: string) => 
  conferenceVenues.filter(v => v.cityId === cityId);

export const getHotelsByCity = (cityId: string) => 
  hotels.filter(h => h.cityId === cityId);

export const getCityById = (cityId: string) => 
  cities.find(c => c.id === cityId);
