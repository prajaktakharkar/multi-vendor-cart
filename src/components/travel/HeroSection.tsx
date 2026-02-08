import { Button } from "@/components/ui/button";
import { Plane, Building2, Car, Calendar } from "lucide-react";

interface HeroSectionProps {
  onStartPlanning: () => void;
}

export const HeroSection = ({ onStartPlanning }: HeroSectionProps) => {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="relative z-10 container mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
          <Plane className="w-4 h-4" />
          Group Travel Made Simple
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
          Plan Your Team's
          <span className="block text-primary">Perfect Trip</span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Book flights, hotels, conference venues, and ground transportation for your 
          business conference, sports team, or corporate retreat—all in one place.
        </p>
        
        <Button 
          size="lg" 
          onClick={onStartPlanning}
          className="text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <Calendar className="w-5 h-5 mr-2" />
          Start Planning Your Trip
        </Button>
        
        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-4 mt-12">
          {[
            { icon: Plane, label: 'Flights' },
            { icon: Building2, label: 'Hotels & Venues' },
            { icon: Car, label: 'Ground Transport' },
          ].map(({ icon: Icon, label }) => (
            <div 
              key={label}
              className="flex items-center gap-2 px-4 py-2 bg-card rounded-full border border-border shadow-sm"
            >
              <Icon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
