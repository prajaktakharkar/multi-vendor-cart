import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Users, Clock, Check } from "lucide-react";

interface RideQuote {
  provider: string;
  providerLogo: string;
  rideType: string;
  rideId: string;
  capacity: number;
  priceRange: { min: number; max: number };
  estimatedTime: string;
  vehiclesNeeded: number;
  totalForGroup: number;
  pricePerPerson: number;
  eta: string;
  features: string[];
}

interface TransportQuoteCardProps {
  quote: RideQuote;
  isRecommended?: boolean;
  onBook: (quote: RideQuote) => void;
}

export const TransportQuoteCard = ({ quote, isRecommended, onBook }: TransportQuoteCardProps) => {
  return (
    <Card className={`relative overflow-hidden transition-all hover:shadow-lg ${
      isRecommended ? 'ring-2 ring-primary border-primary' : 'border-border'
    }`}>
      {isRecommended && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
          Best Value
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{quote.providerLogo}</span>
            <div>
              <h4 className="font-semibold text-foreground">{quote.rideType}</h4>
              <p className="text-sm text-muted-foreground">{quote.provider}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">${quote.totalForGroup}</p>
            <p className="text-xs text-muted-foreground">${quote.pricePerPerson}/person</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{quote.capacity} seats</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Car className="w-4 h-4" />
            <span>{quote.vehiclesNeeded} vehicle{quote.vehiclesNeeded > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{quote.eta} away</span>
          </div>
        </div>

        {quote.features.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {quote.features.slice(0, 3).map((feature) => (
              <Badge key={feature} variant="secondary" className="text-xs">
                <Check className="w-3 h-3 mr-1" />
                {feature}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm text-muted-foreground">
            Est. {quote.estimatedTime}
          </span>
          <Button size="sm" onClick={() => onBook(quote)}>
            Book Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
