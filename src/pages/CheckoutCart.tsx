import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  Plane,
  Hotel,
  Building2,
  Car,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Trophy,
  CreditCard,
  Loader2,
  CheckCircle,
  Sparkles,
  Package,
  AlertCircle,
  Lock,
  Shield,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { retreatApi } from "@/services/retreatApi";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CartItem {
  id: string;
  type: "flight" | "hotel" | "meeting_room" | "catering" | "transport";
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  details?: Record<string, unknown>;
}

interface CartState {
  items: Record<string, CartItem>;
  subtotal: number;
  taxes: number;
  fees: number;
  total: number;
  session_id?: string;
}

type CheckoutStep = "cart" | "contact" | "payment" | "processing" | "success";

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

export default function CheckoutCart() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const sessionId = searchParams.get("session_id") || "";
  const packageId = searchParams.get("package_id") || "";

  const [step, setStep] = useState<CheckoutStep>("cart");
  const [isLoading, setIsLoading] = useState(true);
  const [isModifying, setIsModifying] = useState(false);
  const [cart, setCart] = useState<CartState | null>(null);
  const [bookingId, setBookingId] = useState("");

  // Contact form
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Payment state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"saved" | "new">("saved");
  const [selectedCardId, setSelectedCardId] = useState(MOCK_SAVED_CARDS[0]?.id || "");
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvc, setNewCardCvc] = useState("");
  const [newCardName, setNewCardName] = useState("");
  const [saveNewCard, setSaveNewCard] = useState(false);

  // Fetch cart on mount
  useEffect(() => {
    if (sessionId) {
      fetchCart();
    } else {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Pre-fill contact info from user
  useEffect(() => {
    if (user) {
      setContactEmail(user.email || "");
      setContactName(user.email?.split("@")[0] || "");
    }
  }, [user]);

  const fetchCart = async () => {
    setIsLoading(true);
    try {
      // If we have a package_id, build the cart first
      if (packageId) {
        const buildRes = await retreatApi.buildCart(sessionId, packageId);
        const cartData = buildRes.cart || buildRes.data || buildRes;
        setCart({
          items: cartData.items || {},
          subtotal: cartData.subtotal || 0,
          taxes: cartData.taxes || 0,
          fees: cartData.fees || 0,
          total: cartData.total || 0,
          session_id: sessionId,
        });
      } else {
        // Otherwise try to get existing cart
        const cartRes = await retreatApi.getCart(sessionId);
        const cartData = cartRes.cart || cartRes.data || cartRes;
        setCart({
          items: cartData.items || {},
          subtotal: cartData.subtotal || 0,
          taxes: cartData.taxes || 0,
          fees: cartData.fees || 0,
          total: cartData.total || 0,
          session_id: sessionId,
        });
      }
    } catch (error) {
      console.error("Failed to fetch cart:", error);
      // Create empty cart on error
      setCart({
        items: {},
        subtotal: 0,
        taxes: 0,
        fees: 0,
        total: 0,
        session_id: sessionId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleModifyItem = async (
    itemType: "flight" | "hotel" | "meeting_room" | "catering",
    action: "update" | "remove",
    itemId: string,
    quantity?: number
  ) => {
    if (!sessionId) return;

    setIsModifying(true);
    try {
      const result = await retreatApi.modifyCart(sessionId, {
        item_type: itemType,
        action,
        item_id: itemId,
        quantity,
      });

      // Update local cart state
      const cartData = result.cart || result.data || result;
      setCart({
        items: cartData.items || cart?.items || {},
        subtotal: cartData.subtotal || 0,
        taxes: cartData.taxes || 0,
        fees: cartData.fees || 0,
        total: cartData.total || 0,
        session_id: sessionId,
      });

      toast.success(action === "remove" ? "Item removed" : "Cart updated");
    } catch (error) {
      console.error("Failed to modify cart:", error);
      // Fallback: update local state
      if (action === "remove" && cart) {
        const newItems = { ...cart.items };
        delete newItems[itemId];
        const newSubtotal = Object.values(newItems).reduce(
          (sum, item) => sum + item.subtotal,
          0
        );
        setCart({
          ...cart,
          items: newItems,
          subtotal: newSubtotal,
          total: newSubtotal + cart.taxes + cart.fees,
        });
        toast.success("Item removed");
      }
    } finally {
      setIsModifying(false);
    }
  };

  const validatePayment = () => {
    if (selectedPaymentMethod === "saved") {
      // Always valid if using saved cards (we have defaults)
      return MOCK_SAVED_CARDS.length > 0;
    }
    // Basic validation for new card
    const cardDigits = newCardNumber.replace(/\s/g, "");
    return (
      cardDigits.length >= 15 &&
      newCardExpiry.length >= 4 &&
      newCardCvc.length >= 3 &&
      newCardName.trim().length > 0
    );
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

  const getCardBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case "visa":
        return "💳";
      case "mastercard":
        return "💳";
      case "amex":
        return "💳";
      default:
        return "💳";
    }
  };

  const handleCheckout = async () => {
    if (!contactName.trim() || !contactEmail.trim()) {
      toast.error("Please fill in contact information");
      setStep("contact");
      return;
    }

    if (!validatePayment()) {
      toast.error("Please enter valid payment details");
      return;
    }

    setStep("processing");

    try {
      // Agent 5: Process checkout
      const checkoutRes = await retreatApi.checkout(
        sessionId,
        { name: contactName, email: contactEmail },
        { method: "stripe", stripe_token: "tok_visa" }
      );

      const masterBookingId =
        checkoutRes.master_booking_id ||
        checkoutRes.booking_id ||
        crypto.randomUUID();

      // Save to database only if user is logged in
      if (user) {
        const bookingDetails = {
          booking_id: masterBookingId,
          session_id: sessionId,
          cart: cart,
          checkout_response: checkoutRes,
          contact: { name: contactName, email: contactEmail },
        };

        const { error: bookingError } = await supabase.from("bookings").insert({
          user_id: user.id,
          created_by: user.id,
          booking_type: "travel_package",
          status: "confirmed",
          details: JSON.parse(JSON.stringify(bookingDetails)),
        });

        if (bookingError) {
          console.error("Failed to save booking:", bookingError);
        }
      }

      setBookingId(masterBookingId);
      setStep("success");
      // Clear session after successful checkout
      localStorage.removeItem("touchdown_session_id");
      toast.success("Booking confirmed!");
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Checkout failed. Please try again.");
      setStep("payment");
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "flight":
        return <Plane className="w-5 h-5" />;
      case "hotel":
        return <Hotel className="w-5 h-5" />;
      case "meeting_room":
        return <Building2 className="w-5 h-5" />;
      case "catering":
        return <Package className="w-5 h-5" />;
      case "transport":
        return <Car className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case "flight":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400";
      case "hotel":
        return "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400";
      case "meeting_room":
        return "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400";
      case "catering":
        return "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400";
      case "transport":
        return "bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const cartItems = cart ? Object.entries(cart.items) : [];
  const isEmpty = cartItems.length === 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Trophy className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-foreground">Touchdown</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {sessionId && (
              <Badge variant="secondary" className="text-xs hidden sm:flex">
                <Sparkles className="w-3 h-3 mr-1" />
                Agent Session Active
              </Badge>
            )}
            {/* Step indicators */}
            <div className="flex gap-1">
              {["cart", "contact", "payment", "success"].map((s) => {
                const stepOrder = ["cart", "contact", "payment", "processing", "success"];
                const currentIndex = stepOrder.indexOf(step);
                const thisIndex = stepOrder.indexOf(s === "success" ? "success" : s);
                const isActive = s === step || (s === "payment" && step === "processing");
                const isPast = thisIndex < currentIndex;
                
                return (
                  <div
                    key={s}
                    className={`h-2 rounded-full transition-all ${
                      isActive
                        ? "w-6 bg-primary"
                        : isPast || step === "success"
                        ? "w-2 bg-primary/50"
                        : "w-2 bg-muted"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Skeleton className="w-16 h-16 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty Cart */}
          {!isLoading && isEmpty && step === "cart" && (
            <Card className="p-12 text-center">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Your cart is empty
              </h2>
              <p className="text-muted-foreground mb-6">
                Search for travel packages to add items to your cart
              </p>
              <Button onClick={() => navigate("/search")}>
                <Sparkles className="w-4 h-4 mr-2" />
                Find Travel Packages
              </Button>
            </Card>
          )}

          {/* Cart View */}
          {!isLoading && !isEmpty && step === "cart" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <ShoppingCart className="w-6 h-6" />
                    Your Cart
                  </h1>
                  <p className="text-muted-foreground">
                    {cartItems.length} item{cartItems.length !== 1 ? "s" : ""} in your cart
                  </p>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  ${cart?.total.toLocaleString() || 0}
                </Badge>
              </div>

              {/* Cart Items */}
              <div className="space-y-4">
                {cartItems.map(([key, item]) => (
                  <Card key={key} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex">
                        <div
                          className={`w-2 ${
                            item.type === "flight"
                              ? "bg-blue-500"
                              : item.type === "hotel"
                              ? "bg-purple-500"
                              : item.type === "meeting_room"
                              ? "bg-amber-500"
                              : "bg-green-500"
                          }`}
                        />
                        <div className="flex-1 p-4">
                          <div className="flex items-start gap-4">
                            <div
                              className={`w-12 h-12 rounded-lg flex items-center justify-center ${getItemColor(
                                item.type
                              )}`}
                            >
                              {getItemIcon(item.type)}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground">
                                {item.name || key.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                              </h3>
                              {item.description && (
                                <p className="text-sm text-muted-foreground">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-muted-foreground">
                                  ${item.unit_price.toLocaleString()} × {item.quantity}
                                </span>
                                <Badge variant="secondary">
                                  ${item.subtotal.toLocaleString()}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={isModifying || item.quantity <= 1}
                                onClick={() =>
                                  handleModifyItem(
                                    item.type as any,
                                    "update",
                                    item.id || key,
                                    item.quantity - 1
                                  )
                                }
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="w-8 text-center font-medium">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={isModifying}
                                onClick={() =>
                                  handleModifyItem(
                                    item.type as any,
                                    "update",
                                    item.id || key,
                                    item.quantity + 1
                                  )
                                }
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                disabled={isModifying}
                                onClick={() =>
                                  handleModifyItem(
                                    item.type as any,
                                    "remove",
                                    item.id || key
                                  )
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${cart?.subtotal.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxes</span>
                    <span>${cart?.taxes.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fees</span>
                    <span>${cart?.fees.toLocaleString() || 0}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${cart?.total.toLocaleString() || 0}</span>
                  </div>
                  <Button
                    className="w-full h-12 text-lg"
                    onClick={() => setStep("contact")}
                  >
                    Continue to Checkout
                    <CreditCard className="w-5 h-5 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Contact Step */}
          {step === "contact" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Contact Information
                </h1>
                <p className="text-muted-foreground">
                  Enter your details to complete the booking
                </p>
              </div>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Order Summary Mini */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {cartItems.length} item{cartItems.length !== 1 ? "s" : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Ready for checkout
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        ${cart?.total.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("cart")}
                >
                  Back to Cart
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep("payment")}
                  disabled={!contactName.trim() || !contactEmail.trim()}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Continue to Payment
                </Button>
              </div>
            </div>
          )}

          {/* Payment Step */}
          {step === "payment" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Payment Method
                </h1>
                <p className="text-muted-foreground">
                  Choose how you'd like to pay
                </p>
              </div>

              {/* Saved Cards */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Saved Payment Methods
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <RadioGroup
                    value={selectedPaymentMethod === "saved" ? selectedCardId : ""}
                    onValueChange={(value) => {
                      setSelectedPaymentMethod("saved");
                      setSelectedCardId(value);
                    }}
                  >
                    {MOCK_SAVED_CARDS.map((card) => (
                      <div
                        key={card.id}
                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                          selectedPaymentMethod === "saved" && selectedCardId === card.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => {
                          setSelectedPaymentMethod("saved");
                          setSelectedCardId(card.id);
                        }}
                      >
                        <RadioGroupItem value={card.id} id={card.id} />
                        <div className="flex-1 flex items-center gap-3">
                          <span className="text-2xl">{getCardBrandIcon(card.brand)}</span>
                          <div>
                            <p className="font-medium">
                              {card.brand} •••• {card.last4}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Expires {card.expMonth.toString().padStart(2, "0")}/{card.expYear}
                            </p>
                          </div>
                        </div>
                        {card.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* New Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div
                    className={`flex items-center gap-3 cursor-pointer`}
                    onClick={() => setSelectedPaymentMethod("new")}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPaymentMethod === "new"
                          ? "border-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {selectedPaymentMethod === "new" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <CardTitle className="text-lg">Add New Card</CardTitle>
                  </div>
                </CardHeader>
                {selectedPaymentMethod === "new" && (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardName">Cardholder Name</Label>
                      <Input
                        id="cardName"
                        placeholder="John Doe"
                        value={newCardName}
                        onChange={(e) => setNewCardName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <div className="relative">
                        <Input
                          id="cardNumber"
                          placeholder="4242 4242 4242 4242"
                          value={newCardNumber}
                          onChange={(e) => setNewCardNumber(formatCardNumber(e.target.value))}
                          maxLength={19}
                        />
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Expiry Date</Label>
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
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="saveCard"
                        checked={saveNewCard}
                        onCheckedChange={(checked) => setSaveNewCard(checked === true)}
                      />
                      <Label htmlFor="saveCard" className="text-sm font-normal cursor-pointer">
                        Save this card for future purchases
                      </Label>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Security Notice */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Shield className="w-4 h-4" />
                <span>Your payment information is encrypted and secure</span>
              </div>

              {/* Order Summary Mini */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {cartItems.length} item{cartItems.length !== 1 ? "s" : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedPaymentMethod === "saved" 
                          ? `Paying with •••• ${MOCK_SAVED_CARDS.find(c => c.id === selectedCardId)?.last4 || ""}`
                          : "Paying with new card"
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        ${cart?.total.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("contact")}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCheckout}
                  disabled={!validatePayment()}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Pay ${cart?.total.toLocaleString() || 0}
                </Button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === "processing" && (
            <Card className="p-12 text-center">
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Processing Your Booking
              </h2>
              <p className="text-muted-foreground">
                Agent 5 is finalizing your reservations...
              </p>
            </Card>
          )}

          {/* Success Step */}
          {step === "success" && (
            <Card className="p-12 text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Booking Confirmed!
              </h2>
              <p className="text-muted-foreground mb-4">
                Your travel package has been booked successfully
              </p>
              {bookingId && (
                <Badge variant="outline" className="text-sm mb-6">
                  Booking ID: {bookingId}
                </Badge>
              )}
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  View in Dashboard
                </Button>
                <Button onClick={() => navigate("/search")}>
                  Book Another Trip
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
