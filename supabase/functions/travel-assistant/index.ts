import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

// Tool definitions for the AI
const tools = [
  {
    type: "function",
    function: {
      name: "create_travel_plan",
      description: "Creates a structured travel plan that can be saved as bookings. Use this when you have enough information to create a complete travel plan for the user.",
      parameters: {
        type: "object",
        properties: {
          plan_summary: {
            type: "string",
            description: "A brief summary of the travel plan"
          },
          bookings: {
            type: "array",
            description: "Array of bookings to create",
            items: {
              type: "object",
              properties: {
                booking_type: {
                  type: "string",
                  enum: ["flight", "hotel", "car"],
                  description: "Type of booking"
                },
                details: {
                  type: "object",
                  description: "Booking details"
                },
                start_date: {
                  type: "string",
                  description: "Start date in ISO format (YYYY-MM-DD)"
                },
                end_date: {
                  type: "string",
                  description: "End date in ISO format (YYYY-MM-DD)"
                }
              },
              required: ["booking_type", "details"]
            }
          }
        },
        required: ["plan_summary", "bookings"]
      }
    }
  }
];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, cityId, conversationHistory, saveBookings, bookingsToSave, targetUserId } = await req.json();
    
    console.log('Travel assistant request:', { message, cityId, historyLength: conversationHistory?.length, saveBookings, targetUserId });

    // Handle saving bookings
    if (saveBookings && bookingsToSave) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Please sign in to save bookings' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace('Bearer ', '');
      const { data: claims, error: authError } = await supabase.auth.getClaims(token);
      
      if (authError || !claims?.claims) {
        return new Response(
          JSON.stringify({ error: 'Please sign in to save bookings' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const userId = claims.claims.sub;
      
      // Check if admin is assigning to someone else
      let bookingUserId = userId;
      if (targetUserId && targetUserId !== userId) {
        // Verify the requester is an admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();
        
        if (roleData?.role === 'company_admin') {
          bookingUserId = targetUserId;
          console.log('Admin assigning bookings to:', bookingUserId);
        } else {
          console.log('Non-admin tried to assign to another user');
        }
      }
      
      console.log('Saving bookings for user:', bookingUserId, 'created by:', userId);

      // Insert all bookings
      const bookingsWithUser = bookingsToSave.map((booking: any) => ({
        user_id: bookingUserId,
        created_by: userId,
        booking_type: booking.booking_type,
        status: 'confirmed',
        details: booking.details,
        start_date: booking.start_date || null,
        end_date: booking.end_date || null,
      }));

      const { data: insertedBookings, error: insertError } = await supabase
        .from('bookings')
        .insert(bookingsWithUser)
        .select();

      if (insertError) {
        console.error('Error saving bookings:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save bookings: ' + insertError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log('Bookings saved successfully:', insertedBookings?.length);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Successfully saved ${insertedBookings?.length || 0} bookings!`,
          bookings: insertedBookings 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
- Format responses clearly with bullet points and sections
- Keep responses concise but informative

IMPORTANT - CREATING TRAVEL PLANS:
When the user has provided enough information (dates, group size, preferences), you MUST use the create_travel_plan tool to generate a structured plan. This allows the user to save the bookings directly.

When creating a plan:
- Include flight bookings with airline, departure/arrival cities and times
- Include hotel bookings with hotel name, location, room type
- Include car/transport bookings with provider, vehicle type, pickup/dropoff

Always use the tool when you have enough details to create a complete plan. Even if some details are estimated, create the plan so the user can review and save it.`;

    // Call Lovable AI Gateway with tools
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
        max_tokens: 2048,
        tools,
        tool_choice: 'auto',
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];
    
    let response = choice?.message?.content || "";
    let travelPlan = null;

    // Check if the AI called a tool
    if (choice?.message?.tool_calls?.length > 0) {
      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.function?.name === 'create_travel_plan') {
          try {
            travelPlan = JSON.parse(toolCall.function.arguments);
            console.log('Travel plan created:', travelPlan);
            
            // Generate a nice response with the plan
            response = `## 🎉 Your Travel Plan is Ready!\n\n**${travelPlan.plan_summary}**\n\n`;
            
            if (travelPlan.bookings?.length > 0) {
              response += "### Included Bookings:\n\n";
              for (const booking of travelPlan.bookings) {
                const icon = booking.booking_type === 'flight' ? '✈️' : 
                            booking.booking_type === 'hotel' ? '🏨' : '🚗';
                response += `${icon} **${booking.booking_type.charAt(0).toUpperCase() + booking.booking_type.slice(1)}**\n`;
                
                const details = booking.details;
                if (booking.booking_type === 'flight') {
                  response += `- ${details.airline || 'Airline TBD'} ${details.flightNumber || ''}\n`;
                  response += `- ${details.departure || 'Origin'} → ${details.arrival || 'Destination'}\n`;
                  if (details.departureTime) response += `- Departure: ${details.departureTime}\n`;
                } else if (booking.booking_type === 'hotel') {
                  response += `- ${details.hotelName || 'Hotel TBD'}\n`;
                  response += `- ${details.location || 'Location TBD'}\n`;
                  if (details.roomType) response += `- Room: ${details.roomType}\n`;
                  if (details.checkIn && details.checkOut) response += `- ${details.checkIn} to ${details.checkOut}\n`;
                } else if (booking.booking_type === 'car') {
                  response += `- ${details.provider || 'Provider TBD'} - ${details.vehicleType || 'Vehicle TBD'}\n`;
                  response += `- ${details.pickupLocation || 'Pickup TBD'} → ${details.dropoffLocation || 'Dropoff TBD'}\n`;
                }
                response += '\n';
              }
              response += "\n---\n*Click **Save Plan to Bookings** below to add these to your dashboard!*";
            }
          } catch (e) {
            console.error('Error parsing tool arguments:', e);
          }
        }
      }
    }

    if (!response && !travelPlan) {
      response = "I'm sorry, I couldn't generate a response. Please try again.";
    }

    console.log('AI response generated successfully, has plan:', !!travelPlan);

    return new Response(
      JSON.stringify({ response, travelPlan }),
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
