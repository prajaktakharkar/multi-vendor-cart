import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Edit3 } from 'lucide-react';

interface ChangeRequestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  confirmationNumber?: string;
  onSuccess?: () => void;
}

const REQUEST_TYPES = [
  { value: 'date_change', label: 'Change Travel Dates' },
  { value: 'traveler_change', label: 'Change Traveler Details' },
  { value: 'add_items', label: 'Add Items/Services' },
  { value: 'remove_items', label: 'Remove Items/Services' },
  { value: 'upgrade', label: 'Upgrade/Downgrade Services' },
  { value: 'special_request', label: 'Special Request' },
  { value: 'other', label: 'Other' },
];

export const ChangeRequestFormDialog = ({
  open,
  onOpenChange,
  bookingId,
  confirmationNumber,
  onSuccess,
}: ChangeRequestFormDialogProps) => {
  const { user } = useAuth();
  const [requestType, setRequestType] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !requestType || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('change_requests').insert({
        booking_id: bookingId,
        user_id: user.id,
        request_type: requestType,
        description: description.trim(),
        requested_changes: {
          type: requestType,
          details: description.trim(),
          submitted_at: new Date().toISOString(),
        },
      });

      if (error) throw error;

      toast.success('Modification request submitted successfully');
      setRequestType('');
      setDescription('');
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error('Error submitting change request:', err);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRequestType('');
      setDescription('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Request Modification
          </DialogTitle>
          <DialogDescription>
            Submit a change request for booking
            {confirmationNumber && (
              <span className="font-mono font-medium"> {confirmationNumber}</span>
            )}
            . Our team will review and respond within 24-48 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="request-type">Type of Change *</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger id="request-type">
                <SelectValue placeholder="Select what you'd like to change" />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Please describe the changes you'd like to make in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/1000 characters
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !requestType || !description.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
