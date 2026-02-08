import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Plane, Building2, Car, MapPin, Clock, CheckCircle, XCircle, 
  Loader2, Send, DollarSign, Calendar as CalendarIcon
} from 'lucide-react';
import { format } from 'date-fns';

interface TravelRequest {
  id: string;
  request_type: string;
  destination: string;
  purpose: string;
  start_date: string | null;
  end_date: string | null;
  preferences: { notes?: string };
  estimated_budget: number | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface MyTravelRequestsProps {
  refreshKey?: number;
}

export const MyTravelRequests = ({ refreshKey }: MyTravelRequestsProps) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, refreshKey]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('travel_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as TravelRequest[]);
    } catch (error) {
      console.error('Error fetching travel requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-4 h-4" />;
      case 'hotel': return <Building2 className="w-4 h-4" />;
      case 'car': return <Car className="w-4 h-4" />;
      default: return <Plane className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      trip: 'Full Trip',
      flight: 'Flight',
      hotel: 'Hotel',
      car: 'Car Rental',
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'booked':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"><CheckCircle className="w-3 h-3 mr-1" />Booked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
          <Send className="w-5 h-5" />
          My Travel Requests
        </CardTitle>
        <CardDescription>Track the status of your submitted travel requests</CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">No travel requests yet</p>
            <p className="text-sm">Click "Request Travel" to submit a new request</p>
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
                      {getTypeIcon(request.request_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{request.destination}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(request.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTypeBadge(request.request_type)}
                    {getStatusBadge(request.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon className="w-4 h-4" />
                    <span>
                      {request.start_date && format(new Date(request.start_date), 'MMM d')}
                      {request.end_date && ` - ${format(new Date(request.end_date), 'MMM d, yyyy')}`}
                    </span>
                  </div>
                  {request.estimated_budget && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span>Budget: ${request.estimated_budget.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="text-sm">
                  <span className="text-muted-foreground">Purpose: </span>
                  {request.purpose}
                </div>

                {request.preferences?.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Preferences: </span>
                    {request.preferences.notes}
                  </div>
                )}

                {request.admin_notes && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Admin Response:</p>
                    <p className="text-sm">{request.admin_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
