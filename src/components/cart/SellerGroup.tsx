import { Star, Store } from "lucide-react";
import { CartItem, Seller } from "@/types/cart";
import { CartItemCard } from "./CartItem";

interface SellerGroupProps {
  seller: Seller;
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export const SellerGroup = ({ seller, items, onUpdateQuantity, onRemove }: SellerGroupProps) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="seller-card overflow-hidden animate-slide-in">
      {/* Seller Header */}
      <div className="flex items-center gap-3 p-4 bg-secondary/30 border-b border-seller-divider">
        <div className="relative">
          <img
            src={seller.avatar}
            alt={seller.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-background"
          />
          <div className="absolute -bottom-1 -right-1 bg-accent text-accent-foreground rounded-full p-0.5">
            <Store className="h-3 w-3" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{seller.name}</h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span>{seller.rating}</span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-seller-divider">
        {items.map((item) => (
          <CartItemCard
            key={item.id}
            item={item}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemove}
          />
        ))}
      </div>

      {/* Seller Subtotal */}
      <div className="flex justify-between items-center p-4 bg-secondary/20 border-t border-seller-divider">
        <span className="text-sm text-muted-foreground">Subtotal from {seller.name}</span>
        <span className="font-semibold text-foreground">${subtotal.toFixed(2)}</span>
      </div>
    </div>
  );
};
