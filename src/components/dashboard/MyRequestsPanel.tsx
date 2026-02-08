import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, Building2, Car, Clock, CheckCircle, XCircle, MessageSquare, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ChangeRequest {
  id: string;
  booking_id: string;
  request_type: string;
  description: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  booking?: {
    booking_type: string;
    details: Record<string, unknown>;
  };
}

export const MyRequestsPanel = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      const { data: requestsData, error } = await supabase
        .from('change_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (requestsData) {
        // Fetch associated bookings
        const bookingIds = [...new Set(requestsData.map(r => r.booking_id))];
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('id, booking_type, details')
          .in('id', bookingIds);

        const bookingsMap = new Map(bookingsData?.map(b => [b.id, b]));

        const enrichedRequests = requestsData.map(r => ({
          ...r,
          booking: bookingsMap.get(r.booking_id),
        }));

        setRequests(enrichedRequests as ChangeRequest[]);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBookingIcon = (type?: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-4 h-4" />;
      case 'hotel': return <Building2 className="w-4 h-4" />;
      case 'car': return <Car className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRequestTypeBadge = (type: string) => {
    switch (type) {
      case 'modify': return <Badge variant="outline">Modify</Badge>;
      case 'reschedule': return <Badge variant="secondary">Reschedule</Badge>;
      case 'cancel': return <Badge variant="destructive">Cancel</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getBookingTitle = (booking?: ChangeRequest['booking']) => {
    if (!booking) return 'Booking';
    const details = booking.details as Record<string, string>;
    switch (booking.booking_type) {
      case 'flight':
        return details.airline ? `${details.airline} Flight` : 'Flight';
      case 'hotel':
        return details.hotelName || 'Hotel';
      case 'car':
        return details.provider || 'Car Rental';
      default:
        return 'Booking';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          My Change Requests
        </CardTitle>
        <CardDescription>Track the status of your itinerary change requests</CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">No change requests yet</p>
            <p className="text-sm">Click "Request Changes" on any booking to submit a request</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="p-4 rounded-lg border border-border space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      {getBookingIcon(request.booking?.booking_type)}
                    </div>
                    <div>
                      <p className="font-medium">{getBookingTitle(request.booking)}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRequestTypeBadge(request.request_type)}
                    {getStatusBadge(request.status)}
                  </div>
                </div>

                <div className="pl-13 space-y-2">
                  <p className="text-sm text-muted-foreground">{request.description}</p>
                  
                  {request.admin_notes && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Admin Response:</p>
                      <p className="text-sm">{request.admin_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
