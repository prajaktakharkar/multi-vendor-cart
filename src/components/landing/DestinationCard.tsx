import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Users, ArrowRight } from "lucide-react";

interface DestinationCardProps {
  name: string;
  image: string;
  event: string;
  date: string;
  startingPrice: number;
  capacity: string;
  featured?: boolean;
  onClick: () => void;
}

export const DestinationCard = ({
  name,
  image,
  event,
  date,
  startingPrice,
  capacity,
  featured,
  onClick,
}: DestinationCardProps) => {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-card border ${
        featured ? "border-primary shadow-xl shadow-primary/10" : "border-border"
      } transition-all duration-300 hover:shadow-2xl hover:-translate-y-1`}
    >
      {featured && (
        <Badge className="absolute top-4 left-4 z-10 bg-primary text-primary-foreground">
          🏈 Super Bowl LIX
        </Badge>
      )}

      {/* Image */}
      <div className="relative h-56 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-2xl font-bold text-white drop-shadow-lg">{name}</h3>
          <p className="text-white/80 text-sm flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            {event}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {date}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {capacity}
            </span>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Starting from</p>
            <p className="text-2xl font-bold text-foreground">
              ${startingPrice.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground">/person</span>
            </p>
          </div>
          <Button onClick={onClick} size="sm" className="gap-1">
            Book Now
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
