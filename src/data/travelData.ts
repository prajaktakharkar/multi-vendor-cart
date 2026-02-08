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

export const cities: City[] = [
  {
    id: 'las-vegas',
    name: 'Las Vegas',
    shortName: 'LAS',
    tagline: 'Entertainment Capital of the World',
    image: 'https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=800&q=80',
    airports: ['LAS - Harry Reid International'],
  },
  {
    id: 'atlantic-city',
    name: 'Atlantic City',
    shortName: 'ACY',
    tagline: 'America\'s Playground',
    image: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&q=80',
    airports: ['ACY - Atlantic City International', 'PHL - Philadelphia International'],
  },
  {
    id: 'silicon-valley',
    name: 'Silicon Valley',
    shortName: 'SFO',
    tagline: 'Innovation Hub of the World',
    image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80',
    airports: ['SFO - San Francisco International', 'SJC - San Jose International'],
  },
];

export const conferenceVenues: ConferenceVenue[] = [
  // Las Vegas
  {
    id: 'lv-1',
    name: 'Las Vegas Convention Center',
    cityId: 'las-vegas',
    address: '3150 Paradise Rd, Las Vegas, NV 89109',
    capacity: 10000,
    pricePerDay: 25000,
    amenities: ['WiFi', 'AV Equipment', 'Catering', 'Parking', 'Breakout Rooms'],
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    rating: 4.8,
  },
  {
    id: 'lv-2',
    name: 'The Venetian Expo',
    cityId: 'las-vegas',
    address: '201 Sands Ave, Las Vegas, NV 89169',
    capacity: 5000,
    pricePerDay: 18000,
    amenities: ['WiFi', 'AV Equipment', 'Catering', 'Valet Parking', 'VIP Lounges'],
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    rating: 4.9,
  },
  {
    id: 'lv-3',
    name: 'MGM Grand Conference Center',
    cityId: 'las-vegas',
    address: '3799 S Las Vegas Blvd, Las Vegas, NV 89109',
    capacity: 3000,
    pricePerDay: 15000,
    amenities: ['WiFi', 'AV Equipment', 'Catering', 'Hotel Integration'],
    image: 'https://images.unsplash.com/photo-1582653291997-079a1c04e5a1?w=800&q=80',
    rating: 4.7,
  },
  // Atlantic City
  {
    id: 'ac-1',
    name: 'Atlantic City Convention Center',
    cityId: 'atlantic-city',
    address: '1 Convention Blvd, Atlantic City, NJ 08401',
    capacity: 8000,
    pricePerDay: 20000,
    amenities: ['WiFi', 'AV Equipment', 'Catering', 'Parking', 'Ocean Views'],
    image: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&q=80',
    rating: 4.6,
  },
  {
    id: 'ac-2',
    name: 'Borgata Event Center',
    cityId: 'atlantic-city',
    address: '1 Borgata Way, Atlantic City, NJ 08401',
    capacity: 2500,
    pricePerDay: 12000,
    amenities: ['WiFi', 'Premium AV', 'Fine Dining', 'Casino Access'],
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80',
    rating: 4.8,
  },
  {
    id: 'ac-3',
    name: 'Hard Rock Hotel Conference Hall',
    cityId: 'atlantic-city',
    address: '1000 Boardwalk, Atlantic City, NJ 08401',
    capacity: 1500,
    pricePerDay: 10000,
    amenities: ['WiFi', 'AV Equipment', 'Beach Access', 'Entertainment'],
    image: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=800&q=80',
    rating: 4.5,
  },
  // Silicon Valley
  {
    id: 'sv-1',
    name: 'San Jose McEnery Convention Center',
    cityId: 'silicon-valley',
    address: '150 W San Carlos St, San Jose, CA 95113',
    capacity: 6000,
    pricePerDay: 22000,
    amenities: ['High-Speed WiFi', 'Tech Support', 'Catering', 'Streaming Setup'],
    image: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&q=80',
    rating: 4.7,
  },
  {
    id: 'sv-2',
    name: 'Computer History Museum',
    cityId: 'silicon-valley',
    address: '1401 N Shoreline Blvd, Mountain View, CA 94043',
    capacity: 800,
    pricePerDay: 8000,
    amenities: ['WiFi', 'Unique Venue', 'Tech Exhibits', 'Outdoor Space'],
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80',
    rating: 4.9,
  },
  {
    id: 'sv-3',
    name: 'Palo Alto Conference Center',
    cityId: 'silicon-valley',
    address: '4000 El Camino Real, Palo Alto, CA 94306',
    capacity: 1200,
    pricePerDay: 10000,
    amenities: ['Fiber WiFi', 'AV Equipment', 'Stanford Proximity', 'Green Certified'],
    image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80',
    rating: 4.6,
  },
];

