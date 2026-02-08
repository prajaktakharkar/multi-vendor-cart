import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  retreatApi,
  FlightSearchParams,
  FlightResult,
  HotelSearchParams,
  HotelResult,
  VenueSearchParams,
  VenueResult,
  TransportSearchParams,
  TransportResult,
  AgentChatParams,
  AgentChatResponse,
} from '@/services/retreatApi';

// Session management hook
export function useCrewSession() {
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return sessionStorage.getItem('crew_session_id');
  });

  const updateSession = useCallback((newSessionId: string) => {
    setSessionId(newSessionId);
    sessionStorage.setItem('crew_session_id', newSessionId);
  }, []);

  const clearSession = useCallback(() => {
    setSessionId(null);
    sessionStorage.removeItem('crew_session_id');
  }, []);

  return { sessionId, updateSession, clearSession };
}

// Flight search hook
export function useFlightSearch() {
  const { sessionId, updateSession } = useCrewSession();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: FlightSearchParams) => 
      retreatApi.searchFlights({ ...params, session_id: sessionId || undefined }),
    onSuccess: (data) => {
      if (data.session_id) {
        updateSession(data.session_id);
      }
      queryClient.invalidateQueries({ queryKey: ['flights'] });
    },
    onError: (error: Error) => {
      toast.error('Flight search failed', { description: error.message });
    },
  });

  return {
    searchFlights: mutation.mutate,
    searchFlightsAsync: mutation.mutateAsync,
    flights: mutation.data?.flights ?? [],
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

// Flight details hook
export function useFlightDetails(flightId: string | null) {
  const { sessionId } = useCrewSession();

  return useQuery({
    queryKey: ['flight', flightId],
    queryFn: () => retreatApi.getFlightDetails(flightId!, sessionId || undefined),
    enabled: !!flightId,
  });
}

// Hotel search hook
export function useHotelSearch() {
  const { sessionId, updateSession } = useCrewSession();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: HotelSearchParams) => 
      retreatApi.searchHotels({ ...params, session_id: sessionId || undefined }),
    onSuccess: (data) => {
      if (data.session_id) {
        updateSession(data.session_id);
      }
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
    },
    onError: (error: Error) => {
      toast.error('Hotel search failed', { description: error.message });
    },
  });

  return {
    searchHotels: mutation.mutate,
    searchHotelsAsync: mutation.mutateAsync,
    hotels: mutation.data?.hotels ?? [],
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

// Hotel details hook
export function useHotelDetails(hotelId: string | null) {
  const { sessionId } = useCrewSession();

  return useQuery({
    queryKey: ['hotel', hotelId],
    queryFn: () => retreatApi.getHotelDetails(hotelId!, sessionId || undefined),
    enabled: !!hotelId,
  });
}

// Venue search hook
export function useVenueSearch() {
  const { sessionId, updateSession } = useCrewSession();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: VenueSearchParams) => 
      retreatApi.searchVenues({ ...params, session_id: sessionId || undefined }),
    onSuccess: (data) => {
      if (data.session_id) {
        updateSession(data.session_id);
      }
      queryClient.invalidateQueries({ queryKey: ['venues'] });
    },
    onError: (error: Error) => {
      toast.error('Venue search failed', { description: error.message });
    },
  });

  return {
    searchVenues: mutation.mutate,
    searchVenuesAsync: mutation.mutateAsync,
    venues: mutation.data?.venues ?? [],
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

// Venue details hook
export function useVenueDetails(venueId: string | null) {
  const { sessionId } = useCrewSession();

  return useQuery({
    queryKey: ['venue', venueId],
    queryFn: () => retreatApi.getVenueDetails(venueId!, sessionId || undefined),
    enabled: !!venueId,
  });
}

// Transport search hook
export function useTransportSearch() {
  const { sessionId, updateSession } = useCrewSession();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: TransportSearchParams) => 
      retreatApi.searchTransport({ ...params, session_id: sessionId || undefined }),
    onSuccess: (data) => {
      if (data.session_id) {
        updateSession(data.session_id);
      }
      queryClient.invalidateQueries({ queryKey: ['transport'] });
    },
    onError: (error: Error) => {
      toast.error('Transport search failed', { description: error.message });
    },
  });

  return {
    searchTransport: mutation.mutate,
    searchTransportAsync: mutation.mutateAsync,
    transport: mutation.data?.transport ?? [],
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

// Transport details hook
export function useTransportDetails(transportId: string | null) {
  const { sessionId } = useCrewSession();

  return useQuery({
    queryKey: ['transport', transportId],
    queryFn: () => retreatApi.getTransportDetails(transportId!, sessionId || undefined),
    enabled: !!transportId,
  });
}

// Agent chat hook
export function useAgentChat() {
  const { sessionId, updateSession } = useCrewSession();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'agent'; content: string; suggestions?: string[] }>>([]);

  const mutation = useMutation({
    mutationFn: (params: Omit<AgentChatParams, 'session_id'>) => 
      retreatApi.chatWithAgent({ ...params, session_id: sessionId || undefined }),
    onSuccess: (data, variables) => {
      if (data.session_id) {
        updateSession(data.session_id);
      }
      setMessages(prev => [
        ...prev,
        { role: 'user', content: variables.message },
        { role: 'agent', content: data.message, suggestions: data.suggestions },
      ]);
    },
    onError: (error: Error) => {
      toast.error('Chat failed', { description: error.message });
    },
  });

  const sendMessage = useCallback((message: string, context?: AgentChatParams['context']) => {
    mutation.mutate({ message, context });
  }, [mutation]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    sendMessage,
    messages,
    clearChat,
    isLoading: mutation.isPending,
    error: mutation.error,
    lastResponse: mutation.data,
  };
}

