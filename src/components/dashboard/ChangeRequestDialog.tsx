import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Booking {
  id: string;
  booking_type: 'flight' | 'hotel' | 'car' | 'travel_package';
  details: {
    airline?: string;
    hotelName?: string;
    provider?: string;
    destination?: string;
    [key: string]: unknown;
  };
  start_date: string | null;
  end_date: string | null;
}

interface ChangeRequestDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestSubmitted: () => void;
}

export const ChangeRequestDialog = ({
  booking,
  open,
  onOpenChange,
  onRequestSubmitted,
}: ChangeRequestDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [requestType, setRequestType] = useState<string>('modify');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (!booking || !user) return;

    if (!description.trim()) {
      toast({
        title: 'Description required',
        description: 'Please describe the changes you need.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('change_requests').insert({
        booking_id: booking.id,
        user_id: user.id,
        request_type: requestType,
        description: description.trim(),
        requested_changes: {},
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Request submitted',
        description: 'Your change request has been sent to your company admin.',
      });

      onOpenChange(false);
      onRequestSubmitted();
      setDescription('');
      setRequestType('modify');
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit change request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getBookingTitle = () => {
    if (!booking) return '';
    const details = booking.details as Record<string, string>;
    switch (booking.booking_type) {
      case 'flight':
        return details.airline ? `${details.airline} Flight` : 'Flight Booking';
      case 'hotel':
        return details.hotelName || 'Hotel Booking';
      case 'car':
        return details.provider ? `${details.provider} Rental` : 'Car Rental';
      default:
        return 'Booking';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Changes</DialogTitle>
          <DialogDescription>
            Submit a change request for: <strong>{getBookingTitle()}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="request-type">Request Type</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger id="request-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modify">Modify Details</SelectItem>
                <SelectItem value="reschedule">Reschedule Dates</SelectItem>
                <SelectItem value="cancel">Cancel Booking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              {requestType === 'cancel' ? 'Reason for Cancellation' : 'Describe the Changes Needed'}
            </Label>
            <Textarea
              id="description"
              placeholder={
                requestType === 'cancel'
                  ? 'Please explain why you need to cancel this booking...'
                  : requestType === 'reschedule'
                  ? 'What dates would work better for you?'
                  : 'Describe the changes you need (e.g., different room type, seat preference, etc.)...'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
