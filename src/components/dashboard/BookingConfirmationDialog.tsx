import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  Plane, 
  Building2, 
  MapPin, 
  Car, 
  Download, 
  Mail,
  Calendar,
  Receipt
} from 'lucide-react';
import { CartItem } from './BookingCart';

interface BookingConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  confirmationNumber: string;
  items: CartItem[];
  subtotal: number;
  taxes: number;
  total: number;
  bookedAt: string;
}

const getItemIcon = (type: CartItem['type']) => {
  switch (type) {
    case 'flight': return <Plane className="w-4 h-4" />;
    case 'hotel': return <Building2 className="w-4 h-4" />;
    case 'venue': return <MapPin className="w-4 h-4" />;
    case 'transport': return <Car className="w-4 h-4" />;
  }
};

export const BookingConfirmationDialog = ({
  open,
  onClose,
  confirmationNumber,
  items,
  subtotal,
  taxes,
  total,
  bookedAt,
}: BookingConfirmationDialogProps) => {
  const formattedDate = new Date(bookedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <DialogTitle className="text-2xl">Booking Confirmed!</DialogTitle>
          <DialogDescription>
            Your travel package has been successfully booked
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Confirmation Number */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Confirmation Number
            </p>
            <p className="text-2xl font-bold text-primary font-mono tracking-wider">
              {confirmationNumber}
            </p>
          </div>

          {/* Booking Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Booked on {formattedDate}</span>
          </div>

          <Separator />

          {/* Order Items */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Order Details
            </h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
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
          </div>

          <Separator />

          {/* Price Summary */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxes & Fees</span>
              <span>${taxes.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold text-base">
              <span>Total Paid</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => {
              // Mock email confirmation
              alert('Confirmation email sent!');
            }}>
              <Mail className="w-4 h-4 mr-2" />
              Email Receipt
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => {
              // Mock download
              alert('Receipt downloaded!');
            }}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>

          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
