import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import {
  Package,
  Plane,
  Building2,
  MapPin,
  Car,
  Calendar,
  Receipt,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';

interface BookingItem {
  id: string;
  type: 'flight' | 'hotel' | 'venue' | 'transport';
  name: string;
  description: string;
  price: number;
  quantity: number;
}

interface BookingDetails {
  confirmationNumber?: string;
  items?: BookingItem[];
  subtotal?: number;
  taxes?: number;
  total?: number;
  bookedAt?: string;
  [key: string]: unknown;
}

interface Booking {
  id: string;
  user_id: string;
  booking_type: string;
  status: string;
  details: BookingDetails;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const getItemIcon = (type: string) => {
  switch (type) {
    case 'flight': return <Plane className="w-4 h-4" />;
    case 'hotel': return <Building2 className="w-4 h-4" />;
    case 'venue': return <MapPin className="w-4 h-4" />;
    case 'transport': return <Car className="w-4 h-4" />;
    default: return <Package className="w-4 h-4" />;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'confirmed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
    default: return null;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'confirmed':
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Confirmed</Badge>;
    case 'cancelled':
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Cancelled</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export const MyBookingsPanel = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings((data || []) as Booking[]);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', selectedBooking.id);

      if (error) throw error;

      toast.success('Booking cancelled successfully');
      setCancelDialogOpen(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      toast.error('Failed to cancel booking. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const getBookingTitle = (booking: Booking) => {
    if (booking.booking_type === 'travel_package' && booking.details?.items?.length) {
      return `Travel Package (${booking.details.items.length} items)`;
    }
    return `${booking.booking_type.charAt(0).toUpperCase()}${booking.booking_type.slice(1)} Booking`;
  };

  const getBookingTotal = (booking: Booking) => {
    if (booking.details?.total) {
      return `$${booking.details.total.toFixed(2)}`;
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            My Bookings
          </CardTitle>
          <CardDescription>
            View your past bookings and confirmation details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-medium text-foreground mb-2">No bookings yet</h3>
              <p className="text-sm text-muted-foreground">
                Your confirmed bookings will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedBooking(booking)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {booking.booking_type === 'travel_package' ? (
                        <Package className="w-5 h-5 text-primary" />
                      ) : (
                        getItemIcon(booking.booking_type)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {getBookingTitle(booking)}
                        </p>
                        {getStatusBadge(booking.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                        {booking.details?.confirmationNumber && (
                          <>
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                              {booking.details.confirmationNumber}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(booking.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-primary">{getBookingTotal(booking)}</p>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Details Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getStatusIcon(selectedBooking?.status || '')}
              Booking Details
            </DialogTitle>
            <DialogDescription>
              {selectedBooking?.details?.confirmationNumber && (
                <span className="font-mono">
                  Confirmation: {selectedBooking.details.confirmationNumber}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              {/* Status & Date */}
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedBooking.status)}
                <span className="text-sm text-muted-foreground">
                  {format(new Date(selectedBooking.created_at), 'PPpp')}
                </span>
              </div>

              <Separator />

              {/* Items */}
              {selectedBooking.details?.items && selectedBooking.details.items.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    Items
                  </h4>
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-2">
                      {selectedBooking.details.items.map((item, index) => (
                        <div
                          key={item.id || index}
                          className="flex items-start justify-between gap-3 bg-secondary/50 rounded-lg p-3"
                        >
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <div className="w-7 h-7 rounded-md bg-background flex items-center justify-center flex-shrink-0">
                              {getItemIcon(item.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {item.description}
                              </p>
                              {item.quantity > 1 && (
                                <Badge variant="secondary" className="text-[10px] mt-1">
                                  Qty: {item.quantity}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm font-semibold whitespace-nowrap">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <Separator />

              {/* Price Summary */}
              {selectedBooking.details?.total && (
                <div className="space-y-2 text-sm">
                  {selectedBooking.details.subtotal && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${selectedBooking.details.subtotal.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedBooking.details.taxes && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxes & Fees</span>
                      <span>${selectedBooking.details.taxes.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span className="text-primary">
                      ${selectedBooking.details.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {selectedBooking.status !== 'cancelled' && (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Booking
                  </Button>
                )}
                <Button 
                  variant={selectedBooking.status === 'cancelled' ? 'default' : 'outline'} 
                  className="flex-1" 
                  onClick={() => setSelectedBooking(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your booking 
              {selectedBooking?.details?.confirmationNumber && (
                <span className="font-mono font-medium"> ({selectedBooking.details.confirmationNumber})</span>
              )} will be cancelled and you may be subject to cancellation fees.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Booking'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
