import { useState } from "react";
import { Briefcase, Users, DollarSign, Sparkles, Loader2, ShoppingCart, Lightbulb, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProcurement, ProcurementItem } from "@/hooks/useProcurement";
import { CartItem } from "@/types/cart";

interface ProcurementPlannerProps {
  onAddAllToCart: (items: Omit<CartItem, "quantity">[]) => void;
  onAddItemToCart: (item: Omit<CartItem, "quantity">, quantity: number) => void;
}

export const ProcurementPlanner = ({ onAddAllToCart, onAddItemToCart }: ProcurementPlannerProps) => {
  const [eventDescription, setEventDescription] = useState("Business retreat");
  const [attendeeCount, setAttendeeCount] = useState(40);
  const [budget, setBudget] = useState<string>("");
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  
  const { plan, isLoading, error, generatePlan, clearPlan } = useProcurement();

  const handleGenerate = () => {
    generatePlan(
      eventDescription,
      attendeeCount,
      budget ? Number(budget) : undefined
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

  const categoryColors: Record<string, string> = {
    seating: "bg-blue-100 text-blue-800",
    lighting: "bg-yellow-100 text-yellow-800",
    decor: "bg-pink-100 text-pink-800",
    supplies: "bg-gray-100 text-gray-800",
    refreshments: "bg-orange-100 text-orange-800",
    tech: "bg-purple-100 text-purple-800",
    outdoor: "bg-green-100 text-green-800",
    comfort: "bg-teal-100 text-teal-800",
  };

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
            <p className="text-sm text-muted-foreground">Tell me what you need, I'll find the best options</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-3">
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              What are you planning?
            </label>
            <Input
              placeholder="e.g., Business retreat, team building event..."
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
            <Button 
              onClick={handleGenerate} 
              disabled={isLoading || !eventDescription}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Planning...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Plan
                </>
              )}
            </Button>
          </div>
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
              <div>
                <h3 className="font-semibold text-foreground">{plan.eventSummary}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.items.length} items · {attendeeCount} attendees
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Estimated Total</p>
                <p className="text-2xl font-bold text-primary">${plan.grandTotal.toFixed(2)}</p>
              </div>
            </div>
          </Card>

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

          {/* Items Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">Recommended Items</h4>
              <Button 
                onClick={handleAddAll}
                size="sm"
                disabled={addedItems.size === plan.items.length}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add All to Cart
              </Button>
            </div>

            {plan.items.map((item) => {
              const isAdded = addedItems.has(item.id);
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
                        <Badge className={categoryColors[item.category] || categoryColors.supplies}>
                          {item.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.reason}</p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-foreground">
                            ${item.price.toFixed(2)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            × {item.quantity} = 
                          </span>
                          <span className="font-bold text-primary">
                            ${item.totalCost.toFixed(2)}
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
            })}
          </div>

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
};
