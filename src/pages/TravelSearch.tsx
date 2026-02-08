import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plane, Hotel, MapPin, Car, Search, Loader2, ArrowLeft, Trophy, 
  Calendar, Users, Star, Clock, DollarSign, Sparkles, MessageSquare,
  ChevronRight, Building2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { 
  useFlightSearch, 
  useHotelSearch, 
  useVenueSearch, 
  useTransportSearch,
  useCrewSession,
  useAgentChat,
  FlightResult,
  HotelResult,
  VenueResult,
  TransportResult 
} from "@/hooks/useCrewApi";
import { format } from "date-fns";

// Flight Search Form
const FlightSearchForm = () => {
  const { searchFlights, flights, isLoading, error } = useFlightSearch();
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    departure_date: "",
    return_date: "",
    passengers: 1,
    cabin_class: "economy" as const,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchFlights(form);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="origin">From</Label>
          <Input
            id="origin"
            placeholder="City or airport code"
            value={form.origin}
            onChange={(e) => setForm({ ...form, origin: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="destination">To</Label>
          <Input
            id="destination"
            placeholder="City or airport code"
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="departure_date">Departure</Label>
          <Input
            id="departure_date"
            type="date"
            value={form.departure_date}
            onChange={(e) => setForm({ ...form, departure_date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="return_date">Return (optional)</Label>
          <Input
            id="return_date"
            type="date"
            value={form.return_date}
            onChange={(e) => setForm({ ...form, return_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="passengers">Passengers</Label>
          <Input
            id="passengers"
            type="number"
            min={1}
            max={50}
            value={form.passengers}
            onChange={(e) => setForm({ ...form, passengers: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cabin_class">Class</Label>
          <Select value={form.cabin_class} onValueChange={(v: any) => setForm({ ...form, cabin_class: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="economy">Economy</SelectItem>
              <SelectItem value="premium_economy">Premium Economy</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="first">First Class</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="lg:col-span-3 flex justify-end">
          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search Flights
          </Button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error.message}
        </div>
      )}

      {flights.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Found {flights.length} flights</h3>
          <div className="grid gap-3">
            {flights.map((flight: FlightResult) => (
              <Card key={flight.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Plane className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{flight.airline} {flight.flight_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {flight.departure_time} → {flight.arrival_time} • {flight.duration}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">
                      ${flight.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">per person</p>
                    <Button size="sm" className="mt-2">Select</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Hotel Search Form
const HotelSearchForm = () => {
  const { searchHotels, hotels, isLoading, error } = useHotelSearch();
  const [form, setForm] = useState({
    location: "",
    check_in: "",
    check_out: "",
    guests: 2,
    rooms: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchHotels(form);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="location">Destination</Label>
          <Input
            id="location"
            placeholder="City, address, or hotel name"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="check_in">Check-in</Label>
          <Input
            id="check_in"
            type="date"
            value={form.check_in}
            onChange={(e) => setForm({ ...form, check_in: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="check_out">Check-out</Label>
          <Input
            id="check_out"
            type="date"
            value={form.check_out}
            onChange={(e) => setForm({ ...form, check_out: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="guests">Guests</Label>
          <Input
            id="guests"
            type="number"
            min={1}
            value={form.guests}
            onChange={(e) => setForm({ ...form, guests: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rooms">Rooms</Label>
          <Input
            id="rooms"
            type="number"
            min={1}
            value={form.rooms}
            onChange={(e) => setForm({ ...form, rooms: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="lg:col-span-3 flex justify-end">
          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search Hotels
          </Button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error.message}
        </div>
      )}

      {hotels.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Found {hotels.length} hotels</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {hotels.map((hotel: HotelResult) => (
              <Card key={hotel.id} className="hover:border-primary/50 transition-colors overflow-hidden">
                {hotel.image_url && (
                  <div className="h-32 bg-muted">
                    <img src={hotel.image_url} alt={hotel.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-foreground">{hotel.name}</p>
                      <p className="text-sm text-muted-foreground">{hotel.address}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: hotel.star_rating }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {hotel.amenities?.slice(0, 3).map((amenity) => (
                      <Badge key={amenity} variant="outline" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-bold text-foreground">${hotel.price_per_night}</p>
                      <p className="text-xs text-muted-foreground">per night</p>
                    </div>
                    <Button size="sm">Book Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Venue Search Form
const VenueSearchForm = () => {
  const { searchVenues, venues, isLoading, error } = useVenueSearch();
  const [form, setForm] = useState({
    location: "",
    event_date: "",
    attendees: 20,
    venue_type: "conference" as const,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchVenues(form);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="venue-location">Location</Label>
          <Input
            id="venue-location"
            placeholder="City or area"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event_date">Event Date</Label>
          <Input
            id="event_date"
            type="date"
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="attendees">Attendees</Label>
          <Input
            id="attendees"
            type="number"
            min={1}
            value={form.attendees}
            onChange={(e) => setForm({ ...form, attendees: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue_type">Venue Type</Label>
          <Select value={form.venue_type} onValueChange={(v: any) => setForm({ ...form, venue_type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conference">Conference Room</SelectItem>
              <SelectItem value="meeting">Meeting Space</SelectItem>
              <SelectItem value="retreat">Retreat Venue</SelectItem>
              <SelectItem value="event">Event Hall</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="lg:col-span-4 flex justify-end">
          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search Venues
          </Button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error.message}
        </div>
      )}

      {venues.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Found {venues.length} venues</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {venues.map((venue: VenueResult) => (
              <Card key={venue.id} className="hover:border-primary/50 transition-colors overflow-hidden">
                {venue.image_url && (
                  <div className="h-32 bg-muted">
                    <img src={venue.image_url} alt={venue.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{venue.name}</p>
                      <p className="text-sm text-muted-foreground">{venue.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Up to {venue.capacity}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {venue.amenities?.slice(0, 3).map((amenity) => (
                      <Badge key={amenity} variant="outline" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-bold text-foreground">${venue.price}</p>
                      <p className="text-xs text-muted-foreground">per day</p>
                    </div>
                    <Button size="sm">Reserve</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Transport Search Form
const TransportSearchForm = () => {
  const { searchTransport, transport, isLoading, error } = useTransportSearch();
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    date: "",
    time: "",
    passengers: 4,
    transport_type: "all" as const,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchTransport(form);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="transport-origin">Pickup Location</Label>
          <Input
            id="transport-origin"
            placeholder="Address or airport"
            value={form.origin}
            onChange={(e) => setForm({ ...form, origin: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="transport-destination">Drop-off Location</Label>
          <Input
            id="transport-destination"
            placeholder="Address or venue"
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="transport-date">Date</Label>
          <Input
            id="transport-date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="transport-time">Time</Label>
          <Input
            id="transport-time"
            type="time"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="transport-passengers">Passengers</Label>
          <Input
            id="transport-passengers"
            type="number"
            min={1}
            value={form.passengers}
            onChange={(e) => setForm({ ...form, passengers: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="transport_type">Type</Label>
          <Select value={form.transport_type} onValueChange={(v: any) => setForm({ ...form, transport_type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="shuttle">Shuttle</SelectItem>
              <SelectItem value="car_rental">Car Rental</SelectItem>
              <SelectItem value="rideshare">Rideshare</SelectItem>
              <SelectItem value="bus">Charter Bus</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="lg:col-span-3 flex justify-end">
          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search Transport
          </Button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error.message}
        </div>
      )}

      {transport.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Found {transport.length} options</h3>
          <div className="grid gap-3">
            {transport.map((option: TransportResult) => (
              <Card key={option.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Car className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{option.provider}</p>
                      <p className="text-sm text-muted-foreground">{option.vehicle_type}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          Up to {option.capacity}
                        </Badge>
                        {option.duration && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {option.duration}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">${option.price}</p>
                    <p className="text-xs text-muted-foreground">total</p>
                    <Button size="sm" className="mt-2">Book</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Page Component
export default function TravelSearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sessionId } = useCrewSession();
  const [activeTab, setActiveTab] = useState("flights");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Trophy className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-foreground">Touchdown</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            {sessionId && (
              <Badge variant="secondary" className="text-xs hidden sm:flex">
                <Sparkles className="w-3 h-3 mr-1" />
                Session Active
              </Badge>
            )}
            {user ? (
              <Link to="/dashboard">
                <Button variant="outline" size="sm">Dashboard</Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <Sparkles className="w-3 h-3 mr-1" />
              Powered by CrewAI
            </Badge>
            <h1 className="text-4xl font-bold text-foreground mb-3">
              Plan Your Championship Trip
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Search and book everything you need for the ultimate game day experience—flights, 
              hotels, venues, and ground transportation all in one place.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Plane, label: "Flights", desc: "100+ airlines" },
              { icon: Hotel, label: "Hotels", desc: "Premium partners" },
              { icon: MapPin, label: "Venues", desc: "Conference & events" },
              { icon: Car, label: "Transport", desc: "Uber, Lyft & more" },
            ].map(({ icon: Icon, label, desc }) => (
              <Card key={label} className="text-center p-4">
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <p className="font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </Card>
            ))}
          </div>

          {/* Search Tabs */}
          <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <CardHeader className="pb-0">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="flights" className="gap-2">
                    <Plane className="w-4 h-4" />
                    <span className="hidden sm:inline">Flights</span>
                  </TabsTrigger>
                  <TabsTrigger value="hotels" className="gap-2">
                    <Hotel className="w-4 h-4" />
                    <span className="hidden sm:inline">Hotels</span>
                  </TabsTrigger>
                  <TabsTrigger value="venues" className="gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="hidden sm:inline">Venues</span>
                  </TabsTrigger>
                  <TabsTrigger value="transport" className="gap-2">
                    <Car className="w-4 h-4" />
                    <span className="hidden sm:inline">Transport</span>
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              
              <CardContent className="pt-6">
                <TabsContent value="flights" className="mt-0">
                  <FlightSearchForm />
                </TabsContent>
                <TabsContent value="hotels" className="mt-0">
                  <HotelSearchForm />
                </TabsContent>
                <TabsContent value="venues" className="mt-0">
                  <VenueSearchForm />
                </TabsContent>
                <TabsContent value="transport" className="mt-0">
                  <TransportSearchForm />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

          {/* AI Chat CTA */}
          <Card className="mt-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Need help planning?</h3>
                  <p className="text-sm text-muted-foreground">
                    Chat with our AI assistant for personalized recommendations
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate("/travel")} className="gap-2 shrink-0">
                <Sparkles className="w-4 h-4" />
                Chat with AI
                <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}