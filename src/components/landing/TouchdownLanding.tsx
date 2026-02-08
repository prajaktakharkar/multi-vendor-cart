import { useNavigate } from "react-router-dom";
import { TouchdownHero } from "./TouchdownHero";
import { DestinationCard } from "./DestinationCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, Hotel, Ticket, Car, Shield, Clock, Headphones, Trophy } from "lucide-react";

import newOrleansImg from "@/assets/destination-new-orleans.jpg";
import lasVegasImg from "@/assets/destination-las-vegas.jpg";
import miamiImg from "@/assets/destination-miami.jpg";

const destinations = [
  {
    id: "new-orleans",
    name: "New Orleans",
    image: newOrleansImg,
    event: "Super Bowl LIX Host City",
    date: "Feb 9, 2025",
    startingPrice: 4999,
    capacity: "Groups 2-50",
    featured: true,
  },
  {
    id: "las-vegas",
    name: "Las Vegas",
    image: lasVegasImg,
    event: "2024 Super Bowl LVIII Venue",
    date: "Available Year Round",
    startingPrice: 2499,
    capacity: "Groups 2-100",
    featured: false,
  },
  {
    id: "miami",
    name: "Miami",
    image: miamiImg,
    event: "Championship History",
    date: "Available Year Round",
    startingPrice: 1999,
    capacity: "Groups 2-75",
    featured: false,
  },
];

const services = [
  {
    icon: Plane,
    title: "Charter Flights",
    description: "Direct flights with group discounts via Amadeus & Sabre networks",
  },
  {
    icon: Hotel,
    title: "Premium Hotels",
    description: "Exclusive rates at top hotels near stadiums and downtown",
  },
  {
    icon: Ticket,
    title: "Game Tickets",
    description: "Guaranteed seating with VIP suite options available",
  },
  {
    icon: Car,
    title: "VIP Transport",
    description: "Coordinated Uber/Lyft fleet for seamless game day logistics",
  },
];

const trustSignals = [
  { icon: Shield, label: "Secure Payments" },
  { icon: Clock, label: "24/7 Support" },
  { icon: Headphones, label: "Dedicated Concierge" },
  { icon: Trophy, label: "10,000+ Fans Served" },
];

export const TouchdownLanding = () => {
  const navigate = useNavigate();

  const handleStartPlanning = () => {
    navigate("/search");
  };

  const handleDestinationClick = (cityId: string) => {
    navigate(`/search?city=${cityId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <TouchdownHero onStartPlanning={handleStartPlanning} />

      {/* Destinations Section */}
      <section className="py-20 px-6 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              🏈 Game Day Destinations
            </Badge>
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Championship Travel Packages
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Complete travel packages for the biggest games—from Super Bowl to 
              championship rivalries. Everything you need in one booking.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {destinations.map((dest) => (
              <DestinationCard
                key={dest.id}
                {...dest}
                onClick={() => handleDestinationClick(dest.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Complete Travel Solutions
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From takeoff to touchdown—we handle every detail of your game day experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {services.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-card p-6 rounded-xl border border-border hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <Trophy className="w-16 h-16 mx-auto mb-6 opacity-90" />
          <h2 className="text-4xl font-bold mb-4">
            Ready for Game Day?
          </h2>
          <p className="text-lg opacity-90 max-w-xl mx-auto mb-8">
            Start planning your championship travel experience today. 
            Our AI-powered assistant will help you build the perfect package.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={handleStartPlanning}
            className="text-lg px-8 py-6 rounded-full shadow-xl"
          >
            Start Planning Now
          </Button>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-12 px-6 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {trustSignals.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-muted-foreground">
                <Icon className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border bg-secondary/20">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Trophy className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Touchdown</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Touchdown Travel. Your championship travel partner.
          </p>
        </div>
      </footer>
    </div>
  );
};
