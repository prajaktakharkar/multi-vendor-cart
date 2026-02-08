import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plane, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FlightResult {
  id: string;
  airline: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  price: number;
  currency: string;
  cabinClass: string;
  seatsAvailable: number;
}

const EXAMPLE_PROMPTS = [
  "Book a flight from SFO to NYC for 2 people on March 20th, budget $800 per person, prefer morning departure",
  "Find business class flights from LAX to London for next Monday, max budget $3000",
  "I need to fly 5 employees from Chicago to Las Vegas for a conference March 25-28, economy class, keep it under $400 each",
];

export const AIFlightBooking = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<FlightResult[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

      // Update search results if we got new ones
      if (data.searchResults?.length > 0) {
        setSearchResults(data.searchResults);
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

  const formatDuration = (duration: string) => {
    // Parse ISO 8601 duration (e.g., PT5H30M)
    const match = duration.match(/PT(\d+)H(\d+)?M?/);
    if (match) {
      const hours = match[1];
      const minutes = match[2] || '0';
      return `${hours}h ${minutes}m`;
    }
    return duration;
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

  return (
    <Card className="flex flex-col h-[700px]">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              AI Flight Booking Agent
            </CardTitle>
            <CardDescription>
              Describe your travel needs and I'll find and book the best flights
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
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
                      Hi! I'm your AI flight booking assistant. Tell me about your travel needs and I'll help you find and book the best flights.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Include details like:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                      <li>Origin and destination cities</li>
                      <li>Travel dates (or date range)</li>
                      <li>Number of passengers</li>
                      <li>Budget per person</li>
                      <li>Preferred times (morning/afternoon/evening)</li>
                      <li>Class preference (economy/business/first)</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Try an example:</p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(prompt)}
                        className="text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-1.5 rounded-full transition-colors text-left"
                      >
                        {prompt.slice(0, 50)}...
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
                    <span className="text-sm">Searching flights and analyzing options...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Flight Results Preview */}
        {searchResults.length > 0 && (
          <div className="border-t border-border pt-4 mt-4 flex-shrink-0">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Found {searchResults.length} flights
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {searchResults.slice(0, 5).map((flight) => (
                <div
                  key={flight.id}
                  className="flex-shrink-0 bg-secondary/50 rounded-lg p-3 min-w-[200px]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Plane className="w-3 h-3 text-primary" />
                    <span className="text-xs font-medium">{flight.airline}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {flight.flightNumber}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTime(flight.departure)} → {formatTime(flight.arrival)}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(flight.duration)} • {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      ${flight.price}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 pt-4 flex-shrink-0">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your flight needs..."
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
