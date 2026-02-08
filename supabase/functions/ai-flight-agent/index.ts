import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an intelligent travel and event booking assistant for a corporate travel platform. You help company admins book complete travel packages including flights, hotels, ground transportation, and event venues.

When a user describes their needs, you should:
1. Understand what they're planning (business trip, conference, team event, party, etc.)
2. Extract all requirements: destinations, dates, number of people, budget, preferences
3. Search for appropriate options using the available tools
4. Recommend the best combination based on their criteria
5. Book everything when they approve

**Available booking types:**
- **Flights**: Search and book flights for individuals or groups
- **Hotels**: Find accommodations with specific amenities and star ratings
- **Ground Transport**: Uber/Lyft rides from airports, hotels, venues
- **Event Venues**: Conference centers, party spaces, meeting rooms

**Guidelines:**
- Always stay within budget constraints
- For conferences/events, suggest packages (venue + hotel block + transport)
- Consider logistics: hotel proximity to venue, airport transfers
- Present clear cost breakdowns
- Ask clarifying questions if information is missing

**For events/conferences, gather:**
- Event type (conference, party, meeting, workshop)
- Location/city
- Date(s) and duration
- Number of attendees
- Budget (total or per-person)
- Special requirements (A/V, catering, breakout rooms)

**Response format:**
- Use markdown for clear formatting
- Show price summaries with totals
- Explain your recommendations
- List any trade-offs made`;

const tools = [
  {
    type: "function",
    function: {
      name: "search_flights",
      description: "Search for available flights",
      parameters: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Origin airport code (SFO, LAX, JFK)" },
          destination: { type: "string", description: "Destination airport code" },
          departureDate: { type: "string", description: "Departure date YYYY-MM-DD" },
          returnDate: { type: "string", description: "Return date YYYY-MM-DD (optional)" },
          passengers: { type: "number", description: "Number of passengers" },
          cabinClass: { type: "string", enum: ["economy", "premium_economy", "business", "first"] },
        },
        required: ["origin", "destination", "departureDate", "passengers"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_hotels",
      description: "Search for hotels and accommodations",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City or area name" },
          checkInDate: { type: "string", description: "Check-in date YYYY-MM-DD" },
          checkOutDate: { type: "string", description: "Check-out date YYYY-MM-DD" },
          guests: { type: "number", description: "Number of guests" },
          rooms: { type: "number", description: "Number of rooms needed" },
          maxPricePerNight: { type: "number", description: "Maximum price per night per room" },
          starRating: { type: "number", description: "Minimum star rating (1-5)" },
        },
        required: ["location", "checkInDate", "checkOutDate", "guests", "rooms"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_venues",
      description: "Search for event venues (conferences, parties, meetings)",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City or area" },
          eventDate: { type: "string", description: "Event date YYYY-MM-DD" },
          eventType: { type: "string", enum: ["conference", "party", "wedding", "meeting", "workshop", "other"] },
          attendees: { type: "number", description: "Expected number of attendees" },
          maxBudget: { type: "number", description: "Maximum venue budget" },
        },
        required: ["location", "eventDate", "eventType", "attendees"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_transport",
      description: "Search for ground transportation (Uber/Lyft)",
      parameters: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Pickup location/address" },
          destination: { type: "string", description: "Drop-off location/address" },
          pickupTime: { type: "string", description: "Pickup date and time ISO format" },
          passengers: { type: "number", description: "Number of passengers" },
          rideType: { type: "string", enum: ["standard", "xl", "black", "suv"] },
        },
        required: ["origin", "destination", "pickupTime", "passengers"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_booking_summary",
      description: "Create a summary of selected bookings with total cost",
      parameters: {
        type: "object",
        properties: {
          bookings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["flight", "hotel", "venue", "transport"] },
                itemId: { type: "string" },
                description: { type: "string" },
                price: { type: "number" },
                quantity: { type: "number" },
              },
            },
          },
          totalBudget: { type: "number" },
          notes: { type: "string" },
        },
        required: ["bookings"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "confirm_bookings",
      description: "Confirm and book all selected items",
      parameters: {
        type: "object",
        properties: {
          bookingIds: {
            type: "array",
            items: { type: "string" },
            description: "IDs of items to book",
          },
          contactEmail: { type: "string" },
          contactName: { type: "string" },
          specialRequests: { type: "string" },
        },
        required: ["bookingIds", "contactEmail", "contactName"],
      },
    },
  },
];

async function callSearchFunction(functionName: string, params: any, authHeader: string): Promise<any> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`${functionName} error:`, error);
    throw new Error(`Failed to search: ${functionName}`);
  }

  return await response.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { messages, searchResults: previousResults } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    console.log("AI Travel Agent - messages:", messages.length);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        tools,
        tool_choice: "auto",
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error("AI service error");
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];
    const assistantMessage = choice?.message;

    // Collect all search results
    const allResults = {
      flights: previousResults?.flights || [],
      hotels: previousResults?.hotels || [],
      venues: previousResults?.venues || [],
      transport: previousResults?.transport || [],
    };

    if (assistantMessage?.tool_calls?.length > 0) {
      const toolResults: any[] = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log(`Executing: ${functionName}`, args);

        try {
          let result: any;

          switch (functionName) {
            case "search_flights":
              const flightData = await callSearchFunction("search-flights", args, authHeader);
              allResults.flights = flightData.results || [];
              result = {
                success: true,
                count: allResults.flights.length,
                flights: allResults.flights.slice(0, 10).map((f: any) => ({
                  id: f.id,
                  airline: f.airline,
                  flightNumber: f.flightNumber,
                  departure: f.departureTime,
                  arrival: f.arrivalTime,
                  duration: f.duration,
                  stops: f.stops,
                  price: f.price,
                  cabinClass: f.cabinClass,
                })),
              };
              break;

            case "search_hotels":
              const hotelData = await callSearchFunction("search-hotels", args, authHeader);
              allResults.hotels = hotelData.results || [];
              result = {
                success: true,
                count: allResults.hotels.length,
                nights: hotelData.nights,
                hotels: allResults.hotels.slice(0, 8).map((h: any) => ({
                  id: h.id,
                  name: h.name,
                  starRating: h.starRating,
                  pricePerNight: h.pricePerNight,
                  totalPrice: h.totalPrice,
                  roomType: h.roomType,
                  amenities: h.amenities.slice(0, 5),
                  cancellationPolicy: h.cancellationPolicy,
                })),
              };
              break;

            case "search_venues":
              const venueData = await callSearchFunction("search-venues", args, authHeader);
              allResults.venues = venueData.results || [];
              result = {
                success: true,
                count: allResults.venues.length,
                venues: allResults.venues.slice(0, 8).map((v: any) => ({
                  id: v.id,
                  name: v.name,
                  capacity: v.capacity,
                  pricePerDay: v.pricePerDay,
                  rating: v.rating,
                  amenities: v.amenities.slice(0, 5),
                  cateringOptions: v.cateringOptions,
                })),
              };
              break;

            case "search_transport":
              const transportData = await callSearchFunction("search-transport", args, authHeader);
              allResults.transport = transportData.results || [];
              result = {
                success: true,
                count: allResults.transport.length,
                rides: allResults.transport.map((t: any) => ({
                  id: t.id,
                  provider: t.provider,
                  vehicleType: t.vehicleType,
                  price: t.estimatedPrice,
                  duration: t.estimatedDuration,
                  capacity: t.capacity,
                  surge: t.surge,
                })),
              };
              break;

            case "create_booking_summary":
              const total = args.bookings.reduce((sum: number, b: any) => 
                sum + (b.price * (b.quantity || 1)), 0);
              result = {
                success: true,
                summary: {
                  items: args.bookings,
                  totalCost: total,
                  withinBudget: !args.totalBudget || total <= args.totalBudget,
                  savings: args.totalBudget ? args.totalBudget - total : null,
                },
              };
              break;

            case "confirm_bookings":
              // Create bookings in database
              const bookingRecords = args.bookingIds.map((id: string) => {
                // Determine type from ID prefix
                let bookingType = "other";
                let details: any = { itemId: id };
                
                if (id.startsWith("hotel-")) {
                  bookingType = "hotel";
                  const hotel = allResults.hotels.find((h: any) => h.id === id);
                  if (hotel) details = { ...details, hotelName: hotel.name, price: hotel.totalPrice };
                } else if (id.startsWith("venue-")) {
                  bookingType = "venue";
                  const venue = allResults.venues.find((v: any) => v.id === id);
                  if (venue) details = { ...details, venueName: venue.name, price: venue.pricePerDay };
                } else if (id.includes("-")) {
                  bookingType = "transport";
                  const ride = allResults.transport.find((t: any) => t.id === id);
                  if (ride) details = { ...details, provider: ride.provider, price: ride.estimatedPrice };
                } else {
                  bookingType = "flight";
                  const flight = allResults.flights.find((f: any) => f.id === id);
                  if (flight) details = { ...details, flight: flight.flightNumber, price: flight.price };
                }

                return {
                  user_id: userId,
                  created_by: userId,
                  booking_type: bookingType,
                  status: "confirmed",
                  details: {
                    ...details,
                    contactEmail: args.contactEmail,
                    contactName: args.contactName,
                    specialRequests: args.specialRequests,
                    bookedViaAI: true,
                  },
                };
              });

              const { data: savedBookings, error: bookingError } = await supabase
                .from("bookings")
                .insert(bookingRecords)
                .select();

              if (bookingError) {
                console.error("Booking error:", bookingError);
                result = { success: false, error: "Failed to save bookings" };
              } else {
                result = {
                  success: true,
                  message: `Successfully booked ${savedBookings?.length || 0} items`,
                  bookingIds: savedBookings?.map((b: any) => b.id) || [],
                  confirmationEmail: args.contactEmail,
                };
              }
              break;

            default:
              result = { error: `Unknown tool: ${functionName}` };
          }

          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: JSON.stringify(result),
          });
        } catch (error) {
          console.error(`Tool ${functionName} error:`, error);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: JSON.stringify({ error: error.message }),
          });
        }
      }

      // Follow-up call with tool results
      const followUpMessages = [...aiMessages, assistantMessage, ...toolResults];

      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: followUpMessages,
          tools,
          tool_choice: "auto",
        }),
      });

      if (!followUpResponse.ok) {
        const errorText = await followUpResponse.text();
        console.error("Follow-up error:", errorText);
        throw new Error("AI follow-up error");
      }

      const followUpData = await followUpResponse.json();
      const finalMessage = followUpData.choices?.[0]?.message;

      return new Response(
        JSON.stringify({
          message: finalMessage?.content || "I've processed your request.",
          toolCalls: assistantMessage.tool_calls.map((tc: any) => tc.function.name),
          searchResults: allResults,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage?.content || "I'm here to help you plan travel and events. Tell me what you need!",
        searchResults: allResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI Travel Agent error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
