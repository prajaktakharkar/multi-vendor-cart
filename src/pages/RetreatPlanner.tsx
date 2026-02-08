import { useState, useEffect } from "react";
import { retreatApi, Weights } from "@/services/retreatApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Loader2, ArrowLeft, Sparkles, Plane, Building2, MapPin, Calculator, ShoppingCart, CheckCircle, Package, Plus, Minus, Trash2, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Step = 'analyze' | 'discover' | 'rank' | 'cart' | 'checkout' | 'success';

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

    const [weights, setWeights] = useState<Weights>({
        category_importance: { flights: 30, hotels: 40, meeting_rooms: 15, catering: 15 },
        hotels: { price_weight: 50, trust_weight: 40, location_weight: 25, amenities_weight: 15 }
    });

    const handleAnalyze = async () => {
        setIsLoading(true);
        try {
            const res = await retreatApi.analyzeRequirements(userInput, sessionId || undefined);
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
            const res = await retreatApi.rankPackages(sid, updatedWeights || weights);
            // Handle various response formats
            const packageData = res.packages || res.data || res;
            setPackages(Array.isArray(packageData) ? packageData : []);
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

    const handleUpdateQuantity = (category: string, delta: number) => {
        if (!cartDetails?.items) return;
        const items = { ...cartDetails.items };
        const item = { ...items[category] };

        const newQty = Math.max(0, (item.quantity || 0) + delta);
        if (newQty === 0) {
            handleRemoveItem(category);
            return;
        }

        item.quantity = newQty;
        item.subtotal = (item.unit_price || 0) * newQty;
        items[category] = item;

        updateCartLocal(items);
        toast.info(`Updated ${category.replace('_', ' ')} quantity`);
    };

    const handleRemoveItem = (category: string) => {
        if (!cartDetails?.items) return;
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
        } else if (step === 'success') {
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
                    <div className="flex items-center gap-2">
                        {['analyze', 'rank', 'cart', 'checkout'].map((s, idx) => (
                            <div key={s} className={`w-2 h-2 rounded-full transition-all duration-500 ${(s === step || (s === 'rank' && step === 'discover')) ? 'w-8 bg-primary shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-slate-200'
                                }`} />
                        ))}
                    </div>
                </div>

                {step === 'analyze' && (
                    <Card className="p-10 space-y-8 bg-white/70 backdrop-blur-xl border-slate-200/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden group rounded-3xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="text-center space-y-3 relative z-10">
                            <h2 className="text-4xl font-black tracking-tight text-slate-900">Plan Your Retreat</h2>
                            <p className="text-slate-500 text-lg">Tell us your vision, and our AI agents will handle the logistics.</p>
                        </div>
                        <div className="space-y-4 relative z-10">
                            <Input
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="e.g., Plan a 3-day team offsite in New York for 20 people..."
                                className="text-lg p-8 bg-white/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-primary/50 transition-all rounded-2xl shadow-sm"
                            />
                            <Button onClick={handleAnalyze} disabled={isLoading} className="w-full h-16 text-xl font-bold gap-3 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]">
                                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                                Analyze Requirements
                            </Button>
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

                        <div className="md:col-span-2 space-y-10">
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
                                            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">${(cartItem.unit_price || 0).toLocaleString()} unit</p>
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
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">CVC</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                        <Input
                                            value={paymentDetails.cvc}
                                            onChange={(e) => setPaymentDetails({ ...paymentDetails, cvc: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                                            placeholder="123"
                                            className="pl-12 h-16 bg-white border-slate-100 rounded-2xl shadow-sm focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
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
                        <Button onClick={() => { setStep('analyze'); setSessionId(""); }} className="w-full h-16 text-lg font-bold rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xl">
                            Plan New Retreat
                        </Button>
                    </Card>
                )}
            </div>
        </div>
    );
}
