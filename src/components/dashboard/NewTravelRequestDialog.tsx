import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface NewTravelRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestSubmitted: () => void;
}

export const NewTravelRequestDialog = ({
  open,
  onOpenChange,
  onRequestSubmitted,
}: NewTravelRequestDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [requestType, setRequestType] = useState<string>('trip');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [preferences, setPreferences] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState('');

  const resetForm = () => {
    setRequestType('trip');
    setDestination('');
    setPurpose('');
    setStartDate(undefined);
    setEndDate(undefined);
    setPreferences('');
    setEstimatedBudget('');
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!destination.trim()) {
      toast({
        title: 'Destination required',
        description: 'Please enter a destination.',
        variant: 'destructive',
      });
      return;
    }

    if (!purpose.trim()) {
      toast({
        title: 'Purpose required',
        description: 'Please describe the purpose of your trip.',
        variant: 'destructive',
      });
      return;
    }

    if (!startDate) {
      toast({
        title: 'Start date required',
        description: 'Please select a start date.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('travel_requests').insert({
        user_id: user.id,
        request_type: requestType,
        destination: destination.trim(),
        purpose: purpose.trim(),
        start_date: startDate.toISOString(),
        end_date: endDate?.toISOString() || null,
        preferences: preferences.trim() ? { notes: preferences.trim() } : {},
        estimated_budget: estimatedBudget ? parseFloat(estimatedBudget) : null,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Request submitted',
        description: 'Your travel request has been sent to your company admin for approval.',
      });

      onOpenChange(false);
      onRequestSubmitted();
      resetForm();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit travel request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request New Travel</DialogTitle>
          <DialogDescription>
            Submit a travel request for your company admin to review and book.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="request-type">Travel Type</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger id="request-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trip">Full Trip (Flight + Hotel)</SelectItem>
                <SelectItem value="flight">Flight Only</SelectItem>
                <SelectItem value="hotel">Hotel Only</SelectItem>
                <SelectItem value="car">Car Rental</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              placeholder="e.g., Las Vegas, NV"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose of Travel</Label>
            <Textarea
              id="purpose"
              placeholder="e.g., Client meeting, Conference attendance, Team offsite..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date < (startDate || new Date())}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Estimated Budget (optional)</Label>
            <Input
              id="budget"
              type="number"
              placeholder="e.g., 1500"
              value={estimatedBudget}
              onChange={(e) => setEstimatedBudget(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferences">Preferences & Notes (optional)</Label>
            <Textarea
              id="preferences"
              placeholder="e.g., Prefer morning flights, need hotel near convention center, require rental car..."
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              rows={3}
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
