import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plane, Building2, Car, LogOut, Calendar,
  Clock, MapPin, ChevronRight, CheckCircle
} from 'lucide-react';
import { format, isAfter, isBefore, isToday, addDays } from 'date-fns';

interface Booking {
  id: string;
  booking_type: 'flight' | 'hotel' | 'car';
  status: 'pending' | 'confirmed' | 'cancelled';
  details: {
    origin?: string;
    destination?: string;
    airline?: string;
    flightNumber?: string;
    hotelName?: string;
    roomType?: string;
    address?: string;
    carType?: string;
    pickupLocation?: string;
    dropoffLocation?: string;
    provider?: string;
  };
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export const EmployeeDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

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

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex">
          <div className={`w-2 ${booking.booking_type === 'flight' ? 'bg-blue-500' : booking.booking_type === 'hotel' ? 'bg-purple-500' : 'bg-green-500'}`} />
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getBookingColor(booking.booking_type)}`}>
                  {getBookingIcon(booking.booking_type)}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground capitalize">
                    {booking.booking_type === 'flight' && booking.details.airline}
                    {booking.booking_type === 'hotel' && booking.details.hotelName}
                    {booking.booking_type === 'car' && booking.details.provider}
                    {!booking.details.airline && !booking.details.hotelName && !booking.details.provider && 
                      `${booking.booking_type} Booking`}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {booking.booking_type === 'flight' && booking.details.flightNumber}
                    {booking.booking_type === 'hotel' && booking.details.roomType}
                    {booking.booking_type === 'car' && booking.details.carType}
                  </p>
                </div>
              </div>
              <Badge className={getStatusColor(booking.status)}>
                {booking.status === 'confirmed' && <CheckCircle className="w-3 h-3 mr-1" />}
                {booking.status}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              {booking.booking_type === 'flight' && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{booking.details.origin} → {booking.details.destination}</span>
                </div>
              )}
              {booking.booking_type === 'hotel' && booking.details.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{booking.details.address}</span>
                </div>
              )}
              {booking.booking_type === 'car' && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{booking.details.pickupLocation} → {booking.details.dropoffLocation}</span>
                </div>
              )}
              
              <div className="flex items-center gap-4">
                {booking.start_date && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>
                      {format(new Date(booking.start_date), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
