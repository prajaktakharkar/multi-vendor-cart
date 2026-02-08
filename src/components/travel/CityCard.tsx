import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane } from "lucide-react";
import type { City } from "@/data/travelData";

interface CityCardProps {
  city: City;
  onClick: () => void;
}

export const CityCard = ({ city, onClick }: CityCardProps) => {
  return (
    <Card 
      className="group cursor-pointer overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      onClick={onClick}
    >
      <div className="relative h-56 overflow-hidden">
        <img 
          src={city.image} 
          alt={city.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
        <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
          <Plane className="w-3 h-3 mr-1" />
          {city.shortName}
        </Badge>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h3 className="text-2xl font-bold text-primary-foreground mb-1">{city.name}</h3>
          <p className="text-primary-foreground/80 text-sm">{city.tagline}</p>
        </div>
      </div>
      <CardContent className="p-4 bg-card">
        <div className="flex flex-wrap gap-2">
          {city.airports.map((airport) => (
            <Badge key={airport} variant="secondary" className="text-xs">
              {airport}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
