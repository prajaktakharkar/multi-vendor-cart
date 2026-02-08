import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plane, Building2, Car, Users, Calendar, LogOut, 
  Plus, ChevronRight, Clock, Pencil, CalendarDays, MessageSquare, Send, Settings, Sparkles, UserCheck 
} from 'lucide-react';
import { format } from 'date-fns';
import { CreateBookingDialog } from './CreateBookingDialog';
import { EditBookingDialog } from './EditBookingDialog';
import { BookingCalendar } from './BookingCalendar';
import { ChangeRequestsPanel } from './ChangeRequestsPanel';
import { TravelRequestsPanel } from './TravelRequestsPanel';
import { TransportCredentialsPanel } from './TransportCredentialsPanel';
import { FlightCredentialsPanel } from './FlightCredentialsPanel';
import { AIFlightBooking } from './AIFlightBooking';
import { TeamRosterPanel } from './TeamRosterPanel';
import { MyBookingsPanel } from './MyBookingsPanel';

interface Booking {
  id: string;
  user_id: string;
  booking_type: 'flight' | 'hotel' | 'car';
  status: 'pending' | 'confirmed' | 'cancelled';
  details: Record<string, unknown>;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface Employee {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
}

export const AdminDashboard = () => {
  const { profile, signOut } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (bookingsData) {
        setBookings(bookingsData as Booking[]);
      }

      // Fetch all employee profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name');

      if (profilesData) {
        setEmployees(profilesData as Employee[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBookingIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-4 h-4" />;
      case 'hotel': return <Building2 className="w-4 h-4" />;
      case 'car': return <Car className="w-4 h-4" />;
      default: return null;
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

  const getEmployeeName = (userId: string) => {
    const employee = employees.find(e => e.user_id === userId);
    return employee?.full_name || employee?.email || 'Unknown';
  };

  const handleEditBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setEditDialogOpen(true);
  };

  const stats = {
    totalBookings: bookings.length,
    flights: bookings.filter(b => b.booking_type === 'flight').length,
    hotels: bookings.filter(b => b.booking_type === 'hotel').length,
    cars: bookings.filter(b => b.booking_type === 'car').length,
    employees: employees.length,
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
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{profile?.full_name || 'Admin'}</p>
              <Badge variant="secondary" className="text-xs">Company Admin</Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.totalBookings}</p>
                  <p className="text-sm text-muted-foreground">Total Bookings</p>
                </div>
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.flights}</p>
                  <p className="text-sm text-muted-foreground">Flights</p>
                </div>
                <Plane className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.hotels}</p>
                  <p className="text-sm text-muted-foreground">Hotels</p>
                </div>
                <Building2 className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.cars}</p>
                  <p className="text-sm text-muted-foreground">Cars</p>
                </div>
                <Car className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.employees}</p>
                  <p className="text-sm text-muted-foreground">Employees</p>
                </div>
                <Users className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="ai-booking" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="ai-booking" className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              AI Booking
            </TabsTrigger>
            <TabsTrigger value="my-bookings" className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              My Bookings
            </TabsTrigger>
            <TabsTrigger value="bookings">All Bookings</TabsTrigger>
            <TabsTrigger value="travel-requests" className="flex items-center gap-1.5">
              <Send className="w-4 h-4" />
              Travel Requests
            </TabsTrigger>
            <TabsTrigger value="change-requests" className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              Change Requests
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="team-roster" className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              Team Roster
            </TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-booking">
            <AIFlightBooking />
          </TabsContent>

          <TabsContent value="my-bookings">
            <MyBookingsPanel />
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Travel Bookings</CardTitle>
                  <CardDescription>Manage all employee travel arrangements</CardDescription>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Booking
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium text-foreground mb-2">No bookings yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first booking to get started
                    </p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Booking
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleEditBooking(booking)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            {getBookingIcon(booking.booking_type)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground capitalize">
                              {booking.booking_type} Booking
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{getEmployeeName(booking.user_id)}</span>
                              {booking.start_date && (
                                <>
                                  <span>•</span>
                                  <Clock className="w-3 h-3" />
                                  <span>{format(new Date(booking.start_date), 'MMM d, yyyy')}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="travel-requests">
            <TravelRequestsPanel 
              employees={employees} 
              onCreateBooking={() => setCreateDialogOpen(true)}
            />
          </TabsContent>

          <TabsContent value="change-requests">
            <ChangeRequestsPanel employees={employees} />
          </TabsContent>

          <TabsContent value="team-roster">
            <TeamRosterPanel />
          </TabsContent>

          <TabsContent value="calendar">
            <BookingCalendar
              bookings={bookings}
              employees={employees}
              onBookingClick={handleEditBooking}
            />
          </TabsContent>

          <TabsContent value="employees">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage employee access and view their schedules</CardDescription>
                </div>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Invite Employee
                </Button>
              </CardHeader>
              <CardContent>
                {employees.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium text-foreground mb-2">No employees yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Invite team members to join your organization
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {employees.map((employee) => (
                      <div
                        key={employee.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {employee.full_name?.charAt(0) || employee.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {employee.full_name || 'Unnamed Employee'}
                            </p>
                            <p className="text-sm text-muted-foreground">{employee.email}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          View Schedule
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <FlightCredentialsPanel />
              <TransportCredentialsPanel />
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Booking Dialog */}
        <CreateBookingDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          employees={employees}
          onBookingCreated={fetchData}
        />

        {/* Edit Booking Dialog */}
        <EditBookingDialog
          booking={selectedBooking}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          employees={employees}
          onBookingUpdated={fetchData}
        />
      </main>
    </div>
  );
};
