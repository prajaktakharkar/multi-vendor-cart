import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Static demo data embedded in the function
const travelData = {
  cities: {
    'las-vegas': { name: 'Las Vegas', airports: ['LAS - Harry Reid International'] },
    'atlantic-city': { name: 'Atlantic City', airports: ['ACY - Atlantic City International', 'PHL - Philadelphia International'] },
    'silicon-valley': { name: 'Silicon Valley', airports: ['SFO - San Francisco International', 'SJC - San Jose International'] },
  },
  venues: {
    'las-vegas': [
      { name: 'Las Vegas Convention Center', capacity: 10000, pricePerDay: 25000, amenities: ['WiFi', 'AV Equipment', 'Catering'] },
      { name: 'The Venetian Expo', capacity: 5000, pricePerDay: 18000, amenities: ['WiFi', 'AV Equipment', 'VIP Lounges'] },
      { name: 'MGM Grand Conference Center', capacity: 3000, pricePerDay: 15000, amenities: ['WiFi', 'AV Equipment', 'Hotel Integration'] },
    ],
    'atlantic-city': [
      { name: 'Atlantic City Convention Center', capacity: 8000, pricePerDay: 20000, amenities: ['WiFi', 'AV Equipment', 'Ocean Views'] },
      { name: 'Borgata Event Center', capacity: 2500, pricePerDay: 12000, amenities: ['WiFi', 'Premium AV', 'Fine Dining'] },
      { name: 'Hard Rock Hotel Conference Hall', capacity: 1500, pricePerDay: 10000, amenities: ['WiFi', 'Beach Access'] },
    ],
    'silicon-valley': [
      { name: 'San Jose McEnery Convention Center', capacity: 6000, pricePerDay: 22000, amenities: ['High-Speed WiFi', 'Tech Support', 'Streaming'] },
      { name: 'Computer History Museum', capacity: 800, pricePerDay: 8000, amenities: ['Unique Venue', 'Tech Exhibits'] },
      { name: 'Palo Alto Conference Center', capacity: 1200, pricePerDay: 10000, amenities: ['Fiber WiFi', 'Green Certified'] },
    ],
  },
  hotels: {
    'las-vegas': [
      { name: 'The Bellagio', pricePerNight: 299, stars: 5 },
      { name: 'Caesars Palace', pricePerNight: 249, stars: 5 },
      { name: 'The LINQ Hotel', pricePerNight: 129, stars: 4 },
    ],
    'atlantic-city': [
      { name: 'Borgata Hotel Casino & Spa', pricePerNight: 219, stars: 5 },
      { name: 'Hard Rock Hotel Atlantic City', pricePerNight: 179, stars: 4 },
      { name: 'Ocean Casino Resort', pricePerNight: 159, stars: 4 },
    ],
    'silicon-valley': [
      { name: 'Rosewood Sand Hill', pricePerNight: 599, stars: 5 },
      { name: 'The Westin Palo Alto', pricePerNight: 289, stars: 4 },
      { name: 'Aloft Santa Clara', pricePerNight: 169, stars: 3 },
    ],
  },
  transport: [
    { provider: 'Uber', types: ['UberX ($25-35)', 'UberXL ($40-55)', 'Uber Black ($75-100)'] },
    { provider: 'Lyft', types: ['Lyft ($23-33)', 'Lyft XL ($38-52)', 'Lyft Lux ($70-95)'] },
  ],
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, cityId, conversationHistory } = await req.json();
    
    console.log('Travel assistant request:', { message, cityId, historyLength: conversationHistory?.length });

    // Build context based on city
    const cityData = cityId ? travelData.cities[cityId as keyof typeof travelData.cities] : null;
    const venues = cityId ? travelData.venues[cityId as keyof typeof travelData.venues] : null;
    const hotels = cityId ? travelData.hotels[cityId as keyof typeof travelData.hotels] : null;

    // Build system prompt with available data
    const systemPrompt = `You are a helpful travel planning assistant specializing in group travel for business conferences, sports teams (FIFA Cup, tournaments), and corporate events.

You help plan travel to three cities:
1. Las Vegas - Entertainment capital, major convention center
2. Atlantic City - Beachfront venues, casino resorts
3. Silicon Valley - Tech hub, innovative venues

${cityData ? `
CURRENT CITY: ${cityData.name}
Airports: ${cityData.airports.join(', ')}

AVAILABLE VENUES:
${venues?.map(v => `- ${v.name}: Capacity ${v.capacity}, $${v.pricePerDay.toLocaleString()}/day, Amenities: ${v.amenities.join(', ')}`).join('\n')}

AVAILABLE HOTELS:
${hotels?.map(h => `- ${h.name}: $${h.pricePerNight}/night, ${h.stars}★`).join('\n')}
` : 'No city selected yet. Help the user choose a destination.'}

GROUND TRANSPORT OPTIONS:
${travelData.transport.map(t => `${t.provider}: ${t.types.join(', ')}`).join('\n')}

DATA SOURCES (mention these when relevant):
- Flights: Amadeus/Sabre GDS integration (real-time availability)
- Hotels: Partner inventory with negotiated rates
- Venues: Direct venue partnerships
- Transport: Uber/Lyft business accounts

GUIDELINES:
- Be conversational and helpful
- Ask clarifying questions about: group size, dates, budget, event type
- Provide specific recommendations with prices when possible
- For flights, acknowledge you'd search Amadeus/Sabre for real-time options
- Offer to create detailed itineraries
- Format responses clearly with bullet points and sections
- Keep responses concise but informative`;

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai-gateway.lovable.dev/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-project-id': Deno.env.get('SUPABASE_PROJECT_ID') || '',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const response = aiData.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    console.log('AI response generated successfully');

    return new Response(
      JSON.stringify({ response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Travel assistant error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: "I apologize, but I'm having trouble processing your request right now. Please try again."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
