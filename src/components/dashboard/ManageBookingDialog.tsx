import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangle, X, Edit, MapPin, Calendar, Users, 
  DollarSign, Package, Plane, Hotel, Building2, Car,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BookingDetails {
  booking_id?: string;
  session_id?: string;
  destination?: string;
  attendees?: number;
  budget?: number;
  package?: {
    name?: string;
    total_cost?: number;
    total_price?: number;
    items?: {
      flights?: unknown;
      hotels?: unknown;
      meeting_rooms?: unknown;
      catering?: unknown;
    };
  };
  cart?: {
    items?: Record<string, unknown>;
    subtotal?: number;
    taxes?: number;
    fees?: number;
    total?: number;
  };
  [key: string]: unknown;
}

interface Booking {
  id: string;
  booking_type: string;
  status: string;
  details: BookingDetails;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface ManageBookingDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingUpdated: () => void;
}

export const ManageBookingDialog = ({ 
  booking, 
  open, 
  onOpenChange,
  onBookingUpdated 
}: ManageBookingDialogProps) => {
  const [mode, setMode] = useState<'view' | 'cancel' | 'modify'>('view');
  const [cancelReason, setCancelReason] = useState('');
  const [modifyNotes, setModifyNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!booking) return null;

  const details = booking.details;
  const isPackage = booking.booking_type === 'travel_package';

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const updatedDetails = {
        ...details,
        cancellation_reason: cancelReason,
        cancelled_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          details: JSON.parse(JSON.stringify(updatedDetails))
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Booking cancelled successfully');
      onBookingUpdated();
      onOpenChange(false);
      setMode('view');
      setCancelReason('');
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      toast.error('Failed to cancel booking');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModifyRequest = async () => {
    setIsLoading(true);
    try {
      // Create a change request for this booking
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const requestedChanges = {
        notes: modifyNotes,
        original_details: details
      };

      const { error } = await supabase
        .from('change_requests')
        .insert([{
          booking_id: booking.id,
          user_id: user.id,
          request_type: 'modification',
          description: modifyNotes,
          requested_changes: JSON.parse(JSON.stringify(requestedChanges)),
          status: 'pending'
        }]);

      if (error) throw error;

      toast.success('Modification request submitted');
      onBookingUpdated();
      onOpenChange(false);
      setMode('view');
      setModifyNotes('');
    } catch (error) {
      console.error('Failed to submit modification request:', error);
      toast.error('Failed to submit modification request');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const getPackageItems = () => {
    const items = details.package?.items || details.cart?.items || {};
    return Object.entries(items);
  };

  const getItemIcon = (category: string) => {
    switch (category) {
      case 'flights': return <Plane className="w-4 h-4" />;
      case 'hotels': return <Hotel className="w-4 h-4" />;
      case 'meeting_rooms': return <Building2 className="w-4 h-4" />;
      case 'catering': return <Car className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (!o) {
        setMode('view');
        setCancelReason('');
        setModifyNotes('');
      }
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {mode === 'view' && 'Booking Details'}
            {mode === 'cancel' && 'Cancel Booking'}
            {mode === 'modify' && 'Request Modification'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'view' && 'View and manage your travel booking'}
            {mode === 'cancel' && 'Are you sure you want to cancel this booking?'}
            {mode === 'modify' && 'Describe the changes you need'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'view' && (
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <Badge 
                variant={booking.status === 'confirmed' ? 'default' : 
                        booking.status === 'cancelled' ? 'destructive' : 'secondary'}
              >
                {booking.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Booked {formatDate(booking.created_at)}
              </span>
            </div>

            {/* Destination & Dates */}
            {isPackage && details.destination && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium">{details.destination}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                  </span>
                </div>
                {details.attendees && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{details.attendees} travelers</span>
                  </div>
                )}
                {(details.cart?.total || details.package?.total_cost) && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      ${(details.cart?.total || details.package?.total_cost || details.package?.total_price || 0).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Package Items */}
            {isPackage && getPackageItems().length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Package Includes</h4>
                <div className="space-y-2">
                  {getPackageItems().map(([category, item]) => (
                    <div 
                      key={category}
                      className="flex items-center gap-3 p-2 rounded bg-muted/30"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {getItemIcon(category)}
                      </div>
                      <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Booking ID */}
            {details.booking_id && (
              <div className="text-xs text-muted-foreground">
                Booking ID: {details.booking_id}
              </div>
            )}
          </div>
        )}

        {mode === 'cancel' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">This action cannot be undone</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Cancelling will void all reservations in this booking. 
                  Refund policies may apply based on the vendor terms.
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cancelReason">Reason for cancellation (optional)</Label>
              <Textarea
                id="cancelReason"
                placeholder="Please let us know why you're cancelling..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {mode === 'modify' && (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Describe the changes you need. An admin will review your request 
                and update the booking accordingly.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="modifyNotes">What would you like to change?</Label>
              <Textarea
                id="modifyNotes"
                placeholder="e.g., Change dates to March 15-18, add one more traveler, upgrade hotel room..."
                value={modifyNotes}
                onChange={(e) => setModifyNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {mode === 'view' && booking.status !== 'cancelled' && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setMode('modify')}
                className="w-full sm:w-auto"
              >
                <Edit className="w-4 h-4 mr-2" />
                Request Modification
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setMode('cancel')}
                className="w-full sm:w-auto"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel Booking
              </Button>
            </>
          )}

          {mode === 'cancel' && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setMode('view')}
                disabled={isLoading}
              >
                Go Back
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCancel}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <X className="w-4 h-4 mr-2" />
                )}
                Confirm Cancellation
              </Button>
            </>
          )}

          {mode === 'modify' && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setMode('view')}
                disabled={isLoading}
              >
                Go Back
              </Button>
              <Button 
                onClick={handleModifyRequest}
                disabled={isLoading || !modifyNotes.trim()}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Edit className="w-4 h-4 mr-2" />
                )}
                Submit Request
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