export const hotels: Hotel[] = [
  // Las Vegas
  {
    id: 'lv-h1',
    name: 'The Bellagio',
    cityId: 'las-vegas',
    address: '3600 S Las Vegas Blvd, Las Vegas, NV 89109',
    pricePerNight: 299,
    stars: 5,
    amenities: ['Pool', 'Spa', 'Casino', 'Fine Dining', 'Fountain Views'],
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    rating: 4.8,
    distanceToCenter: '0.2 miles to Strip',
  },
  {
    id: 'lv-h2',
    name: 'Caesars Palace',
    cityId: 'las-vegas',
    address: '3570 S Las Vegas Blvd, Las Vegas, NV 89109',
    pricePerNight: 249,
    stars: 5,
    amenities: ['Pool Complex', 'Spa', 'Casino', 'Shopping'],
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    rating: 4.7,
    distanceToCenter: 'On the Strip',
  },
  {
    id: 'lv-h3',
    name: 'The LINQ Hotel',
    cityId: 'las-vegas',
    address: '3535 S Las Vegas Blvd, Las Vegas, NV 89109',
    pricePerNight: 129,
    stars: 4,
    amenities: ['Pool', 'High Roller Access', 'Casino'],
    image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
    rating: 4.3,
    distanceToCenter: 'On the Strip',
  },
  // Atlantic City
  {
    id: 'ac-h1',
    name: 'Borgata Hotel Casino & Spa',
    cityId: 'atlantic-city',
    address: '1 Borgata Way, Atlantic City, NJ 08401',
    pricePerNight: 219,
    stars: 5,
    amenities: ['Spa', 'Pool', 'Casino', 'Nightlife'],
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
    rating: 4.7,
    distanceToCenter: '3 miles to Boardwalk',
  },
  {
    id: 'ac-h2',
    name: 'Hard Rock Hotel Atlantic City',
    cityId: 'atlantic-city',
    address: '1000 Boardwalk, Atlantic City, NJ 08401',
    pricePerNight: 179,
    stars: 4,
    amenities: ['Beach Access', 'Pool', 'Casino', 'Live Music'],
    image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
    rating: 4.5,
    distanceToCenter: 'On Boardwalk',
  },
  {
    id: 'ac-h3',
    name: 'Ocean Casino Resort',
    cityId: 'atlantic-city',
    address: '500 Boardwalk, Atlantic City, NJ 08401',
    pricePerNight: 159,
    stars: 4,
    amenities: ['Ocean Views', 'Pool', 'Casino', 'Restaurants'],
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    rating: 4.4,
    distanceToCenter: 'On Boardwalk',
  },
  // Silicon Valley
  {
    id: 'sv-h1',
    name: 'Rosewood Sand Hill',
    cityId: 'silicon-valley',
    address: '2825 Sand Hill Rd, Menlo Park, CA 94025',
    pricePerNight: 599,
    stars: 5,
    amenities: ['Spa', 'Pool', 'Fine Dining', 'Garden Views'],
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
    rating: 4.9,
    distanceToCenter: '5 miles to Palo Alto',
  },
  {
    id: 'sv-h2',
    name: 'The Westin Palo Alto',
    cityId: 'silicon-valley',
    address: '675 El Camino Real, Palo Alto, CA 94301',
    pricePerNight: 289,
    stars: 4,
    amenities: ['Fitness Center', 'Restaurant', 'Business Center'],
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80',
    rating: 4.5,
    distanceToCenter: 'Downtown Palo Alto',
  },
  {
    id: 'sv-h3',
    name: 'Aloft Santa Clara',
    cityId: 'silicon-valley',
    address: '4241 El Camino Real, Santa Clara, CA 95051',
    pricePerNight: 169,
    stars: 3,
    amenities: ['Pool', 'Bar', 'Free WiFi', 'Pet Friendly'],
    image: 'https://images.unsplash.com/photo-1568495248636-6432b97bd949?w=800&q=80',
    rating: 4.2,
    distanceToCenter: '2 miles to Convention Center',
  },
];

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
