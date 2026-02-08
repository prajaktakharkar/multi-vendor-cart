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
  Plane, Building2, Car, Clock, CheckCircle, XCircle, 
  MessageSquare, Loader2, AlertCircle 
} from 'lucide-react';
import { format } from 'date-fns';

interface ChangeRequest {
  id: string;
  booking_id: string;
  user_id: string;
  request_type: string;
  description: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  booking?: {
    booking_type: string;
    details: Record<string, unknown>;
    start_date: string | null;
  };
}

interface Employee {
  user_id: string;
  email: string;
  full_name: string | null;
}

interface ChangeRequestsPanelProps {
  employees: Employee[];
}

export const ChangeRequestsPanel = ({ employees }: ChangeRequestsPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from('change_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      if (requestsData) {
        // Fetch associated bookings
        const bookingIds = [...new Set(requestsData.map(r => r.booking_id))];
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('id, booking_type, details, start_date')
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

  const getEmployeeName = (userId: string) => {
    const employee = employees.find(e => e.user_id === userId);
    return employee?.full_name || employee?.email || 'Unknown';
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
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
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

  const handleReview = (request: ChangeRequest) => {
    setSelectedRequest(request);
    setAdminNotes('');
    setReviewDialogOpen(true);
  };

  const processRequest = async (action: 'approved' | 'rejected') => {
    if (!selectedRequest || !user) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('change_requests')
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
        description: `The change request has been ${action}.`,
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

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const reviewedRequests = requests.filter(r => r.status !== 'pending');

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
              Pending Requests
              {pendingRequests.length > 0 && (
                <Badge variant="secondary">{pendingRequests.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>Employee change requests awaiting your review</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pending requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        {getBookingIcon(request.booking?.booking_type)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getEmployeeName(request.user_id)}</span>
                          {getRequestTypeBadge(request.request_type)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {request.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleReview(request)}>
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reviewed Requests */}
        {reviewedRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Request History</CardTitle>
              <CardDescription>Previously reviewed change requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reviewedRequests.slice(0, 10).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start justify-between p-4 rounded-lg border border-border"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        {getBookingIcon(request.booking?.booking_type)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getEmployeeName(request.user_id)}</span>
                          {getRequestTypeBadge(request.request_type)}
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {request.description}
                        </p>
                        {request.admin_notes && (
                          <p className="text-sm text-muted-foreground italic">
                            Admin: {request.admin_notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Review Change Request</DialogTitle>
            <DialogDescription>
              From: <strong>{selectedRequest && getEmployeeName(selectedRequest.user_id)}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                {getRequestTypeBadge(selectedRequest.request_type)}
                <span className="text-sm text-muted-foreground">
                  {format(new Date(selectedRequest.created_at), 'MMM d, yyyy')}
                </span>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">{selectedRequest.description}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-notes">Admin Notes (optional)</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Add any notes or explanations for the employee..."
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
