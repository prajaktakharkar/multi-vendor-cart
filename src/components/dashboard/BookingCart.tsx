import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Plane, 
  Building2, 
  MapPin, 
  Car,
  CreditCard,
  Loader2,
  X
} from 'lucide-react';
import { toast } from 'sonner';

export interface CartItem {
  id: string;
  type: 'flight' | 'hotel' | 'venue' | 'transport';
  name: string;
  description: string;
  price: number;
  quantity: number;
  details: Record<string, any>;
}

interface BookingCartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: () => void;
  isCheckingOut?: boolean;
}

const getItemIcon = (type: CartItem['type']) => {
  switch (type) {
    case 'flight': return <Plane className="w-4 h-4" />;
    case 'hotel': return <Building2 className="w-4 h-4" />;
    case 'venue': return <MapPin className="w-4 h-4" />;
    case 'transport': return <Car className="w-4 h-4" />;
  }
};

const getItemTypeBadge = (type: CartItem['type']) => {
  const colors: Record<CartItem['type'], string> = {
    flight: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    hotel: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    venue: 'bg-green-500/10 text-green-600 border-green-500/20',
    transport: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  };
  return colors[type];
};

export const BookingCart = ({
  items,
  onUpdateQuantity,
  onRemove,
  onClear,
  onCheckout,
  isCheckingOut = false,
}: BookingCartProps) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = 0.08;
  const taxes = subtotal * taxRate;
  const total = subtotal + taxes;

  if (items.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="w-5 h-5" />
            Booking Cart
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">Your cart is empty</p>
          <p className="text-muted-foreground text-xs mt-1">
            Add items from search results to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="w-5 h-5" />
            Booking Cart
            <Badge variant="secondary" className="ml-1">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive"
          >
            Clear all
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-3 pb-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-secondary/50 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center flex-shrink-0">
                      {getItemIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 capitalize ${getItemTypeBadge(item.type)}`}
                        >
                          {item.type}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => onRemove(item.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-background rounded-full px-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full"
                      onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-[10px] text-muted-foreground">
                        ${item.price.toFixed(2)} each
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t border-border p-4 space-y-3 flex-shrink-0">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxes & Fees (8%)</span>
              <span>${taxes.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={onCheckout}
            disabled={isCheckingOut}
          >
            {isCheckingOut ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Checkout ${total.toFixed(2)}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
