// Use proxy in development, direct URL in production
const BASE_URL = import.meta.env.DEV
  ? "/api-retreat"
  : "https://hack-nation-backend-490752502534.europe-west3.run.app";

export interface AnalyzeRequirementsResponse {
  session_id: string;
  [key: string]: any;
}

export interface WeightGroup {
  [key: string]: number;
}

export interface Weights {
  category_importance?: WeightGroup;
  hotels?: WeightGroup;
  flights?: WeightGroup;
  meeting_rooms?: WeightGroup;
}

// Flight search types
export interface FlightSearchParams {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  passengers: number;
  cabin_class?: 'economy' | 'premium_economy' | 'business' | 'first';
  session_id?: string;
}

export interface FlightResult {
  id: string;
  airline: string;
  flight_number: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  price: number;
  currency: string;
  stops: number;
  [key: string]: any;
}

// Hotel search types
export interface HotelSearchParams {
  location: string;
  check_in: string;
  check_out: string;
  guests: number;
  rooms?: number;
  star_rating?: number;
  amenities?: string[];
  session_id?: string;
}

export interface HotelResult {
  id: string;
  name: string;
  address: string;
  star_rating: number;
  price_per_night: number;
  currency: string;
  amenities: string[];
  image_url?: string;
  [key: string]: any;
}

// Venue search types
export interface VenueSearchParams {
  location: string;
  event_date: string;
  attendees: number;
  venue_type?: 'conference' | 'meeting' | 'retreat' | 'event';
  requirements?: string[];
  session_id?: string;
}

export interface VenueResult {
  id: string;
  name: string;
  address: string;
  capacity: number;
  price: number;
  currency: string;
  amenities: string[];
  image_url?: string;
  [key: string]: any;
}

// Transport search types
export interface TransportSearchParams {
  origin: string;
  destination: string;
  date: string;
  time?: string;
  passengers: number;
  transport_type?: 'shuttle' | 'car_rental' | 'rideshare' | 'bus' | 'all';
  session_id?: string;
}

export interface TransportResult {
  id: string;
  provider: string;
  vehicle_type: string;
  capacity: number;
  price: number;
  currency: string;
  duration?: string;
  [key: string]: any;
}

// AI Agent types
export interface AgentChatParams {
  message: string;
  session_id?: string;
  context?: {
    current_step?: string;
    preferences?: Record<string, any>;
  };
}

export interface AgentChatResponse {
  session_id: string;
  message: string;
  suggestions?: string[];
  actions?: Array<{
    type: string;
    data: any;
  }>;
  [key: string]: any;
}

export const retreatApi = {
  // Existing endpoints
  async analyzeRequirements(userInput: string, sessionId?: string): Promise<AnalyzeRequirementsResponse> {
    const response = await fetch(`${BASE_URL}/api/v1/analyze-requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_input: userInput, session_id: sessionId }),
    });
    if (!response.ok) throw new Error('Failed to analyze requirements');
    return response.json();
  },

  async discoverOptions(sessionId: string) {
    const response = await fetch(`${BASE_URL}/api/v1/discover-options?session_id=${sessionId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to discover options');
    return response.json();
  },

  async rankPackages(sessionId: string, weights?: Weights) {
    const response = await fetch(`${BASE_URL}/api/v1/rank-packages?session_id=${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: weights ? JSON.stringify({ weights }) : undefined,
    });
    if (!response.ok) throw new Error('Failed to rank packages');
    return response.json();
  },

  async buildCart(sessionId: string, packageId: string) {
    const response = await fetch(`${BASE_URL}/api/v1/cart/build?session_id=${sessionId}&package_id=${packageId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to build cart');
    return response.json();
  },

  async checkout(sessionId: string, contact: { name: string; email: string }, payment: { method: string; stripe_token: string }) {
    const response = await fetch(`${BASE_URL}/api/v1/checkout?session_id=${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact,
        payment,
        terms_accepted: true,
      }),
    });
    if (!response.ok) throw new Error('Failed to checkout');
    return response.json();
  },

  // CrewAI Flight endpoints
  async searchFlights(params: FlightSearchParams): Promise<{ flights: FlightResult[]; session_id: string }> {
    const response = await fetch(`${BASE_URL}/api/v1/crew/flights/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Failed to search flights');
    return response.json();
  },

  async getFlightDetails(flightId: string, sessionId?: string): Promise<FlightResult> {
    const url = new URL(`${BASE_URL}/api/v1/crew/flights/${flightId}`);
    if (sessionId) url.searchParams.set('session_id', sessionId);
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Failed to get flight details');
    return response.json();
  },

  // CrewAI Hotel endpoints
  async searchHotels(params: HotelSearchParams): Promise<{ hotels: HotelResult[]; session_id: string }> {
    const response = await fetch(`${BASE_URL}/api/v1/crew/hotels/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Failed to search hotels');
    return response.json();
  },

  async getHotelDetails(hotelId: string, sessionId?: string): Promise<HotelResult> {
    const url = new URL(`${BASE_URL}/api/v1/crew/hotels/${hotelId}`);
    if (sessionId) url.searchParams.set('session_id', sessionId);
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Failed to get hotel details');
    return response.json();
  },

  // CrewAI Venue endpoints
  async searchVenues(params: VenueSearchParams): Promise<{ venues: VenueResult[]; session_id: string }> {
    const response = await fetch(`${BASE_URL}/api/v1/crew/venues/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Failed to search venues');
    return response.json();
  },

  async getVenueDetails(venueId: string, sessionId?: string): Promise<VenueResult> {
    const url = new URL(`${BASE_URL}/api/v1/crew/venues/${venueId}`);
    if (sessionId) url.searchParams.set('session_id', sessionId);
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Failed to get venue details');
    return response.json();
  },

  // CrewAI Transport endpoints
  async searchTransport(params: TransportSearchParams): Promise<{ transport: TransportResult[]; session_id: string }> {
    const response = await fetch(`${BASE_URL}/api/v1/crew/transport/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Failed to search transport');
    return response.json();
  },

  async getTransportDetails(transportId: string, sessionId?: string): Promise<TransportResult> {
    const url = new URL(`${BASE_URL}/api/v1/crew/transport/${transportId}`);
    if (sessionId) url.searchParams.set('session_id', sessionId);
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Failed to get transport details');
    return response.json();
  },

  // CrewAI Agent chat endpoint
  async chatWithAgent(params: AgentChatParams): Promise<AgentChatResponse> {
    const response = await fetch(`${BASE_URL}/api/v1/crew/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Failed to chat with agent');
    return response.json();
  },

  // Get session status
  async getSessionStatus(sessionId: string): Promise<{ status: string; data: any }> {
    const response = await fetch(`${BASE_URL}/api/v1/session/${sessionId}/status`);
    if (!response.ok) throw new Error('Failed to get session status');
    return response.json();
  },

  // Get AI recommendations based on session
  async getRecommendations(sessionId: string, category?: 'flights' | 'hotels' | 'venues' | 'transport'): Promise<{ recommendations: any[] }> {
    const url = new URL(`${BASE_URL}/api/v1/crew/recommendations`);
    url.searchParams.set('session_id', sessionId);
    if (category) url.searchParams.set('category', category);
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Failed to get recommendations');
    return response.json();
  },
};
