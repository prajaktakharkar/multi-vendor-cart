import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FlightSearchResult {
  id: string;
  provider: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  price: number;
  currency: string;
  cabinClass: string;
  seatsAvailable: number;
  bookingToken?: string;
}

const SYSTEM_PROMPT = `You are an intelligent travel booking assistant for a corporate travel platform. Your job is to help company admins book flights for their employees.

When a user describes their travel needs, you should:
1. Extract the key requirements: origin, destination, dates, time preferences, class preference, and budget
2. Use the search_flights tool to find available options
3. Analyze the results and recommend the best option based on their criteria
4. If they approve, use the book_flight tool to complete the booking

Guidelines for selecting the best flight:
- Stay within budget - never recommend flights over the max budget
- Prefer direct flights over connections when price difference is < 20%
- Match time preferences (morning = before 12pm, afternoon = 12pm-5pm, evening = after 5pm)
- Upgrade class if budget allows and user mentioned flexibility
- Consider airline reputation and on-time performance

Always explain your recommendation clearly, including:
- Why you chose this flight
- Price vs budget
- Any trade-offs made

If information is missing, ask clarifying questions before searching.`;

const tools = [
  {
    type: "function",
    function: {
      name: "search_flights",
      description: "Search for available flights based on criteria",
      parameters: {
        type: "object",
        properties: {
          origin: {
            type: "string",
            description: "Origin airport code (e.g., SFO, LAX, JFK)",
          },
          destination: {
            type: "string",
            description: "Destination airport code",
          },
          departureDate: {
            type: "string",
            description: "Departure date in YYYY-MM-DD format",
          },
          returnDate: {
            type: "string",
            description: "Return date in YYYY-MM-DD format (optional for one-way)",
          },
          passengers: {
            type: "number",
            description: "Number of passengers",
          },
          cabinClass: {
            type: "string",
            enum: ["economy", "premium_economy", "business", "first"],
            description: "Preferred cabin class",
          },
        },
        required: ["origin", "destination", "departureDate", "passengers"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recommend_flight",
      description: "Analyze search results and recommend the best flight based on user criteria",
      parameters: {
        type: "object",
        properties: {
          selectedFlightId: {
            type: "string",
            description: "ID of the recommended flight",
          },
          reason: {
            type: "string",
            description: "Explanation of why this flight was selected",
          },
          alternativeFlightId: {
            type: "string",
            description: "ID of an alternative option if available",
          },
          alternativeReason: {
            type: "string",
            description: "Why the alternative might be considered",
          },
        },
        required: ["selectedFlightId", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_flight",
      description: "Book the selected flight for the specified passengers",
      parameters: {
        type: "object",
        properties: {
          flightId: {
            type: "string",
            description: "ID of the flight to book",
          },
          passengers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                firstName: { type: "string" },
                lastName: { type: "string" },
                dateOfBirth: { type: "string", description: "YYYY-MM-DD format" },
                gender: { type: "string", enum: ["male", "female"] },
                email: { type: "string" },
              },
              required: ["firstName", "lastName", "dateOfBirth", "gender"],
            },
            description: "Passenger information",
          },
          contactEmail: {
            type: "string",
            description: "Contact email for booking confirmation",
          },
        },
        required: ["flightId", "passengers", "contactEmail"],
      },
    },
  },
];

async function searchFlights(params: any, authHeader: string): Promise<FlightSearchResult[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  
  const response = await fetch(`${supabaseUrl}/functions/v1/search-flights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Search flights error:", error);
    throw new Error("Failed to search flights");
  }

  const data = await response.json();
  return data.results || [];
}

async function bookFlight(params: any, authHeader: string, searchResults: FlightSearchResult[]): Promise<any> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  
  // Find the flight in search results to get booking token
  const flight = searchResults.find(f => f.id === params.flightId);
  if (!flight) {
    throw new Error("Flight not found in search results");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/book-flight`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      flightId: params.flightId,
      provider: flight.provider,
      bookingToken: flight.bookingToken,
      passengers: params.passengers,
      contactEmail: params.contactEmail,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Book flight error:", error);
    throw new Error("Failed to book flight");
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

    const { messages, searchResults: previousSearchResults } = await req.json();

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

    // Prepare messages with system prompt
    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    console.log("Calling AI agent with messages:", messages.length);

    // Call AI with tools
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

    // Check if AI wants to use tools
    if (assistantMessage?.tool_calls?.length > 0) {
      const toolResults: any[] = [];
      let searchResults = previousSearchResults || [];

      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log(`Executing tool: ${functionName}`, args);

        try {
          let result: any;

          switch (functionName) {
            case "search_flights":
              searchResults = await searchFlights(args, authHeader);
              result = {
                success: true,
                count: searchResults.length,
                flights: searchResults.map(f => ({
                  id: f.id,
                  airline: f.airline,
                  flightNumber: f.flightNumber,
                  departure: f.departureTime,
                  arrival: f.arrivalTime,
                  duration: f.duration,
                  stops: f.stops,
                  price: f.price,
                  currency: f.currency,
                  cabinClass: f.cabinClass,
                  seatsAvailable: f.seatsAvailable,
                })),
              };
              break;

            case "recommend_flight":
              const recommended = searchResults.find((f: FlightSearchResult) => f.id === args.selectedFlightId);
              const alternative = args.alternativeFlightId 
                ? searchResults.find((f: FlightSearchResult) => f.id === args.alternativeFlightId)
                : null;
              
              result = {
                success: true,
                recommendation: {
                  flight: recommended,
                  reason: args.reason,
                },
                alternative: alternative ? {
                  flight: alternative,
                  reason: args.alternativeReason,
                } : null,
              };
              break;

            case "book_flight":
              result = await bookFlight(args, authHeader, searchResults);
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

      // Call AI again with tool results
      const followUpMessages = [
        ...aiMessages,
        assistantMessage,
        ...toolResults,
      ];

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
        console.error("Follow-up AI error:", errorText);
        throw new Error("AI follow-up error");
      }

      const followUpData = await followUpResponse.json();
      const finalMessage = followUpData.choices?.[0]?.message;

      return new Response(
        JSON.stringify({
          message: finalMessage?.content || "I've processed your request.",
          toolCalls: assistantMessage.tool_calls.map((tc: any) => tc.function.name),
          searchResults,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No tool calls, just return the message
    return new Response(
      JSON.stringify({
        message: assistantMessage?.content || "I'm here to help you book flights. Tell me about your travel needs!",
        searchResults: previousSearchResults || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI flight agent error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
