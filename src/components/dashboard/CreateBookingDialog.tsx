import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plane, Building2, Car, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
}

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  onBookingCreated: () => void;
}

export const CreateBookingDialog = ({
  open,
  onOpenChange,
  employees,
  onBookingCreated,
}: CreateBookingDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bookingType, setBookingType] = useState<'flight' | 'hotel' | 'car'>('flight');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
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

  const resetForm = () => {
    setBookingType('flight');
    setSelectedEmployee('');
    setStartDate('');
    setEndDate('');
    setFlightDetails({
      airline: '',
      flightNumber: '',
      departure: '',
      arrival: '',
      departureTime: '',
      arrivalTime: '',
    });
    setHotelDetails({
      hotelName: '',
      location: '',
      roomType: '',
      checkIn: '',
      checkOut: '',
    });
    setCarDetails({
      provider: '',
      vehicleType: '',
      pickupLocation: '',
      dropoffLocation: '',
      pickupTime: '',
      dropoffTime: '',
    });
  };

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }

    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }

    setLoading(true);

    try {
      let details: Json = {};

      switch (bookingType) {
        case 'flight':
          details = flightDetails as Json;
          break;
        case 'hotel':
          details = hotelDetails as Json;
          break;
        case 'car':
          details = carDetails as Json;
          break;
      }

      const { error } = await supabase.from('bookings').insert([{
        user_id: selectedEmployee,
        created_by: user?.id as string,
        booking_type: bookingType,
        status: 'confirmed',
        details,
        start_date: startDate,
        end_date: endDate || null,
      }]);

      if (error) throw error;

      toast.success('Booking created successfully');
      resetForm();
      onOpenChange(false);
      onBookingCreated();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
          <DialogDescription>
            Create a travel booking and assign it to an employee
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>Assign to Employee *</Label>
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
                    onChange={(e) => {
                      setFlightDetails({ ...flightDetails, departureTime: e.target.value });
                      if (!startDate) setStartDate(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Arrival Time</Label>
                  <Input
                    type="datetime-local"
                    value={flightDetails.arrivalTime}
                    onChange={(e) => {
                      setFlightDetails({ ...flightDetails, arrivalTime: e.target.value });
                      if (!endDate) setEndDate(e.target.value);
                    }}
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
                    onChange={(e) => {
                      setHotelDetails({ ...hotelDetails, checkIn: e.target.value });
                      if (!startDate) setStartDate(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Check-out Date</Label>
                  <Input
                    type="date"
                    value={hotelDetails.checkOut}
                    onChange={(e) => {
                      setHotelDetails({ ...hotelDetails, checkOut: e.target.value });
                      if (!endDate) setEndDate(e.target.value);
                    }}
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
                    onChange={(e) => {
                      setCarDetails({ ...carDetails, pickupTime: e.target.value });
                      if (!startDate) setStartDate(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Drop-off Time</Label>
                  <Input
                    type="datetime-local"
                    value={carDetails.dropoffTime}
                    onChange={(e) => {
                      setCarDetails({ ...carDetails, dropoffTime: e.target.value });
                      if (!endDate) setEndDate(e.target.value);
                    }}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea placeholder="Any special requests or notes..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
