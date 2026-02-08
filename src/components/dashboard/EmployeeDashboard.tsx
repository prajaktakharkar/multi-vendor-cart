import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plane, Building2, Car, LogOut, Calendar,
  Clock, MapPin, CheckCircle, ArrowRight,
  CalendarDays, Timer, MessageSquare, Edit, Send
} from 'lucide-react';
import { format, isAfter, isBefore, isToday, differenceInDays } from 'date-fns';
import { ChangeRequestDialog } from './ChangeRequestDialog';
import { MyRequestsPanel } from './MyRequestsPanel';
import { NewTravelRequestDialog } from './NewTravelRequestDialog';
import { MyTravelRequests } from './MyTravelRequests';
interface BookingDetails {
  // Flight details
  airline?: string;
  flightNumber?: string;
  departure?: string;
  arrival?: string;
  departureTime?: string;
  arrivalTime?: string;
  origin?: string;
  destination?: string;
  // Hotel details
  hotelName?: string;
  location?: string;
  roomType?: string;
  checkIn?: string;
  checkOut?: string;
  address?: string;
  // Car details
  provider?: string;
  vehicleType?: string;
  carType?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupTime?: string;
  dropoffTime?: string;
  // Index signature for compatibility
  [key: string]: unknown;
}

interface Booking {
  id: string;
  booking_type: 'flight' | 'hotel' | 'car';
  status: 'pending' | 'confirmed' | 'cancelled';
  details: BookingDetails;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export const EmployeeDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [changeRequestDialogOpen, setChangeRequestDialogOpen] = useState(false);
  const [selectedBookingForChange, setSelectedBookingForChange] = useState<Booking | null>(null);
  const [requestsRefreshKey, setRequestsRefreshKey] = useState(0);
  const [newTravelDialogOpen, setNewTravelDialogOpen] = useState(false);
  const [travelRequestsRefreshKey, setTravelRequestsRefreshKey] = useState(0);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user?.id)
        .order('start_date', { ascending: true });

      if (data) {
        setBookings(data as Booking[]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBookingIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-5 h-5" />;
      case 'hotel': return <Building2 className="w-5 h-5" />;
      case 'car': return <Car className="w-5 h-5" />;
      default: return null;
    }
  };

  const getBookingColor = (type: string) => {
    switch (type) {
      case 'flight': return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400';
      case 'hotel': return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400';
      case 'car': return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400';
      default: return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return '';
    }
  };

  const upcomingBookings = bookings.filter(b => 
    b.start_date && isAfter(new Date(b.start_date), new Date())
  );

  const todayBookings = bookings.filter(b =>
    b.start_date && isToday(new Date(b.start_date))
  );

  const pastBookings = bookings.filter(b =>
    b.start_date && isBefore(new Date(b.start_date), new Date()) && !isToday(new Date(b.start_date))
  );

  const BookingCard = ({ booking, showChangeButton = true }: { booking: Booking; showChangeButton?: boolean }) => {
    const details = booking.details;
    
    const handleRequestChange = () => {
      setSelectedBookingForChange(booking);
      setChangeRequestDialogOpen(true);
    };
    const formatDateTime = (dateStr?: string) => {
      if (!dateStr) return null;
      try {
        const date = new Date(dateStr);
        return format(date, 'MMM d, yyyy h:mm a');
      } catch {
        return dateStr;
      }
    };

    const formatDate = (dateStr?: string) => {
      if (!dateStr) return null;
      try {
        const date = new Date(dateStr);
        return format(date, 'MMM d, yyyy');
      } catch {
        return dateStr;
      }
    };

    const getDuration = () => {
      if (booking.start_date && booking.end_date) {
        const days = differenceInDays(new Date(booking.end_date), new Date(booking.start_date));
        if (days === 0) return 'Same day';
        if (days === 1) return '1 night';
        return `${days} nights`;
      }
      return null;
    };

    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="flex">
            <div className={`w-2 ${booking.booking_type === 'flight' ? 'bg-blue-500' : booking.booking_type === 'hotel' ? 'bg-purple-500' : 'bg-green-500'}`} />
            <div className="flex-1 p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getBookingColor(booking.booking_type)}`}>
                    {getBookingIcon(booking.booking_type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">
                      {booking.booking_type === 'flight' && (details.airline || 'Flight')}
                      {booking.booking_type === 'hotel' && (details.hotelName || 'Hotel')}
                      {booking.booking_type === 'car' && (details.provider || 'Car Rental')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {booking.booking_type === 'flight' && details.flightNumber && `Flight ${details.flightNumber}`}
                      {booking.booking_type === 'hotel' && details.roomType && `${details.roomType.charAt(0).toUpperCase() + details.roomType.slice(1)} Room`}
                      {booking.booking_type === 'car' && details.vehicleType && `${details.vehicleType.charAt(0).toUpperCase() + details.vehicleType.slice(1)} Vehicle`}
                    </p>
                  </div>
                </div>
                <Badge className={getStatusColor(booking.status)}>
                  {booking.status === 'confirmed' && <CheckCircle className="w-3 h-3 mr-1" />}
                  {booking.status}
                </Badge>
                {showChangeButton && booking.status !== 'cancelled' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRequestChange();
                    }}
                    className="h-8"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Request Changes
                  </Button>
                )}
              </div>

              {/* Details Grid */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                {/* Flight Details */}
                {booking.booking_type === 'flight' && (
                  <>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{details.departure || details.origin || 'Origin'}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{details.arrival || details.destination || 'Destination'}</span>
                      </div>
                    </div>
                    {(details.departureTime || booking.start_date) && (
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="text-sm">
                          <span className="text-muted-foreground">Departure: </span>
                          <span className="font-medium">{formatDateTime(details.departureTime) || formatDateTime(booking.start_date || undefined)}</span>
                        </div>
                      </div>
                    )}
                    {(details.arrivalTime || booking.end_date) && (
                      <div className="flex items-center gap-3">
                        <Timer className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="text-sm">
                          <span className="text-muted-foreground">Arrival: </span>
                          <span className="font-medium">{formatDateTime(details.arrivalTime) || formatDateTime(booking.end_date || undefined)}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Hotel Details */}
                {booking.booking_type === 'hotel' && (
                  <>
                    {(details.location || details.address) && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm">{details.location || details.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="text-sm flex items-center gap-2 flex-wrap">
                        <div>
                          <span className="text-muted-foreground">Check-in: </span>
                          <span className="font-medium">{formatDate(details.checkIn) || formatDate(booking.start_date || undefined) || 'TBD'}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <span className="text-muted-foreground">Check-out: </span>
                          <span className="font-medium">{formatDate(details.checkOut) || formatDate(booking.end_date || undefined) || 'TBD'}</span>
                        </div>
                      </div>
                    </div>
                    {getDuration() && (
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">{getDuration()}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Car Details */}
                {booking.booking_type === 'car' && (
                  <>
                    {(details.pickupLocation || details.dropoffLocation) && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{details.pickupLocation || 'Pickup'}</span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{details.dropoffLocation || 'Drop-off'}</span>
                        </div>
                      </div>
                    )}
                    {(details.pickupTime || booking.start_date) && (
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="text-sm">
                          <span className="text-muted-foreground">Pickup: </span>
                          <span className="font-medium">{formatDateTime(details.pickupTime) || formatDateTime(booking.start_date || undefined)}</span>
                        </div>
                      </div>
                    )}
                    {(details.dropoffTime || booking.end_date) && (
                      <div className="flex items-center gap-3">
                        <Timer className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="text-sm">
                          <span className="text-muted-foreground">Drop-off: </span>
                          <span className="font-medium">{formatDateTime(details.dropoffTime) || formatDateTime(booking.end_date || undefined)}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Plane className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">TravelPlan Pro</h1>
              <p className="text-xs text-muted-foreground">My Travel Schedule</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => setNewTravelDialogOpen(true)}>
              <Send className="w-4 h-4 mr-2" />
              Request Travel
            </Button>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{profile?.full_name || 'Employee'}</p>
              <Badge variant="outline" className="text-xs">Employee</Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Plane className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {bookings.filter(b => b.booking_type === 'flight').length}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">Flights</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {bookings.filter(b => b.booking_type === 'hotel').length}
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">Hotels</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Car className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {bookings.filter(b => b.booking_type === 'car').length}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">Car Rentals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule */}
        {todayBookings.length > 0 && (
          <Card className="mb-8 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Today's Schedule
              </CardTitle>
              <CardDescription>Your travel arrangements for today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="all">All Bookings</TabsTrigger>
            <TabsTrigger value="travel-requests" className="flex items-center gap-1.5">
              <Send className="w-4 h-4" />
              Travel Requests
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              Change Requests
            </TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-foreground mb-2">No upcoming trips</h3>
                  <p className="text-sm text-muted-foreground">
                    Your company admin will add your travel arrangements here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            {bookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-foreground mb-2">No bookings yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Your travel itinerary will appear here once booked
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="travel-requests">
            <MyTravelRequests refreshKey={travelRequestsRefreshKey} />
          </TabsContent>

          <TabsContent value="requests">
            <MyRequestsPanel key={requestsRefreshKey} />
          </TabsContent>

          <TabsContent value="past">
            {pastBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-foreground mb-2">No past trips</h3>
                  <p className="text-sm text-muted-foreground">
                    Your completed travel history will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pastBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} showChangeButton={false} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Change Request Dialog */}
      <ChangeRequestDialog
        booking={selectedBookingForChange}
        open={changeRequestDialogOpen}
        onOpenChange={setChangeRequestDialogOpen}
        onRequestSubmitted={() => setRequestsRefreshKey(k => k + 1)}
      />

      {/* New Travel Request Dialog */}
      <NewTravelRequestDialog
        open={newTravelDialogOpen}
        onOpenChange={setNewTravelDialogOpen}
        onRequestSubmitted={() => setTravelRequestsRefreshKey(k => k + 1)}
      />
    </div>
  );
};
