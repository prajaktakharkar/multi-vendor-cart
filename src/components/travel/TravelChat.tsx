import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { ChatMessage, type Message } from "./ChatMessage";
import { Send, Loader2, ArrowLeft, Plane, Building2, MapPin, Car, Save, CheckCircle, Users, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cities } from "@/data/travelData";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useAgentChat, useCrewSession } from "@/hooks/useCrewApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Employee {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
}

interface TravelPlan {
  plan_summary: string;
  bookings: Array<{
    booking_type: 'flight' | 'hotel' | 'car';
    details: Record<string, unknown>;
    start_date?: string;
    end_date?: string;
  }>;
}

interface TravelChatProps {
  selectedCity?: string;
  onBack: () => void;
}

const quickActions = [
  { icon: Plane, label: "Book flights", prompt: "I need to book flights for my group" },
  { icon: Building2, label: "Find hotels", prompt: "Show me hotel options for my team" },
  { icon: MapPin, label: "Conference venues", prompt: "What conference venues are available?" },
  { icon: Car, label: "Ground transport", prompt: "I need Uber/Lyft for airport transfers" },
];

export const TravelChat = ({ selectedCity, onBack }: TravelChatProps) => {
  const city = cities.find(c => c.id === selectedCity);
  const { user, session, role } = useAuth();
  const isAdmin = role === 'company_admin';
  
  // CrewAI agent chat integration
  const { 
    sendMessage: sendAgentMessage, 
    messages: agentMessages, 
    isLoading: agentLoading, 
    lastResponse,
    clearChat: clearAgentChat 
  } = useAgentChat();
  const { sessionId } = useCrewSession();
  
  // Use CrewAI mode toggle
  const [useCrewAI, setUseCrewAI] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: city 
        ? `Welcome! I'm your travel planning assistant for ${city.name}. 🎉\n\nI can help you book:\n• ✈️ Flights (via Amadeus/Sabre)\n• 🏨 Hotels\n• 🏛️ Conference venues\n• 🚗 Uber/Lyft transportation\n\nTell me about your group trip—how many people, dates, and what you need!`
        : `Welcome! I'm your group travel planning assistant. 🌟\n\nI specialize in booking travel for:\n• Business conferences\n• Sports teams (FIFA Cup, tournaments)\n• Corporate retreats\n\nWhich city are you interested in?\n• 🎰 Las Vegas\n• 🎲 Atlantic City\n• 💻 Silicon Valley`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<TravelPlan | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('self');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch employees for admin users
  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    }
  }, [isAdmin]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name');
      
      if (error) throw error;
      if (data) {
        setEmployees(data as Employee[]);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  // Sync CrewAI agent messages to local state
  useEffect(() => {
    if (useCrewAI && agentMessages.length > 0) {
      const newMessages: Message[] = agentMessages.map((msg, idx) => ({
        id: `crew-${idx}-${Date.now()}`,
        role: msg.role === 'agent' ? 'assistant' : 'user',
        content: msg.content,
        timestamp: new Date(),
        suggestions: msg.suggestions,
      }));
      
      // Keep initial message and add agent messages
      setMessages(prev => {
        const initial = prev[0];
        return [initial, ...newMessages];
      });
    }
  }, [agentMessages, useCrewAI]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || agentLoading) return;

    // If using CrewAI, delegate to the agent
    if (useCrewAI) {
      sendAgentMessage(content, {
        current_step: 'travel_planning',
        preferences: {
          city: selectedCity,
          cityName: city?.name,
        }
      });
      setInput("");
      return;
    }

    // Original Supabase function logic
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setCurrentPlan(null);
    setPlanSaved(false);

    try {
      const { data, error } = await supabase.functions.invoke('travel-assistant', {
        body: { 
          message: content,
          cityId: selectedCity,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || "I'm sorry, I couldn't process that request. Please try again.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Check if there's a travel plan
      if (data.travelPlan) {
        setCurrentPlan(data.travelPlan);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I encountered an error. Please try again or rephrase your request.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSuggestionClick = useCallback((suggestion: string) => {
    sendMessage(suggestion);
  }, [useCrewAI]);

  const savePlanToBookings = async () => {
    if (!currentPlan || !user) {
      toast.error('Please sign in to save bookings');
      return;
    }

    setIsSavingPlan(true);

    // Determine target user
    const targetUserId = selectedEmployee === 'self' ? user.id : selectedEmployee;
    const targetEmployee = employees.find(e => e.user_id === targetUserId);
    const targetName = targetUserId === user.id ? 'yourself' : (targetEmployee?.full_name || targetEmployee?.email || 'the employee');

    try {
      const { data, error } = await supabase.functions.invoke('travel-assistant', {
        body: { 
          saveBookings: true,
          bookingsToSave: currentPlan.bookings,
          targetUserId: targetUserId,
        }
      });

      if (error) throw error;

      if (data.success) {
        setPlanSaved(true);
        toast.success(data.message || 'Bookings saved successfully!');
        
        // Add confirmation message to chat
        const assignedTo = targetUserId === user.id 
          ? "your dashboard" 
          : `${targetName}'s schedule`;
        
        const confirmMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `✅ **Bookings Saved!**\n\nI've added ${currentPlan.bookings.length} booking(s) to ${assignedTo}. ${targetUserId === user.id ? 'You can view and manage them from the Dashboard page.' : 'The employee will see these in their schedule.'}\n\nIs there anything else you'd like to plan?`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, confirmMessage]);
        setSelectedEmployee('self');
      } else {
        throw new Error(data.error || 'Failed to save bookings');
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save bookings');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const currentLoading = useCrewAI ? agentLoading : isLoading;

  // Get suggestions from last agent response
  const lastSuggestions = useCrewAI && lastResponse?.suggestions ? lastResponse.suggestions : [];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold text-foreground">
            {city ? `Planning: ${city.name}` : 'Travel Planning Assistant'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Flights • Hotels • Venues • Ground Transport
          </p>
        </div>
        
        {/* CrewAI Toggle */}
        <Button
          variant={useCrewAI ? "default" : "outline"}
          size="sm"
          onClick={() => setUseCrewAI(!useCrewAI)}
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {useCrewAI ? 'CrewAI Active' : 'Use CrewAI'}
        </Button>
        
        {city && (
          <img 
            src={city.image} 
            alt={city.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-primary"
          />
        )}
      </div>
      
      {/* CrewAI Session Badge */}
      {useCrewAI && sessionId && (
        <div className="px-4 pt-2">
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            CrewAI Session: {sessionId.slice(0, 8)}...
          </Badge>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {currentLoading && (
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

      {/* CrewAI Suggestions */}
      {useCrewAI && lastSuggestions.length > 0 && !currentLoading && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {lastSuggestions.map((suggestion, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Save Plan Button */}
      {currentPlan && !planSaved && (
        <div className="px-4 pb-2">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">Travel Plan Ready</p>
                  <p className="text-sm text-muted-foreground">
                    {currentPlan.bookings.length} booking(s) • {currentPlan.plan_summary}
                  </p>
                </div>
              </div>
              
              {/* Admin employee selector */}
              {isAdmin && employees.length > 0 && (
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Assign to..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">Myself</SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.user_id} value={employee.user_id}>
                          {employee.full_name || employee.email}
                          {employee.user_id === user?.id && ' (Me)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Button 
                onClick={savePlanToBookings} 
                disabled={isSavingPlan || !user}
                className="w-full"
              >
                {isSavingPlan ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {!user ? 'Sign in to Save' : 
                  selectedEmployee === 'self' ? 'Save Plan to My Bookings' : 
                  `Assign to ${employees.find(e => e.user_id === selectedEmployee)?.full_name || 'Employee'}`
                }
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Plan Saved Confirmation */}
      {planSaved && (
        <div className="px-4 pb-2">
          <Card className="p-4 bg-accent/50 border-accent">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Plan Saved!</p>
                <p className="text-sm text-muted-foreground">
                  View your bookings in the Dashboard
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      {messages.length <= 2 && !useCrewAI && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2 justify-center">
            {quickActions.map(({ icon: Icon, label, prompt }) => (
              <Button
                key={label}
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => sendMessage(prompt)}
                disabled={currentLoading}
              >
                <Icon className="w-4 h-4 mr-1" />
                {label}
              </Button>
            ))}
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
            placeholder={useCrewAI ? "Ask CrewAI about your travel..." : "Describe your travel needs..."}
            className="flex-1 border-0 focus-visible:ring-0 bg-transparent"
            disabled={currentLoading}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!input.trim() || currentLoading}
            className="rounded-full"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
};
