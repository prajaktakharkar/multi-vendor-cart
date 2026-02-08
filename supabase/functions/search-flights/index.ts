import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FlightSearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass?: "economy" | "premium_economy" | "business" | "first";
  preferredProvider?: string;
}

interface FlightCredential {
  id: string;
  provider: string;
  display_name: string;
  api_key: string;
  api_secret: string | null;
  environment: "sandbox" | "production";
  is_active: boolean;
  is_preferred: boolean;
}

interface FlightResult {
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

// Amadeus API integration
async function searchAmadeus(
  credentials: FlightCredential,
  params: FlightSearchRequest
): Promise<FlightResult[]> {
  const baseUrl =
    credentials.environment === "production"
      ? "https://api.amadeus.com"
      : "https://test.api.amadeus.com";

  // Get access token
  const tokenResponse = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: credentials.api_key,
      client_secret: credentials.api_secret || "",
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("Amadeus auth error:", errorText);
    throw new Error("Failed to authenticate with Amadeus");
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  // Search flights
  const searchParams = new URLSearchParams({
    originLocationCode: params.origin,
    destinationLocationCode: params.destination,
    departureDate: params.departureDate,
    adults: params.passengers.toString(),
    max: "20",
    currencyCode: "USD",
  });

  if (params.returnDate) {
    searchParams.append("returnDate", params.returnDate);
  }

  if (params.cabinClass) {
    const cabinMap: Record<string, string> = {
      economy: "ECONOMY",
      premium_economy: "PREMIUM_ECONOMY",
      business: "BUSINESS",
      first: "FIRST",
    };
    searchParams.append("travelClass", cabinMap[params.cabinClass] || "ECONOMY");
  }

  const flightResponse = await fetch(
    `${baseUrl}/v2/shopping/flight-offers?${searchParams}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!flightResponse.ok) {
    const errorText = await flightResponse.text();
    console.error("Amadeus search error:", errorText);
    throw new Error("Failed to search flights with Amadeus");
  }

  const flightData = await flightResponse.json();

  // Transform Amadeus response to our format
  return (flightData.data || []).map((offer: any) => {
    const segment = offer.itineraries[0]?.segments[0];
    const lastSegment =
      offer.itineraries[0]?.segments[offer.itineraries[0]?.segments.length - 1];

    return {
      id: offer.id,
      provider: "amadeus",
      airline: segment?.carrierCode || "Unknown",
      airlineCode: segment?.carrierCode || "",
      flightNumber: `${segment?.carrierCode}${segment?.number}`,
      origin: segment?.departure?.iataCode || params.origin,
      destination: lastSegment?.arrival?.iataCode || params.destination,
      departureTime: segment?.departure?.at || "",
      arrivalTime: lastSegment?.arrival?.at || "",
      duration: offer.itineraries[0]?.duration || "",
      stops: (offer.itineraries[0]?.segments?.length || 1) - 1,
      price: parseFloat(offer.price?.total || "0"),
      currency: offer.price?.currency || "USD",
      cabinClass: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || "ECONOMY",
      seatsAvailable: offer.numberOfBookableSeats || 0,
      bookingToken: JSON.stringify(offer),
    };
  });
}

// Duffel API integration
async function searchDuffel(
  credentials: FlightCredential,
  params: FlightSearchRequest
): Promise<FlightResult[]> {
  const baseUrl = "https://api.duffel.com";

  // Create offer request
  const offerRequestResponse = await fetch(`${baseUrl}/air/offer_requests`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.api_key}`,
      "Duffel-Version": "v1",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        slices: [
          {
            origin: params.origin,
            destination: params.destination,
            departure_date: params.departureDate,
          },
          ...(params.returnDate
            ? [
                {
                  origin: params.destination,
                  destination: params.origin,
                  departure_date: params.returnDate,
                },
              ]
            : []),
        ],
        passengers: Array(params.passengers).fill({ type: "adult" }),
        cabin_class: params.cabinClass || "economy",
      },
    }),
  });

  if (!offerRequestResponse.ok) {
    const errorText = await offerRequestResponse.text();
    console.error("Duffel search error:", errorText);
    throw new Error("Failed to search flights with Duffel");
  }

  const offerData = await offerRequestResponse.json();
  const offers = offerData.data?.offers || [];

  // Transform Duffel response to our format
  return offers.slice(0, 20).map((offer: any) => {
    const slice = offer.slices?.[0];
    const segment = slice?.segments?.[0];
    const lastSegment = slice?.segments?.[slice?.segments?.length - 1];

    return {
      id: offer.id,
      provider: "duffel",
      airline: segment?.marketing_carrier?.name || "Unknown",
      airlineCode: segment?.marketing_carrier?.iata_code || "",
      flightNumber: `${segment?.marketing_carrier?.iata_code}${segment?.marketing_carrier_flight_number}`,
      origin: segment?.origin?.iata_code || params.origin,
      destination: lastSegment?.destination?.iata_code || params.destination,
      departureTime: segment?.departing_at || "",
      arrivalTime: lastSegment?.arriving_at || "",
      duration: slice?.duration || "",
      stops: (slice?.segments?.length || 1) - 1,
      price: parseFloat(offer.total_amount || "0"),
      currency: offer.total_currency || "USD",
      cabinClass: segment?.passengers?.[0]?.cabin_class || "economy",
      seatsAvailable: 9,
      bookingToken: offer.id,
    };
  });
}

