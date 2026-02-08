import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TransportSearchRequest {
  origin: string;
  destination: string;
  pickupTime: string;
  passengers: number;
  rideType?: "standard" | "xl" | "black" | "suv";
}

interface TransportResult {
  id: string;
  provider: string;
  rideType: string;
  vehicleType: string;
  estimatedPrice: number;
  currency: string;
  estimatedDuration: string;
  estimatedArrival: string;
  capacity: number;
  surge?: number;
}

function generateMockTransport(params: TransportSearchRequest): TransportResult[] {
  const providers = ["uber", "lyft"];
  const rideTypes = [
    { type: "standard", name: "UberX / Lyft", capacity: 4, baseFare: 15, perMile: 1.5 },
    { type: "xl", name: "UberXL / Lyft XL", capacity: 6, baseFare: 25, perMile: 2.0 },
    { type: "black", name: "Uber Black / Lyft Lux", capacity: 4, baseFare: 50, perMile: 3.5 },
    { type: "suv", name: "Uber SUV / Lyft Lux SUV", capacity: 6, baseFare: 60, perMile: 4.0 },
  ];

  const results: TransportResult[] = [];
  const estimatedMiles = 5 + Math.random() * 20;
  const baseMinutes = 15 + Math.floor(Math.random() * 30);

  for (const provider of providers) {
    for (const ride of rideTypes) {
      // Skip rides that can't accommodate all passengers
      if (ride.capacity < params.passengers && params.passengers <= 6) continue;

      const surge = Math.random() > 0.7 ? 1.2 + Math.random() * 0.5 : 1;
      const price = Math.round((ride.baseFare + ride.perMile * estimatedMiles) * surge);
      
      const pickupTime = new Date(params.pickupTime);
      const arrivalTime = new Date(pickupTime.getTime() + baseMinutes * 60 * 1000);

      results.push({
        id: `${provider}-${ride.type}-${Date.now()}`,
        provider,
        rideType: ride.type,
        vehicleType: ride.name.split(" / ")[provider === "uber" ? 0 : 1],
        estimatedPrice: price,
        currency: "USD",
        estimatedDuration: `${baseMinutes} mins`,
        estimatedArrival: arrivalTime.toISOString(),
        capacity: ride.capacity,
        surge: surge > 1 ? surge : undefined,
      });
    }
  }

  return results.sort((a, b) => a.estimatedPrice - b.estimatedPrice);
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

    const body: TransportSearchRequest = await req.json();

    if (!body.origin || !body.destination || !body.pickupTime || !body.passengers) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: origin, destination, pickupTime, passengers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Searching transport:", body);

    const results = generateMockTransport(body);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        count: results.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Search transport error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
