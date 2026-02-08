import { useState } from "react";
import { ShoppingCart as CartIcon } from "lucide-react";
import { CartItem, Seller } from "@/types/cart";
import { mockCartItems, mockSellers } from "@/data/mockCart";
import { SellerGroup } from "./SellerGroup";
import { CartSummary } from "./CartSummary";
import { AIRecommendations } from "./AIRecommendations";
import { toast } from "sonner";

export const ShoppingCart = () => {
  const [items, setItems] = useState<CartItem[]>(mockCartItems);
  const sellers = mockSellers;

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddFromRecommendation = (item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`Added ${item.name} to cart`);
  };

  // Group items by seller
  const itemsBySeller = sellers
    .map((seller) => ({
      seller,
      items: items.filter((item) => item.sellerId === seller.id),
    }))
    .filter((group) => group.items.length > 0);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <CartIcon className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground">Start shopping to add items to your cart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <CartIcon className="h-8 w-8 text-primary" />
            Shopping Cart
          </h1>
          <p className="text-muted-foreground mt-2">
            {itemCount} item{itemCount !== 1 ? "s" : ""} from {itemsBySeller.length} seller
            {itemsBySeller.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {itemsBySeller.map(({ seller, items }) => (
              <SellerGroup
                key={seller.id}
                seller={seller}
                items={items}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemove}
              />
            ))}
            
            {/* AI Recommendations */}
            <AIRecommendations
              cartItems={items}
              onAddToCart={handleAddFromRecommendation}
            />
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <CartSummary
              subtotal={subtotal}
              itemCount={itemCount}
              sellerCount={itemsBySeller.length}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
