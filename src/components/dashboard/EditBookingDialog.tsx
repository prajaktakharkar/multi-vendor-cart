import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plane, Building2, Car, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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

interface EditBookingDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  onBookingUpdated: () => void;
}

export const EditBookingDialog = ({
  booking,
  open,
  onOpenChange,
  employees,
  onBookingUpdated,
}: EditBookingDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [bookingType, setBookingType] = useState<'flight' | 'hotel' | 'car'>('flight');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'cancelled'>('confirmed');
  
  // Flight details
  const [flightDetails, setFlightDetails] = useState({
    airline: '',
    flightNumber: '',
    departure: '',
    arrival: '',
    departureTime: '',
    arrivalTime: '',
  });

  // Hotel details
  const [hotelDetails, setHotelDetails] = useState({
    hotelName: '',
    location: '',
    roomType: '',
    checkIn: '',
    checkOut: '',
  });

  // Car details
  const [carDetails, setCarDetails] = useState({
    provider: '',
    vehicleType: '',
    pickupLocation: '',
    dropoffLocation: '',
    pickupTime: '',
    dropoffTime: '',
  });

  // Load booking data when dialog opens
  useEffect(() => {
    if (booking && open) {
      setBookingType(booking.booking_type);
      setSelectedEmployee(booking.user_id);
      setStatus(booking.status);
      
      const details = booking.details as Record<string, string>;
      
      switch (booking.booking_type) {
        case 'flight':
          setFlightDetails({
            airline: details.airline || '',
            flightNumber: details.flightNumber || '',
            departure: details.departure || '',
            arrival: details.arrival || '',
            departureTime: details.departureTime || '',
            arrivalTime: details.arrivalTime || '',
          });
          break;
        case 'hotel':
          setHotelDetails({
            hotelName: details.hotelName || '',
            location: details.location || '',
            roomType: details.roomType || '',
            checkIn: details.checkIn || '',
            checkOut: details.checkOut || '',
          });
          break;
        case 'car':
          setCarDetails({
            provider: details.provider || '',
            vehicleType: details.vehicleType || '',
            pickupLocation: details.pickupLocation || '',
            dropoffLocation: details.dropoffLocation || '',
            pickupTime: details.pickupTime || '',
            dropoffTime: details.dropoffTime || '',
          });
          break;
      }
    }
  }, [booking, open]);

  const handleUpdate = async () => {
    if (!booking) return;
    
    setLoading(true);

    try {
      let details: Json = {};
      let startDate: string | null = null;
      let endDate: string | null = null;

      switch (bookingType) {
        case 'flight':
          details = flightDetails as Json;
          startDate = flightDetails.departureTime || null;
          endDate = flightDetails.arrivalTime || null;
          break;
        case 'hotel':
          details = hotelDetails as Json;
          startDate = hotelDetails.checkIn || null;
          endDate = hotelDetails.checkOut || null;
          break;
        case 'car':
          details = carDetails as Json;
          startDate = carDetails.pickupTime || null;
          endDate = carDetails.dropoffTime || null;
          break;
      }

      const { error } = await supabase
        .from('bookings')
        .update({
          user_id: selectedEmployee,
          booking_type: bookingType,
          status,
          details,
          start_date: startDate,
          end_date: endDate,
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Booking updated successfully');
      onOpenChange(false);
      onBookingUpdated();
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Failed to update booking');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Booking cancelled');
      setShowCancelConfirm(false);
      onOpenChange(false);
      onBookingUpdated();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!booking) return;
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Booking deleted');
      setShowCancelConfirm(false);
      onOpenChange(false);
      onBookingUpdated();
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Failed to delete booking');
    } finally {
      setLoading(false);
    }
  };

  if (!booking) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
            <DialogDescription>
              Update the booking details or change its status
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Status & Employee */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned Employee</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.user_id} value={employee.user_id}>
                        {employee.full_name || employee.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Booking Type Tabs */}
            <Tabs value={bookingType} onValueChange={(v) => setBookingType(v as typeof bookingType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="flight" className="flex items-center gap-2">
                  <Plane className="w-4 h-4" />
                  Flight
                </TabsTrigger>
                <TabsTrigger value="hotel" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Hotel
                </TabsTrigger>
                <TabsTrigger value="car" className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Car
                </TabsTrigger>
              </TabsList>

              {/* Flight Form */}
              <TabsContent value="flight" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Airline</Label>
                    <Input
                      placeholder="e.g., Delta Airlines"
                      value={flightDetails.airline}
                      onChange={(e) => setFlightDetails({ ...flightDetails, airline: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Flight Number</Label>
                    <Input
                      placeholder="e.g., DL1234"
                      value={flightDetails.flightNumber}
                      onChange={(e) => setFlightDetails({ ...flightDetails, flightNumber: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departure City</Label>
                    <Input
                      placeholder="e.g., New York (JFK)"
                      value={flightDetails.departure}
                      onChange={(e) => setFlightDetails({ ...flightDetails, departure: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Arrival City</Label>
                    <Input
                      placeholder="e.g., Los Angeles (LAX)"
                      value={flightDetails.arrival}
                      onChange={(e) => setFlightDetails({ ...flightDetails, arrival: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departure Time</Label>
                    <Input
                      type="datetime-local"
                      value={flightDetails.departureTime}
                      onChange={(e) => setFlightDetails({ ...flightDetails, departureTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Arrival Time</Label>
                    <Input
                      type="datetime-local"
                      value={flightDetails.arrivalTime}
                      onChange={(e) => setFlightDetails({ ...flightDetails, arrivalTime: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Hotel Form */}
              <TabsContent value="hotel" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hotel Name</Label>
                    <Input
                      placeholder="e.g., Marriott Downtown"
                      value={hotelDetails.hotelName}
                      onChange={(e) => setHotelDetails({ ...hotelDetails, hotelName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      placeholder="e.g., Las Vegas, NV"
                      value={hotelDetails.location}
                      onChange={(e) => setHotelDetails({ ...hotelDetails, location: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Room Type</Label>
                  <Select 
                    value={hotelDetails.roomType} 
                    onValueChange={(v) => setHotelDetails({ ...hotelDetails, roomType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Room</SelectItem>
                      <SelectItem value="deluxe">Deluxe Room</SelectItem>
                      <SelectItem value="suite">Suite</SelectItem>
                      <SelectItem value="executive">Executive Suite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Check-in Date</Label>
                    <Input
                      type="date"
                      value={hotelDetails.checkIn}
                      onChange={(e) => setHotelDetails({ ...hotelDetails, checkIn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Check-out Date</Label>
                    <Input
                      type="date"
                      value={hotelDetails.checkOut}
                      onChange={(e) => setHotelDetails({ ...hotelDetails, checkOut: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Car Form */}
              <TabsContent value="car" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select 
                      value={carDetails.provider} 
                      onValueChange={(v) => setCarDetails({ ...carDetails, provider: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uber">Uber</SelectItem>
                        <SelectItem value="lyft">Lyft</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                        <SelectItem value="hertz">Hertz</SelectItem>
                        <SelectItem value="avis">Avis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Vehicle Type</Label>
                    <Select 
                      value={carDetails.vehicleType} 
                      onValueChange={(v) => setCarDetails({ ...carDetails, vehicleType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="economy">Economy</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="suv">SUV</SelectItem>
                        <SelectItem value="luxury">Luxury</SelectItem>
                        <SelectItem value="van">Van</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pickup Location</Label>
                    <Input
                      placeholder="e.g., LAX Airport"
                      value={carDetails.pickupLocation}
                      onChange={(e) => setCarDetails({ ...carDetails, pickupLocation: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Drop-off Location</Label>
                    <Input
                      placeholder="e.g., Convention Center"
                      value={carDetails.dropoffLocation}
                      onChange={(e) => setCarDetails({ ...carDetails, dropoffLocation: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pickup Time</Label>
                    <Input
                      type="datetime-local"
                      value={carDetails.pickupTime}
                      onChange={(e) => setCarDetails({ ...carDetails, pickupTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Drop-off Time</Label>
                    <Input
                      type="datetime-local"
                      value={carDetails.dropoffTime}
                      onChange={(e) => setCarDetails({ ...carDetails, dropoffTime: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              variant="destructive"
              onClick={() => setShowCancelConfirm(true)}
              disabled={loading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The booking will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
