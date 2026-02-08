import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, Calendar, Users, DollarSign, Package, Plane, 
  Hotel, Building2, Car, Loader2, CreditCard, ArrowRight,
  ShoppingCart, Lock, CheckCircle, ArrowLeft
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
    items?: Record<string, unknown>;
  };
  cart?: {
    items?: Record<string, CartItemData>;
    subtotal?: number;
    taxes?: number;
    fees?: number;
    total?: number;
  };
  [key: string]: unknown;
}

interface CartItemData {
  id?: string;
  type?: string;
  name?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  subtotal?: number;
  price?: number;
  details?: Record<string, unknown>;
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

interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

// Mock saved cards
const MOCK_SAVED_CARDS: SavedCard[] = [
  { id: "card_1", last4: "4242", brand: "Visa", expMonth: 12, expYear: 2027, isDefault: true },
  { id: "card_2", last4: "5555", brand: "Mastercard", expMonth: 6, expYear: 2026, isDefault: false },
];

interface BookingCheckoutDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingUpdated: () => void;
}

type CheckoutStep = 'select' | 'cart' | 'payment' | 'processing' | 'success';

export const BookingCheckoutDialog = ({ 
  booking, 
  open, 
  onOpenChange,
  onBookingUpdated 
}: BookingCheckoutDialogProps) => {
  const [step, setStep] = useState<CheckoutStep>('select');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  
  // Payment state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"saved" | "new">("saved");
  const [selectedCardId, setSelectedCardId] = useState(MOCK_SAVED_CARDS[0]?.id || "");
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvc, setNewCardCvc] = useState("");
  const [newCardName, setNewCardName] = useState("");

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open && booking) {
      setStep('select');
      setSelectedItems(new Set());
      setSelectedPaymentMethod("saved");
      setSelectedCardId(MOCK_SAVED_CARDS[0]?.id || "");
      setNewCardNumber("");
      setNewCardExpiry("");
      setNewCardCvc("");
      setNewCardName("");
    }
  }, [open, booking]);

  if (!booking) return null;

  const details = booking.details;
  const isPackage = booking.booking_type === 'travel_package';

  // Extract all line items from cart or package
  const getLineItems = (): Array<{ key: string; item: CartItemData }> => {
    const cartItems = details.cart?.items || {};
    const packageItems = details.package?.items || {};
    
    const items: Array<{ key: string; item: CartItemData }> = [];
    
    // Process cart items
    Object.entries(cartItems).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        items.push({ key, item: value as CartItemData });
      }
    });
    
    // Process package items if no cart items
    if (items.length === 0) {
      Object.entries(packageItems).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          const item = value as CartItemData;
          items.push({ 
            key, 
            item: {
              ...item,
              type: key,
              name: item.name || key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
              unit_price: item.unit_price || item.price || 0,
              subtotal: item.subtotal || item.price || 0,
              quantity: item.quantity || 1,
            }
          });
        }
      });
    }
    
    return items;
  };

  const lineItems = getLineItems();

  const toggleItem = (key: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedItems(newSelected);
  };

  const selectAllItems = () => {
    if (selectedItems.size === lineItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(lineItems.map(li => li.key)));
    }
  };

  const getSelectedTotal = () => {
    return lineItems
      .filter(li => selectedItems.has(li.key))
      .reduce((sum, li) => sum + (li.item.subtotal || li.item.unit_price || 0), 0);
  };

  const getItemIcon = (type?: string) => {
    switch (type) {
      case 'flights':
      case 'flight': return <Plane className="w-4 h-4" />;
      case 'hotels':
      case 'hotel': return <Hotel className="w-4 h-4" />;
      case 'meeting_rooms':
      case 'meeting_room': return <Building2 className="w-4 h-4" />;
      case 'transport':
      case 'catering': return <Car className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getItemColor = (type?: string) => {
    switch (type) {
      case 'flights':
      case 'flight': return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400';
      case 'hotels':
      case 'hotel': return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400';
      case 'meeting_rooms':
      case 'meeting_room': return 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400';
      case 'transport':
      case 'catering': return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const validatePayment = () => {
    if (selectedPaymentMethod === "saved") {
      return MOCK_SAVED_CARDS.length > 0 && selectedCardId;
    }
    const cardDigits = newCardNumber.replace(/\s/g, "");
    return (
      cardDigits.length >= 15 &&
      newCardExpiry.length >= 4 &&
      newCardCvc.length >= 3 &&
      newCardName.trim().length > 0
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const handleProcessPayment = async () => {
    if (!validatePayment()) {
      toast.error("Please enter valid payment details");
      return;
    }

    setStep('processing');
    setIsLoading(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update booking with payment info
      const paymentDetails = {
        ...details,
        payment_processed_at: new Date().toISOString(),
        payment_method: selectedPaymentMethod === "saved" 
          ? `Saved card ending in ${MOCK_SAVED_CARDS.find(c => c.id === selectedCardId)?.last4}`
          : `New card ending in ${newCardNumber.slice(-4)}`,
        selected_items: Array.from(selectedItems),
        amount_paid: getSelectedTotal(),
      };

      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed',
          details: JSON.parse(JSON.stringify(paymentDetails))
        })
        .eq('id', booking.id);

      if (error) throw error;

      setStep('success');
      toast.success('Payment processed successfully!');
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment failed. Please try again.');
      setStep('payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (step === 'success') {
      onBookingUpdated();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'select' && <><Package className="w-5 h-5 text-primary" /> Select Items</>}
            {step === 'cart' && <><ShoppingCart className="w-5 h-5 text-primary" /> Review Cart</>}
            {step === 'payment' && <><CreditCard className="w-5 h-5 text-primary" /> Payment</>}
            {step === 'processing' && <><Loader2 className="w-5 h-5 text-primary animate-spin" /> Processing</>}
            {step === 'success' && <><CheckCircle className="w-5 h-5 text-green-500" /> Payment Complete</>}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Choose items from your itinerary to checkout'}
            {step === 'cart' && 'Review your selected items before payment'}
            {step === 'payment' && 'Complete your payment securely'}
            {step === 'processing' && 'Please wait while we process your payment...'}
            {step === 'success' && 'Your payment has been processed successfully'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step: Select Items */}
          {step === 'select' && (
            <div className="space-y-4">
              {/* Booking Summary */}
              {isPackage && details.destination && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
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
                </div>
              )}

              {/* Select All */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={selectedItems.size === lineItems.length && lineItems.length > 0}
                    onCheckedChange={selectAllItems}
                    id="select-all"
                  />
                  <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Select All ({lineItems.length} items)
                  </Label>
                </div>
                <Badge variant="outline">
                  {selectedItems.size} selected
                </Badge>
              </div>

              <Separator />

              {/* Line Items */}
              <ScrollArea className="h-[300px] pr-4">
                {lineItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No items available in this booking</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lineItems.map(({ key, item }) => (
                      <div 
                        key={key}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer
                          ${selectedItems.has(key) 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50 hover:bg-muted/30'
                          }`}
                        onClick={() => toggleItem(key)}
                      >
                        <Checkbox 
                          checked={selectedItems.has(key)}
                          onCheckedChange={() => toggleItem(key)}
                          className="mt-1"
                        />
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getItemColor(item.type || key)}`}>
                          {getItemIcon(item.type || key)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-foreground truncate">
                            {item.name || key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                          </h4>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                          )}
                          {item.quantity && item.quantity > 1 && (
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-foreground">
                            ${(item.subtotal || item.unit_price || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Selected Total */}
              {selectedItems.size > 0 && (
                <div className="bg-primary/5 rounded-lg p-4 flex items-center justify-between">
                  <span className="font-medium">Selected Total</span>
                  <span className="text-xl font-bold text-primary">
                    ${getSelectedTotal().toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Step: Cart Review */}
          {step === 'cart' && (
            <div className="space-y-4">
              <ScrollArea className="h-[250px] pr-4">
                <div className="space-y-3">
                  {lineItems
                    .filter(li => selectedItems.has(li.key))
                    .map(({ key, item }) => (
                      <div 
                        key={key}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getItemColor(item.type || key)}`}>
                          {getItemIcon(item.type || key)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-foreground">
                            {item.name || key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                          </h4>
                          {item.quantity && item.quantity > 1 && (
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          )}
                        </div>
                        <span className="font-semibold">
                          ${(item.subtotal || item.unit_price || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                </div>
              </ScrollArea>

              <Separator />

              {/* Order Summary */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${getSelectedTotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxes & Fees</span>
                  <span>${(getSelectedTotal() * 0.08).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">${(getSelectedTotal() * 1.08).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step: Payment */}
          {step === 'payment' && (
            <div className="space-y-6">
              {/* Payment Method Selection */}
              <RadioGroup 
                value={selectedPaymentMethod} 
                onValueChange={(v) => setSelectedPaymentMethod(v as "saved" | "new")}
              >
                {/* Saved Cards */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Saved Payment Methods</Label>
                  {MOCK_SAVED_CARDS.map((card) => (
                    <div
                      key={card.id}
                      className={`flex items-center gap-3 p-4 rounded-lg border transition-colors cursor-pointer
                        ${selectedPaymentMethod === "saved" && selectedCardId === card.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                        }`}
                      onClick={() => {
                        setSelectedPaymentMethod("saved");
                        setSelectedCardId(card.id);
                      }}
                    >
                      <RadioGroupItem value="saved" checked={selectedPaymentMethod === "saved" && selectedCardId === card.id} />
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{card.brand} •••• {card.last4}</p>
                        <p className="text-xs text-muted-foreground">Expires {card.expMonth}/{card.expYear}</p>
                      </div>
                      {card.isDefault && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* New Card */}
                <div 
                  className={`space-y-4 p-4 rounded-lg border transition-colors
                    ${selectedPaymentMethod === "new" ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setSelectedPaymentMethod("new")}
                  >
                    <RadioGroupItem value="new" />
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">Add New Card</span>
                  </div>

                  {selectedPaymentMethod === "new" && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <Input
                          id="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          value={newCardNumber}
                          onChange={(e) => setNewCardNumber(formatCardNumber(e.target.value))}
                          maxLength={19}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">Expiry</Label>
                          <Input
                            id="expiry"
                            placeholder="MM/YY"
                            value={newCardExpiry}
                            onChange={(e) => setNewCardExpiry(formatExpiry(e.target.value))}
                            maxLength={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvc">CVC</Label>
                          <Input
                            id="cvc"
                            placeholder="123"
                            value={newCardCvc}
                            onChange={(e) => setNewCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            maxLength={4}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardName">Name on Card</Label>
                        <Input
                          id="cardName"
                          placeholder="John Doe"
                          value={newCardName}
                          onChange={(e) => setNewCardName(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </RadioGroup>

              {/* Secure Payment Badge */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Lock className="w-3 h-3" />
                <span>Secure payment powered by Stripe</span>
              </div>
            </div>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <div className="py-12 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <h3 className="text-lg font-medium mb-2">Processing your payment...</h3>
              <p className="text-muted-foreground">Please don't close this window</p>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">Payment Successful!</h3>
              <p className="text-muted-foreground mb-4">
                Your payment of ${(getSelectedTotal() * 1.08).toFixed(2)} has been processed.
              </p>
              <Badge variant="outline" className="text-sm">
                Booking ID: {booking.id.slice(0, 8).toUpperCase()}
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          {step === 'select' && (
            <>
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button 
                onClick={() => setStep('cart')} 
                disabled={selectedItems.size === 0}
                className="w-full sm:w-auto"
              >
                Continue to Cart
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}

          {step === 'cart' && (
            <>
              <Button variant="outline" onClick={() => setStep('select')} className="w-full sm:w-auto">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep('payment')} className="w-full sm:w-auto">
                Proceed to Payment
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}

          {step === 'payment' && (
            <>
              <Button variant="outline" onClick={() => setStep('cart')} className="w-full sm:w-auto">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleProcessPayment} 
                disabled={!validatePayment() || isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Pay ${(getSelectedTotal() * 1.08).toFixed(2)}
              </Button>
            </>
          )}

          {step === 'success' && (
            <Button onClick={handleClose} className="w-full sm:w-auto">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
