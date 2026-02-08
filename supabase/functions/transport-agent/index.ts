import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Rate limiting: Track requests per user
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  
  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - userLimit.count };
}

// Mock transport options with dynamic pricing
const transportProviders = {
  uber: {
    name: 'Uber',
    logo: '🚗',
    types: [
      { id: 'uber-x', name: 'UberX', capacity: 4, basePrice: 8, perMile: 1.5, perMinute: 0.25, surge: 1.0 },
      { id: 'uber-xl', name: 'UberXL', capacity: 6, basePrice: 12, perMile: 2.0, perMinute: 0.35, surge: 1.0 },
      { id: 'uber-black', name: 'Uber Black', capacity: 4, basePrice: 20, perMile: 3.5, perMinute: 0.50, surge: 1.0 },
      { id: 'uber-suv', name: 'Uber Black SUV', capacity: 6, basePrice: 28, perMile: 4.0, perMinute: 0.60, surge: 1.0 },
      { id: 'uber-van', name: 'UberXL Van', capacity: 10, basePrice: 35, perMile: 3.0, perMinute: 0.45, surge: 1.0 },
    ]
  },
  lyft: {
    name: 'Lyft',
    logo: '🚕',
    types: [
      { id: 'lyft-standard', name: 'Lyft', capacity: 4, basePrice: 7, perMile: 1.4, perMinute: 0.22, surge: 1.0 },
      { id: 'lyft-xl', name: 'Lyft XL', capacity: 6, basePrice: 11, perMile: 1.9, perMinute: 0.32, surge: 1.0 },
      { id: 'lyft-lux', name: 'Lyft Lux', capacity: 4, basePrice: 18, perMile: 3.2, perMinute: 0.45, surge: 1.0 },
      { id: 'lyft-lux-suv', name: 'Lyft Lux Black SUV', capacity: 6, basePrice: 25, perMile: 3.8, perMinute: 0.55, surge: 1.0 },
    ]
  }
};

// City-specific data
const cityData: Record<string, { airportCode: string; popularRoutes: { from: string; to: string; miles: number; minutes: number }[] }> = {
  'las-vegas': {
    airportCode: 'LAS',
    popularRoutes: [
      { from: 'LAS Airport', to: 'Las Vegas Strip', miles: 4, minutes: 15 },
      { from: 'LAS Airport', to: 'Downtown Las Vegas', miles: 6, minutes: 20 },
      { from: 'LAS Airport', to: 'Convention Center', miles: 3, minutes: 12 },
      { from: 'Las Vegas Strip', to: 'Fremont Street', miles: 4, minutes: 18 },
    ]
  },
  'atlantic-city': {
    airportCode: 'ACY',
    popularRoutes: [
      { from: 'ACY Airport', to: 'Boardwalk Hotels', miles: 12, minutes: 25 },
      { from: 'ACY Airport', to: 'Convention Center', miles: 10, minutes: 22 },
      { from: 'PHL Airport', to: 'Atlantic City', miles: 60, minutes: 75 },
      { from: 'Boardwalk', to: 'Marina District', miles: 3, minutes: 10 },
    ]
  },
  'silicon-valley': {
    airportCode: 'SFO',
    popularRoutes: [
      { from: 'SFO Airport', to: 'Downtown San Jose', miles: 35, minutes: 45 },
      { from: 'SFO Airport', to: 'Palo Alto', miles: 25, minutes: 35 },
      { from: 'SJC Airport', to: 'Santa Clara Convention', miles: 5, minutes: 12 },
      { from: 'SFO Airport', to: 'Mountain View', miles: 28, minutes: 40 },
    ]
  }
};

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

