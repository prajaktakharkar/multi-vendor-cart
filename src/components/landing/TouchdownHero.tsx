import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Plane, Hotel, Car, Ticket, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import heroStadium from "@/assets/hero-stadium.jpg";

interface TouchdownHeroProps {
  onStartPlanning?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const calculateTimeLeft = (): TimeLeft => {
  const superBowlDate = new Date("2026-02-08T18:30:00-05:00"); // Super Bowl LX kickoff
  const now = new Date();
  const difference = superBowlDate.getTime() - now.getTime();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
};

export const TouchdownHero = ({ onStartPlanning }: TouchdownHeroProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);
  const { user } = useAuth();

  const handleStartPlanning = () => {
    if (onStartPlanning) {
      onStartPlanning();
    } else {
      navigate("/search");
    }
  };

  return (
    <>
      {/* Top nav bar */}
      <nav className="absolute top-0 left-0 right-0 z-20 px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-white drop-shadow-lg">Touchdown</span>
          </div>
          {user ? (
            <Link to="/dashboard">
              <Button variant="secondary" size="sm">
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button variant="secondary" size="sm">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </nav>

      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Hero background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroStadium})` }}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />

        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/90 rounded-full text-primary-foreground text-sm font-bold mb-6 shadow-lg">
            <Trophy className="w-4 h-4" />
            Super Bowl 2025 Travel Packages
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-2xl">
            Your Ultimate
            <span className="block text-primary drop-shadow-lg">Game Day Experience</span>
          </h1>

          {/* Countdown Timer */}
          <div className="flex justify-center gap-3 sm:gap-6 mb-8">
            {[
              { value: timeLeft.days, label: "Days" },
              { value: timeLeft.hours, label: "Hours" },
              { value: timeLeft.minutes, label: "Mins" },
              { value: timeLeft.seconds, label: "Secs" },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="flex flex-col items-center bg-black/40 backdrop-blur-md rounded-xl px-4 py-3 sm:px-6 sm:py-4 border border-white/20 min-w-[70px] sm:min-w-[90px]"
              >
                <span className="text-3xl sm:text-5xl font-bold text-white tabular-nums">
                  {value.toString().padStart(2, "0")}
                </span>
                <span className="text-xs sm:text-sm text-white/70 uppercase tracking-wider mt-1">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <p className="text-lg text-white/80 mb-2">until Super Bowl LX kickoff</p>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-10 drop-shadow-lg">
            Book complete travel packages for the biggest game of the year—flights, 
            hotels, game tickets, and VIP ground transportation all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={handleStartPlanning} 
              className="text-lg px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all bg-primary hover:bg-primary/90"
            >
              <Ticket className="w-5 h-5 mr-2" />
              Plan Your Trip
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 rounded-full shadow-xl bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              View Packages
            </Button>
          </div>

          {/* Service pills */}
          <div className="flex flex-wrap justify-center gap-4 mt-12">
            {[
              { icon: Plane, label: 'Charter Flights' },
              { icon: Hotel, label: 'Premium Hotels' },
              { icon: Ticket, label: 'Game Tickets' },
              { icon: Car, label: 'VIP Transport' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-lg"
              >
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-white">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/50 flex items-start justify-center pt-2">
            <div className="w-1 h-2 bg-white/70 rounded-full" />
          </div>
        </div>
      </section>
    </>
  );
};