// Mock provider for testing
function searchMock(params: FlightSearchRequest): FlightResult[] {
  const airlines = [
    { code: "UA", name: "United Airlines" },
    { code: "AA", name: "American Airlines" },
    { code: "DL", name: "Delta Air Lines" },
    { code: "SW", name: "Southwest Airlines" },
  ];

  const results: FlightResult[] = [];
  const basePrice = 150 + Math.random() * 300;

  for (let i = 0; i < 8; i++) {
    const airline = airlines[Math.floor(Math.random() * airlines.length)];
    const departureHour = 6 + Math.floor(Math.random() * 14);
    const flightDuration = 2 + Math.floor(Math.random() * 6);
    const stops = Math.random() > 0.6 ? 1 : 0;

    const departureDate = new Date(params.departureDate);
    departureDate.setHours(departureHour, Math.floor(Math.random() * 60));

    const arrivalDate = new Date(departureDate);
    arrivalDate.setHours(arrivalDate.getHours() + flightDuration + stops);

    results.push({
      id: `mock-${i}-${Date.now()}`,
      provider: "mock",
      airline: airline.name,
      airlineCode: airline.code,
      flightNumber: `${airline.code}${1000 + Math.floor(Math.random() * 8999)}`,
      origin: params.origin,
      destination: params.destination,
      departureTime: departureDate.toISOString(),
      arrivalTime: arrivalDate.toISOString(),
      duration: `PT${flightDuration + stops}H${Math.floor(Math.random() * 60)}M`,
      stops,
      price: Math.round((basePrice + i * 25 + Math.random() * 100) * params.passengers),
      currency: "USD",
      cabinClass: params.cabinClass || "economy",
      seatsAvailable: Math.floor(Math.random() * 9) + 1,
      bookingToken: `mock-token-${i}`,
    });
  }

  return results.sort((a, b) => a.price - b.price);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
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

    // Parse request
    const body: FlightSearchRequest = await req.json();

    if (!body.origin || !body.destination || !body.departureDate || !body.passengers) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: origin, destination, departureDate, passengers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Searching flights:", body);

    // Fetch flight credentials using service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: credentials, error: credError } = await adminClient
      .from("flight_credentials")
      .select("*")
      .eq("is_active", true)
      .order("is_preferred", { ascending: false });

    if (credError) {
      console.error("Error fetching credentials:", credError);
      throw new Error("Failed to fetch flight credentials");
    }

    let allResults: FlightResult[] = [];
    const errors: string[] = [];

    // If no credentials configured, return mock data
    if (!credentials || credentials.length === 0) {
      console.log("No flight credentials configured, returning mock data");
      allResults = searchMock(body);
    } else {
      // Search with configured providers
      for (const cred of credentials as FlightCredential[]) {
        // If specific provider requested, only use that one
        if (body.preferredProvider && cred.provider !== body.preferredProvider) {
          continue;
        }

        try {
          let results: FlightResult[] = [];

          switch (cred.provider) {
            case "amadeus":
              console.log("Searching Amadeus...");
              results = await searchAmadeus(cred, body);
              break;
            case "duffel":
              console.log("Searching Duffel...");
              results = await searchDuffel(cred, body);
              break;
            default:
              console.log(`Provider ${cred.provider} not yet implemented, using mock`);
              results = searchMock(body).map((r) => ({
                ...r,
                provider: cred.provider,
              }));
          }

          allResults = [...allResults, ...results];
        } catch (err) {
          console.error(`Error searching ${cred.provider}:`, err);
          errors.push(`${cred.display_name}: ${err.message}`);
        }
      }
    }

    // Sort by price
    allResults.sort((a, b) => a.price - b.price);

    return new Response(
      JSON.stringify({
        success: true,
        results: allResults,
        count: allResults.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Search flights error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
