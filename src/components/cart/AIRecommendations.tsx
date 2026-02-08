import { useEffect } from "react";
import { Sparkles, Plus, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRecommendations, RecommendedItem } from "@/hooks/useRecommendations";
import { CartItem } from "@/types/cart";

interface AIRecommendationsProps {
  cartItems: CartItem[];
  onAddToCart: (item: Omit<CartItem, "quantity">) => void;
}

export const AIRecommendations = ({ cartItems, onAddToCart }: AIRecommendationsProps) => {
  const { recommendations, isLoading, error, fetchRecommendations } = useRecommendations();

  useEffect(() => {
    if (cartItems.length > 0) {
      fetchRecommendations(cartItems);
    }
  }, []);

  const handleAddToCart = (rec: RecommendedItem) => {
    onAddToCart({
      id: rec.id,
      name: rec.name,
      price: rec.price,
      image: rec.image,
      sellerId: rec.sellerId,
    });
  };

  if (cartItems.length === 0) return null;

  return (
    <div className="mt-8 p-6 bg-gradient-to-br from-primary/5 to-accent/10 rounded-2xl border border-primary/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">AI Picks for You</h3>
            <p className="text-sm text-muted-foreground">Based on your cart</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchRecommendations(cartItems)}
          disabled={isLoading}
          className="text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading && recommendations.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Finding perfect matches...</span>
        </div>
      )}

      {error && (
        <div className="text-center py-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recommendations.map((rec) => (
            <Card
              key={rec.id}
              className="p-3 flex gap-3 hover:shadow-md transition-shadow bg-card/80 backdrop-blur-sm"
            >
              <img
                src={rec.image}
                alt={rec.name}
                className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground text-sm truncate">
                  {rec.name}
                </h4>
                <p className="text-xs text-muted-foreground mb-1">
                  {rec.sellerName}
                </p>
                <p className="text-xs text-primary/80 italic line-clamp-1">
                  {rec.reason}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-semibold text-foreground">
                    ${rec.price.toFixed(2)}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    onClick={() => handleAddToCart(rec)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
