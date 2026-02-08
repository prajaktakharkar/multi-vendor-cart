import { ShoppingBag, CreditCard, Truck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CartSummaryProps {
  subtotal: number;
  itemCount: number;
  sellerCount: number;
}

export const CartSummary = ({ subtotal, itemCount, sellerCount }: CartSummaryProps) => {
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return (
    <div className="seller-card p-6 sticky top-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-primary" />
        Order Summary
      </h2>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Items ({itemCount})</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Shipping</span>
          <span className={shipping === 0 ? "text-success font-medium" : ""}>
            {shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Estimated Tax</span>
          <span>${tax.toFixed(2)}</span>
        </div>

        <div className="h-px bg-border my-4" />

        <div className="flex justify-between text-lg font-semibold text-foreground">
          <span>Total</span>
          <span className="text-primary">${total.toFixed(2)}</span>
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          From {sellerCount} seller{sellerCount > 1 ? "s" : ""} • One unified payment
        </p>
      </div>

      <Button className="w-full mt-6 h-12 text-base font-semibold" size="lg">
        <CreditCard className="h-5 w-5 mr-2" />
        Proceed to Checkout
      </Button>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Truck className="h-4 w-4" />
          <span>Fast Delivery</span>
        </div>
        <div className="flex items-center gap-1">
          <Shield className="h-4 w-4" />
          <span>Secure Pay</span>
        </div>
      </div>

      {shipping > 0 && (
        <p className="text-xs text-center text-muted-foreground mt-4 p-2 bg-secondary/50 rounded-lg">
          Add ${(100 - subtotal).toFixed(2)} more for free shipping!
        </p>
      )}
    </div>
  );
};
