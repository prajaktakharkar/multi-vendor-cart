import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ChatMessage, type Message } from "./ChatMessage";
import { TransportQuoteCard } from "./TransportQuoteCard";
import { 
  Send, Loader2, ArrowLeft, Car, Users, MapPin, 
  Sparkles, DollarSign, Zap 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cities } from "@/data/travelData";
import { useToast } from "@/hooks/use-toast";

interface TransportAgentProps {
  selectedCity?: string;
  onBack: () => void;
}

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

interface QuoteSearchParams {
  passengers: number;
  pickup: string;
  dropoff: string;
  preference: 'budget' | 'luxury' | 'fastest';
}

export const TransportAgent = ({ selectedCity, onBack }: TransportAgentProps) => {
  const city = cities.find(c => c.id === selectedCity);
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: city 
        ? `Hey! I'm your ground transport booking agent for ${city.name}. 🚗\n\nI can compare Uber and Lyft options and find the best deal for your group.\n\nTell me:\n• How many people need a ride?\n• Where from and where to?\n• Any preferences (budget, luxury, fastest)?`
        : `Welcome! I help book ground transportation for groups and individuals. 🚗\n\nWhether it's airport transfers, event transportation, or daily travel—I'll compare Uber and Lyft to find you the best options.\n\nHow many people need rides, and where are you headed?`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quotes, setQuotes] = useState<RideQuote[]>([]);
  const [searchParams, setSearchParams] = useState<QuoteSearchParams | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'quotes'>('chat');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getQuotes = async (params: QuoteSearchParams) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('transport-agent', {
        body: {
          action: 'get_quotes',
          passengers: params.passengers,
          cityId: selectedCity || 'las-vegas',
          pickup: params.pickup,
          dropoff: params.dropoff,
          preferences: { luxury: params.preference === 'luxury' },
        }
      });

      if (error) throw error;

      setQuotes(data.quotes || []);
      setSearchParams(params);
      setActiveTab('quotes');

      const summaryMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Found ${data.quotes?.length || 0} ride options for ${params.passengers} passenger${params.passengers > 1 ? 's' : ''}!\n\n📍 ${data.route?.from} → ${data.route?.to}\n\nI've switched to the Quotes tab to show you the options. The best value is highlighted!`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, summaryMessage]);
    } catch (error) {
      console.error('Quote fetch error:', error);
      toast({
        title: "Error fetching quotes",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const bookRide = async (quote: RideQuote) => {
    toast({
      title: "Booking initiated!",
      description: `${quote.vehiclesNeeded}x ${quote.rideType} - Total: $${quote.totalForGroup}`,
    });

    const bookingMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `✅ **Booking Confirmed!**\n\n🚗 ${quote.vehiclesNeeded}x ${quote.rideType} (${quote.provider})\n💰 Total: $${quote.totalForGroup} ($${quote.pricePerPerson}/person)\n⏱️ Arriving in ${quote.eta}\n\nYour driver details will be sent shortly. Need to book more rides or change anything?`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, bookingMessage]);
    setActiveTab('chat');
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('transport-agent', {
        body: { 
          message: content,
          cityId: selectedCity,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
        }
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast({
            title: "Rate limit exceeded",
            description: "Please wait a moment and try again",
            variant: "destructive",
          });
        } else if (error.message?.includes('402')) {
          toast({
            title: "Usage limit reached",
            description: "Please add credits to continue",
            variant: "destructive",
          });
        }
        throw error;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || "I'm sorry, I couldn't process that request.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Check if we should auto-trigger quote search
      if (data.shouldGetQuotes) {
        // Parse for passengers and locations from conversation
        const passengersMatch = content.match(/(\d+)\s*(people|passengers|person|pax)/i);
        if (passengersMatch) {
          await getQuotes({
            passengers: parseInt(passengersMatch[1]),
            pickup: 'Airport',
            dropoff: 'Hotel',
            preference: 'budget',
          });
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleQuickSearch = (passengers: number, preference: 'budget' | 'luxury' | 'fastest') => {
    getQuotes({
      passengers,
      pickup: 'Airport',
      dropoff: 'Convention Center',
      preference,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Ground Transport Agent
          </h2>
          <p className="text-sm text-muted-foreground">
            Compare & book Uber/Lyft for groups
          </p>
        </div>
        {city && (
          <Badge variant="outline" className="text-sm">
            <MapPin className="w-3 h-3 mr-1" />
            {city.name}
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chat' | 'quotes')} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 w-fit">
          <TabsTrigger value="chat" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="quotes" className="gap-2" disabled={quotes.length === 0}>
            <Car className="w-4 h-4" />
            Quotes {quotes.length > 0 && `(${quotes.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col mt-0">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-accent-foreground" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2">
              <p className="text-sm text-muted-foreground mb-2 text-center">Quick search:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleQuickSearch(4, 'budget')}
                  disabled={isLoading}
                >
                  <Users className="w-4 h-4 mr-1" />
                  4 people
                  <DollarSign className="w-3 h-3 ml-1 text-success" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleQuickSearch(20, 'budget')}
                  disabled={isLoading}
                >
                  <Users className="w-4 h-4 mr-1" />
                  20 people
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleQuickSearch(4, 'luxury')}
                  disabled={isLoading}
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  Luxury
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleQuickSearch(1, 'fastest')}
                  disabled={isLoading}
                >
                  <Zap className="w-4 h-4 mr-1" />
                  Just me, fastest
                </Button>
              </div>
            </div>
          )}

          {/* Input */}
          <Card className="m-4 mt-2 border-border">
            <form onSubmit={handleSubmit} className="flex gap-2 p-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., '8 people from airport to the convention center'"
                className="flex-1 border-0 focus-visible:ring-0 bg-transparent"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!input.trim() || isLoading}
                className="rounded-full"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="flex-1 flex flex-col mt-0 overflow-hidden">
          {searchParams && (
            <div className="px-4 py-3 bg-secondary/30 border-b border-border">
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="outline">
                  <Users className="w-3 h-3 mr-1" />
                  {searchParams.passengers} passenger{searchParams.passengers > 1 ? 's' : ''}
                </Badge>
                <span className="text-muted-foreground">
                  {searchParams.pickup} → {searchParams.dropoff}
                </span>
              </div>
            </div>
          )}
          
          <ScrollArea className="flex-1 p-4">
            <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {quotes.map((quote, index) => (
                <TransportQuoteCard
                  key={`${quote.rideId}-${index}`}
                  quote={quote}
                  isRecommended={index === 0}
                  onBook={bookRide}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
