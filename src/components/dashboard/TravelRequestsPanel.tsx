import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Plane, Building2, Car, MapPin, Clock, CheckCircle, XCircle, 
  Loader2, Send, DollarSign, Calendar as CalendarIcon, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface TravelRequest {
  id: string;
  user_id: string;
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

interface Employee {
  user_id: string;
  email: string;
  full_name: string | null;
}

interface TravelRequestsPanelProps {
  employees: Employee[];
  onCreateBooking?: (request: TravelRequest) => void;
}

export const TravelRequestsPanel = ({ employees, onCreateBooking }: TravelRequestsPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TravelRequest | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('travel_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as TravelRequest[]);
    } catch (error) {
      console.error('Error fetching travel requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (userId: string) => {
    const employee = employees.find(e => e.user_id === userId);
    return employee?.full_name || employee?.email || 'Unknown';
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
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'booked':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" />Booked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleReview = (request: TravelRequest) => {
    setSelectedRequest(request);
    setAdminNotes('');
    setReviewDialogOpen(true);
  };

  const processRequest = async (action: 'approved' | 'rejected') => {
    if (!selectedRequest || !user) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('travel_requests')
        .update({
          status: action,
          admin_notes: adminNotes.trim() || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: `Request ${action}`,
        description: action === 'approved' 
          ? 'You can now create a booking for this request.' 
          : 'The employee has been notified.',
      });

      setReviewDialogOpen(false);
      fetchRequests();
    } catch (error) {
      console.error('Error processing request:', error);
      toast({
        title: 'Error',
        description: 'Failed to process the request.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateBooking = (request: TravelRequest) => {
    if (onCreateBooking) {
      onCreateBooking(request);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const otherRequests = requests.filter(r => !['pending', 'approved'].includes(r.status));

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
    <>
      <div className="space-y-6">
        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Pending Travel Requests
              {pendingRequests.length > 0 && (
                <Badge variant="secondary">{pendingRequests.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>New travel requests awaiting your approval</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pending travel requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
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
                            <span className="font-medium">{getEmployeeName(request.user_id)}</span>
                            {getTypeBadge(request.request_type)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{request.destination}</span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleReview(request)}>
                        Review
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarIcon className="w-4 h-4" />
                        <span>
                          {request.start_date && format(new Date(request.start_date), 'MMM d')}
                          {request.end_date && ` - ${format(new Date(request.end_date), 'MMM d')}`}
                        </span>
                      </div>
                      {request.estimated_budget && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="w-4 h-4" />
                          <span>Budget: ${request.estimated_budget.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{request.purpose}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approved - Ready to Book */}
        {approvedRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Ready to Book
                <Badge variant="secondary">{approvedRequests.length}</Badge>
              </CardTitle>
              <CardDescription>Approved requests awaiting booking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {approvedRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        {getTypeIcon(request.request_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getEmployeeName(request.user_id)}</span>
                          <span className="text-muted-foreground">→</span>
                          <span>{request.destination}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {request.start_date && format(new Date(request.start_date), 'MMM d')}
                          {request.end_date && ` - ${format(new Date(request.end_date), 'MMM d, yyyy')}`}
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => handleCreateBooking(request)}>
                      Create Booking
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* History */}
        {otherRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Request History</CardTitle>
              <CardDescription>Completed and rejected requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {otherRequests.slice(0, 10).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        {getTypeIcon(request.request_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getEmployeeName(request.user_id)}</span>
                          <span className="text-muted-foreground">→</span>
                          <span>{request.destination}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(request.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Review Travel Request</DialogTitle>
            <DialogDescription>
              From: <strong>{selectedRequest && getEmployeeName(selectedRequest.user_id)}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 flex-wrap">
                {getTypeBadge(selectedRequest.request_type)}
                <span className="text-sm text-muted-foreground">
                  Submitted {format(new Date(selectedRequest.created_at), 'MMM d, yyyy')}
                </span>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{selectedRequest.destination}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {selectedRequest.start_date && format(new Date(selectedRequest.start_date), 'MMM d, yyyy')}
                    {selectedRequest.end_date && ` - ${format(new Date(selectedRequest.end_date), 'MMM d, yyyy')}`}
                  </span>
                </div>

                {selectedRequest.estimated_budget && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>Estimated Budget: ${selectedRequest.estimated_budget.toLocaleString()}</span>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-1">Purpose:</p>
                  <p className="text-sm">{selectedRequest.purpose}</p>
                </div>

                {selectedRequest.preferences?.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium mb-1">Preferences:</p>
                    <p className="text-sm">{selectedRequest.preferences.notes}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-notes">Response Notes (optional)</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Add any notes for the employee..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => processRequest('rejected')}
              disabled={processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => processRequest('approved')}
              disabled={processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
