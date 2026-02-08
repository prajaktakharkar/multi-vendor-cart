import { useState } from "react";
import { 
  Briefcase, Users, DollarSign, Sparkles, Loader2, ShoppingCart, Lightbulb, 
  Check, X, Plane, MapPin, Calendar, Hotel, Car
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useProcurement, ProcurementItem, TravelDetails } from "@/hooks/useProcurement";
import { CartItem } from "@/types/cart";

interface ProcurementPlannerProps {
  onAddAllToCart: (items: Omit<CartItem, "quantity">[]) => void;
  onAddItemToCart: (item: Omit<CartItem, "quantity">, quantity: number) => void;
}

export const ProcurementPlanner = ({ onAddAllToCart, onAddItemToCart }: ProcurementPlannerProps) => {
  const [eventDescription, setEventDescription] = useState("Business retreat with team building activities");
  const [attendeeCount, setAttendeeCount] = useState(40);
  const [budget, setBudget] = useState<string>("");
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  
  // Travel state
  const [includeTravel, setIncludeTravel] = useState(false);
  const [originCity, setOriginCity] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const { plan, isLoading, error, generatePlan, clearPlan } = useProcurement();

  const handleGenerate = () => {
    const travelDetails: TravelDetails | undefined = includeTravel ? {
      originCity,
      destinationCity,
      startDate,
      endDate,
      nights: startDate && endDate 
        ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
        : undefined
    } : undefined;

    generatePlan(
      eventDescription,
      attendeeCount,
      budget ? Number(budget) : undefined,
      travelDetails
    );
    setAddedItems(new Set());
  };

  const handleAddItem = (item: ProcurementItem) => {
    onAddItemToCart(
      {
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        sellerId: item.sellerId,
      },
      item.quantity
    );
    setAddedItems(prev => new Set(prev).add(item.id));
  };

  const handleAddAll = () => {
    if (!plan) return;
    plan.items.forEach(item => {
      onAddItemToCart(
        {
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          sellerId: item.sellerId,
        },
        item.quantity
      );
    });
    setAddedItems(new Set(plan.items.map(i => i.id)));
  };

  const categoryConfig: Record<string, { color: string; icon: any }> = {
    flights: { color: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200", icon: Plane },
    hotels: { color: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200", icon: Hotel },
    transport: { color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", icon: Car },
    meals: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", icon: null },
    seating: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: null },
    lighting: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: null },
    decor: { color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200", icon: null },
    supplies: { color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", icon: null },
    refreshments: { color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", icon: null },
    tech: { color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", icon: null },
    outdoor: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: null },
    comfort: { color: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200", icon: null },
  };

  // Group items by travel vs supplies
  const travelItems = plan?.items.filter(i => i.isTravel) || [];
  const supplyItems = plan?.items.filter(i => !i.isTravel) || [];

  return (
    <div className="space-y-6">
      {/* Planner Input */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/10 border-primary/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary rounded-lg">
            <Briefcase className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-foreground">AI Procurement Planner</h2>
            <p className="text-sm text-muted-foreground">Plan your event with AI-powered recommendations</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Event Details */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-3">
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                What are you planning?
              </label>
              <Input
                placeholder="e.g., Business retreat with team building activities..."
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                className="bg-background"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Attendees
              </label>
              <Input
                type="number"
                placeholder="40"
                value={attendeeCount}
                onChange={(e) => setAttendeeCount(Number(e.target.value))}
                className="bg-background"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" />
                Budget (optional)
              </label>
              <Input
                type="number"
                placeholder="No limit"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="flex items-end">
              <div className="flex items-center space-x-2 h-10">
                <Switch
                  id="include-travel"
                  checked={includeTravel}
                  onCheckedChange={setIncludeTravel}
                />
                <Label htmlFor="include-travel" className="flex items-center gap-1.5 cursor-pointer">
                  <Plane className="h-4 w-4" />
                  Include Travel
                </Label>
              </div>
            </div>
          </div>

          {/* Travel Details */}
          {includeTravel && (
            <div className="p-4 bg-sky-50 dark:bg-sky-950/30 rounded-lg border border-sky-200 dark:border-sky-800 space-y-4 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
                <Plane className="h-4 w-4" />
                <span className="font-medium text-sm">Travel Details</span>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    From (Origin City)
                  </label>
                  <Input
                    placeholder="e.g., New York"
                    value={originCity}
                    onChange={(e) => setOriginCity(e.target.value)}
                    className="bg-background"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    To (Destination City)
                  </label>
                  <Input
                    placeholder="e.g., Miami"
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                    className="bg-background"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-background"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate} 
            disabled={isLoading || !eventDescription || (includeTravel && (!originCity || !destinationCity))}
            className="w-full md:w-auto"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {includeTravel ? "Planning Trip..." : "Planning..."}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate {includeTravel ? "Travel " : ""}Plan
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="p-4 border-destructive bg-destructive/10">
          <p className="text-destructive text-sm">{error}</p>
        </Card>
      )}

      {/* Results */}
      {plan && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Summary Header */}
          <Card className="p-4 bg-card">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">{plan.eventSummary}</h3>
                {plan.travelSummary && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Plane className="h-3.5 w-3.5" />
                    {plan.travelSummary}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {plan.items.length} items · {attendeeCount} attendees
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Estimated Total</p>
                <p className="text-2xl font-bold text-primary">${plan.grandTotal.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          {/* Cost Breakdown (if travel) */}
          {plan.hasTravel && plan.breakdown && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-3 text-center bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800">
                <Plane className="h-5 w-5 mx-auto mb-1 text-sky-600" />
                <p className="text-xs text-muted-foreground">Flights</p>
                <p className="font-semibold text-foreground">${(plan.breakdown.travel || 0).toLocaleString()}</p>
              </Card>
              <Card className="p-3 text-center bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800">
                <Hotel className="h-5 w-5 mx-auto mb-1 text-violet-600" />
                <p className="text-xs text-muted-foreground">Hotels</p>
                <p className="font-semibold text-foreground">${(plan.breakdown.accommodation || 0).toLocaleString()}</p>
              </Card>
              <Card className="p-3 text-center bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                <Car className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
                <p className="text-xs text-muted-foreground">Transport</p>
                <p className="font-semibold text-foreground">${(plan.breakdown.other || 0).toLocaleString()}</p>
              </Card>
              <Card className="p-3 text-center bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <ShoppingCart className="h-5 w-5 mx-auto mb-1 text-amber-600" />
                <p className="text-xs text-muted-foreground">Supplies</p>
                <p className="font-semibold text-foreground">${(plan.breakdown.supplies || 0).toLocaleString()}</p>
              </Card>
            </div>
          )}

          {/* Tips */}
          {plan.tips.length > 0 && (
            <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {plan.tips.map((tip, i) => (
                    <p key={i} className="text-sm text-amber-800 dark:text-amber-200">{tip}</p>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Travel Items Section */}
          {travelItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-sky-600" />
                <h4 className="font-medium text-foreground">Travel & Accommodation</h4>
              </div>
              {renderItems(travelItems)}
            </div>
          )}

          {/* Supply Items Section */}
          {supplyItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  <h4 className="font-medium text-foreground">Event Supplies & Services</h4>
                </div>
                <Button 
                  onClick={handleAddAll}
                  size="sm"
                  disabled={addedItems.size === plan.items.length}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add All to Cart
                </Button>
              </div>
              {renderItems(supplyItems)}
            </div>
          )}

          {/* Clear Button */}
          <div className="flex justify-center pt-2">
            <Button variant="ghost" onClick={clearPlan} className="text-muted-foreground">
              <X className="h-4 w-4 mr-2" />
              Clear Plan
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  function renderItems(items: ProcurementItem[]) {
    return items.map((item) => {
      const isAdded = addedItems.has(item.id);
      const catConfig = categoryConfig[item.category] || categoryConfig.supplies;
      const IconComponent = catConfig.icon;
      
      return (
        <Card 
          key={item.id} 
          className={`p-4 transition-all ${isAdded ? 'bg-primary/5 border-primary/30' : 'bg-card hover:shadow-md'}`}
        >
          <div className="flex gap-4">
            <img
              src={item.image}
              alt={item.name}
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h5 className="font-medium text-foreground">{item.name}</h5>
                  <p className="text-sm text-muted-foreground">{item.sellerName}</p>
                </div>
                <Badge className={catConfig.color}>
                  {IconComponent && <IconComponent className="h-3 w-3 mr-1" />}
                  {item.category}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.reason}</p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-foreground">
                    ${item.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    × {item.quantity} = 
                  </span>
                  <span className="font-bold text-primary">
                    ${item.totalCost.toLocaleString()}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant={isAdded ? "outline" : "secondary"}
                  onClick={() => handleAddItem(item)}
                  disabled={isAdded}
                >
                  {isAdded ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Added
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      );
    });
  }
};
