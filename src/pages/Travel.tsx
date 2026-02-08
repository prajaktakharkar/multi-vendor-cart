import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HeroSection } from "@/components/travel/HeroSection";
import { CityCard } from "@/components/travel/CityCard";
import { TravelChat } from "@/components/travel/TravelChat";
import { TransportAgent } from "@/components/travel/TransportAgent";
import { cities } from "@/data/travelData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, Building2, MapPin, Car, Users, Shield, Sparkles } from "lucide-react";
type ViewState = 'landing' | 'chat' | 'transport';
const Travel = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewState>('landing');
  const [selectedCity, setSelectedCity] = useState<string | undefined>();
  const handleCitySelect = (cityId: string) => {
    setSelectedCity(cityId);
    setView('chat');
  };
  const handleStartPlanning = () => {
    setSelectedCity(undefined);
    setView('chat');
  };
  const handleTransportAgent = (cityId?: string) => {
    setSelectedCity(cityId);
    setView('transport');
  };
  const handleBack = () => {
    setView('landing');
    setSelectedCity(undefined);
  };
  if (view === 'chat') {
    return <TravelChat selectedCity={selectedCity} onBack={handleBack} />;
  }
  if (view === 'transport') {
    return <TransportAgent selectedCity={selectedCity} onBack={handleBack} />;
  }
  return <div className="min-h-screen bg-background">
      <HeroSection />

      {/* Featured Cities */}
      

      {/* Services */}
      <section className="py-20 px-6 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Complete Travel Solutions
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From takeoff to touchdown and everything in between—we handle it all.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[{
            icon: Plane,
            title: 'Flights',
            description: 'Real-time booking via Amadeus & Sabre with group discounts',
            color: 'text-primary'
          }, {
            icon: Building2,
            title: 'Hotels',
            description: 'Premium accommodations with negotiated corporate rates',
            color: 'text-accent'
          }, {
            icon: MapPin,
            title: 'Conference Venues',
            description: 'Top venues with full AV and catering services',
            color: 'text-primary'
          }, {
            icon: Car,
            title: 'Ground Transport',
            description: 'Uber & Lyft coordination for seamless transfers',
            color: 'text-accent',
            action: () => handleTransportAgent()
          }, {
            icon: Sparkles,
            title: 'AI Retreat Planner',
            description: 'Full 5-step automated planning for your next team offsite',
            color: 'text-primary',
            action: () => navigate('/retreat-planner')
          }].map(({
            icon: Icon,
            title,
            description,
            color,
            action
          }) => <div key={title} className={`bg-card p-6 rounded-xl border border-border hover:border-primary/30 transition-colors ${action ? 'cursor-pointer' : ''}`} onClick={action}>
                <div className={`w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
                {action && <Button variant="link" className="p-0 h-auto mt-2 text-primary">
                    Compare & Book →
                  </Button>}
              </div>)}
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {[{
            icon: Users,
            label: '10,000+ Travelers Booked'
          }, {
            icon: Shield,
            label: 'Secure Payments'
          }, {
            icon: Building2,
            label: '500+ Partner Venues'
          }].map(({
            icon: Icon,
            label
          }) => <div key={label} className="flex items-center gap-3 text-muted-foreground">
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{label}</span>
              </div>)}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2026 Touchdown Group Travel Planner. Powered by AI.</p>
        </div>
      </footer>
    </div>;
};
export default Travel;