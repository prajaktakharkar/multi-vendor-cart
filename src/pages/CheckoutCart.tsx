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
} from "lucide-react";
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

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Please sign in to complete checkout");
      navigate("/auth");
      return;
    }

    if (!contactName.trim() || !contactEmail.trim()) {
      toast.error("Please fill in contact information");
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

      // Save to database
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

      setBookingId(masterBookingId);
      setStep("success");
      toast.success("Booking confirmed!");
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Checkout failed. Please try again.");
      setStep("contact");
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
              {["cart", "contact", "success"].map((s, i) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all ${
                    (s === step || (s === "contact" && step === "processing"))
                      ? "w-6 bg-primary"
                      : step === "success" || 
                        (step === "contact" && s === "cart") ||
                        (step === "processing" && s === "cart")
                      ? "w-2 bg-primary/50"
                      : "w-2 bg-muted"
                  }`}
                />
              ))}
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
                  onClick={handleCheckout}
                  disabled={!contactName.trim() || !contactEmail.trim()}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Complete Booking
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
