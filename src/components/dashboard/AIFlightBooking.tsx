import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plane, Send, Bot, User, Loader2, Sparkles, Building2, Car, MapPin, Star } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SearchResults {
  flights: any[];
  hotels: any[];
  venues: any[];
  transport: any[];
}

const EXAMPLE_PROMPTS = [
  "Plan a 3-day tech conference in Las Vegas for 50 people next month, budget $50k including venue, hotels, and flights from SF",
  "Book flights and hotels for 5 employees traveling from NYC to Chicago, March 15-17, budget $500/person",
  "Find a party venue in Miami for 100 guests on April 20th, plus airport transfers for out-of-town guests",
  "Organize a team offsite: 20 people from Seattle to Austin, April 10-12, need meeting space and dinner venue",
];

export const AIFlightBooking = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults>({
    flights: [],
    hotels: [],
    venues: [],
    transport: [],
  });
  const [activeResultTab, setActiveResultTab] = useState<string>('flights');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-switch to tab with results
  useEffect(() => {
    if (searchResults.flights.length > 0) setActiveResultTab('flights');
    else if (searchResults.hotels.length > 0) setActiveResultTab('hotels');
    else if (searchResults.venues.length > 0) setActiveResultTab('venues');
    else if (searchResults.transport.length > 0) setActiveResultTab('transport');
  }, [searchResults]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-flight-agent', {
        body: {
          messages: updatedMessages,
          searchResults,
        },
      });

      if (error) {
        console.error('AI agent error:', error);
        if (error.message?.includes('429')) {
          toast.error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (error.message?.includes('402')) {
          toast.error('AI credits exhausted. Please add credits to continue.');
        } else {
          toast.error('Failed to process your request. Please try again.');
        }
        return;
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message || 'I encountered an issue processing your request.',
      };
      setMessages([...updatedMessages, assistantMessage]);

      if (data.searchResults) {
        setSearchResults(prev => ({
          flights: data.searchResults.flights?.length > 0 ? data.searchResults.flights : prev.flights,
          hotels: data.searchResults.hotels?.length > 0 ? data.searchResults.hotels : prev.hotels,
          venues: data.searchResults.venues?.length > 0 ? data.searchResults.venues : prev.venues,
          transport: data.searchResults.transport?.length > 0 ? data.searchResults.transport : prev.transport,
        }));
      }
    } catch (err) {
      console.error('Error calling AI agent:', err);
      toast.error('Failed to connect to AI agent');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(\d+)H(\d+)?M?/);
    if (match) return `${match[1]}h ${match[2] || '0'}m`;
    return duration;
  };

  const hasResults = searchResults.flights.length > 0 || 
                     searchResults.hotels.length > 0 || 
                     searchResults.venues.length > 0 || 
                     searchResults.transport.length > 0;

  const resultCounts = {
    flights: searchResults.flights.length,
    hotels: searchResults.hotels.length,
    venues: searchResults.venues.length,
    transport: searchResults.transport.length,
  };

  return (
    <Card className="flex flex-col h-[750px]">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              AI Travel & Event Booking
            </CardTitle>
            <CardDescription>
              Book flights, hotels, venues, and transport — all in one conversation
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 gap-4">
        {/* Chat Messages */}
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4 pb-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg p-4 flex-1">
                    <p className="text-sm text-foreground">
                      Hi! I'm your AI travel and event booking assistant. I can help you plan and book complete travel packages.
                    </p>
                    <p className="text-sm text-muted-foreground mt-3 font-medium">What I can book:</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Plane className="w-4 h-4" /> Flights
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="w-4 h-4" /> Hotels
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" /> Event Venues
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Car className="w-4 h-4" /> Ground Transport
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Try an example:</p>
                  <div className="space-y-2">
                    {EXAMPLE_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(prompt)}
                        className="w-full text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-2 rounded-lg transition-colors text-left"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary/10'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div
                    className={`rounded-lg p-4 flex-1 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Searching and analyzing options...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Results Preview */}
        {hasResults && (
          <div className="border-t border-border pt-4 flex-shrink-0">
            <Tabs value={activeResultTab} onValueChange={setActiveResultTab}>
              <TabsList className="mb-3">
                {resultCounts.flights > 0 && (
                  <TabsTrigger value="flights" className="flex items-center gap-1.5">
                    <Plane className="w-3 h-3" />
                    Flights ({resultCounts.flights})
                  </TabsTrigger>
                )}
                {resultCounts.hotels > 0 && (
                  <TabsTrigger value="hotels" className="flex items-center gap-1.5">
                    <Building2 className="w-3 h-3" />
                    Hotels ({resultCounts.hotels})
                  </TabsTrigger>
                )}
                {resultCounts.venues > 0 && (
                  <TabsTrigger value="venues" className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    Venues ({resultCounts.venues})
                  </TabsTrigger>
                )}
                {resultCounts.transport > 0 && (
                  <TabsTrigger value="transport" className="flex items-center gap-1.5">
                    <Car className="w-3 h-3" />
                    Transport ({resultCounts.transport})
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="flights" className="mt-0">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {searchResults.flights.slice(0, 6).map((flight) => (
                    <div key={flight.id} className="flex-shrink-0 bg-secondary/50 rounded-lg p-3 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <Plane className="w-3 h-3 text-primary" />
                        <span className="text-xs font-medium">{flight.airline}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {flight.flightNumber}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(flight.departureTime || flight.departure)} → {formatTime(flight.arrivalTime || flight.arrival)}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(flight.duration)} • {flight.stops === 0 ? 'Direct' : `${flight.stops} stop`}
                        </span>
                        <span className="text-sm font-semibold text-primary">${flight.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="hotels" className="mt-0">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {searchResults.hotels.slice(0, 6).map((hotel) => (
                    <div key={hotel.id} className="flex-shrink-0 bg-secondary/50 rounded-lg p-3 min-w-[220px]">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-3 h-3 text-primary" />
                        <span className="text-xs font-medium truncate">{hotel.name}</span>
                      </div>
                      <div className="flex items-center gap-1 mb-1">
                        {Array(hotel.starRating).fill(0).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{hotel.roomType}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">/night</span>
                        <span className="text-sm font-semibold text-primary">${hotel.pricePerNight}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="venues" className="mt-0">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {searchResults.venues.slice(0, 6).map((venue) => (
                    <div key={venue.id} className="flex-shrink-0 bg-secondary/50 rounded-lg p-3 min-w-[220px]">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-3 h-3 text-primary" />
                        <span className="text-xs font-medium truncate">{venue.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Capacity: {venue.capacity} guests
                      </div>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {venue.amenities?.slice(0, 2).map((a: string) => (
                          <Badge key={a} variant="outline" className="text-[10px] px-1 py-0">{a}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">/day</span>
                        <span className="text-sm font-semibold text-primary">${venue.pricePerDay}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="transport" className="mt-0">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {searchResults.transport.slice(0, 6).map((ride) => (
                    <div key={ride.id} className="flex-shrink-0 bg-secondary/50 rounded-lg p-3 min-w-[180px]">
                      <div className="flex items-center gap-2 mb-1">
                        <Car className="w-3 h-3 text-primary" />
                        <span className="text-xs font-medium capitalize">{ride.provider}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{ride.vehicleType}</div>
                      <div className="text-xs text-muted-foreground">
                        {ride.estimatedDuration || ride.duration} • {ride.capacity} seats
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        {ride.surge && <Badge variant="destructive" className="text-[10px]">Surge</Badge>}
                        <span className="text-sm font-semibold text-primary ml-auto">${ride.estimatedPrice || ride.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 flex-shrink-0">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your travel or event needs..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
