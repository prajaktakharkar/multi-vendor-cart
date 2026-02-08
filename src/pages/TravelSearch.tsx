import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plane, Hotel, MapPin, Car, Loader2, ArrowLeft, Trophy, 
  Calendar, Users, DollarSign, Sparkles, Package, ShoppingCart,
  ChevronRight, Building2, CheckCircle, Star, Clock
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { retreatApi, Weights } from "@/services/retreatApi";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DiscoverySkeleton } from "@/components/travel/DiscoverySkeleton";
import { CartSkeleton } from "@/components/travel/CartSkeleton";

type Step = 'input' | 'discovering' | 'packages' | 'building-cart' | 'cart' | 'success';

interface CartItem {
  item: any;
  quantity: number;
  subtotal: number;
  unit_price: number;
}

interface CartDetails {
  items: Record<string, CartItem>;
  subtotal: number;
  taxes: number;
  fees: number;
  total: number;
}

export default function TravelSearch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Flow state
  const [step, setStep] = useState<Step>('input');
  const [sessionId, setSessionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentAgent, setCurrentAgent] = useState(0);
  
  // Input form state
  const [destination, setDestination] = useState(searchParams.get('city') || "New Orleans");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 172800000).toISOString().split('T')[0]);
  const [attendees, setAttendees] = useState(10);
  const [budget, setBudget] = useState(15000);
  
  // Results state
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [cartDetails, setCartDetails] = useState<CartDetails | null>(null);
  const [bookingId, setBookingId] = useState<string>("");
  
  // Weights for ranking
  const [weights, setWeights] = useState<Weights>({
    category_importance: { flights: 30, hotels: 40, meeting_rooms: 15, catering: 15 },
    hotels: { price_weight: 50, trust_weight: 40, location_weight: 25, amenities_weight: 15 }
  });

  // Step 1: Analyze requirements and discover options
  const handleSearch = async () => {
    const structuredInput = `Plan a trip to ${destination} from ${startDate} to ${endDate} for ${attendees} people. Total budget is $${budget}. Looking for flights, hotels, and local transportation.`;
    
    setIsLoading(true);
    setStep('discovering');
    setCurrentAgent(1);
    
    try {
      // Agent 1: Analyze requirements
      const analyzeRes = await retreatApi.analyzeRequirements(structuredInput);
      setSessionId(analyzeRes.session_id);
      setCurrentAgent(2);
      
      // Agent 2: Discover options
      await retreatApi.discoverOptions(analyzeRes.session_id);
      setCurrentAgent(3);
      
      // Agent 3: Rank packages
      const rankRes = await retreatApi.rankPackages(analyzeRes.session_id, weights);
      const packageData = rankRes.packages || rankRes.data || rankRes;
      setPackages(Array.isArray(packageData) ? packageData : []);
      
      setStep('packages');
      setCurrentAgent(0);
      toast.success('Found travel packages for you!');
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed. Please try again.');
      setStep('input');
      setCurrentAgent(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-rank with updated weights
  const handleRerank = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    
    try {
      const rankRes = await retreatApi.rankPackages(sessionId, weights);
      const packageData = rankRes.packages || rankRes.data || rankRes;
      setPackages(Array.isArray(packageData) ? packageData : []);
      toast.success('Rankings updated!');
    } catch (error) {
      toast.error('Failed to update rankings');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Select package and build cart
  const handleSelectPackage = async (pkg: any) => {
    setIsLoading(true);
    setSelectedPackage(pkg);
    setStep('building-cart');
    
    try {
      // Agent 4: Build cart
      const cartRes = await retreatApi.buildCart(sessionId, pkg.package_id || pkg.id);
      const cartData = cartRes.cart || cartRes.data || cartRes;
      setCartDetails(cartData);
      setStep('cart');
    } catch (error) {
      toast.error('Failed to build cart');
      setStep('packages');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Checkout
  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please sign in to complete booking');
      navigate('/auth');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Agent 5: Process checkout
      const checkoutRes = await retreatApi.checkout(
        sessionId,
        { name: user.email?.split('@')[0] || 'Guest', email: user.email || '' },
        { method: 'stripe', stripe_token: 'tok_visa' }
      );
      
      const masterBookingId = checkoutRes.master_booking_id || checkoutRes.booking_id || crypto.randomUUID();
      
      // Save booking to database
      const bookingDetails = {
        booking_id: masterBookingId,
        session_id: sessionId,
        destination,
        attendees,
        budget,
        package: selectedPackage,
        cart: cartDetails,
        checkout_response: checkoutRes
      };
      
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          created_by: user.id,
          booking_type: 'travel_package',
          status: 'confirmed',
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
          details: JSON.parse(JSON.stringify(bookingDetails))
        });
      
      if (bookingError) {
        console.error('Failed to save booking:', bookingError);
        toast.error('Booking completed but failed to save to your account');
      }
      
      setBookingId(masterBookingId);
      setStep('success');
      toast.success('Booking confirmed and saved!');
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error('Checkout failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'packages') setStep('input');
    else if (step === 'cart' || step === 'building-cart') setStep('packages');
    else if (step === 'success') {
      setStep('input');
      setSessionId('');
      setPackages([]);
      setCartDetails(null);
    } else navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
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
                Session Active
              </Badge>
            )}
            {/* Progress indicators */}
            <div className="flex gap-1">
              {['input', 'packages', 'cart', 'success'].map((s, i) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all ${
                    s === step || (s === 'input' && step === 'discovering')
                      ? 'w-6 bg-primary'
                      : 'w-2 bg-muted'
                  }`}
                />
              ))}
            </div>
            {user ? (
              <Link to="/dashboard">
                <Button variant="outline" size="sm">Dashboard</Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Step 1: Input Form */}
          {step === 'input' && (
            <div className="space-y-8">
              <div className="text-center">
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI-Powered Search
                </Badge>
                <h1 className="text-4xl font-bold text-foreground mb-3">
                  Plan Your Game Day Trip
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Our AI agents will search vendors, compare options, and find the best packages for your group.
                </p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Plane, label: "Flights", desc: "Best routes" },
                  { icon: Hotel, label: "Hotels", desc: "Near venues" },
                  { icon: MapPin, label: "Venues", desc: "Premium spaces" },
                  { icon: Car, label: "Transport", desc: "Group shuttles" },
                ].map(({ icon: Icon, label, desc }) => (
                  <Card key={label} className="text-center p-4">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <p className="font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </Card>
                ))}
              </div>

              {/* Search Form */}
              <Card className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-sm font-medium">Destination</Label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="Where are you heading?"
                        className="pl-12 h-14 text-lg"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Start Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="pl-12 h-12"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">End Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="pl-12 h-12"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Group Size</Label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="number"
                        value={attendees}
                        onChange={(e) => setAttendees(parseInt(e.target.value) || 1)}
                        min={1}
                        className="pl-12 h-12"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Total Budget ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="number"
                        value={budget}
                        onChange={(e) => setBudget(parseInt(e.target.value) || 1000)}
                        min={1000}
                        step={500}
                        className="pl-12 h-12"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSearch}
                  disabled={isLoading || !destination}
                  className="w-full mt-8 h-14 text-lg gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Find Travel Packages
                </Button>

              </Card>
            </div>
          )}

          {/* Discovering Phase with Skeleton */}
          {step === 'discovering' && (
            <DiscoverySkeleton currentAgent={currentAgent} />
          )}

          {/* Step 2: Package Results */}
          {step === 'packages' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Travel Packages</h2>
                  <p className="text-muted-foreground">
                    Found {packages.length} packages for {destination}
                  </p>
                </div>
                <Badge variant="secondary">
                  {attendees} travelers • ${budget.toLocaleString()} budget
                </Badge>
              </div>

              {/* Preference Sliders */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4 text-foreground">Adjust Your Preferences</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Price Focus</span>
                      <span className="text-muted-foreground">
                        {(weights.hotels?.price_weight || 50) > 50 ? 'Budget-Friendly' : 'Premium'}
                      </span>
                    </div>
                    <Slider
                      value={[weights.hotels?.price_weight || 50]}
                      onValueChange={([v]) => setWeights({
                        ...weights,
                        hotels: { ...weights.hotels, price_weight: v }
                      })}
                      max={100}
                      step={10}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Trust & Reviews</span>
                      <span className="text-muted-foreground">
                        {(weights.hotels?.trust_weight || 50)}%
                      </span>
                    </div>
                    <Slider
                      value={[weights.hotels?.trust_weight || 50]}
                      onValueChange={([v]) => setWeights({
                        ...weights,
                        hotels: { ...weights.hotels, trust_weight: v }
                      })}
                      max={100}
                      step={10}
                    />
                  </div>
                </div>
                <Button variant="outline" onClick={handleRerank} disabled={isLoading} className="mt-4">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Update Rankings
                </Button>
              </Card>

              {/* Package Cards */}
              <div className="space-y-4">
                {packages.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No packages found. Try adjusting your search.</p>
                  </Card>
                ) : (
                  packages.map((pkg, idx) => (
                    <Card key={pkg.package_id || pkg.id || idx} className="overflow-hidden hover:border-primary/50 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {idx === 0 && (
                                <Badge className="bg-primary text-primary-foreground">
                                  <Star className="w-3 h-3 mr-1" />
                                  Best Match
                                </Badge>
                              )}
                              <h3 className="text-lg font-semibold text-foreground">
                                {pkg.name || pkg.items?.hotels?.vendor || `Package ${idx + 1}`}
                              </h3>
                            </div>
                            
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                              {pkg.items?.flights && (
                                <span className="flex items-center gap-1">
                                  <Plane className="w-4 h-4" />
                                  {pkg.items.flights.vendor || 'Flight included'}
                                </span>
                              )}
                              {pkg.items?.hotels && (
                                <span className="flex items-center gap-1">
                                  <Hotel className="w-4 h-4" />
                                  {pkg.items.hotels.vendor || 'Hotel included'}
                                </span>
                              )}
                              {pkg.items?.meeting_rooms && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-4 h-4" />
                                  Venue included
                                </span>
                              )}
                            </div>

                            {pkg.score !== undefined && (
                              <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 max-w-32 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min(pkg.score * 10, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  Match: {Math.round(pkg.score * 10)}%
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-foreground">
                                ${(pkg.total_cost || pkg.total_price || 0).toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">total package</p>
                            </div>
                            <Button onClick={() => handleSelectPackage(pkg)} disabled={isLoading}>
                              {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  Select
                                  <ChevronRight className="w-4 h-4 ml-1" />
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Building Cart Skeleton */}
          {step === 'building-cart' && (
            <CartSkeleton />
          )}

          {/* Step 3: Cart */}
          {step === 'cart' && cartDetails && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Review Your Booking</h2>
                <p className="text-muted-foreground">
                  Confirm your selections before checkout
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Cart Items */}
                <div className="md:col-span-2 space-y-4">
                  {Object.entries(cartDetails.items || {}).map(([category, item]: [string, any]) => (
                    <Card key={category} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            {category === 'flights' && <Plane className="w-6 h-6 text-primary" />}
                            {category === 'hotels' && <Hotel className="w-6 h-6 text-primary" />}
                            {category === 'meeting_rooms' && <Building2 className="w-6 h-6 text-primary" />}
                            {category === 'catering' && <MapPin className="w-6 h-6 text-primary" />}
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground capitalize">
                              {category.replace('_', ' ')}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {item.item?.vendor || item.item?.name || 'Included in package'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {item.quantity || 1}
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold text-foreground">
                          ${(item.subtotal || item.unit_price || 0).toLocaleString()}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Order Summary */}
                <Card className="p-6 h-fit sticky top-24">
                  <h3 className="font-semibold text-foreground mb-4">Order Summary</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${(cartDetails.subtotal || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxes</span>
                      <span>${(cartDetails.taxes || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fees</span>
                      <span>${(cartDetails.fees || 0).toLocaleString()}</span>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="text-primary">${(cartDetails.total || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <Button onClick={handleCheckout} disabled={isLoading} className="w-full mt-6 h-12">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ShoppingCart className="w-4 h-4 mr-2" />
                    )}
                    {user ? 'Complete Booking' : 'Sign In to Book'}
                  </Button>
                </Card>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <Card className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-3">Booking Confirmed!</h2>
              <p className="text-muted-foreground mb-2">
                Your trip to {destination} has been booked.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Booking ID: <span className="font-mono">{bookingId}</span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => navigate('/dashboard')}>
                  View in Dashboard
                </Button>
                <Button variant="outline" onClick={handleBack}>
                  Plan Another Trip
                </Button>
              </div>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}