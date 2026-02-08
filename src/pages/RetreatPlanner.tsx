import { useState, useEffect } from "react";
import { retreatApi, Weights } from "@/services/retreatApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Loader2, ArrowLeft, Sparkles, Plane, Building2, MapPin, Calculator, ShoppingCart, CheckCircle, Package, Plus, Minus, Trash2, CreditCard, Lock, ShieldCheck, Calendar, Users, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, Download, Save, History, CreditCard as CardIcon } from "lucide-react";

type Step = 'analyze' | 'discover' | 'rank' | 'cart' | 'checkout' | 'success' | 'dashboard';

interface PaymentDetails {
    cardNumber: string;
    expiry: string;
    cvc: string;
    name: string;
}

export default function RetreatPlanner() {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('analyze');
    const [sessionId, setSessionId] = useState<string>("");
    const [userInput, setUserInput] = useState("Plan a 2-day retreat in Paris for 15 people. Budget $10,000.");
    const [isLoading, setIsLoading] = useState(false);
    const [discoveryResults, setDiscoveryResults] = useState<any>(null);
    const [packages, setPackages] = useState<any[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<any>(null);
    const [cartDetails, setCartDetails] = useState<any>(null);
    const [bookingId, setBookingId] = useState<string>("");
    const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
        cardNumber: "",
        expiry: "",
        cvc: "",
        name: "Manan Shah"
    });

    // Structured Input State
    const [destination, setDestination] = useState("Paris");
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(Date.now() + 172800000).toISOString().split('T')[0]); // +2 days
    const [attendees, setAttendees] = useState(15);
    const [budget, setBudget] = useState(10000);

    const [weights, setWeights] = useState<Weights>({
        category_importance: { flights: 30, hotels: 40, meeting_rooms: 15, catering: 15 },
        hotels: { price_weight: 50, trust_weight: 40, location_weight: 25, amenities_weight: 15 }
    });
    const [bookings, setBookings] = useState<any[]>([]);
    const [saveCard, setSaveCard] = useState(false);

    // Persistence Logic
    useEffect(() => {
        const savedBookings = localStorage.getItem("retreat_bookings");
        if (savedBookings) setBookings(JSON.parse(savedBookings));

        const savedCardInfo = localStorage.getItem("retreat_card_info");
        if (savedCardInfo) {
            setPaymentDetails(JSON.parse(savedCardInfo));
            setSaveCard(true);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("retreat_bookings", JSON.stringify(bookings));
    }, [bookings]);

    useEffect(() => {
        if (saveCard) {
            localStorage.setItem("retreat_card_info", JSON.stringify(paymentDetails));
        } else {
            localStorage.removeItem("retreat_card_info");
        }
    }, [paymentDetails, saveCard]);

    const downloadReceipt = (booking: any) => {
        const content = `RETREAT BOOKING RECEIPT\n\nBooking ID: ${booking.id}\nPackage: ${booking.packageName}\nTotal: $${booking.total?.toLocaleString()}\nDate: ${new Date(booking.date).toLocaleDateString()}\n\nThank you for choosing Retreat Planner!`;
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `receipt-${booking.id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Receipt download started");
    };

    const handleAnalyze = async () => {
        setIsLoading(true);
        // Build structured prompt
        const structuredInput = `Plan a retreat in ${destination} from ${startDate} to ${endDate} for ${attendees} people. Total budget is $${budget}.`;

        try {
            const res = await retreatApi.analyzeRequirements(structuredInput, sessionId || undefined);
            setSessionId(res.session_id);
            setStep('discover');
            handleDiscover(res.session_id);
        } catch (error) {
            toast.error("Failed to analyze requirements");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDiscover = async (sid: string) => {
        setIsLoading(true);
        try {
            const res = await retreatApi.discoverOptions(sid);
            setDiscoveryResults(res);
            handleRank(sid);
        } catch (error) {
            toast.error("Discovery failed");
            setIsLoading(false);
        }
    };

    const handleRank = async (sid: string, updatedWeights?: Weights) => {
        setIsLoading(true);
        try {
            const currentWeights = updatedWeights || weights;
            const res = await retreatApi.rankPackages(sid, currentWeights);
            // Handle various response formats
            const packageData = res.packages || res.data || res;
            let sortedPackages = Array.isArray(packageData) ? [...packageData] : [];

            // Explicit client-side sort as fallback/enhancement
            const priceWeight = currentWeights.hotels?.price_weight || 50;
            const trustWeight = currentWeights.hotels?.trust_weight || 50;

            sortedPackages.sort((a, b) => {
                // 1. Backend matches (Highest score first)
                if (a.score !== undefined && b.score !== undefined && a.score !== b.score) {
                    return b.score - a.score;
                }

                // 2. Price Preference
                const priceA = a.total_cost || a.total_price || 0;
                const priceB = b.total_cost || b.total_price || 0;

                if (priceWeight > 50) {
                    // High Price Focus = Affordability. Cheap first (ascending).
                    if (priceA !== priceB) return priceA - priceB;
                } else if (priceWeight < 50) {
                    // Low Price Focus = Premium. Expensive first (descending).
                    if (priceA !== priceB) return priceB - priceA;
                }

                // 3. Fallback to original rank
                return (a.rank || 0) - (b.rank || 0);
            });

            setPackages(sortedPackages);
            setStep('rank');
            toast.success("Rankings updated based on your preferences");
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            toast.error("Ranking failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateWeights = (category: string, param: string, value: number) => {
        const newWeights = {
            ...weights,
            [category]: {
                ...(weights[category as keyof Weights] as any),
                [param]: value
            }
        };
        setWeights(newWeights);
    };

    const handleSelectPackage = async (pkg: any) => {
        setIsLoading(true);
        try {
            const res = await retreatApi.buildCart(sessionId, pkg.package_id || pkg.id);
            // Handle both {cart: {...}} and direct {...} response formats
            const cartData = res.cart || res.data || res;
            setCartDetails(cartData);
            setSelectedPackage(pkg);
            setStep('cart');
        } catch (error) {
            toast.error("Failed to build cart");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckout = async () => {
        if (!paymentDetails.cardNumber || !paymentDetails.expiry || !paymentDetails.cvc) {
            toast.error("Please fill in all payment details");
            return;
        }
        setIsLoading(true);
        try {
            const res = await retreatApi.checkout(sessionId,
                { name: paymentDetails.name, email: "manan@example.com" },
                { method: "stripe", stripe_token: "tok_visa" }
            );
            setBookingId(res.master_booking_id);
            setStep('success');

            // Save booking to list
            const newBooking = {
                id: res.master_booking_id,
                packageName: selectedPackage.items?.hotels?.vendor || "Custom Retreat",
                total: cartDetails.total,
                date: new Date().toISOString(),
                items: cartDetails.items
            };
            setBookings([newBooking, ...bookings]);

            toast.success("Payment successful!");
        } catch (error) {
            toast.error("Checkout failed");
        } finally {
            setIsLoading(false);
        }
    };

    const updateCartLocal = (newItems: any) => {
        const subtotal = Object.values(newItems).reduce((acc: number, item: any) => acc + (item.subtotal || 0), 0) as number;
        const taxes = subtotal * 0.0875;
        const fees = subtotal * 0.025;
        const total = subtotal + taxes + fees;

        setCartDetails({
            ...cartDetails,
            items: newItems,
            subtotal,
            taxes,
            fees,
            total
        });
    };

    const handleUpdateQuantity = async (category: string, delta: number) => {
        if (!cartDetails?.items) return;
        const items = { ...cartDetails.items };
        const item = { ...items[category] };

        // Ensure we preserve the unit price
        const unitPrice = item.unit_price || item.item?.price || item.item?.unit_price || 0;
        const newQty = Math.max(0, (item.quantity || 0) + delta);

        if (newQty === 0) {
            handleRemoveItem(category);
            return;
        }

        // Try to call backend API, fall back to local update
        try {
            const res = await retreatApi.modifyCart(sessionId, {
                item_type: category as 'flight' | 'hotel' | 'meeting_room' | 'catering',
                action: 'update',
                item_id: item.item?.id || item.id,
                quantity: newQty,
            });
            // If backend returns updated cart, use it
            if (res.cart) {
                setCartDetails(res.cart);
                toast.info(`Updated ${category.replace('_', ' ')} quantity`);
                return;
            }
        } catch (error) {
            console.log('Backend modify failed, using local update');
        }

        // Local fallback
        item.quantity = newQty;
        item.unit_price = unitPrice;
        item.subtotal = unitPrice * newQty;
        items[category] = item;

        updateCartLocal(items);
        toast.info(`Updated ${category.replace('_', ' ')} quantity`);
    };

    const handleRemoveItem = async (category: string) => {
        if (!cartDetails?.items) return;
        
        // Try to call backend API
        try {
            const item = cartDetails.items[category];
            const res = await retreatApi.modifyCart(sessionId, {
                item_type: category as 'flight' | 'hotel' | 'meeting_room' | 'catering',
                action: 'remove',
                item_id: item.item?.id || item.id,
            });
            if (res.cart) {
                setCartDetails(res.cart);
                toast.error(`Removed ${category.replace('_', ' ')} from cart`);
                return;
            }
        } catch (error) {
            console.log('Backend remove failed, using local update');
        }

        // Local fallback
        const items = { ...cartDetails.items };
        delete items[category];
        updateCartLocal(items);
        toast.error(`Removed ${category.replace('_', ' ')} from cart`);
    };

    const handleBack = () => {
        if (step === 'analyze') {
            navigate(-1);
        } else if (step === 'discover' || step === 'rank') {
            setStep('analyze');
        } else if (step === 'cart') {
            setStep('rank');
        } else if (step === 'checkout') {
            setStep('cart');
        } else if (step === 'success' || step === 'dashboard') {
            setStep('analyze');
            setSessionId("");
        }
    };

    return (
        <div className="min-h-screen bg-[#fcfcfc] text-slate-900 p-6 relative overflow-hidden font-sans">
            {/* Mesh Gradient Background (Light Mode) */}
            <div className="absolute inset-0 z-0 opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            <div className="max-w-4xl mx-auto space-y-8 relative z-10">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={handleBack} className="gap-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                    <div className="flex items-center gap-6">
                        <Button variant="ghost" onClick={() => setStep('dashboard')} className="gap-2 text-slate-500 hover:text-primary transition-colors">
                            <LayoutDashboard className="w-4 h-4" /> Dashboard
                        </Button>
                        <div className="flex items-center gap-2">
                            {['analyze', 'rank', 'cart', 'checkout'].map((s, idx) => (
                                <div key={s} className={`w-2 h-2 rounded-full transition-all duration-500 ${(s === step || (s === 'rank' && step === 'discover')) ? 'w-8 bg-primary shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-slate-200'
                                    }`} />
                            ))}
                        </div>
                    </div>
                </div>

                {step === 'analyze' && (
                    <Card className="p-10 space-y-10 bg-white/70 backdrop-blur-xl border-slate-200/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden group rounded-[2.5rem]">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="text-center space-y-3 relative z-10">
                            <h2 className="text-4xl font-black tracking-tight text-slate-900">Plan Your Retreat</h2>
                            <p className="text-slate-500 text-lg">Our AI agents will find and rank the best options for your team.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                            <div className="space-y-3 md:col-span-2">
                                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Where are you heading?</label>
                                <div className="relative">
                                    <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-primary w-6 h-6" />
                                    <Input
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value)}
                                        placeholder="e.g., Paris, Tokyo, New York..."
                                        className="text-lg pl-16 h-20 bg-white/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-primary/50 transition-all rounded-[1.5rem] shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Start Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/60 w-5 h-5 pointer-events-none z-10" />
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="text-lg pl-16 h-16 bg-white/50 border-slate-200 text-slate-900 focus:border-primary/50 transition-all rounded-[1.25rem] shadow-sm block w-full appearance-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-2">End Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/60 w-5 h-5 pointer-events-none z-10" />
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="text-lg pl-16 h-16 bg-white/50 border-slate-200 text-slate-900 focus:border-primary/50 transition-all rounded-[1.25rem] shadow-sm block w-full appearance-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Attendees</label>
                                <div className="relative">
                                    <Users className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/60 w-5 h-5" />
                                    <Input
                                        type="number"
                                        value={attendees}
                                        onChange={(e) => setAttendees(parseInt(e.target.value))}
                                        className="text-lg pl-16 h-16 bg-white/50 border-slate-200 text-slate-900 focus:border-primary/50 transition-all rounded-[1.25rem] shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Total Budget ($)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/60 w-5 h-5" />
                                    <Input
                                        type="number"
                                        value={budget}
                                        onChange={(e) => setBudget(parseInt(e.target.value))}
                                        className="text-lg pl-16 h-16 bg-white/50 border-slate-200 text-slate-900 focus:border-primary/50 transition-all rounded-[1.25rem] shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2 pt-6">
                                <Button onClick={handleAnalyze} disabled={isLoading} className="w-full h-20 text-2xl font-black gap-4 rounded-[1.5rem] shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]">
                                    {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Sparkles className="w-8 h-8" />}
                                    Analyze & Find Packages
                                </Button>
                                <p className="text-center text-slate-400 text-sm mt-4 font-medium italic">Our agents will scan 100+ vendors in seconds.</p>
                            </div>
                        </div>
                    </Card>
                )}

                {step === 'discover' && (
                    <Card className="p-16 text-center space-y-8 bg-white/80 backdrop-blur-xl border-slate-200/60 rounded-3xl shadow-xl">
                        <div className="relative w-32 h-32 mx-auto">
                            <div className="absolute inset-0 border-4 border-primary/5 rounded-full" />
                            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(249,115,22,0.15)]" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <MapPin className="w-12 h-12 text-primary animate-bounce" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl font-bold text-slate-900">Discovering Options...</h2>
                            <p className="text-slate-500 text-lg max-w-md mx-auto">Our agents are scouring the web for the best flights, hotels, and venues. Quality takes a moment.</p>
                        </div>
                    </Card>
                )}

                {step === 'rank' && (
                    <div className="grid md:grid-cols-3 gap-12">
                        <Card className="p-10 h-fit space-y-10 md:sticky md:top-8 bg-white/80 backdrop-blur-xl border-slate-200/60 rounded-[2.5rem] shadow-xl">
                            <div className="space-y-8">
                                <h3 className="font-black text-2xl flex items-center gap-3 text-slate-900">
                                    <Calculator className="w-8 h-8 text-primary" /> Preferences
                                </h3>

                                <div className="space-y-10">
                                    <div className="space-y-5">
                                        <div className="flex justify-between text-xs uppercase tracking-[0.2em] text-slate-400 font-black">
                                            <label>Price Focus</label>
                                            <span className="text-primary bg-primary/5 px-2 py-0.5 rounded-lg">{weights.hotels?.price_weight}%</span>
                                        </div>
                                        <Slider
                                            value={[weights.hotels?.price_weight || 50]}
                                            onValueChange={([v]) => handleUpdateWeights('hotels', 'price_weight', v)}
                                            className="cursor-pointer"
                                        />
                                    </div>

                                    <div className="space-y-5">
                                        <div className="flex justify-between text-xs uppercase tracking-[0.2em] text-slate-400 font-black">
                                            <label>Trust & Rating</label>
                                            <span className="text-primary bg-primary/5 px-2 py-0.5 rounded-lg">{weights.hotels?.trust_weight}%</span>
                                        </div>
                                        <Slider
                                            value={[weights.hotels?.trust_weight || 50]}
                                            onValueChange={([v]) => handleUpdateWeights('hotels', 'trust_weight', v)}
                                            className="cursor-pointer"
                                        />
                                    </div>

                                    <Button onClick={() => handleRank(sessionId)} disabled={isLoading} className="w-full h-16 font-bold rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition-all gap-3 shadow-lg shadow-slate-200">
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                        Recalculate Ranking
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        <div className="md:col-span-2 space-y-10 relative min-h-[400px]">
                            {isLoading && step === 'rank' && (
                                <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center rounded-[2.5rem] space-y-4 transition-all duration-500">
                                    <div className="relative">
                                        <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-ping absolute inset-0" />
                                        <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
                                    </div>
                                    <p className="text-primary font-black uppercase tracking-[0.3em] text-sm animate-pulse">Refining Recommendations...</p>
                                </div>
                            )}

                            <div className="flex justify-between items-end mb-4 px-2">
                                <div>
                                    <h2 className="text-4xl font-black tracking-tight text-slate-900">Recommended for You</h2>
                                    <p className="text-slate-500 mt-2">Ranked based on your specific requirements and preferences.</p>
                                </div>
                                <div className="text-right hidden md:block">
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sort Order</p>
                                    <p className="text-primary font-black">Best Match First</p>
                                </div>
                            </div>

                            {Array.isArray(packages) && packages.map((pkg, i) => (
                                <Card key={i} className="p-10 bg-white/70 backdrop-blur-sm border-slate-200/60 hover:border-primary/50 transition-all duration-500 group cursor-pointer rounded-[2.5rem] relative overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1" onClick={() => handleSelectPackage(pkg)}>
                                    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 text-primary">
                                        <ArrowLeft className="rotate-180 w-8 h-8" />
                                    </div>
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                                        <div className="space-y-6 flex-1">
                                            <div className="flex items-center gap-4">
                                                <Badge className="bg-primary text-white hover:bg-primary border-none text-xs px-5 py-2 rounded-full font-black shadow-lg shadow-primary/20">
                                                    Rank #{pkg.rank || i + 1}
                                                </Badge>
                                                <div className="flex items-center gap-2 text-green-600 font-black text-sm uppercase tracking-wider bg-green-50 px-3 py-1 rounded-lg border border-green-100">
                                                    <Sparkles className="w-4 h-4" />
                                                    {pkg.score || Math.round(98 - (i * 3))}% Match
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <h3 className="text-3xl font-black group-hover:text-primary transition-colors text-slate-900 leading-tight">
                                                    {pkg.items?.hotels?.vendor === pkg.items?.meeting_rooms?.vendor
                                                        ? pkg.items?.hotels?.vendor
                                                        : `${pkg.items?.hotels?.vendor} & ${pkg.items?.meeting_rooms?.vendor}`}
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1 w-12 bg-primary/20 rounded-full" />
                                                    <p className="text-xs font-black uppercase tracking-[0.25em] text-primary/60">
                                                        {pkg.items?.hotels?.vendor === pkg.items?.meeting_rooms?.vendor
                                                            ? "Integrated Retreat Package"
                                                            : "Curated Vendor Partnership"}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-slate-500 text-lg leading-relaxed font-medium">
                                                {pkg.explanation?.why_ranked || "This package offers the best balance of your criteria, featuring top-rated venues and efficient travel logistics."}
                                            </p>
                                        </div>
                                        <div className="text-right min-w-[180px] pt-2">
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total Investment</p>
                                            <p className="text-4xl font-black text-slate-900 tracking-tighter">
                                                ${(pkg.total_cost || pkg.total_price || 0).toLocaleString()}
                                            </p>
                                            <p className="text-[10px] uppercase tracking-[0.2em] text-primary/70 font-black mt-2 bg-primary/5 px-2 py-1 rounded-md inline-block">All Fees Included</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-4 mt-10 pt-8 border-t border-slate-100/60">
                                        <div className="flex items-center gap-2 bg-slate-50 text-slate-600 px-4 py-2 rounded-2xl border border-slate-100/50 text-sm font-bold">
                                            <Plane className="w-4 h-4 text-primary" /> {pkg.items?.flights?.vendor}
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-50 text-slate-600 px-4 py-2 rounded-2xl border border-slate-100/50 text-sm font-bold">
                                            <Building2 className="w-4 h-4 text-primary" /> {pkg.items?.hotels?.metadata?.star_rating || 4}★ {pkg.items?.hotels?.metadata?.room_type || "Premium Stay"}
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-50 text-slate-600 px-4 py-2 rounded-2xl border border-slate-100/50 text-sm font-bold">
                                            <Package className="w-4 h-4 text-primary" /> {pkg.items?.catering?.vendor || "Local Catering"}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'cart' && cartDetails && (
                    <Card className="p-10 max-w-3xl mx-auto space-y-10 bg-white/80 backdrop-blur-2xl border-slate-200/60 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-accent" />
                        <div className="text-center space-y-3">
                            <h2 className="text-4xl font-black tracking-tight text-slate-900">Review Your Selection</h2>
                            <p className="text-slate-500 text-lg">Adjust quantities or remove items to fit your final needs.</p>
                        </div>

                        <div className="space-y-4">
                            {cartDetails?.items && Object.entries(cartDetails.items).map(([key, cartItem]: [string, any]) => (
                                <Card key={key} className="flex flex-col md:flex-row justify-between items-center p-6 bg-white/50 border-white/60 hover:border-primary/20 transition-all rounded-3xl gap-6 group shadow-sm">
                                    <div className="flex items-center gap-6 flex-1 w-full">
                                        <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                            {key === 'flights' && <Plane className="w-7 h-7" />}
                                            {key === 'hotels' && <Building2 className="w-7 h-7" />}
                                            {key === 'meeting_rooms' && <MapPin className="w-7 h-7" />}
                                            {key === 'catering' && <Package className="w-7 h-7" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-lg font-bold capitalize tracking-tight text-slate-800">{key.replace('_', ' ')}</p>
                                            <p className="text-sm text-slate-400 italic mb-2 line-clamp-1">
                                                {cartItem.item?.vendor || cartItem.item?.title}
                                            </p>
                                            <p className="text-[11px] text-primary/70 font-black uppercase tracking-[0.15em]">
                                                {key === 'flights' && `Per Attendee Trip`}
                                                {key === 'hotels' && `Shared Room-Nights`}
                                                {key === 'meeting_rooms' && `Full-Day Venue Rental`}
                                                {key === 'catering' && `Daily Meal Packages`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                                        <div className="flex items-center bg-slate-50 rounded-2xl p-1 border border-slate-100">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl"
                                                onClick={() => handleUpdateQuantity(key, -1)}
                                            >
                                                <Minus className="w-4 h-4" />
                                            </Button>
                                            <span className="w-12 text-center font-black text-xl text-slate-900">{cartItem.quantity}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl"
                                                onClick={() => handleUpdateQuantity(key, 1)}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="text-right min-w-[120px]">
                                            <p className="text-2xl font-black text-slate-900">${(cartItem.subtotal || 0).toLocaleString()}</p>
                                            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                                                ${(cartItem.unit_price || cartItem.item?.price || cartItem.item?.unit_price || (cartItem.quantity ? Math.round(cartItem.subtotal / cartItem.quantity) : 0)).toLocaleString()} unit
                                            </p>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-slate-200 hover:text-destructive hover:bg-destructive/5 rounded-xl transition-colors"
                                            onClick={() => handleRemoveItem(key)}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <div className="p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 space-y-4 shadow-inner relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.02] to-transparent pointer-events-none" />
                            <div className="flex justify-between text-slate-500 font-medium">
                                <span>Subtotal</span>
                                <span>${(cartDetails.subtotal || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 font-medium">
                                <span>Taxes (8.75%)</span>
                                <span>${(cartDetails.taxes || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 font-medium pb-4 border-b border-slate-100/50">
                                <span>Service Fees (2.5%)</span>
                                <span>${(cartDetails.fees || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-baseline pt-2">
                                <span className="text-lg font-bold text-slate-400 uppercase tracking-widest leading-none">Total Investment</span>
                                <span className="text-5xl font-black text-slate-900 tracking-tighter drop-shadow-sm">
                                    ${(cartDetails.total || 0).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <Button onClick={() => setStep('checkout')} disabled={isLoading} className="w-full h-20 text-2xl font-black rounded-3xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-[0.98] gap-4">
                            {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <ShoppingCart className="w-8 h-8" />}
                            Confirm & Checkout
                        </Button>
                    </Card>
                )}

                {step === 'checkout' && (
                    <Card className="p-10 max-w-2xl mx-auto space-y-10 bg-white/80 backdrop-blur-2xl border-slate-200/60 rounded-[3rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-accent" />
                        <div className="text-center space-y-4">
                            <h2 className="text-4xl font-black tracking-tight text-slate-900">Payment Details</h2>
                            <p className="text-slate-500 text-lg">Secure your world-class retreat package.</p>
                        </div>

                        <div className="space-y-8">
                            <div className="p-8 bg-slate-900 rounded-[2.5rem] relative overflow-hidden text-white shadow-2xl group transition-all hover:scale-[1.02]">
                                <div className="absolute top-0 right-0 p-8 opacity-20">
                                    <CreditCard className="w-24 h-24" />
                                </div>
                                <div className="space-y-10 relative z-10">
                                    <div className="flex justify-between items-start">
                                        <div className="w-14 h-11 bg-yellow-400/80 rounded-xl shadow-inner border border-yellow-300/50" />
                                        <Plane className="w-10 h-10 text-primary animate-pulse" />
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-3xl font-mono tracking-[0.25em]">
                                            {paymentDetails.cardNumber ? paymentDetails.cardNumber.padEnd(16, '*').replace(/(.{4})/g, '$1 ') : "**** **** **** ****"}
                                        </p>
                                        <div className="flex justify-between text-[11px] uppercase tracking-widest font-black opacity-40">
                                            <span>Card Holder</span>
                                            <span>Expires</span>
                                        </div>
                                        <div className="flex justify-between font-black tracking-[0.2em] text-lg">
                                            <span>{paymentDetails.name?.toUpperCase() || "YOUR NAME"}</span>
                                            <span>{paymentDetails.expiry || "MM/YY"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Card Number</label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                        <Input
                                            value={paymentDetails.cardNumber}
                                            onChange={(e) => setPaymentDetails({ ...paymentDetails, cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                                            placeholder="XXXX XXXX XXXX XXXX"
                                            className="pl-12 h-16 bg-white border-slate-100 rounded-2xl shadow-sm focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                                    <div className="relative">
                                        <Input
                                            value={paymentDetails.name}
                                            onChange={(e) => setPaymentDetails({ ...paymentDetails, name: e.target.value })}
                                            placeholder="Manan Shah"
                                            className="h-16 bg-white border-slate-100 rounded-2xl shadow-sm focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Expiry Date</label>
                                    <Input
                                        value={paymentDetails.expiry}
                                        onChange={(e) => setPaymentDetails({ ...paymentDetails, expiry: e.target.value })}
                                        placeholder="MM/YY"
                                        className="h-16 bg-white border-slate-100 rounded-2xl shadow-sm focus:ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">CVV</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                        <Input
                                            type="password"
                                            value={paymentDetails.cvc}
                                            onChange={(e) => setPaymentDetails({ ...paymentDetails, cvc: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                                            placeholder="123"
                                            className="pl-12 h-16 bg-white border-slate-100 rounded-2xl shadow-sm focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 px-1">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${saveCard ? 'bg-primary border-primary' : 'border-slate-200 group-hover:border-primary/50'}`}>
                                        {saveCard && <CheckCircle className="w-4 h-4 text-white" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={saveCard}
                                        onChange={(e) => setSaveCard(e.target.checked)}
                                    />
                                    <span className="text-sm font-bold text-slate-500 group-hover:text-slate-900 transition-colors">Save card details securely for future retreats</span>
                                </label>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-sm font-medium">
                                <ShieldCheck className="w-5 h-5 text-green-500" />
                                Your payment is encrypted and secured by industry standards.
                            </div>

                            <Button onClick={handleCheckout} disabled={isLoading} className="w-full h-20 text-2xl font-black rounded-3xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl transition-all active:scale-[0.98] gap-4">
                                {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Lock className="w-8 h-8" />}
                                Pay Now: ${(cartDetails?.total || 0).toLocaleString()}
                            </Button>
                        </div>
                    </Card>
                )}

                {step === 'success' && (
                    <Card className="p-16 text-center max-w-xl mx-auto space-y-10 bg-white/90 backdrop-blur-3xl border-slate-200/60 rounded-[3rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none" />
                        <div className="w-28 h-28 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(34,197,94,0.1)] animate-bounce">
                            <CheckCircle className="w-16 h-16" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-4xl font-black tracking-tight text-slate-900">Booking Finalized!</h2>
                            <p className="text-slate-500 text-xl">Your world-class retreat is ready for takeoff.</p>
                            <div className="mt-8 p-6 bg-slate-50 border border-slate-100 rounded-2xl font-mono text-lg text-primary">
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-300 mb-2 font-bold">Confirmation Code</p>
                                {bookingId}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Button onClick={() => downloadReceipt({ id: bookingId, packageName: selectedPackage?.items?.hotels?.vendor || "Custom Retreat", total: cartDetails?.total, date: new Date().toISOString() })} variant="outline" className="h-16 text-lg font-bold rounded-2xl border-slate-200 text-slate-600 hover:text-slate-900 gap-3">
                                <Download className="w-5 h-5" /> Receipt
                            </Button>
                            <Button onClick={() => setStep('dashboard')} className="h-16 text-lg font-bold rounded-2xl bg-slate-900 hover:bg-slate-800 text-white gap-3">
                                <LayoutDashboard className="w-5 h-5" /> Dashboard
                            </Button>
                        </div>
                        <Button onClick={() => { setStep('analyze'); setSessionId(""); }} variant="ghost" className="w-full h-14 text-slate-400 font-bold hover:text-slate-900">
                            Plan New Retreat
                        </Button>
                    </Card>
                )}

                {step === 'dashboard' && (
                    <div className="space-y-10 max-w-3xl mx-auto">
                        <div className="text-center space-y-4">
                            <h2 className="text-4xl font-black tracking-tight text-slate-900">Your Bookings</h2>
                            <p className="text-slate-500 text-lg">Manage and review your upcoming and past retreats.</p>
                        </div>

                        {bookings.length === 0 ? (
                            <Card className="p-20 text-center space-y-6 bg-white/80 backdrop-blur-xl border-slate-200/60 rounded-[3rem] shadow-xl">
                                <History className="w-20 h-20 text-slate-200 mx-auto" />
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-slate-400">No bookings yet</h3>
                                    <p className="text-slate-400">Your world-class retreats will appear here once finalized.</p>
                                </div>
                                <Button onClick={() => setStep('analyze')} className="bg-primary hover:bg-primary/90 text-white font-bold h-14 px-8 rounded-2xl">
                                    Start Planning
                                </Button>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                {bookings.map((booking, idx) => (
                                    <Card key={idx} className="p-10 bg-white/70 backdrop-blur-sm border-slate-200/60 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <FileText className="w-32 h-32" />
                                        </div>
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <Badge className="bg-green-500 text-white hover:bg-green-500 border-none px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20">
                                                        Confirmed
                                                    </Badge>
                                                    <span className="text-xs font-black text-slate-300 font-mono">{booking.id}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="text-2xl font-black text-slate-900">{booking.packageName}</h3>
                                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                                        Booked on {new Date(booking.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-3 min-w-[150px]">
                                                <p className="text-3xl font-black text-slate-900 tracking-tighter">${booking.total?.toLocaleString()}</p>
                                                <Button
                                                    onClick={() => downloadReceipt(booking)}
                                                    variant="secondary"
                                                    className="bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold gap-2 rounded-xl h-12 shadow-sm"
                                                >
                                                    <Download className="w-4 h-4" /> Receipt
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}

                        <Button onClick={() => setStep('analyze')} variant="ghost" className="w-full h-12 text-slate-400 font-bold hover:text-primary transition-colors gap-2">
                            <Sparkles className="w-4 h-4" /> Plan another retreat
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