// Recommendations hook
export function useRecommendations(category?: 'flights' | 'hotels' | 'venues' | 'transport') {
  const { sessionId } = useCrewSession();

  return useQuery({
    queryKey: ['recommendations', sessionId, category],
    queryFn: () => retreatApi.getRecommendations(sessionId!, category),
    enabled: !!sessionId,
  });
}

// Session status hook
export function useSessionStatus() {
  const { sessionId } = useCrewSession();

  return useQuery({
    queryKey: ['session-status', sessionId],
    queryFn: () => retreatApi.getSessionStatus(sessionId!),
    enabled: !!sessionId,
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

// Requirements analysis hook
export function useAnalyzeRequirements() {
  const { sessionId, updateSession } = useCrewSession();

  const mutation = useMutation({
    mutationFn: (userInput: string) => 
      retreatApi.analyzeRequirements(userInput, sessionId || undefined),
    onSuccess: (data) => {
      if (data.session_id) {
        updateSession(data.session_id);
      }
    },
    onError: (error: Error) => {
      toast.error('Analysis failed', { description: error.message });
    },
  });

  return {
    analyze: mutation.mutate,
    analyzeAsync: mutation.mutateAsync,
    result: mutation.data,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Discover options hook
export function useDiscoverOptions() {
  const { sessionId } = useCrewSession();

  const mutation = useMutation({
    mutationFn: () => retreatApi.discoverOptions(sessionId!),
    onError: (error: Error) => {
      toast.error('Discovery failed', { description: error.message });
    },
  });

  return {
    discover: mutation.mutate,
    discoverAsync: mutation.mutateAsync,
    options: mutation.data,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Rank packages hook
export function useRankPackages() {
  const { sessionId } = useCrewSession();

  const mutation = useMutation({
    mutationFn: (weights?: Parameters<typeof retreatApi.rankPackages>[1]) => 
      retreatApi.rankPackages(sessionId!, weights),
    onError: (error: Error) => {
      toast.error('Ranking failed', { description: error.message });
    },
  });

  return {
    rank: mutation.mutate,
    rankAsync: mutation.mutateAsync,
    packages: mutation.data,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Combined hook for full workflow
export function useCrewApi() {
  const session = useCrewSession();
  const flightSearch = useFlightSearch();
  const hotelSearch = useHotelSearch();
  const venueSearch = useVenueSearch();
  const transportSearch = useTransportSearch();
  const agentChat = useAgentChat();
  const analyzeRequirements = useAnalyzeRequirements();
  const discoverOptions = useDiscoverOptions();
  const rankPackages = useRankPackages();

  return {
    session,
    flights: flightSearch,
    hotels: hotelSearch,
    venues: venueSearch,
    transport: transportSearch,
    chat: agentChat,
    analyze: analyzeRequirements,
    discover: discoverOptions,
    rank: rankPackages,
  };
}

// Type exports for consumers
export type {
  FlightSearchParams,
  FlightResult,
  HotelSearchParams,
  HotelResult,
  VenueSearchParams,
  VenueResult,
  TransportSearchParams,
  TransportResult,
  AgentChatParams,
  AgentChatResponse,
};