function calculateRideOptions(
  passengers: number,
  route: { miles: number; minutes: number },
  preferences: { luxury?: boolean; shared?: boolean }
): RideQuote[] {
  const quotes: RideQuote[] = [];
  const surgeMultiplier = 1 + Math.random() * 0.3; // Random surge 1.0-1.3

  for (const [providerKey, provider] of Object.entries(transportProviders)) {
    for (const rideType of provider.types) {
      // Skip luxury if not preferred, or non-luxury if luxury preferred
      const isLuxury = rideType.name.includes('Black') || rideType.name.includes('Lux');
      if (preferences.luxury && !isLuxury) continue;
      if (!preferences.luxury && isLuxury && passengers <= 4) continue; // Show luxury for large groups

      const vehiclesNeeded = Math.ceil(passengers / rideType.capacity);
      const basePrice = rideType.basePrice + (route.miles * rideType.perMile) + (route.minutes * rideType.perMinute);
      const priceWithSurge = basePrice * surgeMultiplier;
      const priceMin = Math.round(priceWithSurge * 0.9);
      const priceMax = Math.round(priceWithSurge * 1.1);
      const totalForGroup = priceMax * vehiclesNeeded;
      const pricePerPerson = Math.round(totalForGroup / passengers * 100) / 100;

      const features: string[] = [];
      if (isLuxury) features.push('Premium vehicle', 'Professional driver');
      if (rideType.capacity >= 6) features.push('Extra luggage space');
      if (vehiclesNeeded === 1) features.push('Single vehicle');
      if (pricePerPerson < 15) features.push('Budget friendly');

      quotes.push({
        provider: provider.name,
        providerLogo: provider.logo,
        rideType: rideType.name,
        rideId: rideType.id,
        capacity: rideType.capacity,
        priceRange: { min: priceMin, max: priceMax },
        estimatedTime: `${route.minutes}-${route.minutes + 5} min`,
        vehiclesNeeded,
        totalForGroup,
        pricePerPerson,
        eta: `${Math.floor(Math.random() * 8) + 3} min`,
        features,
      });
    }
  }

  // Sort by total cost for group
  return quotes.sort((a, b) => a.totalForGroup - b.totalForGroup);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ========== AUTHENTICATION CHECK ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Transport agent: Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required. Please sign in to use the transport agent.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.log('Transport agent: Invalid JWT token', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session. Please sign in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log('Transport agent: Authenticated user', userId);

    // ========== RATE LIMITING ==========
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      console.log('Transport agent: Rate limit exceeded for user', userId);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a moment before trying again.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000))
          } 
        }
      );
    }

    const { action, message, passengers, cityId, pickup, dropoff, preferences, conversationHistory } = await req.json();
    
    console.log('Transport agent request:', { action, passengers, cityId, pickup, dropoff, userId });

    // Handle direct quote requests
    if (action === 'get_quotes') {
      const city = cityData[cityId] || cityData['las-vegas'];
      
      // Find matching route or estimate
      let route = city.popularRoutes.find(r => 
        r.from.toLowerCase().includes(pickup?.toLowerCase() || '') ||
        r.to.toLowerCase().includes(dropoff?.toLowerCase() || '')
      );
      
      if (!route) {
        // Estimate based on random distance
        route = { from: pickup || 'Pickup', to: dropoff || 'Destination', miles: 8, minutes: 20 };
      }

      const quotes = calculateRideOptions(passengers || 1, route, preferences || {});

      return new Response(
        JSON.stringify({ 
          quotes,
          route,
          passengers,
          cityName: cityId?.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(rateLimit.remaining)
          } 
        }
      );
    }

    // Handle booking requests
    if (action === 'book') {
      const { quoteId, passengerDetails } = await req.json();
      
      // Simulate booking
      const bookingId = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      return new Response(
        JSON.stringify({
          success: true,
          bookingId,
          message: `Booking confirmed! Your ${quoteId} ride has been scheduled.`,
          confirmationDetails: {
            bookingId,
            status: 'confirmed',
            estimatedPickup: new Date(Date.now() + 10 * 60000).toISOString(),
          }
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(rateLimit.remaining)
          } 
        }
      );
    }

    // AI chat for natural language interactions
    const city = cityId ? cityData[cityId] : null;
    const routeInfo = city ? city.popularRoutes.map(r => `${r.from} → ${r.to} (~${r.miles} miles, ${r.minutes} min)`).join('\n') : '';

    const systemPrompt = `You are a ground transportation booking agent specializing in coordinating rides for groups and individuals.

YOUR CAPABILITIES:
1. Compare Uber and Lyft options side-by-side
2. Calculate optimal vehicle combinations for groups (1-100+ people)
3. Recommend based on budget, comfort, or speed preferences
4. Handle multi-stop itineraries
5. Coordinate fleet bookings for events

${city ? `
CURRENT CITY: ${cityId?.replace('-', ' ')}
POPULAR ROUTES:
${routeInfo}
` : ''}

AVAILABLE RIDE TYPES:
Uber: UberX (4), UberXL (6), Uber Black (4), Uber Black SUV (6), UberXL Van (10)
Lyft: Lyft (4), Lyft XL (6), Lyft Lux (4), Lyft Lux Black SUV (6)

GUIDELINES:
- Ask for: number of passengers, pickup location, destination, and preferences (budget/luxury/speed)
- For groups >6, always calculate multiple vehicle options
- Compare total cost AND per-person cost
- Mention luggage capacity for airport transfers
- For events/conferences, offer to schedule multiple pickup times
- Be conversational but efficient

When you have enough info, say "I'll get real-time quotes for you now" and summarize what you'll search for.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(conversationHistory || []),
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Usage limit reached. Please add credits to continue.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const response = aiData.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that request.";

    // Check if AI wants to trigger a quote search
    const shouldGetQuotes = response.toLowerCase().includes("get real-time quotes") || 
                           response.toLowerCase().includes("searching for") ||
                           response.toLowerCase().includes("let me find");

    return new Response(
      JSON.stringify({ 
        response,
        shouldGetQuotes,
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateLimit.remaining)
        } 
      }
    );

  } catch (error) {
    console.error('Transport agent error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        response: "I apologize, but I'm having trouble right now. Please try again."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
